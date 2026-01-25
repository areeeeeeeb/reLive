package handlers

import (
	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserHandler struct {
	pool *pgxpool.Pool
}

func NewUserHandler(pool *pgxpool.Pool) *UserHandler {
	return &UserHandler{pool: pool}
}



func (h *UserHandler) Sync(c *gin.Context) {
	type SyncUserRequest struct {
		Email       string `json:"email" binding:"required,email"`
		Username    string `json:"username" binding:"required"`
		DisplayName string `json:"displayName" binding:"required"`
	}
	var req SyncUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	
	// context should already have user_id
	// middleware will put it in
	// create user if not created
	// send user info back to client
	uq := database.NewUserQueries(h.pool)
	user_to_upsert := &models.User{  // partial User
		Auth0ID: c.GetString("auth0_id"),
		Email: req.Email,
		Username: req.Username,
		DisplayName: req.DisplayName,
		ProfilePictureURL: nil,
		Bio: nil,
	}

	uq.Upsert(c, user_to_upsert)
	
	c.JSON(200, gin.H{"ok": true})
}

func (h *UserHandler) Me(c *gin.Context) {
	// context should already have user_id
	// middleware will put it in
	// we just need to send it back to the client

	_ = h.pool // TODO: use for DB queries
	c.JSON(200, gin.H{"ok": true})
}
