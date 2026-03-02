package services

import (
	"context"

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

func (s *SongService) Search(ctx context.Context, req dto.SearchRequest) (*dto.SongSearchResponse, error) {
	if err := s.searchService.ValidateMaxResults(req.MaxResults); err != nil {
		return nil, err
	}

	songs, err := s.store.SearchSongs(ctx, req.Q, req.MaxResults)
	if err != nil {
		return nil, err
	}

	artistIDs := collectSongArtistIDs(songs)
	artists, err := s.store.ListArtistsByIDs(ctx, artistIDs)
	if err != nil {
		return nil, err
	}
	artistsByID := indexBy(artists, func(a models.Artist) int { return a.ID })

	results := s.BuildSearchResults(songs, artistsByID)
	meta := s.searchService.BuildSearchMeta(req, len(results))
	return &dto.SongSearchResponse{
		Results: results,
		Meta:    meta,
	}, nil
}

func (s *SongService) BuildSearchResults(
	songs []models.Song,
	artistsByID map[int]models.Artist,
) []dto.SongSearchItem {
	results := make([]dto.SongSearchItem, 0, len(songs))
	for _, song := range songs {
		var artistCompact *dto.ArtistCompact
		if song.ArtistID != nil {
			if artist, ok := artistsByID[*song.ArtistID]; ok {
				artistCompact = &dto.ArtistCompact{
					ID:       artist.ID,
					Name:     artist.Name,
					ImageURL: artist.ImageURL,
				}
			}
		}

		results = append(results, dto.SongSearchItem{
			ID:              song.ID,
			Title:           song.Title,
			Artist:          artistCompact,
			DurationSeconds: song.DurationSeconds,
			IsVerified:      song.IsVerified,
		})
	}

	return results
}

func collectSongArtistIDs(songs []models.Song) []int {
	seen := make(map[int]struct{})
	artistIDs := make([]int, 0)

	for _, song := range songs {
		if song.ArtistID == nil {
			continue
		}
		id := *song.ArtistID
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		artistIDs = append(artistIDs, id)
	}

	return artistIDs
}
