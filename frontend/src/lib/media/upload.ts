// =============================================================================
// Upload Orchestrator
// Combines v2api (backend) and s3 (object storage) to handle the full upload flow
// =============================================================================

// src/pages/Upload.tsx will call this orchestrator to handle the upload flow

import { uploadVideoInit, uploadVideoConfirm } from '../v2api/videos';
import type { UploadVideoInitRequest, UploadedPart } from '../v2api/videos';
import { putPresigned } from '../s3/upload';
import { isVideoType, getMimeTypeFromExtension } from '../types';
import type { VideoContentType } from '../types';
import { updateQueueItem } from './queue';
import { mediaItemToFile } from './selection';
import type { MediaMetadata, QueuedMedia } from './types';

// =============================================================================
// Types
// =============================================================================

export type { MediaMetadata, QueuedMedia } from './types';

export interface UploadVideoResult {
  videoId: number;
}

// =============================================================================
// Upload Video (multipart)
// =============================================================================

export async function uploadVideo(
  file: File,
  metadata?: MediaMetadata,
  onProgress?: (percent: number) => void
): Promise<UploadVideoResult> {
    // determine content type (use file.type or infer from extension)
    let contentType = file.type;
    if (!contentType || contentType === '') {
        contentType = getMimeTypeFromExtension(file.name) || '';
    }

    if (!isVideoType(contentType)) {
        throw new Error(`Unsupported file type: ${contentType || 'unknown'} (file: ${file.name})`);
    }

    // 1. initialize upload. backend creates DB record and returns presigned URLs
    const initReq: UploadVideoInitRequest = {
        filename: file.name,
        contentType: contentType,
        sizeBytes: file.size,
        // include metadata if provided
        ...(metadata?.recordedAt && { recordedAt: metadata.recordedAt.toISOString() }),
        ...(metadata?.latitude !== undefined && { latitude: metadata.latitude }),
        ...(metadata?.longitude !== undefined && { longitude: metadata.longitude }),
        ...(metadata?.duration !== undefined && { duration: metadata.duration }),
        ...(metadata?.width !== undefined && { width: metadata.width }),
        ...(metadata?.height !== undefined && { height: metadata.height }),
    };
    const initRes = await uploadVideoInit(initReq);

    // 2. upload parts concurrently
    //  Cap at 15 to avoid overwhelming the browser connection pool and causing stalled connections to reset part progress.
    const PART_CONCURRENCY = 15;
    const partCount = initRes.partUrls.length;
    const partProgress = new Array(partCount).fill(0);
    const parts: UploadedPart[] = new Array(partCount);

    const uploadPart = async (i: number) => {
        const start = i * initRes.partSize;
        const end = Math.min(start + initRes.partSize, file.size);
        const partBlob = file.slice(start, end);

        const { etag } = await putPresigned(
            initRes.partUrls[i],
            partBlob,
            contentType as VideoContentType,
            (partPercent) => {
                if (onProgress) {
                    partProgress[i] = Math.max(partProgress[i], partPercent);
                    const overallPercent = Math.round(partProgress.reduce((a, b) => a + b, 0) / partCount);
                    onProgress(overallPercent);
                }
            }
        );

        if (!etag) throw new Error(`Failed to upload part ${i + 1}`);
        parts[i] = { partNumber: i + 1, etag };
    };

    for (let i = 0; i < partCount; i += PART_CONCURRENCY) {
        await Promise.all(
            Array.from({ length: Math.min(PART_CONCURRENCY, partCount - i) }, (_, j) => uploadPart(i + j))
        );
    }

    // 3. confirm upload. backend calls S3 CompleteMultipartUpload
    await uploadVideoConfirm(initRes.videoId, {
        uploadId: initRes.uploadId,
        parts,
    });

    return { videoId: initRes.videoId };
}

// TODO: photo upload (single PUT, no multipart)

// =============================================================================
// Process Queued Uploads
// =============================================================================

/**
 * process queued items and upload them concurrently
 */
export async function processUploads(queuedItems: QueuedMedia[]): Promise<void> {
  // only upload items that are pending (uninitialized)
  const itemsToUpload = queuedItems.filter(item => item.uploadStatus === 'pending');
  if (itemsToUpload.length === 0) return;

  // upload files one at a time — uploading all concurrently multiplies connection count
  // (N videos × PART_CONCURRENCY parts) which causes DO Spaces to throttle aggressively
  for (const queuedItem of itemsToUpload) {
    try {
      // mark as uploading
      updateQueueItem(queuedItem.id, { uploadStatus: 'uploading' });
      const file = await mediaItemToFile(queuedItem.media);
      if (!file) throw new Error('Failed to convert media to file');
      // upload with metadata
      const result = await uploadVideo(
        file,
        queuedItem.metadata,
        (progress) => {
          updateQueueItem(queuedItem.id, { uploadProgress: progress });
        },
      );
      // mark as completed
      updateQueueItem(queuedItem.id, {
        uploadStatus: 'completed',
        uploadProgress: 100,
        videoId: result.videoId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      console.error(`Upload failed for ${queuedItem.fileName}:`, error);
      updateQueueItem(queuedItem.id, {
        uploadStatus: 'failed',
        uploadError: errorMessage,
      });
    }
  }
}
