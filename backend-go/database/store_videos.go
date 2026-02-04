package database
import (
	"context"
	"github.com/areeeeeeeb/reLive/backend-go/models"
)

// CreateVideo inserts a new video record with pending_upload status
func (s *Store) CreateVideo(ctx context.Context, userID int, filename, s3Key, videoURL string) (*models.Video, error) {
	const q = `
	INSERT INTO videos (user_id, filename, s3_key, video_url, status)
	VALUES ($1, $2, $3, $4, $5)
	RETURNING id, user_id, filename, s3_key, video_url, status, created_at`

	var video models.Video
	err := s.pool.QueryRow(ctx, q,
		userID,
		filename,
		s3Key,
		videoURL,
		models.VideoStatusPendingUpload,
	).Scan(
		&video.ID,
		&video.UserID,
		&video.Filename,
		&video.S3Key,
		&video.VideoURL,
		&video.Status,
		&video.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &video, nil
}

// GetVideoByID retrieves a video by its ID
func (s *Store) GetVideoByID(ctx context.Context, videoID int) (*models.Video, error) {
	const q = `
	SELECT id, user_id, filename, s3_key, video_url, status, created_at
	FROM videos
	WHERE id = $1`

	var video models.Video
	err := s.pool.QueryRow(ctx, q, videoID).Scan(
		&video.ID,
		&video.UserID,
		&video.Filename,
		&video.S3Key,
		&video.VideoURL,
		&video.Status,
		&video.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &video, nil
}

// UpdateVideoStatus updates the status of a video
func (s *Store) UpdateVideoStatus(ctx context.Context, videoID int, status string) error {
	const q = `
	UPDATE videos
	SET status = $1, updated_at = NOW()
	WHERE id = $2`

	_, err := s.pool.Exec(ctx, q, status, videoID)
	return err
}