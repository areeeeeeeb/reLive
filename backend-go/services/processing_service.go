package services

import (
	"context"
	"fmt"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
)

type ProcessingService struct {
	store *database.Store
}

func NewProcessingService(store *database.Store) *ProcessingService {
	return &ProcessingService{store: store}
}

// Process runs the full processing pipeline for a single video.
func (ps *ProcessingService) Process(ctx context.Context, video *models.Video) error {
	// TODO: implement processing pipeline
	return fmt.Errorf("Processing pipeline with concurrency not implemented yet")
}
