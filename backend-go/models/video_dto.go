package models

// UploadInitRequest for initiating a multipart upload
type UploadInitRequest struct {
	Filename    string `json:"filename" binding:"required"`
	ContentType string `json:"contentType" binding:"required"`
	SizeBytes   int64  `json:"sizeBytes" binding:"required,min=1"`
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

