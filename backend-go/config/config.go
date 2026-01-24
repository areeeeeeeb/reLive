package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port		string
	Environment	string
	DatabaseURL string
}

func Load() *Config {

	return &Config{
		Port:			getEnv("PORT", "8081"),
		Environment:	getEnv("ENVIRONMENT", "development"),
		DatabaseURL:	getEnv("DATABASE_URL", ""),
	}
}

func getEnv(key, defaultValue string) string {
	fmt.Println(key)
	fmt.Println(os.Getenv(key))
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}