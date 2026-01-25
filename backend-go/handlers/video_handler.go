package handlers

import (

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type VideoHandler struct {
	pool     *pgxpool.Pool
	s3Client *s3.Client
	bucket   string
	cdnURL   string
}

func NewVideoHandler(pool *pgxpool.Pool, s3Client *s3.Client, bucket string, cdnURL string) *VideoHandler {
	return &VideoHandler{
		pool:     pool,
		s3Client: s3Client,
		bucket:   bucket,
		cdnURL:   cdnURL,
	}
}

// GET /videos
func (h *VideoHandler) List(c *gin.Context) {
	c.JSON(501, gin.H{"error": "not implemented"})
}

// GET /videos/:id
func (h *VideoHandler) Get(c *gin.Context) {
	c.JSON(501, gin.H{"error": "not implemented"})
}

// POST /videos/upload/init
func (h *VideoHandler) UploadInit(c *gin.Context) {
	// 1. Get post request body
	
	// 2. Route to upload service to:
		// validate file type/size
		// create DB entry for video with status
		// generate presigned URL
	
	// 3. Return presigned URL and video ID
	c.JSON(501, gin.H{"error": "not implemented"})
}

// POST /videos/:id/upload/confirm
func (h *VideoHandler) UploadConfirm(c *gin.Context) {
	// 1. Get video ID from client 

	// 2. Route to upload service to:
		// validate video exists and belongs to user
		// update video status in DB
		// triggers any post-upload processing (transcoding, thumbnail generation, etc)

	// 3. (LATER) We can configure using background jobs or event-driven architecture later 
		// (with Redis, RabbitMQ, etc)
	c.JSON(501, gin.H{"error": "not implemented"})
}

// DELETE /videos/:id
func (h *VideoHandler) Delete(c *gin.Context) {
	c.JSON(501, gin.H{"error": "not implemented"})
}
