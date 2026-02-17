import { PhotoLibrary } from '@capgo/capacitor-photo-library';
import type {
  PhotoLibraryAuthorizationState,
  PhotoLibraryAsset,
} from '@capgo/capacitor-photo-library';
import { Capacitor } from '@capacitor/core';

/**
 * unified media selection result
 */
export type MediaSelection =
  | { source: 'web'; files: File[] }
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
  accept?: string;
}): Promise<MediaSelection> {
  const {
    selectionLimit = 10,
    includeVideos = true,
    includeImages = false,
    accept = 'video/*',
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
    // web: use file input
    return new Promise<MediaSelection>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = selectionLimit !== 1;
      input.style.display = 'none';

      const cleanup = () => {
        document.body.removeChild(input);
      };

      input.addEventListener('change', () => {
        const files = input.files;
        if (files && files.length > 0) {
          const fileArray = Array.from(files).slice(0, selectionLimit || files.length);
          resolve({ source: 'web', files: fileArray });
        } else {
          reject(new Error('No files selected'));
        }
        cleanup();
      });

      input.addEventListener('cancel', () => {
        reject(new Error('User cancelled file selection'));
        cleanup();
      });

      // Attach to DOM (required for some browsers)
      document.body.appendChild(input);
      input.click();
    });
  }
}


/**
 * Convert a PhotoLibraryAsset to a File object
 * Useful for legacy upload systems that expect File objects
 * @deprecated Use PhotoLibraryAsset directly in new upload system
 */
export async function assetToFile(asset: PhotoLibraryAsset): Promise<File | null> {
  if (!asset.file) return null;

  try {
    // Get the file path (prefer webPath for web compatibility)
    const filePath = asset.file.webPath || Capacitor.convertFileSrc(asset.file.path);

    // Fetch the file as a blob
    const response = await fetch(filePath);
    const blob = await response.blob();

    // Create a File object with proper name and type
    const file = new File([blob], asset.fileName || `media-${asset.id}`, {
      type: asset.mimeType || blob.type,
    });

    return file;
  } catch (error) {
    console.error(`Failed to load asset ${asset.id}:`, error);
    return null;
  }
}
