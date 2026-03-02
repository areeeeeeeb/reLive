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

type ArtistHandler struct {
	artistService *services.ArtistService
}

func NewArtistHandler(artistService *services.ArtistService) *ArtistHandler {
	return &ArtistHandler{artistService: artistService}
}

// GET /artists/:id
func (h *ArtistHandler) Get(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid artist id"})
		return
	}

	artist, err := h.artistService.Get(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, apperr.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "artist not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get artist"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"artist": artist})
}

// Search returns artists matching a query string.
//
//	GET /artists/search?q=radiohead&max_results=10
func (h *ArtistHandler) Search(c *gin.Context) {
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

	response, err := h.artistService.Search(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "artist search failed"})
		return
	}

	c.JSON(http.StatusOK, response)
}
