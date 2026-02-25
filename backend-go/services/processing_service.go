package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
)

const (
	thumbnailOffsetFraction = 0.10            // extract frame at 10% into the video
	thumbnailOffsetFallback = 5.0             // seconds — used when duration is unknown
	presignGetTTL           = 15 * time.Minute // presigned URL TTL — must outlive worst-case ffprobe + ffmpeg time
)

type ProcessingService struct {
	store  *database.Store
	media  *MediaService
	upload *UploadService
}

func NewProcessingService(store *database.Store, media *MediaService, upload *UploadService) *ProcessingService {
	return &ProcessingService{store: store, media: media, upload: upload}
}

// Process runs the processing pipeline for a single video.
// Called by JobQueueService for videos with processing_status = 'processing'.
// On success, marks processing_status = 'completed'. On failure, JobQueueService marks it 'failed'.
func (ps *ProcessingService) Process(ctx context.Context, video *models.Video) error {


	// step 1: presign GET — ffprobe and ffmpeg stream from this directly, no disk download needed.
	presignedURL, err := ps.upload.PresignGet(ctx, video.S3Key, presignGetTTL)
	if err != nil {
		return fmt.Errorf("presign GET: %w", err)
	}

	// step 2: skip ffprobe if client already sent complete metadata. only probe if any of the core fields are missing.
	if video.Duration == nil || video.Width == nil || video.Height == nil {
		meta, err := ps.media.ProbeMetadata(ctx, presignedURL)
		if err != nil {
			log.Printf("[processing] video %d: ffprobe failed: %v", video.ID, err)
		} else {
			// step 3: fill DB gaps — COALESCE preserves any client-provided values.
			if err := ps.store.UpdateVideoMetadata(ctx, video.ID, *meta); err != nil {
				log.Printf("[processing] video %d: UpdateVideoMetadata failed: %v", video.ID, err)
			}
			// carry ffprobe duration forward for offset calculation below
			if video.Duration == nil {
				video.Duration = meta.Duration
			}
		}
	}

	// step 4: compute thumbnail offset.
	offset := thumbnailOffsetFallback
	if video.Duration != nil {
		offset = *video.Duration * thumbnailOffsetFraction
	}

	// step 5: extract frame
	frame, err := ps.media.ExtractFrame(ctx, presignedURL, offset)
	if err != nil {
		log.Printf("[processing] video %d: ExtractFrame failed: %v", video.ID, err)
	} else {
		// step 6: upload thumbnail while persisting URL
		thumbnailKey := fmt.Sprintf("thumbnails/%d.jpg", video.ID)
		thumbnailURL, err := ps.upload.PutObject(ctx, thumbnailKey, frame, "image/jpeg")
		if err != nil {
			// thumbnail failure is soft — video is still watchable, thumbnail_url stays nil.
			log.Printf("[processing] video %d: thumbnail upload failed: %v", video.ID, err)
		} else if err := ps.store.SetThumbnailURL(ctx, video.ID, thumbnailURL); err != nil {
			log.Printf("[processing] video %d: SetThumbnailURL failed: %v", video.ID, err)
		}
	}

	// step 7: mark processing complete regardless of thumbnail outcome.
	return ps.store.SetProcessingStatusCompleted(ctx, video.ID)
}
