package services

import (
	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type VideoService struct {
	store    *database.Store
	s3Client *s3.Client
	bucket   string
	cdnURL   string
}

func NewVideoService(store *database.Store, s3Client *s3.Client, bucket string, cdnURL string) *VideoService {
	return &VideoService{
		store:    store,
		s3Client: s3Client,
		bucket:   bucket,
		cdnURL:   cdnURL,
	}
}
