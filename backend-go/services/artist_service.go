package services

import (
	"context"
	"fmt"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
)

type ArtistService struct {
	store         *database.Store
	searchService *SearchService
}

func NewArtistService(store *database.Store, searchService *SearchService) *ArtistService {
	return &ArtistService{store: store, searchService: searchService}
}

func (s *ArtistService) Get(ctx context.Context, id int) (*models.Artist, error) {
	return s.store.GetArtistByID(ctx, id)
}

func (s *ArtistService) Search(ctx context.Context, query string, maxResults int, source string) ([]models.Artist, error) {
	if err := s.searchService.ValidateMaxResults(maxResults); err != nil {
		return nil, err
	}

	switch source {
	case models.SearchSourceLocal:
		return s.store.SearchArtists(ctx, query, maxResults)
	case models.SearchSourceExternal:
		return nil, fmt.Errorf("external source not implemented for artists")
	case models.SearchSourceMixed:
		return nil, fmt.Errorf("mixed source not implemented for artists")
	default:
		return nil, fmt.Errorf("invalid source: %s", source)
	}
}
