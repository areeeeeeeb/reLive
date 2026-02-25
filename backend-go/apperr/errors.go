package apperr

import "errors"

// fill as we go. they do NOT mean the same thing as HTTP status codes.

var (
	ErrNotFound        = errors.New("not found")
	ErrDuplicate       = errors.New("duplicate")
	ErrConcertNotFound = errors.New("concert not found")

	// config env errors
	ErrDevBypassAuthNotAllowed              = errors.New("DEV_BYPASS_AUTH cannot be enabled in non-development environments")
	ErrDevBypassAuthAuth0IDNotSet           = errors.New("DEV_AUTH0_ID is required when DEV_BYPASS_AUTH is enabled")
	ErrInvalidSearchTrgmSimilarityThreshold = errors.New("search trigram similarity threshold must be between 0 and 1")
)
