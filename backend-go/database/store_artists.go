package database

import (
	"context"
	"errors"

	"github.com/areeeeeeeb/reLive/backend-go/apperr"
	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/jackc/pgx/v5"
)

const artistCols = `
	id,
	name,
	musicbrainz_id,
	spotify_id,
	rym_id,
	image_url,
	is_verified,
	created_by_user_id,
	created_at,
	deleted_at
`

func scanArtist(row pgx.Row) (*models.Artist, error) {
	var a models.Artist
	err := row.Scan(
		&a.ID,
		&a.Name,
		&a.MusicBrainzID,
		&a.SpotifyID,
		&a.RYMID,
		&a.ImageURL,
		&a.IsVerified,
		&a.CreatedByUserID,
		&a.CreatedAt,
		&a.DeletedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, apperr.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func scanArtists(rows pgx.Rows, allowPartial bool) ([]models.Artist, error) {
	defer rows.Close()
	artists := make([]models.Artist, 0)
	for rows.Next() {
		a, err := scanArtist(rows)
		if err != nil {
			if allowPartial {
				continue
			}
			return artists, err
		}
		artists = append(artists, *a)
	}
	return artists, rows.Err()
}

func (s *Store) GetArtistByID(ctx context.Context, id int) (*models.Artist, error) {
	const q = `
	SELECT ` + artistCols + `
	FROM artists
	WHERE id = $1 AND deleted_at IS NULL`

	return scanArtist(s.pool.QueryRow(ctx, q, id))
}

func (s *Store) ListArtistsByIDs(ctx context.Context, ids []int) ([]models.Artist, error) {
	if len(ids) == 0 {
		return []models.Artist{}, nil
	}

	const q = `
	SELECT ` + artistCols + `
	FROM artists
	WHERE deleted_at IS NULL
	  AND id = ANY($1::int[])`

	rows, err := s.pool.Query(ctx, q, ids)
	if err != nil {
		return nil, err
	}

	return scanArtists(rows, true)
}

func (s *Store) SearchArtists(ctx context.Context, query string, maxResults int) ([]models.Artist, error) {
	query, likeQuery := prepareSearchQuery(query)

	const q = `
	SELECT ` + artistCols + `
	FROM artists
	WHERE deleted_at IS NULL
	  AND (name ILIKE $2 OR similarity(name, $1) >= $4)
	ORDER BY
	  (lower(name) = lower($1)) DESC,
	  (name ILIKE $1 || '%') DESC,
	  similarity(name, $1) DESC,
	  is_verified DESC,
	  name ASC,
	  id ASC
	LIMIT $3`

	rows, err := s.pool.Query(ctx, q, query, likeQuery, maxResults, s.searchTrgmSimilarityThreshold)
	if err != nil {
		return nil, err
	}

	return scanArtists(rows, true)
}
