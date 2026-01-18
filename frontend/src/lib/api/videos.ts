import apiClient from './client';
import { API_ENDPOINTS } from './config';

export interface VideoMetadata {
  title: string;
  description?: string;
  recorded_at?: string;
  latitude?: string;
  longitude?: string;
  device_make?: string;
  device_model?: string;
  duration_seconds?: number;
  width?: number;
  height?: number;
}

export interface UploadVideoResponse {
  success: boolean;
  message: string;
  video: {
    id: number;
    title: string;
    videoUrl: string;
    duration: number;
    recordedAt: string | null;
    songId: number | null;
    createdAt: string;
  };
  metadata?: {
    hasGPS: boolean;
    hasTimestamp: boolean;
    latitude?: number;
    longitude?: number;
    location?: {
      city: string;
      state: string;
      country: string;
    };
    device?: {
      make: string;
      model: string;
    };
    dimensions?: {
      width: number;
      height: number;
    };
  };
  concert?: {
    id: number;
    artistId: number;
    artistName: string;
    venueId: number;
    venueName: string;
    venueCity: string;
    date: string;
    tourName: string | null;
    setlistFetched: boolean;
    songsCount: number;
    confidence: string;
    daysDifference: number;
    distance: number;
  };
  song?: any;
}

/**
 * Upload a video file with metadata
 * @param videoFile - The video file to upload (File or Blob)
 * @param metadata - Video metadata
 * @param userId - User ID (default: 1 for testing)
 * @param onProgress - Optional callback for upload progress
 * @returns Promise with upload response
 */
export const uploadVideo = async (
  videoFile: File | Blob,
  metadata: VideoMetadata,
  userId: number = 1,
  onProgress?: (progress: number) => void
): Promise<UploadVideoResponse> => {
  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append('user_id', userId.toString());
  formData.append('title', metadata.title);

  if (metadata.description) {
    formData.append('description', metadata.description);
  }
  if (metadata.recorded_at) {
    formData.append('recorded_at', metadata.recorded_at);
  }
  if (metadata.latitude) {
    formData.append('latitude', metadata.latitude);
  }
  if (metadata.longitude) {
    formData.append('longitude', metadata.longitude);
  }
  if (metadata.device_make) {
    formData.append('device_make', metadata.device_make);
  }
  if (metadata.device_model) {
    formData.append('device_model', metadata.device_model);
  }
  if (metadata.duration_seconds) {
    formData.append('duration_seconds', metadata.duration_seconds.toString());
  }
  if (metadata.width) {
    formData.append('width', metadata.width.toString());
  }
  if (metadata.height) {
    formData.append('height', metadata.height.toString());
  }

  const response = await apiClient.post<UploadVideoResponse>(
    API_ENDPOINTS.uploadVideo,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    }
  );

  return response.data;
};

/**
 * Get all videos
 */
export const getAllVideos = async () => {
  const response = await apiClient.get(API_ENDPOINTS.videos);
  return response.data;
};

/**
 * Get videos for a specific user
 */
export const getUserVideos = async (userId: number) => {
  const response = await apiClient.get(API_ENDPOINTS.userVideos(userId));
  return response.data;
};
