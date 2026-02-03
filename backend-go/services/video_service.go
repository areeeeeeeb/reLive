package services

import (
	"fmt"
	"strings"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
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

func NewVideoService(store *database.Store, s3Client *s3.Client, bucket string, cdnURL string) *VideoService {
	return &VideoService{
		store:    store,
		uploadService: NewUploadService(s3Client, bucket),
		cdnURL:   cdnURL,
	}
}
// Frontend Expects:
/*
interface UploadVideoInitResponse {
    videoId: number;
    uploadId: string;
    partUrls: string[];   // ← array of presigned URLs, one per chunk
    partSize: number;     // ← tells frontend how big each chunk is
}
*/

func (s *VideoService) InitUpload(c *gin.Context, userID int, req models.UploadURLRequest) (*models.UploadURLResponse, error) {
    ctx := c.Request.Context()

    // Validate content type
    if !strings.HasPrefix(req.ContentType, "video/") {
        return nil, fmt.Errorf("invalid content type: %s, must be a video", req.ContentType)
    }
    // Validate file size
    if req.SizeBytes > MaxFileSize {
        return nil, fmt.Errorf("file too large: max size is 5TB")
    }
    // Dynamic part size and count based on file size from request
    partSize := CalculatePartSize(req.SizeBytes)
    partCount := CalculatePartCount(req.SizeBytes, partSize)
    // Generate unique S3 key
    key := fmt.Sprintf("users/%d/videos/%s/%s", userID, uuid.New().String(), req.Filename)
    // Create multipart upload in S3
    uploadID, err := s.uploadService.CreateMultipartUpload(ctx, key, req.ContentType)
    if err != nil {
        return nil, err
    }
    // Generate presigned URLs for each part
    partURLs, err := s.uploadService.GeneratePresignedPartUrls(ctx, key, uploadID, partCount)
    if err != nil {
		s.uploadService.AbortMultipartUpload(ctx, key, uploadID) // cleanup
        return nil, err
    }
    // Save video record to DB
    videoURL := fmt.Sprintf("%s/%s", s.cdnURL, key)
    video, err := s.store.CreateVideo(ctx, userID, req.Filename, key, videoURL)
    if err != nil {
		s.uploadService.AbortMultipartUpload(ctx, key, uploadID) // cleanup
        return nil, err
    }
    // Return response to frontend
    return &models.UploadURLResponse{
        VideoID:  video.ID,
        UploadID: uploadID,
        PartURLs: partURLs,
        PartSize: partSize,
    }, nil
}

