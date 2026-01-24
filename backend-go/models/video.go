package models

import "time"

// Video represents an uploaded event video
type Video struct {
    ID           int        `db:"id" json:"id"`
    UserID       int        `db:"user_id" json:"user_id"`
    EventID      *int       `db:"event_id" json:"event_id"`           // Nullable
    Filename     string     `db:"filename" json:"filename"`
    VideoURL     string     `db:"video_url" json:"video_url"`
    ThumbnailURL *string    `db:"thumbnail_url" json:"thumbnail_url"`     // Nullable
    Duration     *float64   `db:"duration" json:"duration"`               // Nullable (in seconds)
    Status       string     `db:"status" json:"status"`
    Confidence   *float64   `db:"confidence_score" json:"confidence_score"` // Nullable
    CreatedAt    time.Time  `db:"created_at" json:"created_at"`
    ProcessedAt  *time.Time `db:"processed_at" json:"processed_at"`       // Nullable
}

// Video status constants
const (
    VideoStatusPendingUpload = "pending_upload"
    VideoStatusQueued        = "queued"
    VideoStatusProcessing    = "processing"
    VideoStatusCompleted     = "completed"
    VideoStatusFailed        = "failed"
    VideoStatusNoMatch       = "no_event_found"
)

// UploadURLRequest for requesting a presigned upload URL
type UploadURLRequest struct {
    Filename string `json:"filename" binding:"required"`
    FileSize int64  `json:"file_size" binding:"required,min=1"`
}

// UploadURLResponse returned with presigned URL
type UploadURLResponse struct {
    UploadURL string `json:"upload_url"`
    VideoURL  string `json:"video_url"`
    VideoID   int    `json:"video_id"`
}

// VideoWithDetails includes related user and event data
type VideoWithDetails struct {
    Video
    User    *User           `json:"user,omitempty"`
    Event   *EventDetails   `json:"event,omitempty"`
}

// VideoMetadata extracted from video file
type VideoMetadata struct {
    GPS       GPSCoordinates
    Timestamp time.Time
    Duration  float64
    Width     int
    Height    int
    Codec     string
}

// GPSCoordinates from video metadata
type GPSCoordinates struct {
    Latitude  float64
    Longitude float64
}
