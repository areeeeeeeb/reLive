export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
  // Video endpoints
  videos: '/api/videos',
  uploadVideo: '/api/videos/upload',
  userVideos: (userId: number) => `/api/users/${userId}/videos`,

  // Concert endpoints
  concerts: '/api/concerts',
  concertPage: (concertId: number) => `/api/concerts/${concertId}/page`,
  concertVideos: (concertId: number) => `/api/concerts/${concertId}/videos`,
  searchConcerts: '/api/concerts/search',

  // User endpoints
  userProfile: (userId: number) => `/api/users/${userId}/profile`,
  userHome: (userId: number) => `/api/users/${userId}/home`,

  // Song endpoints
  concertSetlist: (concertId: number) => `/api/songs/concert/${concertId}`,

  // Health check
  health: '/health',
  healthDb: '/health/db',
} as const;
