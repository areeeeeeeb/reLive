package models

import "time"

// SongPerformance represents a specific song performed by a specific act.
//
// This is where setlist data lives. Grouped by act_id, these rows form the
// setlist for that act's set. Data can come from Setlist.fm imports or
// user contributions.
//
// Videos link to SongPerformance instead of directly to songs
//

type SongPerformance struct {
	ID        int        `db:"id" json:"id"`
	ActID     int        `db:"act_id" json:"act_id"`
	SongID    int        `db:"song_id" json:"song_id"`
	Position  *int       `db:"position" json:"position,omitempty"`   // position in the setlist
	StartedAt *time.Time `db:"started_at" json:"started_at,omitempty"`

	CreatedAt time.Time  `db:"created_at" json:"created_at"`
	DeletedAt *time.Time `db:"deleted_at" json:"-"`
}

