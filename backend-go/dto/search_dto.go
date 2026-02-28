package dto

import "time"

const (
	SearchMaxResultsDefault = 10
	SearchMaxResultsMax     = 50
)

// Compact models are lightweight nested objects used in search cards.
// They include enough fields to render basic UI and link to detail pages.
type VenueCompact struct {
	ID          int     `json:"id,omitempty"`
	Name        string  `json:"name,omitempty"`
	City        *string `json:"city,omitempty"`
	Region      *string `json:"region,omitempty"`
	CountryCode string  `json:"country_code,omitempty"`
}

type ArtistCompact struct {
	ID       int     `json:"id,omitempty"`
	Name     string  `json:"name,omitempty"`
	ImageURL *string `json:"image_url,omitempty"`
}

// SearchRequest is shared across search endpoints.
type SearchRequest struct {
	Q          string `form:"q" binding:"required"`
	MaxResults int    `form:"max_results"`
}

type SearchResponseMeta struct {
	Query               string  `json:"query"`
	RequestedMaxResults int     `json:"requested_max_results"`
	ResultsReturned     int     `json:"results_returned"`
	NextCursor          *string `json:"next_cursor,omitempty"`
	HasMore             bool    `json:"has_more"`
}

// -----CONCERT SEARCH
// add IsVariousArtist later
type ConcertSearchItem struct {
	ID              int            `json:"id"`
	Name            string         `json:"name"`
	Date            time.Time      `json:"date"`
	PrimaryArtist   *ArtistCompact `json:"primary_artist,omitempty"`
	Venue           *VenueCompact  `json:"venue,omitempty"`
	ImageURL        *string        `json:"image_url,omitempty"`
}

type ConcertSearchResponse struct {
	Results []ConcertSearchItem `json:"results"`
	Meta    SearchResponseMeta  `json:"meta"`
}

// -----ARTIST SEARCH

type ArtistSearchItem struct {
	ID         int     `json:"id"`
	Name       string  `json:"name"`
	ImageURL   *string `json:"image_url,omitempty"`
	IsVerified bool    `json:"is_verified"`
}

type ArtistSearchResponse struct {
	Results []ArtistSearchItem `json:"results"`
	Meta    SearchResponseMeta `json:"meta"`
}

// -----SONG SEARCH

type SongSearchItem struct {
	ID              int            `json:"id"`
	Title           string         `json:"title"`
	Artist          *ArtistCompact `json:"artist,omitempty"`
	DurationSeconds *int           `json:"duration_seconds,omitempty"`
	IsVerified      bool           `json:"is_verified"`
}

type SongSearchResponse struct {
	Results []SongSearchItem   `json:"results"`
	Meta    SearchResponseMeta `json:"meta"`
}

// -----USER SEARCH

type UserSearchItem struct {
	ID                int     `json:"id"`
	Username          string  `json:"username"`
	DisplayName       string  `json:"display_name"`
	ProfilePictureURL *string `json:"profile_picture_url,omitempty"`
}

type UserSearchResponse struct {
	Results []UserSearchItem   `json:"results"`
	Meta    SearchResponseMeta `json:"meta"`
}
