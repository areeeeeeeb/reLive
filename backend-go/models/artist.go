package models

import "time"

// Artist represents a music artist or band
type Artist struct {
    ID        int       `db:"id" json:"id"`
    Name      string    `db:"name" json:"name"`
    SpotifyID *string   `db:"spotify_id" json:"spotify_id"` // Nullable
    ImageURL  *string   `db:"image_url" json:"image_url"`   // Nullable
    CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// ArtistWithEvents includes the artist's events
type ArtistWithEvents struct {
    Artist
    Events []Event `json:"events"`
}
