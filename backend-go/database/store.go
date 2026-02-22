package database

import (
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool                          *pgxpool.Pool
	searchTrgmSimilarityThreshold float64
}

func NewStore(pool *pgxpool.Pool, searchTrgmSimilarityThreshold float64) (*Store) {
	return &Store{
		pool:                          pool,
		searchTrgmSimilarityThreshold: searchTrgmSimilarityThreshold,
	}
}

