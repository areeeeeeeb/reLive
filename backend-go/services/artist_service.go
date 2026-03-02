package services

import (
	"context"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/dto"
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

func (s *ArtistService) Search(ctx context.Context, req dto.SearchRequest) (*dto.ArtistSearchResponse, error) {
	if err := s.searchService.ValidateMaxResults(req.MaxResults); err != nil {
		return nil, err
	}

	artists, err := s.store.SearchArtists(ctx, req.Q, req.MaxResults)
	if err != nil {
		return nil, err
	}

	results := s.BuildSearchResults(artists)
	meta := s.searchService.BuildSearchMeta(req, len(results))
	return &dto.ArtistSearchResponse{
		Results: results,
		Meta:    meta,
	}, nil
}

// BuildSearchTemplateResponse prepares the search-card response contract.
func (s *ArtistService) BuildSearchResults(artists []models.Artist) []dto.ArtistSearchItem {
	results := make([]dto.ArtistSearchItem, 0, len(artists))
	for _, artist := range artists {
		results = append(results, dto.ArtistSearchItem{
			ID:         artist.ID,
			Name:       artist.Name,
			ImageURL:   artist.ImageURL,
			IsVerified: artist.IsVerified,
		})
	}

	return results
}
