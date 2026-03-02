package services

import (
	"context"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/dto"
	"github.com/areeeeeeeb/reLive/backend-go/models"
)

type ConcertService struct {
	store         *database.Store
	searchService *SearchService
}

func NewConcertService(store *database.Store, searchService *SearchService) *ConcertService {
	return &ConcertService{
		store:         store,
		searchService: searchService,
	}
}

func (s *ConcertService) Get(ctx context.Context, concertID int) (*models.Concert, error) {
	return s.store.GetConcertByID(ctx, concertID)
}

func (s *ConcertService) Search(ctx context.Context, req dto.SearchRequest) (*dto.ConcertSearchResponse, error) {
	if err := s.searchService.ValidateMaxResults(req.MaxResults); err != nil {
		return nil, err
	}

	concerts, err := s.store.SearchConcerts(ctx, req.Q, req.MaxResults)
	if err != nil {
		return nil, err
	}

	artistIDs, venueIDs := collectConcertRelationIDs(concerts)

	artists, err := s.store.ListArtistsByIDs(ctx, artistIDs)
	if err != nil {
		return nil, err
	}
	artistsByID := indexBy(artists, func(a models.Artist) int { return a.ID })

	venues, err := s.store.ListVenuesByIDs(ctx, venueIDs)
	if err != nil {
		return nil, err
	}
	venuesByID := indexBy(venues, func(v models.Venue) int { return v.ID })

	results := s.BuildSearchResults(
		concerts,
		artistsByID,
		venuesByID,
	)
	meta := s.searchService.BuildSearchMeta(req, len(results))
	return &dto.ConcertSearchResponse{
		Results: results,
		Meta:    meta,
	}, nil
}

func (s *ConcertService) BuildSearchResults(
	concerts []models.Concert,
	artistsByID map[int]models.Artist,
	venuesByID map[int]models.Venue,
) []dto.ConcertSearchItem {
	results := make([]dto.ConcertSearchItem, 0, len(concerts))
	for _, concert := range concerts {
		var artistCompact *dto.ArtistCompact
		var venueCompact *dto.VenueCompact

		if concert.ArtistID != nil {
			if artist, ok := artistsByID[*concert.ArtistID]; ok {
				artistCompact = &dto.ArtistCompact{
					ID:       artist.ID,
					Name:     artist.Name,
					ImageURL: artist.ImageURL,
				}
			}
		}

		if concert.VenueID != nil {
			if venue, ok := venuesByID[*concert.VenueID]; ok {
				venueCompact = &dto.VenueCompact{
					ID:          venue.ID,
					Name:        venue.Name,
					City:        venue.City,
					Region:      venue.Region,
					CountryCode: venue.CountryCode,
				}
			}
		}

		results = append(results, dto.ConcertSearchItem{
			ID:            concert.ID,
			Name:          concert.Name,
			Date:          concert.Date,
			PrimaryArtist: artistCompact,
			Venue:         venueCompact,
		})
	}

	return results
}

func collectConcertRelationIDs(concerts []models.Concert) ([]int, []int) {
	artistSeenSet := make(map[int]struct{})
	venueSeenSet := make(map[int]struct{})
	artistIDs := make([]int, 0)
	venueIDs := make([]int, 0)

	for _, concert := range concerts {
		if concert.ArtistID != nil {
			id := *concert.ArtistID
			_, seen := artistSeenSet[id]
			if !seen {
				artistSeenSet[id] = struct{}{}
				artistIDs = append(artistIDs, id)
			}
		}

		if concert.VenueID != nil {
			id := *concert.VenueID
			_, seen := venueSeenSet[id]
			if !seen {
				venueSeenSet[id] = struct{}{}
				venueIDs = append(venueIDs, id)
			}
		}
	}

	return artistIDs, venueIDs
}
