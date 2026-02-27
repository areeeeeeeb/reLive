import { PhotoLibrary } from '@capgo/capacitor-photo-library';
import type { PhotoLibraryAuthorizationState } from '@capgo/capacitor-photo-library';
import { Capacitor } from '@capacitor/core';
import {
  ALLOWED_VIDEO_FILE_EXTENSIONS,
  ALLOWED_IMAGE_FILE_EXTENSIONS,
} from '../types';
import type { MediaItem, MediaSelection } from './types';
export type { MediaItem, MediaSelection } from './types';

/**
 * request authorization to access the photo library (native only)
 * @returns the authorization state
 * @throws error if access is denied or restricted
 */
async function requestPhotoLibraryAccess(): Promise<PhotoLibraryAuthorizationState> {
  const { state } = await PhotoLibrary.requestAuthorization();
  if (state !== 'authorized' && state !== 'limited') {
    throw new Error(`Photo library access ${state}. Please enable in Settings.`);
  }
  return state;
}

/**
 * platform-agnostic media selector
 * @returns promise that resolves with selected media
 */
export async function selectMedia(options?: {
  selectionLimit?: number;
  includeVideos?: boolean;
  includeImages?: boolean;
}): Promise<MediaSelection> {
  const {
    selectionLimit = undefined,
    includeVideos = true,
    includeImages = false,
  } = options || {};

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    // native: use PhotoLibrary
    await requestPhotoLibraryAccess();
    const selection = await PhotoLibrary.pickMedia({
      selectionLimit,
      includeVideos,
      includeImages
    });

    // filter out any assets that failed to persist
    const validAssets = selection.assets.filter(asset => asset.file || asset.thumbnail);

    // if no valid assets, user likely cancelled
    if (validAssets.length === 0) {
      throw new Error('User cancelled media selection');
    }

    return validAssets.map(asset => ({ source: 'native' as const, asset }));
  } else {
    // web: use file system
    try {
      // file system access API expects file extensions
      const accept: Record<string, string[]> = {};
      if (includeVideos) accept['video/*'] = ALLOWED_VIDEO_FILE_EXTENSIONS;
      if (includeImages) accept['image/*'] = ALLOWED_IMAGE_FILE_EXTENSIONS;

      const pickerOpts: any = {
        types: [{ accept }],
        multiple: selectionLimit !== 1,
      };

      const handles = await (window as any).showOpenFilePicker(pickerOpts);
      const limitedHandles = handles.slice(0, selectionLimit || handles.length);

      return limitedHandles.map((handle: FileSystemFileHandle) => ({ source: 'web' as const, handle }));
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('User cancelled file selection');
      }
      throw error;
    }
  }
}


/**
 * convert a media item to a File object
 */
export async function mediaItemToFile(
  item: MediaItem
): Promise<File | null> {
  // web: FileSystemFileHandle
  if (item.source === 'web') {
    return await item.handle.getFile();
  }

  // native: PhotoLibraryAsset
  if (!item.asset.file) return null;

  try {
    // PhotoLibraryFile already has webPath which is Capacitor.convertFileSrc(path)
    const response = await fetch(item.asset.file.webPath);
    const blob = await response.blob();

    // create a file object with proper name, type, and size
    const file = new File([blob], item.asset.fileName, {
      type: item.asset.file.mimeType || item.asset.mimeType || blob.type,
    });
    return file;
  } catch (error) {
    console.error(`Failed to load asset ${item.asset.id}:`, error);
    return null;
  }
}

/**
 * get thumbnail URLs for media selection
 * @param input - MediaSelection or single item
 * @returns array of thumbnail webPaths
 */
export function getMediaThumbnails(
  input: MediaSelection | MediaItem
): (string | null)[] {
  const items = Array.isArray(input) ? input : [input];

  return items.map(item => {
    // native: PhotoLibraryAsset with thumbnail
    if (item.source === 'native' && item.asset.thumbnail) {
      return item.asset.thumbnail.webPath || null;
    }
    // web: not supported
    return null;
  });
}
