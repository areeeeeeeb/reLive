package services

import (
	"context"
	"log"
	"time"

	"github.com/areeeeeeeb/reLive/backend-go/config"
	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/workers"
)

// JobQueueService manages background video processing via worker pool + scheduler.
type JobQueueService struct {
	store      *database.Store
	processing *ProcessingService
	pool       *workers.Pool
	scheduler  *workers.Scheduler
}

func NewJobQueueService(store *database.Store, processing *ProcessingService, cfg config.ConcurrencyConfig) *JobQueueService {
	jq := &JobQueueService{
		store:      store,
		processing: processing,
		pool:       workers.NewPool("video-processing", cfg.Concurrency, cfg.QueueSize),
	}

	jq.scheduler = workers.NewScheduler("video", jq.pool, jq.fetch, time.Duration(cfg.Interval)*time.Second)

	return jq
}

// Start launches the pool and scheduler in background goroutines.
func (jq *JobQueueService) Start(ctx context.Context) {
	// reset stuck videos from a previous crash
	if err := jq.store.ResetStuckProcessingVideos(ctx); err != nil {
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
		v := v
		jobs[i] = func(ctx context.Context) error {
			return jq.processing.Process(ctx, v)
		}
	}
	return jobs, nil
}


