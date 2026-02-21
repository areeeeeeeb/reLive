package main

import (
	"context"
	"log"
	"strings"

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
	ctx := context.Background()
	// Load configuration from environment variables
	cfg := config.Load()

	var authMiddleware gin.HandlerFunc
	if cfg.DevBypassAuth {
		if cfg.Environment != "development" {
			log.Fatal("DEV_BYPASS_AUTH cannot be enabled in non-development environments")
		}
		if strings.TrimSpace(cfg.DevAuth0ID) == "" {
			log.Fatal("DEV_AUTH0_ID is required when DEV_BYPASS_AUTH is enabled")
		}
		authMiddleware = middleware.DevAuthBypass(cfg.DevAuth0ID)
	} else {
		authMiddleware = middleware.AuthRequired(cfg.Auth0)
	}

	pool, err := cfg.NewDBPool(ctx)
	if err != nil {
		log.Fatalf("Failed to connect to database %v", err)
	}
	defer pool.Close()
	// Connect to S3
	s3Client, err := cfg.NewS3Client(ctx)
	if err != nil {
		log.Fatalf("Failed to connect to s3 %v", err)
	}
	// Create Gin router
	r := gin.Default()

	// CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			// allow web dev server
			if origin == "http://localhost:5173" {
				return true
			}
			// allow capacitor mobile apps
			if origin == "capacitor://localhost" || origin == "http://localhost" {
				return true
			}
			return false
		},
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

	// start job queue for background processing
	processingService := services.NewProcessingService(store)
	jobQueue := services.NewJobQueueService(store, processingService, cfg.Concurrency.Concurrency, cfg.Concurrency.QueueSize, cfg.Concurrency.Interval, cfg.Concurrency.StuckThreshold)
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

		// users routes
		users := v2.Group("/users")
		{
			usersAuth := users.Group("")
			usersAuth.Use(authMiddleware)
			{
				usersAuth.POST("/sync", userHandler.Sync)
			}

			usersResolved := users.Group("")
			usersResolved.Use(authMiddleware, middleware.ResolveUser(store))
			{
				usersResolved.POST("/me", userHandler.Me)
			}
		}

		// videos routes
		videos := v2.Group("/videos")
		{
			videos.GET("", videoHandler.List)
			videos.GET("/:id", videoHandler.Get)

			videosResolved := videos.Group("")
			videosResolved.Use(authMiddleware, middleware.ResolveUser(store))
			{
				videosResolved.POST("/upload/init", videoHandler.UploadInit)
				videosResolved.POST("/:id/upload/confirm", videoHandler.UploadConfirm)
				videosResolved.DELETE("/:id", videoHandler.Delete)
			}
		}
	}

	// Start server on port 8081 (TypeScript backend is on 8080)
	r.Run(":8081")
}
