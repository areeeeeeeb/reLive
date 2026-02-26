// Package integration_test contains end-to-end HTTP tests for the reLive backend.
// They spin up a real Gin router backed by a real database and make actual HTTP
// calls via net/http/httptest — no mocking of the handler layer.
//
// Prerequisites:
//   - DATABASE_URL set (or present in backend-go/.env)
//   - ENVIRONMENT=development, DEV_BYPASS_AUTH=true, DEV_AUTH0_ID set (handled by testConfig)
//
// S3-dependent tests (TestVideos_FullUploadFlow) skip automatically when
// DO_SPACES_BUCKET / DO_SPACES_KEY / DO_SPACES_SECRET are absent.
//
// Run:
//
//	go test ./tests/integration/... -v
//	go test ./tests/integration/... -v -run TestUsers
package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/areeeeeeeb/reLive/backend-go/config"
	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/handlers"
	"github.com/areeeeeeeb/reLive/backend-go/middleware"
	"github.com/areeeeeeeb/reLive/backend-go/services"
	"github.com/aws/aws-sdk-go-v2/aws"
	awscredentials "github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

// ts is the shared test server. All tests in this package use it.
var (
	ts        *httptest.Server
	devUserID int
)

// devAuth0ID is the fixed auth0_id injected by DevAuthBypass for all test requests.
const devAuth0ID = "test|dev-integration-user"

func TestMain(m *testing.M) {
	// Load .env from backend-go/ (two levels up from tests/integration/)
	_ = godotenv.Load("../../.env")

	if os.Getenv("DATABASE_URL") == "" {
		fmt.Println("SKIP: integration tests require DATABASE_URL to be set")
		os.Exit(0)
	}

	gin.SetMode(gin.TestMode)

	ctx := context.Background()
	cfg := testConfig()

	pool, err := cfg.NewDBPool(ctx)
	if err != nil {
		fmt.Printf("FAIL: could not connect to database: %v\n", err)
		os.Exit(1)
	}

	store := database.NewStore(pool, cfg.Store.SearchTrgmSimilarityThreshold)
	uploadService := newUploadService(cfg)

	// Wire services — mirrors main.go, minus thumbnail service (no ffmpeg in test env).
	userService := services.NewUserService(store)
	concertService := services.NewConcertService(store)
	actService := services.NewActService(store)
	songPerformanceService := services.NewSongPerformanceService(store)
	searchService := services.NewSearchService()
	artistService := services.NewArtistService(store, searchService)
	songService := services.NewSongService(store, searchService)
	detectionService := services.NewDetectionService(store)
	videoService := services.NewVideoService(store, uploadService, nil)

	authMW := middleware.DevAuthBypass(devAuth0ID)

	userHandler := handlers.NewUserHandler(userService)
	concertHandler := handlers.NewConcertHandler(concertService, actService, songPerformanceService, videoService, detectionService)
	videoHandler := handlers.NewVideoHandler(videoService)
	artistHandler := handlers.NewArtistHandler(artistService)
	songHandler := handlers.NewSongHandler(songService)

	router := buildRouter(authMW, store, pool,
		userHandler, videoHandler, artistHandler, songHandler, concertHandler)

	ts = httptest.NewServer(router)

	// Sync the dev user once so ResolveUser middleware can resolve them for all auth'd tests.
	devUserID = mustSyncDevUser()

	code := m.Run()

	ts.Close()
	pool.Close()
	os.Exit(code)
}

// testConfig returns a Config suitable for integration testing.
// DevBypassAuth=true so tests never need real Auth0 tokens.
func testConfig() *config.Config {
	return &config.Config{
		Environment:   "development",
		DevBypassAuth: true,
		DevAuth0ID:    devAuth0ID,
		DatabaseURL:   os.Getenv("DATABASE_URL"),
		Store: config.StoreConfig{
			SearchTrgmSimilarityThreshold: 0.3,
		},
		Spaces: config.SpacesConfig{
			Endpoint:  os.Getenv("DO_SPACES_ENDPOINT"),
			Bucket:    os.Getenv("DO_SPACES_BUCKET"),
			Region:    os.Getenv("DO_SPACES_REGION"),
			AccessKey: os.Getenv("DO_SPACES_KEY"),
			SecretKey: os.Getenv("DO_SPACES_SECRET"),
			CdnURL:    os.Getenv("DO_SPACES_CDN_URL"),
		},
	}
}

