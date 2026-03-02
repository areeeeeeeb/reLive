package models

import "time"

// Song represents a musical track/composition.
//
// ArtistID refers to the original/credited artist (songwriter or recording
// artist), NOT the performer at a specific concert. Performance context is
// modeled through SongPerformance that the video is linked to.
//
//	video -> song_performance -> song -> artist = who wrote/recorded it
//	video -> song_performance -> act  -> artist = who performed it
//
// therefore when song.artist_id != act.artist_id, it's a cover
type Song struct {
	ID                     int        `db:"id" json:"id"`
	Title                  string     `db:"title" json:"title"`
	ArtistID               *int       `db:"artist_id" json:"artist_id,omitempty"`
	ArtistNameRaw          *string    `db:"artist_name_raw" json:"artist_name_raw,omitempty"`
	DurationSeconds        *int       `db:"duration_seconds" json:"duration_seconds,omitempty"`

	MusicBrainzRecordingID *string    `db:"musicbrainz_recording_id" json:"musicbrainz_recording_id,omitempty"`
	ISRC                   *string    `db:"isrc" json:"isrc,omitempty"`

	IsVerified             bool       `db:"is_verified" json:"is_verified"`
	CreatedByUserID        *int       `db:"created_by_user_id" json:"created_by_user_id,omitempty"`

	CreatedAt              time.Time  `db:"created_at" json:"created_at"`
	DeletedAt              *time.Time `db:"deleted_at" json:"-"`
}
