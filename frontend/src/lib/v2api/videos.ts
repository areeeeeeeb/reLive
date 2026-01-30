import apiClient from './client';
import { API_V2_ENDPOINTS } from './config';

// ============================================================================
// Types (update as backend response shapes become clear)
// ============================================================================

export interface Video {
  id: number;
  // TODO: add fields as backend implements them
}

export interface UploadInitRequest {
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export interface UploadInitResponse {
  videoId: number;   // video ID in database
  uploadUrl: string;   // presigned URL for direct upload to object storage
  key: string;   // object path in bucket
  partSize?: number;   // chunk size for multipart upload
}

export interface UploadConfirmRequest {
  videoId: number;   // video ID in database
  key: string;   // object path in bucket
  sizeBytes: number;   // size of the uploaded file
  md5Hash: string;   // MD5 hash of the uploaded file
  contentType: string;   // content type of the uploaded file
  originalFilename: string;   // original filename of the uploaded file
  uploadId: string;   // upload ID for the multipart upload
  partNumber: number;   // part number for the multipart upload
  etag: string;   // ETag of the uploaded part
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
export const uploadVideoInit = async (req: UploadInitRequest): Promise<UploadInitResponse> => {
  const res = await apiClient.post(API_V2_ENDPOINTS.uploadVideoInit, req);
  return res.data;
};

/**
 * POST /v2/api/videos/:id/upload/confirm
 * Confirm upload completed, kick off processing
 */
export const uploadVideoConfirm = async (videoId: number, req?: UploadConfirmRequest): Promise<void> => {
  await apiClient.post(API_V2_ENDPOINTS.uploadVideoConfirm(videoId), req ?? {});
};

/**
 * DELETE /v2/api/videos/:id
 * Delete a video
 */
export const deleteVideo = async (videoId: number): Promise<void> => {
  await apiClient.delete(API_V2_ENDPOINTS.deleteVideo(videoId));
};

