package database

import (
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool                          *pgxpool.Pool
	searchTrgmSimilarityThreshold float64
}

func NewStore(pool *pgxpool.Pool, searchTrgmSimilarityThreshold float64) (*Store, error) {
	if searchTrgmSimilarityThreshold < 0 || searchTrgmSimilarityThreshold > 1 {
		return nil, fmt.Errorf("search trigram similarity threshold must be between 0 and 1, got %f", searchTrgmSimilarityThreshold)
	}

	return &Store{
		pool:                          pool,
		searchTrgmSimilarityThreshold: searchTrgmSimilarityThreshold,
	}, nil
}

