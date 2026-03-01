import s3Client from './client';
import { MediaContentType } from '../types';

/**
 * PUT bytes to a presigned S3/Spaces URL.
 */
export async function putPresigned(
  url: string,
  blob: Blob,
  contentType: MediaContentType,
  onProgress?: (pct: number) => void
): Promise<{ etag?: string }> {
  const res = await s3Client.put(url, blob, {
    headers: { 'Content-Type': contentType },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });

  // Entity tag for the uploaded object
  // hash of only the content
  const etag = res.headers.etag?.replaceAll('"', '');  // ex) ETag: "d41d8cd98f00b204e9800998ecf8427e"
  return { etag };
}
