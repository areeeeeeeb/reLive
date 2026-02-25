package database

import (
	"context"

	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/jackc/pgx/v5"
)

const actCols = `
	id,
	concert_id,
	artist_id,
	act_type,
	start_time,
	created_at,
	deleted_at
`

func scanAct(row pgx.Row) (*models.Act, error) {
	var a models.Act
	if err := row.Scan(
		&a.ID,
		&a.ConcertID,
		&a.ArtistID,
		&a.ActType,
		&a.StartTime,
		&a.CreatedAt,
		&a.DeletedAt,
	); err != nil {
		return nil, err
	}
	return &a, nil
}

func scanActs(rows pgx.Rows, allowPartial bool) ([]models.Act, error) {
	defer rows.Close()
	acts := make([]models.Act, 0)
	for rows.Next() {
		a, err := scanAct(rows)
		if err != nil {
			if allowPartial {
				continue
			}
			return acts, err
		}
		acts = append(acts, *a)
	}
	return acts, rows.Err()
}

func (s *Store) ListActsByConcert(ctx context.Context, concertID int) ([]models.Act, error) {
	const q = `
	SELECT ` + actCols + `
	FROM acts
	WHERE concert_id = $1 AND deleted_at IS NULL
	ORDER BY created_at ASC, id ASC`

	rows, err := s.pool.Query(ctx, q, concertID)
	if err != nil {
		return nil, err
	}

	return scanActs(rows, true)
}
