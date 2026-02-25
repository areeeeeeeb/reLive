package services

import (
	"context"

	"github.com/areeeeeeeb/reLive/backend-go/apperr"
	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
)

type SongPerformanceService struct {
	store *database.Store
}

func NewSongPerformanceService(store *database.Store) *SongPerformanceService {
	return &SongPerformanceService{store: store}
}

func (s *SongPerformanceService) ListByConcert(ctx context.Context, concertID int) ([]models.SongPerformance, error) {
	performances, err := s.store.ListSongPerformancesByConcert(ctx, concertID)
	if err != nil {
		return nil, err
	}
	if len(performances) > 0 {
		return performances, nil
	}

	exists, err := s.store.ConcertExists(ctx, concertID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, apperr.ErrConcertNotFound
	}
	return performances, nil
}