// newUploadService creates an UploadService for the test config.
// If Spaces credentials are absent it constructs a non-functional (dummy) S3
// client so VideoService can still be instantiated — S3-dependent tests skip
// themselves via hasS3Creds().
func newUploadService(cfg *config.Config) *services.UploadService {
	client, err := cfg.NewS3Client(context.Background())
	if err != nil {
		// No real creds — use a dummy client pointing at an unreachable endpoint.
		// This keeps the service constructable; actual S3 calls will fail safely.
		client = s3.New(s3.Options{
			BaseEndpoint: aws.String("http://127.0.0.1:19999"),
			Region:       "us-east-1",
			Credentials:  awscredentials.NewStaticCredentialsProvider("dummy", "dummy", ""),
		})
	}
	bucket := cfg.Spaces.Bucket
	if bucket == "" {
		bucket = "test-bucket"
	}
	cdnURL := cfg.Spaces.CdnURL
	if cdnURL == "" {
		cdnURL = "http://cdn.test"
	}
	return services.NewUploadService(client, bucket, cdnURL)
}

// buildRouter replicates the full route + middleware wiring from main.go.
// The job queue is intentionally excluded — it is not needed for HTTP tests.
func buildRouter(
	authMW gin.HandlerFunc,
	store *database.Store,
	pool *pgxpool.Pool,
	userHandler *handlers.UserHandler,
	videoHandler *handlers.VideoHandler,
	artistHandler *handlers.ArtistHandler,
	songHandler *handlers.SongHandler,
	concertHandler *handlers.ConcertHandler,
) *gin.Engine {
	r := gin.New() // no default logger/recovery — keeps test output clean

	r.Use(cors.New(cors.Config{
		AllowOriginFunc:  func(string) bool { return true },
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	r.GET("/health/db", func(c *gin.Context) {
		if err := pool.Ping(c.Request.Context()); err != nil {
			c.JSON(500, gin.H{"status": "error", "error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "ok", "database": "connected"})
	})

	v2 := r.Group("/v2/api")
	{
		v2.GET("/", func(c *gin.Context) {
			c.JSON(200, gin.H{"message": "ReLive API v2", "version": "2.0.0"})
		})

		users := v2.Group("/users")
		{
			users.Group("").Use(authMW).POST("/sync", userHandler.Sync)
			users.Group("").Use(authMW, middleware.ResolveUser(store)).POST("/me", userHandler.Me)
		}

		videos := v2.Group("/videos")
		{
			videos.GET("", videoHandler.List)
			videos.GET("/:id", videoHandler.Get)

			vAuth := videos.Group("").Use(authMW, middleware.ResolveUser(store))
			vAuth.POST("/upload/init", videoHandler.UploadInit)
			vAuth.POST("/:id/upload/confirm", videoHandler.UploadConfirm)
			vAuth.DELETE("/:id", videoHandler.Delete)
		}

		artists := v2.Group("/artists")
		artists.GET("/search", artistHandler.Search)
		artists.GET("/:id", artistHandler.Get)

		songs := v2.Group("/songs")
		songs.GET("/search", songHandler.Search)
		songs.GET("/:id", songHandler.Get)

		concerts := v2.Group("/concerts")
		concerts.GET("/:id", concertHandler.Get)
		concerts.GET("/:id/videos", concertHandler.ListVideos)
		concerts.GET("/:id/acts", concertHandler.ListActs)
		concerts.GET("/:id/song-performances", concertHandler.ListSongPerformances)
	}

	return r
}

// mustSyncDevUser POSTs to /v2/api/users/sync to ensure the dev bypass user
// exists in the database before any test that needs ResolveUser runs.
func mustSyncDevUser() int {
	body, _ := json.Marshal(map[string]string{
		"email":       "devtest@relive-integration.dev",
		"username":    "devtest",
		"displayName": "Integration Test User",
	})
	resp, err := http.Post(ts.URL+"/v2/api/users/sync", "application/json", bytes.NewReader(body))
	if err != nil {
		panic(fmt.Sprintf("mustSyncDevUser: %v", err))
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		panic(fmt.Sprintf("mustSyncDevUser: unexpected status %d", resp.StatusCode))
	}
	var result struct {
		User struct {
			ID int `json:"id"`
		} `json:"user"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		panic(fmt.Sprintf("mustSyncDevUser decode: %v", err))
	}
	return result.User.ID
}
