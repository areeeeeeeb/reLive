package handlers

import (
	"github.com/areeeeeeeb/reLive/backend-go/services"
	"github.com/gin-gonic/gin"
	"github.com/areeeeeeeb/reLive/backend-go/models"
)

type VideoHandler struct {
	videoService *services.VideoService
}

func NewVideoHandler(videoService *services.VideoService) *VideoHandler {
	return &VideoHandler{videoService: videoService}
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
	var req models.UploadURLRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
	}
	// 2. Route to upload service to:
		// validate file type/size
		// create DB entry for video with status
		// generate presigned URL

		userID := int(1) // TEMP: get from auth middleware later
	
	resp, err := h.videoService.InitUpload(c, userID, req)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	// 3. Return presigned URL and video ID
	c.JSON(200, resp)
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
