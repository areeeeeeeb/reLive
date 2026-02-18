import type { MediaItem } from './selection';
import { mediaItemToFile } from './selection';
import { extractVideoMetadata } from './info';
import { deleteVideo } from '../v2api/videos';


// INTERFACE
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
  duration?: number;
  width?: number;
  height?: number;
  recordedAt?: Date;
  latitude?: number;
  longitude?: number;
}

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
      : 'file'; // web handles don't have fileName easily accessible yet

    // basic metadata from asset
    let metadata: Partial<QueuedMedia> = {};

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
    }

    // create initial queued item
    const queuedItem: QueuedMedia = {
      id,
      media,
      fileName,
      status: 'pending' as const,
      progress: 0,
      ...metadata,
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
      // skip if we already have location and date from native asset
      const hasLocation = queuedItem.latitude != null && queuedItem.longitude != null;
      const hasDate = queuedItem.recordedAt != null;

      if (hasLocation && hasDate) {
        console.log(`Skipping MediaInfo for ${queuedItem.fileName} - already have metadata`);
        continue;
      }

      // convert to file
      const file = await mediaItemToFile(queuedItem.media);
      if (!file) continue;

      // extract metadata using MediaInfo
      const metadata = await extractVideoMetadata(file);

      // update queue item with missing metadata only
      if (metadata) {
        updateQueueItem(queuedItem.id, {
          recordedAt: queuedItem.recordedAt || metadata.recordedAt,
          latitude: queuedItem.latitude || metadata.latitude,
          longitude: queuedItem.longitude || metadata.longitude,
          duration: metadata.duration || queuedItem.duration,
          width: metadata.width || queuedItem.width,
          height: metadata.height || queuedItem.height,
        });
      }
    } catch (error) {
      console.error(`Failed to extract metadata for ${queuedItem.fileName}:`, error);
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
    .filter(item => item.status === 'completed' && item.videoId != null)
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
