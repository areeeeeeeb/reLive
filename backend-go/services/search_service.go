package services

import (
	"fmt"

	"github.com/areeeeeeeb/reLive/backend-go/dto"
)

// SearchService is a shared toolkit for local search operations.
// Domain services (ArtistService, SongService) own their own search orchestration.
type SearchService struct{}

func NewSearchService() *SearchService {
	return &SearchService{}
}

// ValidateMaxResults checks that maxResults is within allowed bounds.
func (s *SearchService) ValidateMaxResults(maxResults int) error {
	if maxResults <= 0 || maxResults > dto.SearchMaxResultsMax {
		return fmt.Errorf("invalid max_results: %d (must be 1-%d)", maxResults, dto.SearchMaxResultsMax)
	}
	return nil
}

// BuildSearchMeta returns shared response metadata defaults for search responses.
func (s *SearchService) BuildSearchMeta(req dto.SearchRequest, resultsReturned int) dto.SearchResponseMeta {
	requestedMaxResults := req.MaxResults
	if requestedMaxResults <= 0 {
		requestedMaxResults = dto.SearchMaxResultsDefault
	}
	if requestedMaxResults > dto.SearchMaxResultsMax {
		requestedMaxResults = dto.SearchMaxResultsMax
	}

	return dto.SearchResponseMeta{
		Query:               req.Q,
		RequestedMaxResults: requestedMaxResults,
		ResultsReturned:     resultsReturned,
		HasMore:             false,
	}
}
