package services

import (
	"context"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
)

type ConcertService struct {
	store *database.Store
}

func NewConcertService(store *database.Store) *ConcertService {
	return &ConcertService{store: store}
}

func (s *ConcertService) Get(ctx context.Context, concertID int) (*models.Concert, error) {
	return s.store.GetConcertByID(ctx, concertID)
}
