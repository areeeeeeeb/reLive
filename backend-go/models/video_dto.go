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

