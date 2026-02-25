package handlers

import (
	"errors"
	"strconv"

	"github.com/areeeeeeeb/reLive/backend-go/apperr"
	"github.com/areeeeeeeb/reLive/backend-go/services"
	"github.com/gin-gonic/gin"
)

type ConcertHandler struct {
	concertService         *services.ConcertService
	actService             *services.ActService
	songPerformanceService *services.SongPerformanceService
	videoService           *services.VideoService
}

func NewConcertHandler(
	concertService *services.ConcertService,
	actService *services.ActService,
	songPerformanceService *services.SongPerformanceService,
	videoService *services.VideoService,
) *ConcertHandler {
	return &ConcertHandler{
		concertService:         concertService,
		actService:             actService,
		songPerformanceService: songPerformanceService,
		videoService:           videoService,
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
		if errors.Is(err, apperr.ErrConcertNotFound) {
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
		if errors.Is(err, apperr.ErrConcertNotFound) {
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
		if errors.Is(err, apperr.ErrConcertNotFound) {
			c.JSON(404, gin.H{"error": "concert not found"})
			return
		}
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"song_performances": result})
}

func (h *ConcertHandler) ListVideos(c *gin.Context) {
	concertID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid concert id"})
		return
	}

	result, err := h.videoService.ListByConcert(c.Request.Context(), concertID)
	if err != nil {
		if errors.Is(err, apperr.ErrConcertNotFound) {
			c.JSON(404, gin.H{"error": "concert not found"})
			return
		}
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"videos": result})
}
