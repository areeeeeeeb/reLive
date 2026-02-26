package config

import (
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port          string
	Environment   string
	DatabaseURL   string
	Store         StoreConfig
	DevBypassAuth bool
	DevAuth0ID    string

	Auth0  Auth0Config
	Spaces SpacesConfig
	Concurrency ConcurrencyConfig

}

type StoreConfig struct {
	SearchTrgmSimilarityThreshold float64
}

type Auth0Config struct {
	Domain   string
	Audience string
}

type SpacesConfig struct {
	Endpoint  string
	Bucket    string
	Region    string
	AccessKey string
	SecretKey string
	CdnURL    string
}

type ConcurrencyConfig struct {
	Concurrency       int           // POOL_CONCURRENCY — number of worker goroutines
	QueueSize         int           // POOL_QUEUE_SIZE — job channel buffer size
	SchedulerInterval time.Duration // SCHEDULER_INTERVAL_SECS — how often scheduler polls DB
	StuckThreshold    time.Duration // STUCK_THRESHOLD_MINS — how long before a processing job is considered stuck
}

func Load() *Config {
	godotenv.Load()

	return &Config{
		Port:          getEnv("PORT", "8081"),
		Environment:   getEnv("ENVIRONMENT", "development"),
		DatabaseURL:   getEnv("DATABASE_URL", ""),
		DevBypassAuth: getEnvBool("DEV_BYPASS_AUTH", false),
		DevAuth0ID:    getEnv("DEV_AUTH0_ID", ""),

		Store: StoreConfig{
			SearchTrgmSimilarityThreshold: getEnvFloat64("SEARCH_TRGM_SIMILARITY_THRESHOLD", 0.3),
		},

		Concurrency: ConcurrencyConfig{
			Concurrency:       getEnvInt("POOL_CONCURRENCY", 5),
			QueueSize:         getEnvInt("POOL_QUEUE_SIZE", 50),
			SchedulerInterval: time.Duration(getEnvInt("SCHEDULER_INTERVAL_SECS", 30)) * time.Second,
			StuckThreshold:    time.Duration(getEnvInt("STUCK_THRESHOLD_MINS", 10)) * time.Minute,
		},
		
		Auth0: Auth0Config{
			Domain:   getEnv("AUTH0_DOMAIN", ""),
			Audience: getEnv("AUTH0_AUDIENCE", ""),
		},

		Spaces: SpacesConfig{
			Endpoint:  getEnv("DO_SPACES_ENDPOINT", ""),
			Bucket:    getEnv("DO_SPACES_BUCKET", ""),
			Region:    getEnv("DO_SPACES_REGION", ""),
			AccessKey: getEnv("DO_SPACES_KEY", ""),
			SecretKey: getEnv("DO_SPACES_SECRET", ""),
			CdnURL:    getEnv("DO_SPACES_CDN_URL", ""),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if value == "" {
		return defaultValue
	}
	switch value {
	case "1", "true":
		return true
	case "0", "false":
		return false
	default:
		return defaultValue
	}
}

func getEnvInt(key string, defaultValue int) int {
	s := getEnv(key, "")
	if s == "" {
		return defaultValue
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return defaultValue
	}
	return v
}


func getEnvFloat64(key string, defaultValue float64) float64 {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return defaultValue
	}

	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return defaultValue
	}
	return parsed
}
