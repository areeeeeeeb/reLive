// =============================================================================
// shared types for media selection, queuing, and uploading
// =============================================================================

import type { PhotoLibraryAsset } from '@capgo/capacitor-photo-library';
import type { ConcertMatch } from '../v2api/concerts';

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
 * status for uploading
 */
export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';

/**
 * status for concert detection
 */
export type DetectingStatus = 'pending' | 'completed' | 'failed';

/**
 * queued media item with upload and processing status tracking
 */
export interface QueuedMedia {
  id: string; // unique identifier
  media: MediaItem;
  fileName: string;
  // upload tracking
  uploadStatus: UploadStatus;
  uploadProgress: number; // 0-100
  uploadError?: string;
  videoId?: number;
  // metadata
  metadata: MediaMetadata;
  metadataExtracted: boolean; // whether we've attempted to extract metadata
  // concert detection
  detectingStatus: DetectingStatus;
  concertMatches?: ConcertMatch[]; // detected concert matches (up to 3)
}
