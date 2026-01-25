package main

import (
	"context"
	"log"

	"github.com/areeeeeeeb/reLive/backend-go/config"
	"github.com/areeeeeeeb/reLive/backend-go/handlers"
	"github.com/areeeeeeeb/reLive/backend-go/middleware"
	"github.com/gin-gonic/gin"
)

func main() {
	// Create Gin router
	ctx := context.Background()

	cfg := config.Load()

	pool, err := cfg.NewDBPool(ctx)
	if err != nil {
		log.Fatalf("Failed to connect to database %v", err)
	}
	defer pool.Close()

	r := gin.Default()

	// add handler structs here
	userHandler := handlers.NewUserHandler(pool)

	// Basic health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	// Database health check
	r.GET("/health/db", func(c *gin.Context) {
		err := pool.Ping(c.Request.Context())
		if err != nil {
			c.JSON(500, gin.H{"status": "error", "error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "ok", "database": "connected"})
	})

	// API v2 route group
	v2 := r.Group("/v2/api")
	{
		v2.GET("/", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "ReLive API v2",
				"version": "2.0.0",
			})
		})

		v2_auth := v2.Group("")
		v2_auth.Use(middleware.AuthRequired(cfg.Auth0))
		{
			v2_auth.POST("/users/sync", userHandler.Sync)
			v2_auth.POST("/users/me", userHandler.Me)
		}
	}

	// Start server on port 8081 (TypeScript backend is on 8080)
	r.Run(":8081")
}
