import { S3Client, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createReadStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'DO_SPACES_ENDPOINT',
  'DO_SPACES_BUCKET',
  'DO_SPACES_KEY',
  'DO_SPACES_SECRET',
  'DO_SPACES_REGION',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Configure S3 client for DigitalOcean Spaces
const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,   // leave as string; DO supports this
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  forcePathStyle: false, // DO uses virtual-hosted style, correct
});

export default s3Client;
export const SPACES_BUCKET = process.env.DO_SPACES_BUCKET!;
/**
 * Upload video to DigitalOcean Spaces
 * @param filePath - Local path to video file
 * @param options - Upload options
 * @returns Object with URL, key, and metadata
 */
export const uploadVideo = async (
  filePath: string,
  options: {
    folder?: string;
    originalName?: string;
    contentType?: string;
  } = {}
): Promise<{
  url: string;
  cdnUrl: string;
  key: string;
  bucket: string;
  size?: number;
}> => {
  try {
    const bucket = process.env.DO_SPACES_BUCKET!;
    const cdnBaseUrl = process.env.DO_SPACES_CDN_URL || process.env.DO_SPACES_ENDPOINT;

    // Generate unique filename
    const fileExt = path.extname(options.originalName || filePath);
    const uniqueId = uuidv4();
    const fileName = `${uniqueId}${fileExt}`;
    
    // Construct key (path in bucket)
    const folder = options.folder || 'videos';
    const key = `${folder}/${fileName}`;

    console.log(`📤 Uploading to DigitalOcean Spaces: ${key}`);

    // Create read stream from file
    const fileStream = createReadStream(filePath);

    // Configure upload with multipart for large files
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: fileStream,
        ACL: 'public-read', // Make video publicly accessible
        ContentType: options.contentType || 'video/mp4',
        // Optional: Set cache control for CDN
        CacheControl: 'public, max-age=31536000', // 1 year
      },
    });

    // Track upload progress
    upload.on('httpUploadProgress', (progress) => {
      if (progress.loaded && progress.total) {
        const percent = ((progress.loaded / progress.total) * 100).toFixed(2);
        console.log(`Upload progress: ${percent}%`);
      }
    });

    // Execute upload
    const result = await upload.done();

    // Construct URLs
    const url = `${process.env.DO_SPACES_ENDPOINT}/${bucket}/${key}`;
    const cdnUrl = `${cdnBaseUrl}/${key}`;

    console.log(`✅ Upload complete: ${cdnUrl}`);

    return {
      url,
      cdnUrl,
      key,
      bucket,
      size: result.$metadata.httpStatusCode === 200 ? undefined : undefined,
    };
  } catch (error) {
    console.error('❌ DigitalOcean Spaces upload error:', error);
    throw new Error(`Failed to upload video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Delete video from DigitalOcean Spaces
 * @param key - Object key (path) in bucket
 * @returns Success status
 */
export const deleteVideo = async (key: string): Promise<{ success: boolean }> => {
  try {
    const bucket = process.env.DO_SPACES_BUCKET!;

    console.log(`🗑️  Deleting from DigitalOcean Spaces: ${key}`);

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);

    console.log(`✅ Delete complete: ${key}`);

    return { success: true };
  } catch (error) {
    console.error('❌ DigitalOcean Spaces delete error:', error);
    throw new Error(`Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Check if video exists in DigitalOcean Spaces
 * @param key - Object key (path) in bucket
 * @returns Boolean indicating if object exists
 */
export const videoExists = async (key: string): Promise<boolean> => {
  try {
    const bucket = process.env.DO_SPACES_BUCKET!;

    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
};

/**
 * Get video metadata from DigitalOcean Spaces
 * @param key - Object key (path) in bucket
 * @returns Metadata object
 */
export const getVideoMetadata = async (
  key: string
): Promise<{
  contentLength?: number;
  contentType?: string;
  lastModified?: Date;
  etag?: string;
}> => {
  try {
    const bucket = process.env.DO_SPACES_BUCKET!;

    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    return {
      contentLength: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      etag: response.ETag,
    };
  } catch (error) {
    console.error('❌ Failed to get video metadata:', error);
    throw new Error(`Failed to get video metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate a public URL for a video
 * @param key - Object key (path) in bucket
 * @returns Public CDN URL
 */
export const getVideoUrl = (key: string): string => {
  const cdnBaseUrl = process.env.DO_SPACES_CDN_URL || 
    `${process.env.DO_SPACES_ENDPOINT}/${process.env.DO_SPACES_BUCKET}`;
  return `${cdnBaseUrl}/${key}`;
};