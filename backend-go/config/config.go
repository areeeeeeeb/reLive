package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	Environment string
	DatabaseURL string

	Auth0  Auth0Config
	Spaces SpacesConfig
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

func Load() *Config {
	godotenv.Load()

	return &Config{
		Port:        getEnv("PORT", "8081"),
		Environment: getEnv("ENVIRONMENT", "development"),
		DatabaseURL: getEnv("DATABASE_URL", ""),

		Auth0: Auth0Config{
			getEnv("Auth0_Domain", ""),
			getEnv("Auth0_Audience", ""),
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
