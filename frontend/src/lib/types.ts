// =============================================================================
// Shared Types
// =============================================================================

// user type
export interface User {
  id: number;
  auth0_id: string;
  email: string;
  username: string;
  display_name: string;
  profile_picture: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

// media content types (SOURCE OF TRUTH)
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ALLOWED_MEDIA_TYPES = [...ALLOWED_VIDEO_TYPES, ...ALLOWED_IMAGE_TYPES] as const;

export type VideoContentType = typeof ALLOWED_VIDEO_TYPES[number];
export type ImageContentType = typeof ALLOWED_IMAGE_TYPES[number];
export type MediaContentType = typeof ALLOWED_MEDIA_TYPES[number];

// media file extensions
const VIDEO_EXTENSIONS_MAP: Record<VideoContentType, readonly string[]> = {
  'video/mp4': ['.mp4', '.m4v'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov', '.qt'],
};
const IMAGE_EXTENSIONS_MAP: Record<ImageContentType, readonly string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};
export const ALLOWED_VIDEO_FILE_EXTENSIONS = Object.values(VIDEO_EXTENSIONS_MAP).flat();
export const ALLOWED_IMAGE_FILE_EXTENSIONS = Object.values(IMAGE_EXTENSIONS_MAP).flat();
export const ALLOWED_MEDIA_FILE_EXTENSIONS = [...ALLOWED_VIDEO_FILE_EXTENSIONS, ...ALLOWED_IMAGE_FILE_EXTENSIONS] as const;

// type guards
export function isVideoType(type: string): type is VideoContentType {
  return (ALLOWED_VIDEO_TYPES as readonly string[]).includes(type);
}

export function isImageType(type: string): type is ImageContentType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

export function isAllowedMediaType(type: string): type is MediaContentType {
  return (ALLOWED_MEDIA_TYPES as readonly string[]).includes(type);
}
