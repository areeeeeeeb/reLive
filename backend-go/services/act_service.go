package services

import (
	"context"

	"github.com/areeeeeeeb/reLive/backend-go/apperr"
	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
)

type ActService struct {
	store *database.Store
}

func NewActService(store *database.Store) *ActService {
	return &ActService{store: store}
}

func (s *ActService) ListByConcert(ctx context.Context, concertID int) ([]models.Act, error) {
	acts, err := s.store.ListActsByConcert(ctx, concertID)
	if err != nil {
		return nil, err
	}
	if len(acts) > 0 {
		return acts, nil
	}

	exists, err := s.store.ConcertExists(ctx, concertID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, apperr.ErrNotFound
	}
	return acts, nil
}
