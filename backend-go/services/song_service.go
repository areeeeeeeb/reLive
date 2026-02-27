package services

import (
	"context"
	"fmt"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/dto"
	"github.com/areeeeeeeb/reLive/backend-go/models"
)

type SongService struct {
	store         *database.Store
	searchService *SearchService
}

func NewSongService(store *database.Store, searchService *SearchService) *SongService {
	return &SongService{store: store, searchService: searchService}
}

func (s *SongService) Get(ctx context.Context, id int) (*models.Song, error) {
	return s.store.GetSongByID(ctx, id)
}

func (s *SongService) Search(ctx context.Context, query string, maxResults int, source string) ([]models.Song, error) {
	if err := s.searchService.ValidateMaxResults(maxResults); err != nil {
		return nil, err
	}

	switch source {
	case dto.SearchSourceLocal:
		return s.store.SearchSongs(ctx, query, maxResults)
	case dto.SearchSourceExternal:
		return nil, fmt.Errorf("external source not implemented for songs")
	case dto.SearchSourceMixed:
		return nil, fmt.Errorf("mixed source not implemented for songs")
	default:
		return nil, fmt.Errorf("invalid source: %s", source)
	}
}
