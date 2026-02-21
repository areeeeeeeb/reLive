package services

import (
	"fmt"

	"github.com/areeeeeeeb/reLive/backend-go/models"
)

// SearchService is a shared toolkit for search operations.
// It holds the future MusicBrainz client and shared helpers.
// Domain services (ArtistService, SongService) own their own search orchestration.
type SearchService struct {
	// TODO: add MusicBrainz HTTP client here
}

func NewSearchService() *SearchService {
	return &SearchService{}
}

// ValidateMaxResults checks that maxResults is within allowed bounds.
func (s *SearchService) ValidateMaxResults(maxResults int) error {
	if maxResults <= 0 || maxResults > models.SearchMaxResultsMax {
		return fmt.Errorf("invalid max_results: %d (must be 1-%d)", maxResults, models.SearchMaxResultsMax)
	}
	return nil
}


// PAUSED DUE TO MUSICBRAINZ RATE LIMITING CONCERNS
// FetchMBArtists(ctx, query) ([]MBArtistResult, error)
// FetchMBRecordings(ctx, query) ([]MBRecordingResult, error)
