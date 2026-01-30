// =============================================================================
// Environment Variables - Single source of truth
// =============================================================================

// API Base URLs
export const API_V1_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
export const API_V2_BASE_URL = import.meta.env.VITE_API_V2_BASE_URL || 'http://localhost:8081';

// Auth0
export const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN || '';
export const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || '';

// DigitalOcean Spaces (S3-compatible)
export const DO_SPACES_ENDPOINT = import.meta.env.VITE_DO_SPACES_ENDPOINT || '';
export const DO_SPACES_BUCKET = import.meta.env.VITE_DO_SPACES_BUCKET || '';
export const DO_SPACES_REGION = import.meta.env.VITE_DO_SPACES_REGION || '';
export const DO_SPACES_KEY = import.meta.env.VITE_DO_SPACES_KEY || '';
export const DO_SPACES_SECRET = import.meta.env.VITE_DO_SPACES_SECRET || '';
export const DO_SPACES_CDN_URL = import.meta.env.VITE_DO_SPACES_CDN_URL || '';

// =============================================================================
// API Endpoints
// =============================================================================

// v1 API (TypeScript backend on :3000)
export const API_V1_ENDPOINTS = {
  // Videos
  videos: '/api/videos',
  uploadVideo: '/api/videos/upload',
  userVideos: (userId: number) => `/api/users/${userId}/videos`,

  // Concerts
  concerts: '/api/concerts',
  concertPage: (concertId: number) => `/api/concerts/${concertId}/page`,
  concertVideos: (concertId: number) => `/api/concerts/${concertId}/videos`,
  searchConcerts: '/api/concerts/search',

  // Users
  userProfile: (userId: number) => `/api/users/${userId}/profile`,
  userHome: (userId: number) => `/api/users/${userId}/home`,

  // Songs
  concertSetlist: (concertId: number) => `/api/songs/concert/${concertId}`,

  // Health
  health: '/health',
  healthDb: '/health/db',
} as const;

// v2 API (Go backend on :8081)
export const API_V2_ENDPOINTS = {
  // Videos
  listAllVideos: '/v2/api/videos',
  getVideo: (videoId: number) => `/v2/api/videos/${videoId}`,
  uploadVideoInit: '/v2/api/videos/upload/init',
  uploadVideoConfirm: (videoId: number) => `/v2/api/videos/${videoId}/upload/confirm`,
  deleteVideo: (videoId: number) => `/v2/api/videos/${videoId}`,

  // Users
  userSync: '/v2/api/users/sync',
  userMe: '/v2/api/users/me',
} as const;

