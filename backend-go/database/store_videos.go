package database

import (
	"context"

	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/jackc/pgx/v5"
)

func scanVideo(row pgx.Row) (*models.Video, error) {
	var video models.Video
	err := row.Scan(
		&video.ID,
		&video.UserID,
		&video.Filename,
		&video.S3Key,
		&video.VideoURL,
		&video.ThumbnailURL,
		&video.Duration,
		&video.Status,
		&video.CreatedAt,
		&video.ProcessedAt,
	)
	if err != nil {
		return nil, err
	}
	return &video, nil
}

// CreateVideo inserts a new video record with pending_upload status
func (s *Store) CreateVideo(ctx context.Context, userID int, filename, s3Key, videoURL string) (*models.Video, error) {
	const q = `
	INSERT INTO videos (user_id, filename, s3_key, video_url, status)
	VALUES ($1, $2, $3, $4, $5)
	RETURNING id, user_id, filename, s3_key, video_url, thumbnail_url, duration, status, created_at, processed_at`

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
	SELECT id, user_id, filename, s3_key, video_url, thumbnail_url, duration, status, created_at, processed_at
	FROM videos
	WHERE id = $1`

	return scanVideo(s.pool.QueryRow(ctx, q, videoID))
}

// UpdateVideoStatus updates the status of a video and returns the updated video
func (s *Store) UpdateVideoStatus(ctx context.Context, videoID int, status string) (*models.Video, error) {
	const q = `
	UPDATE videos
	SET status = $1, updated_at = NOW()
	WHERE id = $2
	RETURNING id, user_id, filename, s3_key, video_url, thumbnail_url, duration, status, created_at, processed_at`

	return scanVideo(s.pool.QueryRow(ctx, q, status, videoID))
}