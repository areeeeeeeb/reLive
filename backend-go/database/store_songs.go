package database

import (
	"context"
	"errors"

	"github.com/areeeeeeeb/reLive/backend-go/apperr"
	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/jackc/pgx/v5"
)

const songCols = `
	id,
	title,
	artist_id,
	artist_name_raw,
	duration_seconds,
	musicbrainz_recording_id,
	isrc,
	is_verified,
	created_by_user_id,
	created_at,
	deleted_at
`

func scanSong(row pgx.Row) (*models.Song, error) {
	var s models.Song
	err := row.Scan(
		&s.ID,
		&s.Title,
		&s.ArtistID,
		&s.ArtistNameRaw,
		&s.DurationSeconds,
		&s.MusicBrainzRecordingID,
		&s.ISRC,
		&s.IsVerified,
		&s.CreatedByUserID,
		&s.CreatedAt,
		&s.DeletedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, apperr.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func scanSongs(rows pgx.Rows) ([]models.Song, error) {
	var songs []models.Song
	for rows.Next() {
		s, err := scanSong(rows)
		if err != nil {
			return nil, err
		}
		songs = append(songs, *s)
	}
	return songs, rows.Err()
}

func (s *Store) GetSongByID(ctx context.Context, id int) (*models.Song, error) {
	const q = `
	SELECT ` + songCols + `
	FROM songs
	WHERE id = $1 AND deleted_at IS NULL`

	return scanSong(s.pool.QueryRow(ctx, q, id))
}

func (s *Store) SearchSongs(ctx context.Context, query string, maxResults int) ([]models.Song, error) {
	query, likeQuery := prepareSearchQuery(query)

	const q = `
	SELECT ` + songCols + `
	FROM songs
	WHERE deleted_at IS NULL
	  AND (title ILIKE $2 OR title % $1)
	ORDER BY
	  (lower(title) = lower($1)) DESC,
	  (title ILIKE $1 || '%') DESC,
	  similarity(title, $1) DESC,
	  is_verified DESC,
	  title ASC
	LIMIT $3`

	rows, err := s.pool.Query(ctx, q, query, likeQuery, maxResults)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanSongs(rows)
}
