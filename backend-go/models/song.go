package models

import "time"

// Song represents a song in a event setlist
type Song struct {
    ID                    int       `db:"id" json:"id"`
    EventID               int       `db:"event_id" json:"event_id"`
    Title                 string    `db:"title" json:"title"`
    OrderInSetlist        int       `db:"order_in_setlist" json:"order_in_setlist"`
    DurationSeconds       *int      `db:"duration_seconds" json:"duration_seconds"`           // Nullable
    CreatedAt             time.Time `db:"created_at" json:"created_at"`
    Source                string    `db:"source" json:"source"`                               // "setlistfm", "manual", etc.
    FingerprintConfidence *float64  `db:"fingerprint_confidence" json:"fingerprint_confidence"` // Nullable
    AudioFingerprint      *string   `db:"audio_fingerprint" json:"audio_fingerprint"`         // Nullable
}

// Setlist represents a full event setlist
type Setlist struct {
    EventID int    `json:"event_id"`
    Songs   []Song `json:"songs"`
}

// Source constants
const (
    SongSourceSetlistFM = "setlistfm"
    SongSourceManual    = "manual"
    SongSourceAudio     = "audio_fingerprint"
)