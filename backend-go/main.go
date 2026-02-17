package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/areeeeeeeb/reLive/backend-go/config"
	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/handlers"
	"github.com/areeeeeeeb/reLive/backend-go/middleware"
	"github.com/areeeeeeeb/reLive/backend-go/services"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Create Gin router
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

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

	// CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// store for DB operations
	store := database.NewStore(pool)

	// add service structs here
	userService := services.NewUserService(store)
	videoService := services.NewVideoService(store, s3Client, cfg.Spaces.Bucket, cfg.Spaces.CdnURL)
	// mediaService, err := services.NewMediaService()
	// if err != nil {
	// 	log.Fatalf("Failed to create media service %v", err)
	// }
	
	// add handler structs here
	userHandler := handlers.NewUserHandler(userService)
	videoHandler := handlers.NewVideoHandler(videoService)

	// Job queue for concurrent background processing 
	jobQueue := services.NewJobQueueService(store, cfg.Concurrency)
	jobQueue.Start(ctx)


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

		// dev-only routes (no auth). disabled in production
		if cfg.Environment != "production" {
			dev := v2.Group("/dev")
			{
				dev.POST("/users/sync", userHandler.TestSync)
				dev.POST("/videos/upload/init", videoHandler.UploadInit)
				dev.POST("/videos/:id/upload/confirm", videoHandler.UploadConfirm)		
			}
		}

		// auth required routes
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
				videos.GET("", videoHandler.List)
				videos.GET("/:id", videoHandler.Get)
				videos.POST("/upload/init", videoHandler.UploadInit)
				videos.POST("/:id/upload/confirm", videoHandler.UploadConfirm)
				videos.DELETE("/:id", videoHandler.Delete)
			}
		}
	}

	// Start server on port 8081 (TypeScript backend is on 8080)
	r.Run(":8081")
}
