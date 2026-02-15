package models

import "time"

// Act represents one artist's performance within a concert.
//
// Videos link to acts to identify the performer. The act_type field
// distinguishes the role (main, opener, etc.)
//
// CONCERN: what if video attached to concert but not act?
// QUERY LEVEL FALLBACK:
// -- All videos for artist X
// SELECT DISTINCT v.* FROM videos v
// LEFT JOIN acts a ON v.act_id = a.id
// WHERE
//     -- Path 1: explicitly tagged
//     a.artist_id = $1
//     -- Path 2: untagged, but concert has exactly one act by this artist
//     OR (v.act_id IS NULL AND v.event_type = 'concert' AND (
//         SELECT COUNT(*) FROM acts WHERE concert_id = v.event_id
//     ) = 1 AND EXISTS (
//         SELECT 1 FROM acts WHERE concert_id = v.event_id AND artist_id = $1
//     ))
// ;
type Act struct {
	ID        int        `db:"id" json:"id"`
	ConcertID int        `db:"concert_id" json:"concert_id"`
	ArtistID  int        `db:"artist_id" json:"artist_id"`
	ActType   *string    `db:"act_type" json:"act_type,omitempty"`

	StartTime *time.Time `db:"start_time" json:"start_time"`

	CreatedAt time.Time  `db:"created_at" json:"created_at"`
	DeletedAt *time.Time `db:"deleted_at" json:"-"`
}

// Act type constants
const (
	ActTypeMain   = "main"
	ActTypeOpener = "opener"
)
