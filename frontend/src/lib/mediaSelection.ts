import { PhotoLibrary } from '@capgo/capacitor-photo-library';
import type {
  PhotoLibraryAuthorizationState,
  PhotoLibraryAsset,
} from '@capgo/capacitor-photo-library';
import { Capacitor } from '@capacitor/core';
import {
  ALLOWED_VIDEO_FILE_EXTENSIONS,
  ALLOWED_IMAGE_FILE_EXTENSIONS,
} from './types';

/**
 * unified media selection result
 * both web and native use lightweight references that can be converted to File objects when needed
 */
export type MediaSelection =
  | { source: 'web'; handles: FileSystemFileHandle[] }
  | { source: 'native'; assets: PhotoLibraryAsset[] };

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
      includeImages,
    });
    return { source: 'native', assets: selection.assets };
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

      return { source: 'web', handles: limitedHandles };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('User cancelled file selection');
      }
      throw error;
    }
  }
}


/**
 * convert a media selection item to a File object
 */
export async function mediaSelectionToFile(
  item: FileSystemFileHandle | PhotoLibraryAsset
): Promise<File | null> {
  // web: FileSystemFileHandle
  if ('getFile' in item) return await item.getFile();

  // native: PhotoLibraryAsset
  if (!item.file) return null;

  try {
    // get the file path
    const filePath = Capacitor.convertFileSrc(item.file.path);
    // fetch the file as a blob
    const response = await fetch(filePath);
    const blob = await response.blob();
    // create a file object with proper name and type
    const file = new File([blob], item.fileName, {
      type: item.mimeType || blob.type,
    });
    return file;
  } catch (error) {
    console.error(`Failed to load asset ${item.id}:`, error);
    return null;
  }
}
