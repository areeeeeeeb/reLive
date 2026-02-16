package models

import "time"

// Video represents an uploaded event video
type Video struct {
	ID           int        `db:"id" json:"id"`
	UserID       int        `db:"user_id" json:"user_id"`

	Filename     string     `db:"filename" json:"filename"`
	S3Key        string     `db:"s3_key" json:"-"`
	VideoURL     string     `db:"video_url" json:"video_url"`
	ThumbnailURL *string    `db:"thumbnail_url" json:"thumbnail_url"` // Nullable

	Status       string     `db:"status" json:"status"`
	Visibility   string     `db:"visibility" json:"visibility"`

	EventType           *string `db:"event_type" json:"event_type"`
	EventID             *int    `db:"event_id" json:"event_id"`
	ActID               *int    `db:"act_id" json:"act_id,omitempty"`
	SongPerformanceID   *int    `db:"song_performance_id" json:"song_performance_id,omitempty"`

	// metadata (extracted or client-provided)
	Duration     *float64   `db:"duration" json:"duration"`  // Nullable (in seconds)
    Latitude     *float64   `db:"latitude" json:"latitude,omitempty"`
    Longitude    *float64   `db:"longitude" json:"longitude,omitempty"`
    RecordedAt   *time.Time `db:"recorded_at" json:"recorded_at,omitempty"`
    Width        *int       `db:"width" json:"width"`
    Height       *int       `db:"height" json:"height"`

	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time  `db:"updated_at" json:"updated_at"`
	ProcessedAt  *time.Time `db:"processed_at" json:"processed_at"` // Nullable
	DeletedAt    *time.Time `db:"deleted_at" json:"-"` // Nullable
}

// Video status constants
const (
	VideoStatusPendingUpload = "pending_upload"
	VideoStatusQueued        = "queued"
	VideoStatusProcessing    = "processing"
	VideoStatusCompleted     = "completed"
	VideoStatusFailed        = "failed"
)

const (
	VideoVisibilityPrivate = "private"
	VideoVisibilityPublic  = "public"
)

const (
	EventTypeConcert = "concert"
)

// VideoMetadata extracted from video file
type VideoMetadata struct {
	GPS       GPSCoordinates
	Timestamp time.Time
	Duration  float64
	Width     int
	Height    int
	// Codec     string // cpmpression tech, we'll learn about this as we go
}

// GPSCoordinates from video metadata
type GPSCoordinates struct {
	Latitude  float64
	Longitude float64
}
