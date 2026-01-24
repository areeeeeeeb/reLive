package main

import (
	"github.com/gin-gonic/gin"
)

func main() {
	// Create Gin router
	r := gin.Default()

	// Basic health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
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
	}

	// Start server on port 8081 (TypeScript backend is on 8080)
	r.Run(":8081")
}