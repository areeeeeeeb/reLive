package config

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func (c *Config) NewS3Client(ctx context.Context) (*s3.Client, error) {
	if c.Spaces.AccessKey == "" || c.Spaces.SecretKey == "" {
		return nil, fmt.Errorf("DO Spaces credentials not configured")
	}

	client := s3.New(s3.Options{
		BaseEndpoint: aws.String(c.Spaces.Endpoint),
		Region:       c.Spaces.Region,
		Credentials:  credentials.NewStaticCredentialsProvider(c.Spaces.AccessKey, c.Spaces.SecretKey, ""),
		UsePathStyle: true,
	})

	return client, nil
}