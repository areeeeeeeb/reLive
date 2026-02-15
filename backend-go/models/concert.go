package models

import "time"

// Concert represents a show/event that a user attends.
//
// ArtistID is a convenience denormalization for the common case (solo/headliner).
// For multi-artist events (festivals, album concerts),
// ArtistID is NULL and the acts table is the source of truth for who performed.
//
// The acts table always holds the full picture. ArtistID is a shortcut to
// avoid a JOIN when listing concerts with their main artist. Setlist.fm models
// it similarly: one setlist = one artist, with festivals having separate entries.
//
// Solo show:     ArtistID set + 1 act
// Multi-artist:  ArtistID NULL + N acts (each with act_type: main, opener, etc.)
type Concert struct {
	ID          int        `db:"id" json:"id"`
	Name        *string    `db:"name" json:"name,omitempty"`
	Date        time.Time  `db:"date" json:"date"`

	VenueID     *int       `db:"venue_id" json:"venue_id,omitempty"`
	ArtistID    *int       `db:"artist_id" json:"artist_id,omitempty"` // main/primary artist, nullable for multi-artist
	SetlistFmID *string    `db:"setlistfm_id" json:"setlistfm_id,omitempty"`

	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	DeletedAt   *time.Time `db:"deleted_at" json:"-"`
}

