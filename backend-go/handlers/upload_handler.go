package handlers

import (
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UploadHandler struct {
	pool     *pgxpool.Pool
	s3Client *s3.Client
	bucket   string
	cdnURL   string
}

func NewUploadHandler(pool *pgxpool.Pool, s3Client *s3.Client, bucket string, cdnURL string) *UploadHandler {
	return &UploadHandler{
		pool:     pool,
		s3Client: s3Client,
		bucket:   bucket,
		cdnURL:   cdnURL,
	}
}

// GetPresignedURL generates a presigned URL for direct client upload
func (h *UploadHandler) GetPresignedURL(c *gin.Context) {
	// TODO: implement
	// 1. Parse request (filename, filesize)
	// 2. Validate file type/size
	// 3. Generate unique object key
	// 4. Create video record in DB with status "pending_upload"
	// 5. Generate presigned PUT URL
	// 6. Return presigned URL + video ID to client
	c.JSON(501, gin.H{"error": "not implemented"})
}

// ConfirmUpload marks a video as uploaded after client confirms
func (h *UploadHandler) ConfirmUpload(c *gin.Context) {
	// TODO: implement
	// 1. Get video ID from request
	// 2. Verify the object exists in S3
	// 3. Update video status to "queued"
	// 4. Return success
	c.JSON(501, gin.H{"error": "not implemented"})
}

// DeleteUpload removes a video and its S3 object
func (h *UploadHandler) DeleteUpload(c *gin.Context) {
	// TODO: implement
	// 1. Get video ID from request
	// 2. Verify user owns the video
	// 3. Delete S3 object
	// 4. Delete DB record
	// 5. Return success
	c.JSON(501, gin.H{"error": "not implemented"})
}
