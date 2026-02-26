package services

import (
	"context"
	"log"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
)

// DetectionService runs concert detection for a video using client-provided metadata.
// Detection is triggered explicitly by the client via POST /videos/:id/concert/detect
// and runs synchronously in the HTTP handler — no worker pool involved.
type DetectionService struct {
	store *database.Store
}

func NewDetectionService(store *database.Store) *DetectionService {
	return &DetectionService{store: store}
}

// Detect attempts to match the video to a concert using the provided metadata.
// On completion it persists detection_status on the video and returns the result.
// Returns a non-nil error only for infrastructure failures (e.g. DB write failed).
func (ds *DetectionService) Detect(ctx context.Context, videoID int, req models.ConcertDetectRequest) (*models.ConcertDetectResult, error) {
	// TODO: implement GPS + timestamp concert matching against concerts table.
	log.Printf("[detection] video %d: detection not yet implemented", videoID)

	if err := ds.store.SetDetectionStatus(ctx, videoID, models.VideoDetectionStatusNotDetected); err != nil {
		return nil, err
	}

	return &models.ConcertDetectResult{Detected: false, Matches: []models.ConcertMatch{}}, nil
}
