package handlers

import (
	"net/http"

	"github.com/areeeeeeeb/reLive/backend-go/dto"
	"github.com/areeeeeeeb/reLive/backend-go/services"
	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	userService *services.UserService
}

func NewUserHandler(userService *services.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

func (h *UserHandler) Sync(c *gin.Context) {
	var req dto.SyncUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if c.GetString("auth0_id") == "" {
		c.JSON(400, gin.H{"error": "auth0_id is required"})
		return
	}

	user, err := h.userService.Sync(c.Request.Context(), c.GetString("auth0_id"), req.Email, req.Username, req.DisplayName)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"user": user})
}

// TestSync bypasses auth for local testing
func (h *UserHandler) TestSync(c *gin.Context) {
	var req dto.TestSyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userService.Sync(c.Request.Context(), req.Auth0ID, req.Email, req.Username, req.DisplayName)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"user": user})
}

func (h *UserHandler) Me(c *gin.Context) {
	// context should already have user_id
	// middleware will put it in
	// we just need to send it back to the client

	// _ = h.pool // TODO: use for DB queries
	c.JSON(200, gin.H{"ok": true})
}

// Search returns users matching a query string.
//
//	GET /users/search?q=dkang&max_results=10
func (h *UserHandler) Search(c *gin.Context) {
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

	response, err := h.userService.Search(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user search failed"})
		return
	}

	c.JSON(http.StatusOK, response)
}
