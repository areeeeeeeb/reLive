package handlers

import (
	"github.com/areeeeeeeb/reLive/backend-go/models"
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
	var req models.SyncUserRequest
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
	var req models.TestSyncRequest
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
