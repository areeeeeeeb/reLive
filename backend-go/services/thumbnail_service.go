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
	thumbnailOffsetFraction = 0.10             // extract frame at 10% into the video
	thumbnailOffsetFallback = 5.0              // seconds — used when duration is unknown
	presignGetTTL           = 15 * time.Minute // presigned URL TTL — must outlive worst-case ffprobe + ffmpeg time
)

type ThumbnailService struct {
	store  *database.Store
	media  *MediaService
	upload *UploadService
	sem    chan struct{} // semaphore — limits concurrent extraction goroutines
}

func NewThumbnailService(ctx context.Context, store *database.Store, media *MediaService, upload *UploadService, maxConcurrent int) *ThumbnailService {
	ts := &ThumbnailService{
		store:  store,
		media:  media,
		upload: upload,
		sem:    make(chan struct{}, maxConcurrent),
	}
	ts.recoverPending(ctx)
	return ts
}

// Extract runs the thumbnail pipeline synchronously for a single video.
// Presigns a GET URL, optionally runs ffprobe to fill missing metadata,
// extracts a frame with ffmpeg, and uploads the JPEG to S3.
// All steps after presign are soft failures — the video remains watchable.
// On success, marks thumbnail_status = 'completed'. On failure, the caller marks it 'failed'.
func (ts *ThumbnailService) Extract(ctx context.Context, video *models.Video) error {

	// step 1: presign GET — ffprobe and ffmpeg stream from this directly, no disk download needed.
	presignedURL, err := ts.upload.PresignGet(ctx, video.S3Key, presignGetTTL)
	if err != nil {
		return fmt.Errorf("presign GET: %w", err)
	}

	// step 2: skip ffprobe if client already sent complete metadata. only probe if any of the core fields are missing.
	if video.Duration == nil || video.Width == nil || video.Height == nil {
		meta, err := ts.media.ProbeMetadata(ctx, presignedURL)
		if err != nil {
			log.Printf("[thumbnail] video %d: ffprobe failed: %v", video.ID, err)
		} else {
			// step 3: fill DB gaps — COALESCE preserves any client-provided values.
			if err := ts.store.UpdateVideoMetadata(ctx, video.ID, *meta); err != nil {
				log.Printf("[thumbnail] video %d: UpdateVideoMetadata failed: %v", video.ID, err)
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
	frame, err := ts.media.ExtractFrame(ctx, presignedURL, offset)
	if err != nil {
		log.Printf("[thumbnail] video %d: ExtractFrame failed: %v", video.ID, err)
	} else {
		// step 6: upload thumbnail and persist URL
		thumbnailKey := fmt.Sprintf("thumbnails/%d.jpg", video.ID)
		thumbnailURL, err := ts.upload.PutObject(ctx, thumbnailKey, frame, "image/jpeg")
		if err != nil {
			// thumbnail failure is soft — video is still watchable, thumbnail_url stays nil.
			log.Printf("[thumbnail] video %d: thumbnail upload failed: %v", video.ID, err)
		} else if err := ts.store.SetThumbnailURL(ctx, video.ID, thumbnailURL); err != nil {
			log.Printf("[thumbnail] video %d: SetThumbnailURL failed: %v", video.ID, err)
		}
	}

	// step 7: mark thumbnail extraction complete regardless of outcome.
	return ts.store.SetThumbnailStatusCompleted(ctx, video.ID)
}

// ExtractAsync spawns a goroutine to run the thumbnail pipeline for the given video.
// Acquires the semaphore to bound concurrency. Uses context.Background() so the goroutine
// outlives the HTTP request that triggered it.
func (ts *ThumbnailService) ExtractAsync(video *models.Video) {
	go func() {
		ts.sem <- struct{}{} // acquire — blocks if at concurrency limit
		defer func() { <-ts.sem }()

		ctx := context.Background()
		if err := ts.Extract(ctx, video); err != nil {
			log.Printf("[thumbnail] video %d: async extraction failed: %v", video.ID, err)
			_ = ts.store.SetThumbnailStatusFailed(ctx, video.ID)
		}
	}()
}

// recoverPending resumes any thumbnail extractions interrupted by a previous crash or restart.
// Called automatically by NewThumbnailService. Resets stuck 'processing' videos back to
// 'queued', then claims and re-spawns them via ExtractAsync.
func (ts *ThumbnailService) recoverPending(ctx context.Context) {
	// Reset any videos stuck in 'processing' back to 'queued' regardless of age.
	if err := ts.store.ResetStuckThumbnailVideos(ctx, 0); err != nil {
		log.Printf("[thumbnail] recovery: failed to reset stuck videos: %v", err)
		return
	}

	// Claim queued videos atomically (transitions them to 'processing') and re-spawn.
	const recoveryBatchSize = 1000
	videos, err := ts.store.ClaimQueuedThumbnails(ctx, recoveryBatchSize)
	if err != nil {
		log.Printf("[thumbnail] recovery: failed to fetch queued videos: %v", err)
		return
	}

	if len(videos) == 0 {
		return
	}

	log.Printf("[thumbnail] recovery: re-spawning %d pending thumbnail jobs", len(videos))
	for _, v := range videos {
		ts.ExtractAsync(v)
	}
}
