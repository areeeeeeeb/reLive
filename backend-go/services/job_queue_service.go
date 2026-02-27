package services

import (
	"context"
	"log"
	"time"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/areeeeeeeb/reLive/backend-go/workers"
)

// JobQueueService manages the thumbnail processing pipeline: claims queued videos and dispatches
// them to a bounded worker pool via a periodic scheduler.

// Completely decoupled from the upload pipeline — claims videos with thumbnail_status = 'queued'
type JobQueueService struct {
	store          *database.Store
	thumbnail      *ThumbnailService
	pool           *workers.Pool
	scheduler      *workers.Scheduler
	stuckThreshold time.Duration
	resetInterval  time.Duration
}

func NewJobQueueService(
	store *database.Store,
	thumbnail *ThumbnailService,
	concurrency, queueSize int,
	schedulerInterval, stuckThreshold, resetInterval time.Duration,
) *JobQueueService {
	jqs := &JobQueueService{
		store:          store,
		thumbnail:      thumbnail,
		pool:           workers.NewPool("thumbnail", concurrency, queueSize),
		stuckThreshold: stuckThreshold,
		resetInterval:  resetInterval,
	}
	jqs.scheduler = workers.NewScheduler("thumbnail", jqs.pool, jqs.fetch, schedulerInterval)
	return jqs
}

// Start launches the pool, scheduler, and reset loop in background goroutines.
func (jqs *JobQueueService) Start(ctx context.Context) {
	go jqs.pool.Run(ctx)
	go jqs.scheduler.Run(ctx)
	go jqs.runResetLoop(ctx)
	log.Println("[job-queue] started")
}

// runResetLoop periodically resets videos stuck in thumbnail_status = 'processing'.
// Decoupled from fetch so the reset cadence is independent of the scheduler poll interval.
func (jqs *JobQueueService) runResetLoop(ctx context.Context) {
	ticker := time.NewTicker(jqs.resetInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := jqs.store.ResetStuckThumbnailVideos(ctx, jqs.stuckThreshold); err != nil {
				log.Printf("[job-queue] failed to reset stuck thumbnail jobs: %v", err)
			}
		}
	}
}

// fetch bridges Postgres → worker jobs for the thumbnail pipeline.
func (jqs *JobQueueService) fetch(ctx context.Context, limit int) ([]workers.Job, error) {
	videos, err := jqs.store.ClaimQueuedThumbnails(ctx, limit)
	if err != nil {
		return nil, err
	}

	jobs := make([]workers.Job, len(videos))
	for i, v := range videos {
		jobs[i] = jqs.processingJob(v)
	}
	return jobs, nil
}

// processingJob returns a Job that runs the thumbnail pipeline for a single video.
func (jqs *JobQueueService) processingJob(v *models.Video) workers.Job {
	return func(ctx context.Context) error {
		if err := jqs.thumbnail.Extract(ctx, v); err != nil {
			if ferr := jqs.store.SetThumbnailStatusFailed(ctx, v.ID); ferr != nil {
				log.Printf("[job-queue] video %d: failed to mark thumbnail as failed: %v", v.ID, ferr)
			}
			return err
		}
		return nil
	}
}
