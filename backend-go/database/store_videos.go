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