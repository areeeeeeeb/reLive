package services

import (
	"context"
	"log"
	"time"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/areeeeeeeb/reLive/backend-go/workers"
)

// JobQueueService manages background video processing via worker pool + scheduler.
type JobQueueService struct {
	store          *database.Store
	processing     *ProcessingService
	pool           *workers.Pool
	scheduler      *workers.Scheduler
	stuckThreshold int // minutes
}

func NewJobQueueService(store *database.Store, processing *ProcessingService, concurrency, queueSize, intervalSecs, stuckThresholdMins int) *JobQueueService {
	jq := &JobQueueService{
		store:          store,
		processing:     processing,
		pool:           workers.NewPool("video-processing", concurrency, queueSize),
		stuckThreshold: stuckThresholdMins,
	}

	jq.scheduler = workers.NewScheduler("video", jq.pool, jq.fetch, time.Duration(intervalSecs)*time.Second)

	return jq
}

// Start launches the pool and scheduler in background goroutines.
func (jq *JobQueueService) Start(ctx context.Context) {
	// reset stuck videos from a previous crash
	if err := jq.store.ResetStuckProcessingVideos(ctx, time.Duration(jq.stuckThreshold)*time.Minute); err != nil {
		log.Printf("[job-queue] failed to reset stuck videos: %v", err)
	}
	go jq.pool.Run(ctx)
	go jq.scheduler.Run(ctx)
	log.Println("[job-queue] started")
}


// fetch bridges Postgres → worker jobs
func (jq *JobQueueService) fetch(ctx context.Context, limit int) ([]workers.Job, error) {
	videos, err := jq.store.ClaimQueuedVideos(ctx, limit)
	if err != nil {
		return nil, err
	}

	jobs := make([]workers.Job, len(videos))
	for i, v := range videos {
		jobs[i] = jq.processVideoJob(v)
	}
	return jobs, nil
}

// processVideoJob returns a Job that processes a single video and marks it failed on error.
func (jq *JobQueueService) processVideoJob(v *models.Video) workers.Job {
	return func(ctx context.Context) error {
		if err := jq.processing.Process(ctx, v); err != nil {
			jq.store.UpdateVideoStatus(ctx, v.ID, models.VideoStatusFailed)
			return err
		}
		return nil
	}
}


