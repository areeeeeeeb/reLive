package services

import (
	"context"
	"log"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
)

// DetectionService contains all detection logic when the client explicitly triggers a detect request
type DetectionService struct {
	store *database.Store
}

func NewDetectionService(store *database.Store) *DetectionService {
	return &DetectionService{store: store}
}

// DetectConcert attempts to match the video to a concert using the provided metadata.
// On completion it persists detection_status on the video and returns the result.
// Returns a non-nil error only for infrastructure failures (e.g. DB write failed).
func (ds *DetectionService) DetectConcert(ctx context.Context, videoID int, req models.ConcertDetectRequest) (*models.ConcertDetectResult, error) {
	// TODO: implement GPS + timestamp concert matching against concerts table.
	log.Printf("[detection] video %d: detection not yet implemented", videoID)

	if err := ds.store.SetDetectionStatus(ctx, videoID, models.VideoDetectionStatusNotDetected); err != nil {
		return nil, err
	}

	return &models.ConcertDetectResult{Detected: false, Matches: []models.ConcertMatch{}}, nil
}
