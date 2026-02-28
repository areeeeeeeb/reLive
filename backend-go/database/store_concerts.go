package database

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

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
	var name sql.NullString

	if err := row.Scan(
		&c.ID,
		&name,
		&c.Date,
		&c.VenueID,
		&c.ArtistID,
		&c.SetlistFmID,
		&c.CreatedAt,
		&c.DeletedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperr.ErrNotFound
		}
		return nil, err
	}

	c.Name = resolveConcertName(name, c.Date)
	return &c, nil
}

func resolveConcertName(name sql.NullString, date time.Time) string {
	if name.Valid {
		trimmed := strings.TrimSpace(name.String)
		if trimmed != "" {
			return trimmed
		}
	}

	return "Concert on " + date.Format("2006-01-02")
}

func scanConcerts(rows pgx.Rows, allowPartial bool) ([]models.Concert, error) {
	defer rows.Close()
	concerts := make([]models.Concert, 0)
	for rows.Next() {
		c, err := scanConcert(rows)
		if err != nil {
			if allowPartial {
				continue
			}
			return concerts, err
		}
		concerts = append(concerts, *c)
	}
	return concerts, rows.Err()
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

func (s *Store) SearchConcerts(ctx context.Context, query string, maxResults int) ([]models.Concert, error) {
	query, likeQuery := prepareSearchQuery(query)

	const q = `
	SELECT ` + concertCols + `
	FROM concerts
	WHERE deleted_at IS NULL
	  AND (
	    name ILIKE $2
	    OR similarity(COALESCE(name, ''), $1) >= $4
	  )
	ORDER BY
	  (lower(COALESCE(name, '')) = lower($1)) DESC,
	  (COALESCE(name, '') ILIKE $1 || '%') DESC,
	  similarity(COALESCE(name, ''), $1) DESC,
	  date DESC
	LIMIT $3`

	rows, err := s.pool.Query(ctx, q, query, likeQuery, maxResults, s.searchTrgmSimilarityThreshold)
	if err != nil {
		return nil, err
	}

	return scanConcerts(rows, true)
}
