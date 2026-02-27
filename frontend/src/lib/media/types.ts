// =============================================================================
// shared types for media selection, queuing, and uploading
// =============================================================================

import type { PhotoLibraryAsset } from '@capgo/capacitor-photo-library';

/**
 * unified media selection result
 * both web and native use lightweight references that can be converted to file objects when needed
 */
export type MediaItem =
  | { source: 'web'; handle: FileSystemFileHandle }
  | { source: 'native'; asset: PhotoLibraryAsset };

export type MediaSelection = MediaItem[];

/**
 * metadata extracted from media files
 */
export interface MediaMetadata {
  recordedAt?: Date;
  latitude?: number;
  longitude?: number;
  duration?: number;
  width?: number;
  height?: number;
}

/**
 * queued media item with upload status tracking
 */
export interface QueuedMedia {
  id: string; // unique identifier
  media: MediaItem;
  fileName: string;
  // upload tracking
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
  videoId?: number;
  // metadata
  metadata: MediaMetadata;
}
