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
  videoId: number;
  uploadUrl: string;
  key: string;
  // TODO: add fields as backend implements them
}

export interface UploadConfirmRequest {
  // TODO: add fields as backend implements them
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

