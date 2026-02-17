package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	Environment string
	DatabaseURL string

	Auth0  Auth0Config
	Spaces SpacesConfig
	Concurrency ConcurrencyConfig

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
	Concurrency int
	QueueSize   int
	Interval    int // seconds
}

func Load() *Config {
	godotenv.Load()

	return &Config{
		Port:        getEnv("PORT", "8081"),
		Environment: getEnv("ENVIRONMENT", "development"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		
		Concurrency: ConcurrencyConfig{
			Concurrency: getEnvInt("POOL_CONCURRENCY", 20),
			QueueSize:   getEnvInt("POOL_QUEUE_SIZE", 50),
			Interval:    getEnvInt("POLL_INTERVAL_SECONDS", 10),
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

