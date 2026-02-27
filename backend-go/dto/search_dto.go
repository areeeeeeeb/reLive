package dto

const (
	SearchSourceLocal    = "local"
	SearchSourceExternal = "external"
	SearchSourceMixed    = "mixed"
)

const (
	SearchMaxResultsDefault = 10
	SearchMaxResultsMax     = 50
)

const (
	SearchDefaultSource = SearchSourceLocal
)

// SearchRequest for searching any entity via flyout/search bar.
type SearchRequest struct {
	Q          string `form:"q" binding:"required"`
	MaxResults int    `form:"max_results"`
	Source     string `form:"source" binding:"omitempty,oneof=local external mixed"`
}
