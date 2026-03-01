package database

import (
	"context"
	"fmt"
	"time"

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
	thumbnail_status,
	thumbnail_processing_started_at,
	detection_status,
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
		&v.ThumbnailStatus,
		&v.ThumbnailProcessingStartedAt,
		&v.DetectionStatus,
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

func scanVideos(rows pgx.Rows, allowPartial bool) ([]*models.Video, error) {
	defer rows.Close()
	var videos []*models.Video
	for rows.Next() {
		v, err := scanVideo(rows)
		if err != nil {
			if allowPartial {
				continue
			}
			return nil, err
		}
		videos = append(videos, v)
	}
	return videos, rows.Err()
}

// CreateVideo inserts a new video record.
// thumbnail_status is intentionally not set here — ConfirmUpload sets it to queued
// once the S3 upload is complete, ensuring the thumbnail worker never claims a mid-upload video.
func (s *Store) CreateVideo(ctx context.Context, userID int, filename, s3Key, videoURL string, duration *float64, latitude, longitude *float64, recordedAt *time.Time, width, height *int) (*models.Video, error) {
	const q = `
	INSERT INTO videos (user_id, filename, s3_key, video_url, status, duration, latitude, longitude, recorded_at, width, height)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	RETURNING ` + videoCols

	row := s.pool.QueryRow(ctx, q,
		userID,
		filename,
		s3Key,
		videoURL,
		models.VideoStatusPendingUpload,
		duration,
		latitude,
		longitude,
		recordedAt,
		width,
		height,
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

// ListVideosByConcert returns non-deleted videos linked to the given concert.
func (s *Store) ListVideosByConcert(ctx context.Context, concertID int) ([]*models.Video, error) {
	const q = `
	SELECT ` + videoCols + `
	FROM videos
	WHERE event_type = $1
	  AND event_id = $2
	  AND deleted_at IS NULL
	ORDER BY recorded_at ASC NULLS LAST, created_at ASC, id ASC`

	rows, err := s.pool.Query(ctx, q, models.EventTypeConcert, concertID)
	if err != nil {
		return nil, err
	}
	return scanVideos(rows, true)
}

// SetThumbnailURL sets the thumbnail_url for a video.
func (s *Store) SetThumbnailURL(ctx context.Context, videoID int, url string) error {
	const q = `
	UPDATE videos SET thumbnail_url = $1, updated_at = NOW() WHERE id = $2`

	_, err := s.pool.Exec(ctx, q, url, videoID)
	return err
}

// SetUploadStatusCompleted atomically sets status = 'completed' and thumbnail_status = 'queued' (for recovery)
// Note: this only updates DB state — actual extraction is dispatched separately via ThumbnailService.ExtractAsync.
func (s *Store) SetUploadStatusCompleted(ctx context.Context, videoID int) error {
	const q = `
	UPDATE videos
	SET status = $1, thumbnail_status = $2, updated_at = NOW()
	WHERE id = $3`

	_, err := s.pool.Exec(ctx, q, models.VideoStatusCompleted, models.VideoThumbnailStatusQueued, videoID)
	return err
}

// ClaimQueuedThumbnails atomically claims up to `limit` queued videos for thumbnail extraction.
// FOR UPDATE SKIP LOCKED prevents double-claiming across concurrent workers/instances.
func (s *Store) ClaimQueuedThumbnails(ctx context.Context, limit int) ([]*models.Video, error) {
	const q = `
	UPDATE videos SET thumbnail_status = $1, thumbnail_processing_started_at = NOW(), updated_at = NOW()
	WHERE id IN (
		SELECT id FROM videos
		WHERE thumbnail_status = $2 AND deleted_at IS NULL
		ORDER BY created_at, id
		LIMIT $3
		FOR UPDATE SKIP LOCKED
	)
	RETURNING ` + videoCols

	rows, err := s.pool.Query(ctx, q,
		models.VideoThumbnailStatusProcessing,
		models.VideoThumbnailStatusQueued,
		limit,
	)
	if err != nil {
		return nil, err
	}
	return scanVideos(rows, true)
}

// UpdateVideoMetadata updates the extracted/fallback metadata fields for a video.
// Uses COALESCE to only overwrite fields that are provided (non-nil).
// NOTE: This means you cannot intentionally clear a field back to NULL with this method.
func (s *Store) UpdateVideoMetadata(ctx context.Context, videoID int, meta models.VideoMetadata) error {
	const q = `
	UPDATE videos
	SET duration = COALESCE($1, duration),
	    latitude = COALESCE($2, latitude),
	    longitude = COALESCE($3, longitude),
	    recorded_at = COALESCE($4, recorded_at),
	    width = COALESCE($5, width),
	    height = COALESCE($6, height),
	    updated_at = NOW()
	WHERE id = $7`

	var lat, lng *float64
	if meta.GPS != nil {
		lat = &meta.GPS.Latitude
		lng = &meta.GPS.Longitude
	}

	_, err := s.pool.Exec(ctx, q,
		meta.Duration,
		lat,
		lng,
		meta.Timestamp,
		meta.Width,
		meta.Height,
		videoID,
	)
	return err
}

// SetThumbnailStatusCompleted marks thumbnail_status as completed and records processed_at for a video.
func (s *Store) SetThumbnailStatusCompleted(ctx context.Context, videoID int) error {
	const q = `
	UPDATE videos
	SET thumbnail_status = $1, processed_at = NOW(), updated_at = NOW()
	WHERE id = $2`

	_, err := s.pool.Exec(ctx, q, models.VideoThumbnailStatusCompleted, videoID)
	return err
}

// SetThumbnailStatusFailed marks thumbnail_status as failed for a video.
func (s *Store) SetThumbnailStatusFailed(ctx context.Context, videoID int) error {
	const q = `
	UPDATE videos
	SET thumbnail_status = $1, updated_at = NOW()
	WHERE id = $2`

	_, err := s.pool.Exec(ctx, q, models.VideoThumbnailStatusFailed, videoID)
	return err
}

// ResetStuckThumbnailVideos resets videos stuck in thumbnail_status = processing back to queued.
func (s *Store) ResetStuckThumbnailVideos(ctx context.Context, stuckAfter time.Duration) error {
	const q = `
	UPDATE videos SET thumbnail_status = $1, thumbnail_processing_started_at = NULL, updated_at = NOW()
	WHERE thumbnail_status = $2 AND deleted_at IS NULL AND thumbnail_processing_started_at < $3`
	cutoff := time.Now().Add(-stuckAfter)
	_, err := s.pool.Exec(ctx, q, models.VideoThumbnailStatusQueued, models.VideoThumbnailStatusProcessing, cutoff)
	return err
}

// SetDetectionStatus records the result of a concert detection attempt on a video.
func (s *Store) SetDetectionStatus(ctx context.Context, videoID int, status string) error {
	const q = `
	UPDATE videos SET detection_status = $1, updated_at = NOW() WHERE id = $2`

	_, err := s.pool.Exec(ctx, q, status, videoID)
	return err
}
