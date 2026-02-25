package database

import (
	"context"
	"errors"

	"github.com/areeeeeeeb/reLive/backend-go/apperr"
	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/jackc/pgx/v5"
)

const concertCols = `
	id,
	name,
	date,
	venue_id,
	artist_id,
	setlistfm_id,
	created_at,
	deleted_at
`

func scanConcert(row pgx.Row) (*models.Concert, error) {
	var c models.Concert
	if err := row.Scan(
		&c.ID,
		&c.Name,
		&c.Date,
		&c.VenueID,
		&c.ArtistID,
		&c.SetlistFmID,
		&c.CreatedAt,
		&c.DeletedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperr.ErrConcertNotFound
		}
		return nil, err
	}
	return &c, nil
}

func (s *Store) GetConcertByID(ctx context.Context, concertID int) (*models.Concert, error) {
	const q = `
	SELECT ` + concertCols + `
	FROM concerts
	WHERE id = $1 AND deleted_at IS NULL`

	return scanConcert(s.pool.QueryRow(ctx, q, concertID))
}

func (s *Store) ConcertExists(ctx context.Context, concertID int) (bool, error) {
	const q = `
	SELECT EXISTS (
		SELECT 1
		FROM concerts
		WHERE id = $1 AND deleted_at IS NULL
	)`

	var exists bool
	if err := s.pool.QueryRow(ctx, q, concertID).Scan(&exists); err != nil {
		return false, err
	}
	return exists, nil
}
