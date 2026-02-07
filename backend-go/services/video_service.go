package services

import (
	"context"
	"fmt"
	"strings"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

const (
	MaxFileSize = 5 * 1024 * 1024 * 1024 * 1024 // 5TB - DO Spaces limit
)

type VideoService struct {
	store         *database.Store
	uploadService *UploadService // upload_service handles s3 interactions
	cdnURL        string
}

// InitUploadResult is the domain result of initiating an upload
type InitUploadResult struct {
	VideoID  int
	UploadID string
	PartURLs []string
	PartSize int64
}

func NewVideoService(store *database.Store, s3Client *s3.Client, bucket string, cdnURL string) *VideoService {
	return &VideoService{
		store:    store,
		uploadService: NewUploadService(s3Client, bucket),
		cdnURL:   cdnURL,
	}
}
func (s *VideoService) InitUpload(ctx context.Context, userID int, filename string, contentType string, sizeBytes int64) (*InitUploadResult, error) {
    if !strings.HasPrefix(contentType, "video/") {
        return nil, fmt.Errorf("invalid content type: %s, must be a video", contentType)
    }
    if sizeBytes > MaxFileSize {
        return nil, fmt.Errorf("file too large: max size is 5TB")
    }

    partSize := CalculatePartSize(sizeBytes)
    partCount := CalculatePartCount(sizeBytes, partSize)

    // generate unique S3 key
    key := fmt.Sprintf("users/%d/videos/%s/%s", userID, uuid.New().String(), filename)

    uploadID, err := s.uploadService.CreateMultipartUpload(ctx, key, contentType)
    if err != nil {
        return nil, err
    }

    partURLs, err := s.uploadService.GeneratePresignedPartUrls(ctx, key, uploadID, partCount)
    if err != nil {
        s.uploadService.AbortMultipartUpload(ctx, key, uploadID)
        return nil, err
    }

    videoURL := fmt.Sprintf("%s/%s", s.cdnURL, key)
    video, err := s.store.CreateVideo(ctx, userID, filename, key, videoURL)
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

// ConfirmUpload completes a multipart upload and updates video status
func (s *VideoService) ConfirmUpload(ctx context.Context, videoID int, userID int, uploadID string, parts []models.UploadPart) error {
    // Get video to verify ownership and get S3 key
    video, err := s.store.GetVideoByID(ctx, videoID)
    if err != nil {
        return fmt.Errorf("video not found: %w", err)
    }

    // Verify user owns this video
    if video.UserID != userID {
        return fmt.Errorf("unauthorized: video does not belong to user")
    }

    // Verify video is in correct status
    if video.Status != models.VideoStatusPendingUpload {
        return fmt.Errorf("video is not in pending_upload status (current: %s)", video.Status)
    }

	// Complete multipart upload in S3
	if err := s.uploadService.CompleteMultipartUpload(ctx, video.S3Key, uploadID, parts); err != nil {
		// Cleanup: abort S3 upload and mark video as failed (best effort)
		_ = s.uploadService.AbortMultipartUpload(ctx, video.S3Key, uploadID)
		_, _ = s.store.UpdateVideoStatus(ctx, videoID, models.VideoStatusFailed)
		return fmt.Errorf("failed to complete S3 upload: %w", err)
	}

	// Update video status to queued (ready for processing)
	if _, err := s.store.UpdateVideoStatus(ctx, videoID, models.VideoStatusQueued); err != nil {
		return fmt.Errorf("failed to update video status: %w", err)
	}

	return nil
}
