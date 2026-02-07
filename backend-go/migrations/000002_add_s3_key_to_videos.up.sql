-- Add s3_key column to videos table for storing S3 object key
ALTER TABLE videos ADD COLUMN s3_key VARCHAR(512);
