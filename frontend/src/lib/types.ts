// =============================================================================
// Shared Types
// =============================================================================

// media content types
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ALLOWED_MEDIA_TYPES = [...ALLOWED_VIDEO_TYPES, ...ALLOWED_IMAGE_TYPES] as const;

export type VideoContentType = typeof ALLOWED_VIDEO_TYPES[number];
export type ImageContentType = typeof ALLOWED_IMAGE_TYPES[number];
export type MediaContentType = typeof ALLOWED_MEDIA_TYPES[number];

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
