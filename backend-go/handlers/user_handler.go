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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if c.GetString("auth0_id") == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "auth0_id is required"})
		return
	}

	user, err := h.userService.Sync(c.Request.Context(), c.GetString("auth0_id"), req.Email, req.Username, req.DisplayName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

// TestSync bypasses auth for local testing
func (h *UserHandler) TestSync(c *gin.Context) {
	var req dto.TestSyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userService.Sync(c.Request.Context(), req.Auth0ID, req.Email, req.Username, req.DisplayName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

// Me returns the authenticated user's profile.
func (h *UserHandler) Me(c *gin.Context) {
	userID := c.GetInt("user_id")
	user, err := h.userService.GetByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}

// UpdateProfile updates the authenticated user's display name, profile picture, and bio.
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	var req dto.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetInt("user_id")
	user, err := h.userService.UpdateProfile(c.Request.Context(), userID, req.DisplayName, req.ProfilePicture, req.Bio)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
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
