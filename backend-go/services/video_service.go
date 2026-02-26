package services

import (
	"context"
	"fmt"
	"strings"

	"github.com/areeeeeeeb/reLive/backend-go/apperr"
	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/google/uuid"
)

const (
	MaxFileSize = 5 * 1024 * 1024 * 1024 * 1024 // 5TB - DO Spaces limit
)

type VideoService struct {
	store         *database.Store
	uploadService *UploadService
	thumbnail     *ThumbnailService
}

// InitUploadResult is the domain result of initiating an upload
type InitUploadResult struct {
	VideoID  int
	UploadID string
	PartURLs []string
	PartSize int64
}

// thumbnail may be nil — callers that don't need thumbnail extraction (e.g. tests) can pass nil.
func NewVideoService(store *database.Store, upload *UploadService, thumbnail *ThumbnailService) *VideoService {
	return &VideoService{
		store:         store,
		uploadService: upload,
		thumbnail:     thumbnail,
	}
}

// InitUpload takes the full UploadInitRequest because all fields are needed together
// and UploadInitRequest lives in models (not the handler layer), keeping the coupling acceptable.
func (s *VideoService) InitUpload(ctx context.Context, userID int, req *models.UploadInitRequest) (*InitUploadResult, error) {
	if !strings.HasPrefix(req.ContentType, "video/") {
		return nil, fmt.Errorf("invalid content type: %s, must be a video", req.ContentType)
	}
	if req.SizeBytes > MaxFileSize {
		return nil, fmt.Errorf("file too large: max size is 5TB")
	}

	partSize := CalculatePartSize(req.SizeBytes)
	partCount := CalculatePartCount(req.SizeBytes, partSize)

	// generate unique S3 key: videos/{userID}/{uuid}_{filename}
	key := fmt.Sprintf("videos/%d/%s_%s", userID, uuid.New().String(), req.Filename)

	uploadID, err := s.uploadService.CreateMultipartUpload(ctx, key, req.ContentType)
	if err != nil {
		return nil, err
	}

	partURLs, err := s.uploadService.GeneratePresignedPartUrls(ctx, key, uploadID, partCount)
	if err != nil {
		s.uploadService.AbortMultipartUpload(ctx, key, uploadID)
		return nil, err
	}

	videoURL := s.uploadService.CDNURL(key)
	video, err := s.store.CreateVideo(ctx, userID, req.Filename, key, videoURL, req.Duration, req.Latitude, req.Longitude, req.RecordedAt, req.Width, req.Height)
	if err != nil {
		s.uploadService.AbortMultipartUpload(ctx, key, uploadID)
		return nil, err
	}

	return &InitUploadResult{
		VideoID:  video.ID,
		UploadID: uploadID,
		PartURLs: partURLs,
		PartSize: partSize,
	}, nil
}

// ConfirmUpload completes a multipart upload, marks the video as completed,
// and immediately queues thumbnail extraction via ThumbnailService.
func (s *VideoService) ConfirmUpload(ctx context.Context, videoID int, userID int, uploadID string, parts []models.UploadPart) error {
	video, err := s.store.GetVideoByID(ctx, videoID)
	if err != nil {
		return fmt.Errorf("video not found: %w", err)
	}

	if video.UserID != userID {
		return fmt.Errorf("unauthorized: video does not belong to user")
	}

	if video.Status != models.VideoStatusPendingUpload {
		return fmt.Errorf("video is not in pending_upload status (current: %s)", video.Status)
	}

	if err := s.uploadService.CompleteMultipartUpload(ctx, video.S3Key, uploadID, parts); err != nil {
		_ = s.uploadService.AbortMultipartUpload(ctx, video.S3Key, uploadID)
		_, _ = s.store.UpdateVideoStatus(ctx, videoID, models.VideoStatusFailed)
		return fmt.Errorf("failed to complete S3 upload: %w", err)
	}

	if err := s.store.SetUploadStatusCompleted(ctx, videoID); err != nil {
		return fmt.Errorf("failed to set upload status completed: %w", err)
	}
	// Fire Goroutine for thumbnail pipeline while upload pipeline continues
	if s.thumbnail != nil {
		s.thumbnail.ExtractAsync(video)
	}

	return nil
}

// GetByID retrieves a video by its ID.
func (s *VideoService) GetByID(ctx context.Context, videoID int) (*models.Video, error) {
	return s.store.GetVideoByID(ctx, videoID)
}

// SetConcert links a video to a concert
func (s *VideoService) SetConcert(ctx context.Context, videoID int, concertID int) error {
	return s.store.SetVideoConcert(ctx, videoID, concertID)
}

// SetSong links a video to a song
func (s *VideoService) SetSong(ctx context.Context, videoID int, songID int) error {
	return s.store.SetVideoSong(ctx, videoID, songID)
}

func (s *VideoService) ListByConcert(ctx context.Context, concertID int) ([]*models.Video, error) {
	videos, err := s.store.ListVideosByConcert(ctx, concertID)
	if err != nil {
		return nil, err
	}
	if len(videos) > 0 {
		return videos, nil
	}

	exists, err := s.store.ConcertExists(ctx, concertID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, apperr.ErrNotFound
	}
	return []*models.Video{}, nil
}
