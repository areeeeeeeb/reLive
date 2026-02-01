package handlers

import (
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
	type SyncUserRequest struct {
		Email       string `json:"email" binding:"required,email"`
		Username    string `json:"username" binding:"required"`
		DisplayName string `json:"displayName"`  //optional
	}
	var req SyncUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userService.Sync(c, c.GetString("auth0_id"), req.Email, req.Username, req.DisplayName)
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
