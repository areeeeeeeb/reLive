package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/areeeeeeeb/reLive/backend-go/apperr"
	"github.com/areeeeeeeb/reLive/backend-go/dto"
	"github.com/areeeeeeeb/reLive/backend-go/services"
	"github.com/gin-gonic/gin"
)

type SongHandler struct {
	songService *services.SongService
}

func NewSongHandler(songService *services.SongService) *SongHandler {
	return &SongHandler{songService: songService}
}

// Get returns a single song by ID.
//
//	GET /songs/:id
func (h *SongHandler) Get(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid song id"})
		return
	}

	song, err := h.songService.Get(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, apperr.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "song not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get song"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"song": song})
}

// Search returns songs matching a query string.
//
//	GET /songs/search?q=creep&max_results=10&source=mixed
//
// default (main) behavior is to search both local and external sources
// this can be overridden by setting the source query parameter
func (h *SongHandler) Search(c *gin.Context) {
	var req dto.SearchRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.MaxResults <= 0 {
		req.MaxResults = dto.SearchMaxResultsDefault
	}
	if req.MaxResults > dto.SearchMaxResultsMax {
		req.MaxResults = dto.SearchMaxResultsMax
	}
	if req.Source == "" {
		req.Source = dto.SearchDefaultSource
	}

	songs, err := h.songService.Search(c.Request.Context(), req.Q, req.MaxResults, req.Source)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "song search failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"songs": songs})
}
