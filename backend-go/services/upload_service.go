package services

import (
	"bytes"
	"context"
	"fmt"
	"time"

	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3Types "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

const (
	MinPartSize = 5 * 1024 * 1024  // 5MB minimum for S3
	MaxParts    = 10000            // S3 limit
)

// CalculatePartSize returns optimal part size based on file size
// Falls back to MinPartSize if calculation has issues
func CalculatePartSize(SizeBytes int64) int64 {
	if SizeBytes <= 0 {
		return MinPartSize
	}
	// If file fits within max parts using minimum size, use minimum
	if SizeBytes/MinPartSize <= MaxParts {
		return MinPartSize
	}
	// Otherwise, calculate larger part size to stay under max parts
	partSize := (SizeBytes / MaxParts) + 1
	return partSize
}

// CalculatePartCount returns number of parts needed for a file
func CalculatePartCount(SizeBytes int64, partSize int64) int {
	if partSize <= 0 {
		partSize = MinPartSize
	}
	count := SizeBytes / partSize
	if SizeBytes%partSize != 0 {
		count++ // ceiling division
	}
	return int(count)
}
type UploadService struct {
	s3Client      *s3.Client
	presignClient *s3.PresignClient
	bucket        string
	cdnURL        string
}

func NewUploadService(s3Client *s3.Client, bucket string, cdnURL string) *UploadService {
	return &UploadService{
		s3Client:      s3Client,
		presignClient: s3.NewPresignClient(s3Client),
		bucket:        bucket,
		cdnURL:        cdnURL,
	}
}

// CDNURL returns the public CDN URL for a given S3 key.
func (s *UploadService) CDNURL(key string) string {
	return fmt.Sprintf("%s/%s", s.cdnURL, key)
}

// CreateMultipartUpload initiates a multipart upload and returns the upload ID
func (s *UploadService) CreateMultipartUpload(ctx context.Context, key string, contentType string) (string, error) {
	output, err := s.s3Client.CreateMultipartUpload(ctx, &s3.CreateMultipartUploadInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("failed to create multipart upload: %w", err)
	}
	return *output.UploadId, nil
}

// GeneratePresignedUrls generates presigned URLs for each part of the multipart upload
func (s *UploadService) GeneratePresignedPartUrls(ctx context.Context, key string, uploadID string, partCount int) ([]string, error) {
	urls := make([]string, partCount)
	for i := range partCount {
		partNumber := int32(i + 1)
		presigned, err := s.presignClient.PresignUploadPart(ctx, &s3.UploadPartInput{
			Bucket:   aws.String(s.bucket),
			Key:      aws.String(key),
			PartNumber: aws.Int32(partNumber),
			UploadId: aws.String(uploadID),
		})
		if err != nil {
			return nil, fmt.Errorf("failed to generate presigned URL for part %d: %w", partNumber, err)
		}
		urls[i] = presigned.URL
	}
	return urls, nil
}

// AbortMultipartUpload cancels a multipart upload (cleanup on failure)
func (s *UploadService) AbortMultipartUpload(ctx context.Context, key string, uploadID string) error {
	_, err := s.s3Client.AbortMultipartUpload(ctx, &s3.AbortMultipartUploadInput{
		Bucket:   aws.String(s.bucket),
		Key:      aws.String(key),
		UploadId: aws.String(uploadID),
	})
	if err != nil {
		return fmt.Errorf("failed to abort multipart upload: %w", err)
	}
	return nil
}

// CompleteMultipartUpload finalizes a multipart upload
func (s *UploadService) CompleteMultipartUpload(ctx context.Context, key string, uploadID string, parts []models.UploadPart) error {
	// Convert to S3 CompletedPart format
	completedParts := make([]s3Types.CompletedPart, len(parts))
	for i, part := range parts {
		completedParts[i] = s3Types.CompletedPart{
			PartNumber: aws.Int32(int32(part.PartNumber)),
			ETag:       aws.String(part.ETag),
		}
	}

	_, err := s.s3Client.CompleteMultipartUpload(ctx, &s3.CompleteMultipartUploadInput{
		Bucket:   aws.String(s.bucket),
		Key:      aws.String(key),
		UploadId: aws.String(uploadID),
		MultipartUpload: &s3Types.CompletedMultipartUpload{
			Parts: completedParts,
		},
	})
	if err != nil {
		return fmt.Errorf("failed to complete multipart upload: %w", err)
	}
	return nil
}

// PresignGet returns a presigned GET URL for the given S3 key, valid for ttl duration.
// ffprobe and ffmpeg can stream directly from this URL without downloading the file.
func (s *UploadService) PresignGet(ctx context.Context, key string, ttl time.Duration) (string, error) {
	presigned, err := s.presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(ttl))
	if err != nil {
		return "", fmt.Errorf("failed to presign GET for %s: %w", key, err)
	}
	return presigned.URL, nil
}

// PutObject uploads data to the given S3 key and returns the CDN URL.
func (s *UploadService) PutObject(ctx context.Context, key string, data []byte, contentType string) (string, error) {
	_, err := s.s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("failed to put object %s: %w", key, err)
	}
	return s.CDNURL(key), nil
}