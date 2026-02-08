package handlers

import (
	"strconv"

	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/areeeeeeeb/reLive/backend-go/services"
	"github.com/gin-gonic/gin"
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
	var req models.UploadInitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	userID := int(1) // TEMP: get from auth middleware later

	result, err := h.videoService.InitUpload(
		c.Request.Context(),
		userID,
		req.Filename,
		req.ContentType,
		req.SizeBytes,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, models.UploadInitResponse{
		VideoID:  result.VideoID,
		UploadID: result.UploadID,
		PartURLs: result.PartURLs,
		PartSize: result.PartSize,
	})
}

// POST /videos/:id/upload/confirm
func (h *VideoHandler) UploadConfirm(c *gin.Context) {
	var req models.UploadConfirmRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	// LATER: WRITE A FUNCTION IN VIDEOHANDLER TO VALIDATE VIDEOID, UPLOADID, PARTS

	userID := 1
	// Get video ID from URL parameter
	
	videoID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid video ID"})
		return
	}

	// Confirm upload
	if err := h.videoService.ConfirmUpload(c.Request.Context(), videoID, userID, req.UploadID, req.Parts); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, models.UploadConfirmResponse{
		VideoID: videoID,
		Status:  models.VideoStatusQueued,
	})
}

// DELETE /videos/:id
func (h *VideoHandler) Delete(c *gin.Context) {
	c.JSON(501, gin.H{"error": "not implemented"})
}
