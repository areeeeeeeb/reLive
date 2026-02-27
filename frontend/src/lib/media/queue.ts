import { mediaItemToFile } from './selection';
import { extractMediaMetadata } from './info';
import { deleteVideo } from '../v2api/videos';
import type { MediaItem, MediaMetadata, QueuedMedia } from './types';
export type { QueuedMedia } from './types';

// QUEUE STATE
// array-based queue holding individual media items
let uploadQueue: QueuedMedia[] = [];
// listeners for queue changes
type QueueChangeListener = (queue: QueuedMedia[]) => void;
const listeners: Set<QueueChangeListener> = new Set();


// QUEUE OPERATIONS
/**
 * subscribe to queue changes
 */
export const subscribeToQueue = (listener: QueueChangeListener): (() => void) => {
  listeners.add(listener);
  // immediately notify with current state
  listener(uploadQueue);
  // return unsubscribe function
  return () => {
    listeners.delete(listener);
  };
};

/**
 * notify all listeners of queue change
 */
const notifyListeners = () => {
  listeners.forEach(listener => listener([...uploadQueue]));
};

/**
 * add media items to the queue
 */
export const addToQueue = async (items: MediaItem[]): Promise<void> => {
  const newItems: QueuedMedia[] = [];

  for (let index = 0; index < items.length; index++) {
    const media = items[index];

    // generate unique ID
    const id = `${Date.now()}-${index}`;

    // extract filename
    const fileName = media.source === 'native'
      ? media.asset.fileName
      : media.handle.name;

    // basic metadata from asset
    let metadata: MediaMetadata = {};
    let metadataExtracted = false;

    if (media.source === 'native') {
      metadata = {
        duration: media.asset.duration,
        width: media.asset.width,
        height: media.asset.height,
        // try to get location and date from native asset first
        latitude: media.asset.latitude,
        longitude: media.asset.longitude,
        recordedAt: media.asset.creationDate ? new Date(media.asset.creationDate) : undefined,
      };

      // if we have both location and date from native asset, no need to extract
      const hasLocation = metadata.latitude != null && metadata.longitude != null;
      const hasDate = metadata.recordedAt != null;
      metadataExtracted = hasLocation && hasDate;
    }

    // create initial queued item
    const queuedItem: QueuedMedia = {
      id,
      media,
      fileName,
      uploadStatus: 'pending',
      uploadProgress: 0,
      metadata,
      metadataExtracted,
      processingStatus: 'pending',
    };

    newItems.push(queuedItem);
  }

  // add all items to queue immediately
  uploadQueue.push(...newItems);
  notifyListeners();

  // extract detailed metadata asynchronously (don't block queue)
  extractMetadataAsync(newItems);
};

/**
 * extract metadata from queued items asynchronously
 * only runs if we're missing key metadata (location or date)
 */
async function extractMetadataAsync(items: QueuedMedia[]): Promise<void> {
  for (const queuedItem of items) {
    try {
      // skip if we already extracted metadata
      if (queuedItem.metadataExtracted) continue;

      // convert to file
      const file = await mediaItemToFile(queuedItem.media);
      if (!file) {
        updateQueueItem(queuedItem.id, { metadataExtracted: true });
        continue;
      }

      // extract metadata using MediaInfo
      const extractedMetadata = await extractMediaMetadata(file);

      // update queue item with missing metadata only
      if (extractedMetadata) {
        updateQueueItem(queuedItem.id, {
          metadata: {
            recordedAt: queuedItem.metadata.recordedAt || extractedMetadata.recordedAt,
            latitude: queuedItem.metadata.latitude || extractedMetadata.latitude,
            longitude: queuedItem.metadata.longitude || extractedMetadata.longitude,
            duration: extractedMetadata.duration || queuedItem.metadata.duration,
            width: extractedMetadata.width || queuedItem.metadata.width,
            height: extractedMetadata.height || queuedItem.metadata.height,
          },
          metadataExtracted: true,
        });
      } else {
        updateQueueItem(queuedItem.id, { metadataExtracted: true });
      }
    } catch (error) {
      console.error(`Failed to extract metadata for ${queuedItem.fileName}:`, error);
      updateQueueItem(queuedItem.id, { metadataExtracted: true });
    }
  }
}

/**
 * update a queued item's status
 */
export const updateQueueItem = (id: string, updates: Partial<Omit<QueuedMedia, 'id' | 'media' | 'fileName'>>): void => {
  const index = uploadQueue.findIndex(item => item.id === id);
  if (index !== -1) {
    uploadQueue[index] = { ...uploadQueue[index], ...updates };
    notifyListeners();
  }
};

/**
 * get current queue
 */
export const getQueue = (): QueuedMedia[] => {
  return [...uploadQueue];
};

/**
 * clear all queue items
 */
export const clearQueue = (): void => {
  uploadQueue = [];
  notifyListeners();
};

/**
 * remove specific item from queue
 */
export const removeFromQueue = (id: string): void => {
  uploadQueue = uploadQueue.filter(item => item.id !== id);
  notifyListeners();
};

/**
 * check if queue has items
 */
export const hasQueuedItems = (): boolean => {
  return uploadQueue.length > 0;
};

/**
 * get all completed video IDs from the queue
 */
export const getCompletedVideoIds = (): number[] => {
  return uploadQueue
    .filter(item => item.uploadStatus === 'completed' && item.videoId != null)
    .map(item => item.videoId!);
};

/**
 * clear queue and delete any uploaded videos from backend
 */
export const clearQueueAndDeleteUploads = async (): Promise<void> => {
  const videoIds = getCompletedVideoIds();

  // clear queue immediately (optimistic UI)
  clearQueue();

  // delete uploaded videos in background
  if (videoIds.length > 0) {
    console.log('Deleting uploaded videos:', videoIds);
    const deletePromises = videoIds.map(videoId =>
      deleteVideo(videoId).catch(err => {
        console.error(`Failed to delete video ${videoId}:`, err);
      })
    );
    await Promise.all(deletePromises);
  }
};
