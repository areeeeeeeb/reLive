// =============================================================================
// Upload Orchestrator
// Combines v2api (backend) and s3 (object storage) to handle the full upload flow
// =============================================================================

// src/pages/Upload.tsx will call this orchestrator to handle the upload flow

import { uploadVideoInit, uploadVideoConfirm } from './v2api/videos';
import type { UploadVideoInitRequest, UploadedPart } from './v2api/videos';
import { putPresigned } from './s3/upload';
import type { VideoContentType } from './types';

// =============================================================================
// Types
// =============================================================================

export interface UploadVideoResult {
  videoId: number;
}

// =============================================================================
// Upload Video (multipart)
// =============================================================================

export async function uploadVideo(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadVideoResult> {

  // 1. initialize upload. backend creates DB record and returns presigned URLs
  const initReq: UploadVideoInitRequest = {
    filename: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  };
  const initRes = await uploadVideoInit(initReq);

  // 2. upload each part to S3
  const parts: UploadedPart[] = [];
  const partCount = initRes.partUrls.length;

  for (let i = 0; i < partCount; i++) {
    const start = i * initRes.partSize;
    const end = Math.min(start + initRes.partSize, file.size);
    const partBlob = file.slice(start, end);

    const { etag } = await putPresigned(
      initRes.partUrls[i],
      partBlob,
      file.type as VideoContentType,
      (partPercent) => {
        if (onProgress) {
          const overallPercent = Math.round(((i + partPercent / 100) / partCount) * 100);
          onProgress(overallPercent);
        }
      }
    );

    if (!etag) {
      throw new Error(`Failed to upload part ${i + 1}`);
    }

    parts.push({
      partNumber: i + 1,  // S3 part numbers are 1-indexed
      etag,
    });
  }

  // 3. confirm upload. backend calls S3 CompleteMultipartUpload
  await uploadVideoConfirm(initRes.videoId, {
    uploadId: initRes.uploadId,
    parts,
  });

  return { videoId: initRes.videoId };
}

// TODO: photo upload (single PUT, no multipart)

