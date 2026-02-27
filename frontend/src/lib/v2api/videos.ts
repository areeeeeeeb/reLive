import apiClient from './client';
import { API_V2_ENDPOINTS } from './config';

// ============================================================================
// Types (update as backend response shapes become clear)
// ============================================================================

export interface Video {
  id: number;
  // TODO: add fields as backend implements them
}

export interface UploadVideoInitRequest {
  filename: string;
  contentType: string;
  sizeBytes: number;

  // client-extracted metadata (optional)
  recordedAt?: string;  // ISO 8601 timestamp
  latitude?: number;
  longitude?: number;
  duration?: number;    // seconds
  width?: number;
  height?: number;
}

export interface UploadVideoInitResponse {
  videoId: number;      // video ID in database
  uploadId: string;     // S3 multipart upload ID
  partUrls: string[];   // presigned URL for each part (in order)
  partSize: number;     // size of each part
}

export interface UploadedPart {
  partNumber: number;
  etag: string;
}

export interface UploadVideoConfirmRequest {
  uploadId: string;       // S3 multipart upload ID
  parts: UploadedPart[];  // all completed parts
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * GET /v2/api/videos
 * List all videos
 */
export const listAllVideos = async (): Promise<Video[]> => {
  const res = await apiClient.get(API_V2_ENDPOINTS.listAllVideos);
  return res.data;
};

/**
 * GET /v2/api/videos/:id
 * Get a video by ID
 */
export const getVideo = async (videoId: number): Promise<Video> => {
  const res = await apiClient.get(API_V2_ENDPOINTS.getVideo(videoId));
  return res.data;
};

/**
 * POST /v2/api/videos/upload/init
 * Get presigned URL for direct upload to object storage
 */
export const uploadVideoInit = async (req: UploadVideoInitRequest): Promise<UploadVideoInitResponse> => {
  const res = await apiClient.post(API_V2_ENDPOINTS.uploadVideoInit, req);
  return res.data;
};

/**
 * POST /v2/api/videos/:id/upload/confirm
 * Confirm upload completed, kick off processing
 */
export const uploadVideoConfirm = async (videoId: number, req: UploadVideoConfirmRequest): Promise<void> => {
  await apiClient.post(API_V2_ENDPOINTS.uploadVideoConfirm(videoId), req);
};

/**
 * DELETE /v2/api/videos/:id
 * Delete a video
 */
export const deleteVideo = async (videoId: number): Promise<void> => {
  await apiClient.delete(API_V2_ENDPOINTS.deleteVideo(videoId));
};

