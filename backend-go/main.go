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

	s3Client, err := cfg.NewS3Client(ctx)
	if err != nil {
		log.Fatalf("Failed to connect to s3 %v", err)
	}

	r := gin.Default()

	// add handler structs here
	userHandler := handlers.NewUserHandler(pool)
	videoUploadHandler := handlers.NewVideoUploadHandler(pool, s3Client, cfg.Spaces.Bucket, cfg.Spaces.CdnURL)

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
			users := v2_auth.Group("/users")
			{
				users.POST("/sync", userHandler.Sync)
				users.POST("/me", userHandler.Me)
			}

			videos := v2_auth.Group("/videos")
			{
				videos.POST("/:id/upload/init", videoUploadHandler.GetPresignedURL)
				videos.POST("/:id/upload/confirm", videoUploadHandler.ConfirmUpload)
			}
		}
	}

	// Start server on port 8081 (TypeScript backend is on 8080)
	r.Run(":8081")
}
