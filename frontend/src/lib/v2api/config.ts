export const API_BASE_URL = import.meta.env.VITE_API_V2_BASE_URL || 'http://localhost:8081';

export const API_V2_ENDPOINTS = {
  // Videos
  listAllVideos: '/v2/api/videos',
  getVideo: (videoId: number) => `/v2/api/videos/${videoId}`,
  deleteVideo: (videoId: number) => `/v2/api/videos/${videoId}`,
  uploadVideoInit: '/v2/api/videos/upload/init',
  uploadVideoConfirm: (videoId: number) => `/v2/api/videos/${videoId}/upload/confirm`,


  // Users
  userSync: '/v2/api/users/sync',
  userMe: '/v2/api/users/me',
} as const;

