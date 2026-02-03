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
	Duration     *float64   `db:"duration" json:"duration"`           // Nullable (in seconds)
	Status       string     `db:"status" json:"status"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
	ProcessedAt  *time.Time `db:"processed_at" json:"processed_at"` // Nullable
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
	Filename    string `json:"filename" binding:"required"`
	ContentType string `json:"contentType" binding:"required"`
	SizeBytes   int64  `json:"sizeBytes" binding:"required,min=1"`
}

// UploadURLResponse returned with presigned URLs for multipart upload
type UploadURLResponse struct {
	VideoID  int      `json:"videoId"`
	UploadID string   `json:"uploadId"`
	PartURLs []string `json:"partUrls"`
	PartSize int64    `json:"partSize"`
}


// VideoMetadata extracted from video file
type VideoMetadata struct {
	GPS       GPSCoordinates
	Timestamp time.Time
	Duration  float64
	Width     int
	Height    int
	Codec     string // cpmpression tech, we'll learn about this as we go
}

// GPSCoordinates from video metadata
type GPSCoordinates struct {
	Latitude  float64
	Longitude float64
}
