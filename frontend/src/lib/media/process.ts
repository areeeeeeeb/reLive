// =============================================================================
// Media Processing Pipeline
// Handles metadata extraction and concert detection for queued media
// =============================================================================

import { detectConcert } from '../v2api/concerts';
import type { ConcertDetectRequest } from '../v2api/concerts';
import { mediaItemToFile } from './selection';
import { extractMediaMetadata } from './info';
import { updateQueueItem, getQueue } from './queue';
import type { QueuedMedia } from './types';

/**
 * extract metadata
 * only runs if we're missing key metadata (location or date)
 */
export async function extractItemMetadata(queuedItem: QueuedMedia): Promise<void> {
  try {
    // skip if we already extracted metadata
    if (queuedItem.metadataExtracted) return;

    // convert to file
    const file = await mediaItemToFile(queuedItem.media);
    if (!file) {
      console.warn(`[Metadata] Failed to convert ${queuedItem.fileName} to file`);
      updateQueueItem(queuedItem.id, { metadataExtracted: true });
      return;
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
      console.warn(`[Metadata] No metadata extracted for ${queuedItem.fileName}`);
      updateQueueItem(queuedItem.id, { metadataExtracted: true });
    }
  } catch (error) {
    console.error(`[Metadata] Failed to extract metadata for ${queuedItem.fileName}:`, error);
    updateQueueItem(queuedItem.id, { metadataExtracted: true });
  }
}

/**
 * detect concerts 
 * only runs if item has the required metadata (location and date)
 */
export async function detectConcertForItem(queuedItem: QueuedMedia): Promise<void> {
  try {
    // skip if no metadata to detect with
    if (!queuedItem.metadata.latitude || !queuedItem.metadata.recordedAt) {
      updateQueueItem(queuedItem.id, {
        detectingStatus: 'completed',
        concertMatches: [],
      });
      return;
    }

    // prepare detection request
    const detectReq: ConcertDetectRequest = {
      recordedAt: queuedItem.metadata.recordedAt.toISOString(),
      latitude: queuedItem.metadata.latitude,
      longitude: queuedItem.metadata.longitude,
    };

    // call detection API
    const result = await detectConcert(detectReq);

    // update queue item with matches
    if (result.detected && result.matches.length > 0) {
      updateQueueItem(queuedItem.id, {
        detectingStatus: 'completed',
        concertMatches: result.matches,
      });
    } else {
      updateQueueItem(queuedItem.id, {
        detectingStatus: 'completed',
        concertMatches: [],
      });
    }
  } catch (error) {
    updateQueueItem(queuedItem.id, {
      detectingStatus: 'failed',
      concertMatches: [],
    });
  }
}

/**
 * process all queued media items: extract metadata and detect concerts
 */
export async function processQueuedMedia(): Promise<void> {
  const queue = getQueue();

  // extract metadata for all items concurrently
  const itemsToExtract = queue.filter(item => !item.metadataExtracted);
  if (itemsToExtract.length > 0) {
    const extractionPromises = itemsToExtract.map(item => extractItemMetadata(item));
    await Promise.all(extractionPromises); 
  }

  // get fresh queue state after metadata extraction
  const updatedQueue = getQueue();
  const itemsToDetect = updatedQueue.filter(item => item.detectingStatus === 'pending');

  if (itemsToDetect.length > 0) {
    const detectionPromises = itemsToDetect.map(item => detectConcertForItem(item));
    await Promise.all(detectionPromises).catch(error => {
      console.error('[Processing Pipeline] Concert detection failed:', error);
    });
  }
}
