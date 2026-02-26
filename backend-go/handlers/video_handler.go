package handlers

import (
	"log"
	"strconv"

	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/areeeeeeeb/reLive/backend-go/services"
	"github.com/gin-gonic/gin"
)

type VideoHandler struct {
	videoService     *services.VideoService
	detectionService *services.DetectionService
}

func NewVideoHandler(videoService *services.VideoService, detectionService *services.DetectionService) *VideoHandler {
	return &VideoHandler{videoService: videoService, detectionService: detectionService}
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

	userID := c.GetInt("user_id")
	if userID == 0 {
		c.JSON(401, gin.H{"error": "user not found"})
		return
	}

	result, err := h.videoService.InitUpload(
		c.Request.Context(),
		userID,
		&req,
	)
	if err != nil {
		log.Printf("[upload-init] error: %v", err)
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

	userID := c.GetInt("user_id")
	if userID == 0 {
		c.JSON(401, gin.H{"error": "user not found"})
		return
	}

	videoID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid video ID"})
		return
	}

	if err := h.videoService.ConfirmUpload(c.Request.Context(), videoID, userID, req.UploadID, req.Parts); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, models.UploadConfirmResponse{
		VideoID: videoID,
		Status:  models.VideoStatusCompleted,
	})
}

// POST /videos/:id/concert/detect
// Detects which concert a video belongs to using client-provided metadata.
func (h *VideoHandler) DetectConcert(c *gin.Context) {
	videoID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid video ID"})
		return
	}

	userID := c.GetInt("user_id")
	if userID == 0 {
		c.JSON(401, gin.H{"error": "user not found"})
		return
	}

	video, err := h.videoService.GetByID(c.Request.Context(), videoID)
	if err != nil {
		c.JSON(404, gin.H{"error": "video not found"})
		return
	}
	if video.UserID != userID {
		c.JSON(403, gin.H{"error": "forbidden"})
		return
	}

	var req models.ConcertDetectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	result, err := h.detectionService.DetectConcert(c.Request.Context(), videoID, req)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, result)
}

// DELETE /videos/:id
func (h *VideoHandler) Delete(c *gin.Context) {
	c.JSON(501, gin.H{"error": "not implemented"})
}
