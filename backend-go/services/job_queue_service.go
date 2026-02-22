package services

import (
	"context"
	"log"
	"time"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/areeeeeeeb/reLive/backend-go/workers"
)

// JobQueueService manages pipeline A: concert/song detection from client metadata.
// Completely decoupled from the upload pipeline — claims videos with detection_status = 'pending'
// regardless of upload status.
type JobQueueService struct {
	store          *database.Store
	processing     *ProcessingService
	pool           *workers.Pool
	scheduler      *workers.Scheduler
	stuckThreshold int // minutes
}

func NewJobQueueService(store *database.Store, processing *ProcessingService, concurrency, queueSize, intervalSecs, stuckThresholdMins int) *JobQueueService {
	jqs := &JobQueueService{
		store:          store,
		processing:     processing,
		pool:           workers.NewPool("detection", concurrency, queueSize),
		stuckThreshold: stuckThresholdMins,
	}

	jqs.scheduler = workers.NewScheduler("detection", jqs.pool, jqs.fetch, time.Duration(intervalSecs)*time.Second)

	return jqs
}

// Start launches the pool and scheduler in background goroutines.
func (jqs *JobQueueService) Start(ctx context.Context) {
	go jqs.pool.Run(ctx)
	go jqs.scheduler.Run(ctx)
	log.Println("[job-queue] started")
}

// fetch bridges Postgres → worker jobs for pipeline A (detection).
// Also resets videos stuck in detection_status = 'processing' on every tick,
// so crashed workers are recovered without requiring a server restart.
func (jqs *JobQueueService) fetch(ctx context.Context, limit int) ([]workers.Job, error) {
	if err := jqs.store.ResetStuckDetectingVideos(ctx, time.Duration(jqs.stuckThreshold)*time.Minute); err != nil {
		log.Printf("[job-queue] failed to reset stuck detections: %v", err)
	}

	videos, err := jqs.store.ClaimPendingDetections(ctx, limit)
	if err != nil {
		return nil, err
	}

	jobs := make([]workers.Job, len(videos))
	for i, v := range videos {
		jobs[i] = jqs.detectionJob(v)
	}
	return jobs, nil
}

// detectionJob returns a Job that runs concert/song detection for a single video.
func (jqs *JobQueueService) detectionJob(v *models.Video) workers.Job {
	return func(ctx context.Context) error {
		if err := jqs.processing.Process(ctx, v); err != nil {
			if ferr := jqs.store.FailDetection(ctx, v.ID); ferr != nil {
				log.Printf("[job-queue] video %d: failed to mark detection as failed: %v", v.ID, ferr)
			}
			return err
		}
		return nil
	}
}
