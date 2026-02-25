package database

import (
	"context"

	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/jackc/pgx/v5"
)

const songPerformanceCols = `
	sp.id,
	sp.act_id,
	sp.song_id,
	sp.position,
	sp.started_at,
	sp.created_at,
	sp.deleted_at
`

func scanSongPerformance(row pgx.Row) (*models.SongPerformance, error) {
	var sp models.SongPerformance
	if err := row.Scan(
		&sp.ID,
		&sp.ActID,
		&sp.SongID,
		&sp.Position,
		&sp.StartedAt,
		&sp.CreatedAt,
		&sp.DeletedAt,
	); err != nil {
		return nil, err
	}
	return &sp, nil
}

func scanSongPerformances(rows pgx.Rows, allowPartial bool) ([]models.SongPerformance, error) {
	defer rows.Close()
	performances := make([]models.SongPerformance, 0)
	for rows.Next() {
		sp, err := scanSongPerformance(rows)
		if err != nil {
			if allowPartial {
				continue
			}
			return performances, err
		}
		performances = append(performances, *sp)
	}
	return performances, rows.Err()
}

func (s *Store) ListSongPerformancesByConcert(ctx context.Context, concertID int) ([]models.SongPerformance, error) {
	const q = `
	SELECT ` + songPerformanceCols + `
	FROM song_performances sp
	INNER JOIN acts a ON a.id = sp.act_id
	WHERE a.concert_id = $1
	  AND a.deleted_at IS NULL
	  AND sp.deleted_at IS NULL
	ORDER BY a.created_at ASC, a.id ASC, sp.position ASC NULLS LAST, sp.id ASC`

	rows, err := s.pool.Query(ctx, q, concertID)
	if err != nil {
		return nil, err
	}

	return scanSongPerformances(rows, true)
}
