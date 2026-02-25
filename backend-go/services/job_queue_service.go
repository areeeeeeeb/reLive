package services

import (
	"context"
	"log"
	"time"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/areeeeeeeb/reLive/backend-go/workers"
)

// JobQueueService manages the processing pipeline: claims queued videos and runs processing jobs.
// Completely decoupled from the upload pipeline — claims videos with processing_status = 'queued'
// regardless of upload status.
type JobQueueService struct {
	store          *database.Store
	processing     *ProcessingService
	pool           *workers.Pool
	scheduler      *workers.Scheduler
	stuckThreshold time.Duration
}

func NewJobQueueService(store *database.Store, processing *ProcessingService, concurrency, queueSize, intervalSecs, stuckThresholdMins int) *JobQueueService {
	jqs := &JobQueueService{
		store:          store,
		processing:     processing,
		pool:           workers.NewPool("processing", concurrency, queueSize),
		stuckThreshold: time.Duration(stuckThresholdMins) * time.Minute,
	}

	jqs.scheduler = workers.NewScheduler("processing", jqs.pool, jqs.fetch, time.Duration(intervalSecs)*time.Second)

	return jqs
}

// Start launches the pool and scheduler in background goroutines.
func (jqs *JobQueueService) Start(ctx context.Context) {
	go jqs.pool.Run(ctx)
	go jqs.scheduler.Run(ctx)
	log.Println("[job-queue] started")
}

// fetch bridges Postgres → worker jobs for the processing pipeline.
// Also resets videos stuck in processing_status = 'processing' on every tick,
// so crashed workers are recovered without requiring a server restart.
func (jqs *JobQueueService) fetch(ctx context.Context, limit int) ([]workers.Job, error) {
	if err := jqs.store.ResetStuckProcessingVideos(ctx, jqs.stuckThreshold); err != nil {
		log.Printf("[job-queue] failed to reset stuck processing jobs: %v", err)
	}

	videos, err := jqs.store.ClaimQueuedProcessing(ctx, limit)
	if err != nil {
		return nil, err
	}

	jobs := make([]workers.Job, len(videos))
	for i, v := range videos {
		jobs[i] = jqs.processingJob(v)
	}
	return jobs, nil
}

// processingJob returns a Job that runs the processing pipeline for a single video.
func (jqs *JobQueueService) processingJob(v *models.Video) workers.Job {
	return func(ctx context.Context) error {
		if err := jqs.processing.Process(ctx, v); err != nil {
			if ferr := jqs.store.SetProcessingStatusFailed(ctx, v.ID); ferr != nil {
				log.Printf("[job-queue] video %d: failed to mark processing as failed: %v", v.ID, ferr)
			}
			return err
		}
		return nil
	}
}
