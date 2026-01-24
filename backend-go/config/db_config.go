package config
// setup DB connection pool

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)


func (c *Config) NewDBPool(ctx context.Context) (*pgxpool.Pool, error) {
	
	parsed_db_config, err := pgxpool.ParseConfig(c.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse DATABASE_URL: %w", err)
	}

	parsed_db_config.MaxConns = 25
	parsed_db_config.MinConns = 5
	parsed_db_config.MaxConnLifetime = time.Hour
	parsed_db_config.MaxConnIdleTime = 30 * time.Minute
	parsed_db_config.HealthCheckPeriod = 1 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, parsed_db_config)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	stats := pool.Stat()
	log.Printf("\033[32m" + "Database pool created! <3 max: %d, min %d, current %d",
		parsed_db_config.MaxConns,
		parsed_db_config.MinConns,
		stats.TotalConns(),
	)

	return pool, nil
}

// func (c *Config) TestConnection(ctx )