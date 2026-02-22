package config

import (
	"strings"

	"github.com/areeeeeeeb/reLive/backend-go/apperr"
)

func (c *Config) Validate() error {
	if c.DevBypassAuth {
		if c.Environment != "development" {
			return apperr.ErrDevBypassAuthNotAllowed
		}
		if strings.TrimSpace(c.DevAuth0ID) == "" {
			return apperr.ErrDevBypassAuthAuth0IDNotSet
		}
	}

	if c.Store.SearchTrgmSimilarityThreshold < 0 || c.Store.SearchTrgmSimilarityThreshold > 1 {
		return apperr.ErrInvalidSearchTrgmSimilarityThreshold
	}

	return nil
}
