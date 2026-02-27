package handlers

import (
	"errors"
	"strconv"

	"github.com/areeeeeeeb/reLive/backend-go/apperr"
	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/areeeeeeeb/reLive/backend-go/services"
	"github.com/gin-gonic/gin"
)

type ConcertHandler struct {
	concertService         *services.ConcertService
	actService             *services.ActService
	songPerformanceService *services.SongPerformanceService
	videoService           *services.VideoService
	detectionService       *services.DetectionService
}

func NewConcertHandler(
	concertService *services.ConcertService,
	actService *services.ActService,
	songPerformanceService *services.SongPerformanceService,
	videoService *services.VideoService,
	detectionService *services.DetectionService,
) *ConcertHandler {
	return &ConcertHandler{
		concertService:         concertService,
		actService:             actService,
		songPerformanceService: songPerformanceService,
		videoService:           videoService,
		detectionService:       detectionService,
	}
}

func (h *ConcertHandler) Get(c *gin.Context) {
	concertID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid concert id"})
		return
	}

	result, err := h.concertService.Get(c.Request.Context(), concertID)
	if err != nil {
		if errors.Is(err, apperr.ErrNotFound) {
			c.JSON(404, gin.H{"error": "concert not found"})
			return
		}
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"concert": result})
}

func (h *ConcertHandler) ListActs(c *gin.Context) {
	concertID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid concert id"})
		return
	}

	result, err := h.actService.ListByConcert(c.Request.Context(), concertID)
	if err != nil {
		if errors.Is(err, apperr.ErrNotFound) {
			c.JSON(404, gin.H{"error": "concert not found"})
			return
		}
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"acts": result})
}

func (h *ConcertHandler) ListSongPerformances(c *gin.Context) {
	concertID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid concert id"})
		return
	}

	result, err := h.songPerformanceService.ListByConcert(c.Request.Context(), concertID)
	if err != nil {
		if errors.Is(err, apperr.ErrNotFound) {
			c.JSON(404, gin.H{"error": "concert not found"})
			return
		}
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"song_performances": result})
}

// POST /v2/api/concerts/detect
// Stateless: returns top concert candidates for the given GPS coordinates and timestamp.
func (h *ConcertHandler) Detect(c *gin.Context) {
	var req models.ConcertDetectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	result, err := h.detectionService.DetectConcert(c.Request.Context(), req)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, result)
}

func (h *ConcertHandler) ListVideos(c *gin.Context) {
	concertID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid concert id"})
		return
	}

	result, err := h.videoService.ListByConcert(c.Request.Context(), concertID)
	if err != nil {
		if errors.Is(err, apperr.ErrNotFound) {
			c.JSON(404, gin.H{"error": "concert not found"})
			return
		}
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"videos": result})
}
