package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port          string
	Environment   string
	DatabaseURL   string
	DevBypassAuth bool
	DevAuth0ID    string

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
		Port:          getEnv("PORT", "8081"),
		Environment:   getEnv("ENVIRONMENT", "development"),
		DatabaseURL:   getEnv("DATABASE_URL", ""),
		DevBypassAuth: getEnvBool("DEV_BYPASS_AUTH", false),
		DevAuth0ID:    getEnv("DEV_AUTH0_ID", ""),

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
