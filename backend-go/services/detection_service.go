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

// DetectConcert attempts to match the provided metadata to a concert.
// Stateless — no DB writes. Returns top candidates ordered by confidence score.
// Returns a non-nil error only for infrastructure failures (e.g. DB query failed).
func (ds *DetectionService) DetectConcert(ctx context.Context, req models.ConcertDetectRequest) (*models.ConcertDetectResult, error) {
	// TODO: implement GPS + timestamp concert matching against concerts table.
	log.Printf("[detection] detection not yet implemented")

	return &models.ConcertDetectResult{Detected: false, Matches: []models.ConcertMatch{}}, nil
}
