package services

import (
	"context"
	"log"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/dto"
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
func (ds *DetectionService) DetectConcert(ctx context.Context, req dto.ConcertDetectRequest) (*dto.ConcertDetectResult, error) {
	// TODO: implement GPS + timestamp concert matching against concerts table.
	log.Printf("[detection] detection not yet implemented")

	return &dto.ConcertDetectResult{Detected: false, Matches: []dto.ConcertMatch{}}, nil
}
