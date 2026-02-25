package services

import (
	"context"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
)

// UploadService needs two new methods for ProcessingService to use:
//   - PresignGet(ctx, s3Key string) (url string, err error)
//       presignClient.PresignGetObject — TTL of 15min covers worst-case processing time.
//   - PutObject(ctx, key string, data []byte, contentType string) (url string, err error)
//       s3Client.PutObject with bytes.NewReader(data) — returns the CDN URL of the uploaded object.
//
// store_videos.go needs one new method:
//   - SetThumbnailURL(ctx, videoID int, url string) error
//       UPDATE videos SET thumbnail_url = $1, updated_at = NOW() WHERE id = $2
//
// CreateVideo (store_videos.go) should stop setting processing_status = queued conditionally.
// ConfirmUpload (video_service.go) should always set processing_status = queued after CompleteMultipartUpload.
// This means every confirmed video gets a thumbnail, and the race condition
// (processor claiming a video mid-upload) is eliminated by design rather than papered over.

type ProcessingService struct {
	store   *database.Store
	media   *MediaService
	upload  *UploadService
	cdnURL  string
}

func NewProcessingService(store *database.Store, media *MediaService, upload *UploadService, cdnURL string) *ProcessingService {
	return &ProcessingService{store: store, media: media, upload: upload, cdnURL: cdnURL}
}

// Process runs the processing pipeline for a single video.
// Called by JobQueueService for videos with processing_status = 'processing'.
// On success, marks processing_status = 'completed'. On failure, JobQueueService marks it 'failed'.
func (ps *ProcessingService) Process(ctx context.Context, video *models.Video) error {

	// step 1: generate a presigned GET URL for the S3 object (video.S3Key).
	// ffprobe and ffmpeg both accept URLs directly — no need to download the file to disk.
	// presigned URL should have a TTL long enough to cover the full processing time 

	// step 2 (conditional): if video.Duration, video.Width, or video.Height are nil,
	// run ffprobe against the presigned URL via media.ProbeMetadata(ctx, presignedURL).
	// client already sends these fields via MediaInfo.js at upload init, so on the common path
	// ffprobe is skipped entirely — no redundant S3 read.
	// if ffprobe is needed and fails, log and continue — metadata is enrichment, not a hard requirement.

	// step 3 (conditional): if ffprobe ran, call store.UpdateVideoMetadata(ctx, video.ID, metadata).
	// uses COALESCE — only fills fields that are currently NULL in the DB.

	// step 4: compute thumbnail offset.
	// use video.Duration if non-nil (client-provided or ffprobe-extracted), offset = *duration * 0.10.
	// if duration is still unavailable, fall back to a fixed offset (e.g. 5.0 seconds).

	// step 5: extract a thumbnail frame via media.ExtractFrame(ctx, presignedURL, offset).
	// returns raw JPEG bytes.

	// step 6: upload the JPEG to S3 at key "thumbnails/{video.ID}.jpg" via upload.PutObject.
	// content-type: image/jpeg.
	// construct public URL as fmt.Sprintf("%s/thumbnails/%d.jpg", ps.cdnURL, video.ID).

	// step 7: store.SetThumbnailURL(ctx, video.ID, thumbnailURL).

	// step 8: store.SetProcessingStatusCompleted(ctx, video.ID).

	return ps.store.SetProcessingStatusCompleted(ctx, video.ID)
}
