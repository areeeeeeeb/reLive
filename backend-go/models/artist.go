package models

import "time"

// Artist represents a musical artist or band.
//
// Single table for both canonical (MusicBrainz/Spotify/RYM-backed) and
// user-contributed artists. The difference is whether external IDs are
// populated and the is_verified flag. When a user-contributed artist later
// gets canonical backing, just populate the external ID on this row.
type Artist struct {
	ID              int        `db:"id" json:"id"`
	Name            string     `db:"name" json:"name"`
	MusicBrainzID   *string    `db:"musicbrainz_id" json:"musicbrainz_id,omitempty"`  // maps to GROUP or PERSON
	SpotifyID       *string    `db:"spotify_id" json:"spotify_id,omitempty"`
	RYMID           *string    `db:"rym_id" json:"rym_id,omitempty"`
	ImageURL        *string    `db:"image_url" json:"image_url,omitempty"`
	IsVerified      bool       `db:"is_verified" json:"is_verified"`
	CreatedByUserID *int       `db:"created_by_user_id" json:"created_by_user_id,omitempty"`
	CreatedAt       time.Time  `db:"created_at" json:"created_at"`
	DeletedAt       *time.Time `db:"deleted_at" json:"-"`
}

