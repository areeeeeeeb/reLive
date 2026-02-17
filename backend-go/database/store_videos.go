package database

import (
	"context"
	"fmt"

	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/jackc/pgx/v5"
)

const videoCols = `
	id,
	user_id,
	filename,
	s3_key,
	video_url,
	thumbnail_url,
	status,
	visibility,
	event_type,
	event_id,
	act_id,
	song_performance_id,
	duration,
	latitude,
	longitude,
	recorded_at,
	width,
	height,
	created_at,
	updated_at,
	processed_at,
	deleted_at
`

func scanVideo(row pgx.Row) (*models.Video, error) {
	var v models.Video
	err := row.Scan(
		&v.ID,
		&v.UserID,
		&v.Filename,
		&v.S3Key,
		&v.VideoURL,
		&v.ThumbnailURL,
		&v.Status,
		&v.Visibility,
		&v.EventType,
		&v.EventID,
		&v.ActID,
		&v.SongPerformanceID,
		&v.Duration,
		&v.Latitude,
		&v.Longitude,
		&v.RecordedAt,
		&v.Width,
		&v.Height,
		&v.CreatedAt,
		&v.UpdatedAt,
		&v.ProcessedAt,
		&v.DeletedAt,
	)
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func scanVideos(rows pgx.Rows) ([]*models.Video, error) {
	defer rows.Close()
	var videos []*models.Video
	for rows.Next() {
		v, err := scanVideo(rows)
		if err != nil {
			return nil, err
		}
		videos = append(videos, v)
	}
	return videos, rows.Err()
}


// CreateVideo inserts a new video record with pending_upload status
func (s *Store) CreateVideo(ctx context.Context, userID int, filename, s3Key, videoURL string) (*models.Video, error) {
	const q = `
	INSERT INTO videos (user_id, filename, s3_key, video_url, status)
	VALUES ($1, $2, $3, $4, $5)
	RETURNING ` + videoCols

	row := s.pool.QueryRow(ctx, q,
		userID,
		filename,
		s3Key,
		videoURL,
		models.VideoStatusPendingUpload,
	)
	return scanVideo(row)
}

// GetVideoByID retrieves a video by its ID
func (s *Store) GetVideoByID(ctx context.Context, videoID int) (*models.Video, error) {
	const q = `
	SELECT ` + videoCols + `
	FROM videos
	WHERE id = $1 AND deleted_at IS NULL`

	return scanVideo(s.pool.QueryRow(ctx, q, videoID))
}

// UpdateVideoStatus updates the status of a video and returns the updated video
func (s *Store) UpdateVideoStatus(ctx context.Context, videoID int, status string) (*models.Video, error) {
	const q = `
	UPDATE videos
	SET status = $1, updated_at = NOW()
	WHERE id = $2
	RETURNING ` + videoCols

	return scanVideo(s.pool.QueryRow(ctx, q, status, videoID))
}

// SetVideoConcert links a video to a concert via event_type + event_id
func (s *Store) SetVideoConcert(ctx context.Context, videoID int, concertID int) error {
	const q = `
	UPDATE videos
	SET event_type = $1, event_id = $2, updated_at = NOW()
	WHERE id = $3`

	_, err := s.pool.Exec(ctx, q, models.EventTypeConcert, concertID, videoID)
	return err
}

// SetVideoSong links a video to a song
// TODO: add song_id column to videos table
func (s *Store) SetVideoSong(ctx context.Context, videoID int, songID int) error {
	return fmt.Errorf("not implemented")
}

// ClaimQueuedVideos atomically claims up to `limit` queued videos for processing.
// FOR UPDATE SKIP LOCKED prevents double-claiming across concurrent workers/instances.
func (s *Store) ClaimQueuedVideos(ctx context.Context, limit int) ([]*models.Video, error) {
	const q = `
	UPDATE videos SET status = $1, updated_at = NOW()
	WHERE id IN (
		SELECT id FROM videos
		WHERE status = $2 AND deleted_at IS NULL
		ORDER BY created_at
		LIMIT $3
		FOR UPDATE SKIP LOCKED
	)
	RETURNING ` + videoCols

	rows, err := s.pool.Query(ctx, q,
		models.VideoStatusProcessing,
		models.VideoStatusQueued,
		limit,
	)
	if err != nil {
		return nil, err
	}
	return scanVideos(rows)
}

// UpdateVideoMetadata updates the extracted/fallback metadata fields for a video
func (s *Store) UpdateVideoMetadata(ctx context.Context, videoID int, meta models.VideoMetadata) error {
	const q = `
	UPDATE videos
	SET duration = $1, latitude = $2, longitude = $3, recorded_at = $4,
	    width = $5, height = $6, updated_at = NOW()
	WHERE id = $7`

	_, err := s.pool.Exec(ctx, q,
		meta.Duration,
		meta.GPS.Latitude,
		meta.GPS.Longitude,
		meta.Timestamp,
		meta.Width,
		meta.Height,
		videoID,
	)
	return err
}

// ResetStuckProcessingVideos resets videos that were marked as processing but may have been left in that state due to a crash or error.
func (s *Store) ResetStuckProcessingVideos(ctx context.Context) error {
	const q = `
	UPDATE videos SET status = $1, updated_at = NOW()
	WHERE status = $2 AND deleted_at IS NULL`
	_, err := s.pool.Exec(ctx, q, models.VideoStatusQueued, models.VideoStatusProcessing)
	return err
}
