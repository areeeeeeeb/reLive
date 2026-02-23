package services

import (
	"context"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
)

type ProcessingService struct {
	store *database.Store
}

func NewProcessingService(store *database.Store) *ProcessingService {
	return &ProcessingService{store: store}
}

// Process runs the processing pipeline using client-provided metadata on the video.
// Called by JobQueueService for videos with processing_status = 'processing'.
// On success, marks processing_status = 'completed'. On failure, JobQueueService marks it 'failed'.
func (ps *ProcessingService) Process(ctx context.Context, video *models.Video) error {
	// step 1: concert detection via external API using video.Latitude, video.Longitude, video.RecordedAt
	// step 2: song/artist detection using concert + local source of truth or external API
	// step 3: store.SetProcessingStatusCompleted(ctx, video.ID)
	return ps.store.SetProcessingStatusCompleted(ctx, video.ID)
}
