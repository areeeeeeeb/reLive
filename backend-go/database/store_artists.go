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

func scanArtists(rows pgx.Rows) ([]models.Artist, error) {
	var artists []models.Artist
	for rows.Next() {
		a, err := scanArtist(rows)
		if err != nil {
			return nil, err
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

func (s *Store) SearchArtists(ctx context.Context, query string, maxResults int) ([]models.Artist, error) {
	const q = `
	SELECT ` + artistCols + `
	FROM artists
	WHERE name ILIKE $1 AND deleted_at IS NULL
	ORDER BY is_verified DESC, name ASC
	LIMIT $2`

	// TODO: better search ranking system

	rows, err := s.pool.Query(ctx, q, "%"+escapeILIKE(query)+"%", maxResults) // TODO: use elasticsearch
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanArtists(rows)
}
