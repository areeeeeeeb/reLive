package config

import (
	"os"
    "context"
    "log"
	"github.com/joho/godotenv"

	"github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/credentials"
    "github.com/aws/aws-sdk-go-v2/service/s3"
	)
	
var S3Client *s3.Client

func InitSpaces() {
	godotenv.Load()

	endpoint := os.Getenv("DO_SPACES_ENDPOINT")
	region := os.Getenv("DO_SPACES_REGION")
	accessKey := os.Getenv("DO_SPACES_KEY")
	secretKey := os.Getenv("DO_SPACES_SECRET")

	if accessKey == "" || secretKey == "" || endpoint == "" || region == "" {
		log.Fatal("DigitalOcean Spaces credentials or configuration are not set in environment variables")
	}

	customResolver := aws.EndpointResolverWithOptionsFunc(
        func(service, region string, options ...interface{}) (aws.Endpoint, error) {
            return aws.Endpoint{
                URL:               endpoint,
                SigningRegion:     region,
                HostnameImmutable: true, // Important for Spaces
            }, nil
        },
    )

	cfg := aws.Config{
		Region:      region,
		Credentials: credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
		EndpointResolverWithOptions: customResolver,
	}
	S3Client = s3.NewFromConfig(cfg)
	log.Println("DigitalOcean Spaces S3 client initialized")


}