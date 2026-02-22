package models

import "time"

// UploadInitRequest for initiating a multipart upload.
// Metadata fields are optional — if provided, pipeline A (concert/song detection) starts immediately.
type UploadInitRequest struct {
	Filename    string `json:"filename" binding:"required"`
	ContentType string `json:"contentType" binding:"required"`
	SizeBytes   int64  `json:"sizeBytes" binding:"required,min=1"`

	// client-extracted metadata (optional)
	RecordedAt *time.Time `json:"recordedAt"`
	Latitude   *float64   `json:"latitude"`
	Longitude  *float64   `json:"longitude"`
	Duration   *float64   `json:"duration"` // seconds
	Width      *int       `json:"width"`
	Height     *int       `json:"height"`
}

// UploadInitResponse returned with presigned URLs for multipart upload
type UploadInitResponse struct {
	VideoID  int      `json:"videoId"`
	UploadID string   `json:"uploadId"`
	PartURLs []string `json:"partUrls"`
	PartSize int64    `json:"partSize"`
}

// UploadPart represents an uploaded part with its ETag
type UploadPart struct {
	PartNumber int    `json:"partNumber" binding:"required"`
	ETag       string `json:"etag" binding:"required"`
}

// UploadConfirmRequest for completing a multipart upload
type UploadConfirmRequest struct {
	UploadID string       `json:"uploadId" binding:"required"`
	Parts    []UploadPart `json:"parts" binding:"required,min=1"`
}

// UploadConfirmResponse returned after successful upload completion
type UploadConfirmResponse struct {
	VideoID int    `json:"videoId"`
	Status  string `json:"status"`
}

