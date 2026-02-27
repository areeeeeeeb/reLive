import MediaInfoFactory from 'mediainfo.js';
import type { MediaInfo, ReadChunkFunc, MediaInfoResult } from 'mediainfo.js';

let mediainfoInstance: MediaInfo | null = null;

/**
 * get or initialize the MediaInfo instance
 */
async function getMediaInfo(): Promise<MediaInfo> {
  if (!mediainfoInstance) {
    mediainfoInstance = await MediaInfoFactory({
      format: 'object',
      locateFile: () => 'https://cdn.jsdelivr.net/npm/mediainfo.js/dist/MediaInfoModule.wasm',
    });
  }
  return mediainfoInstance;
}

/**
 * extracted metadata from video file
 */
export interface MediaMetadata {
  recordedAt?: Date;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  duration?: number;
  width?: number;
  height?: number;
}

/**
 * extract metadata from a video file using MediaInfo
 */
export async function extractMediaMetadata(file: File): Promise<MediaMetadata> {
  try {
    const mediainfo = await getMediaInfo();

    const getSize = () => file.size;
    const readChunk: ReadChunkFunc = (chunkSize: number, offset: number) =>
      new Promise<Uint8Array>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.error) {
            reject(event.target.error);
            return;
          }
          resolve(new Uint8Array(event.target?.result as ArrayBuffer));
        };
        reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize));
      });

    const result = await mediainfo.analyzeData(getSize, readChunk) as MediaInfoResult;

    const metadata: MediaMetadata = {};

    // extract from general track (track 0)
    if (result?.media?.track?.[0]) {
      const generalTrack: any = result.media.track[0];

      // recorded date
      if (generalTrack.Recorded_Date) {
        try {
          metadata.recordedAt = new Date(generalTrack.Recorded_Date);
        } catch (e) {
          console.warn('Failed to parse Recorded_Date:', generalTrack.Recorded_Date);
        }
      }

      // GPS location
      if (generalTrack.Recorded_Location) {
        // match format: "43.6436°N 79.3787°W" or "43.6436°N 79.3787°W 100m"
        const locationMatch = generalTrack.Recorded_Location.match(
          /([\d.]+)°([NS])\s+([\d.]+)°([EW])(?:\s+([\d.]+)m)?/
        );
        if (locationMatch) {
          const [_, lat, latDir, lon, lonDir, alt] = locationMatch;
          metadata.latitude = latDir === 'S' ? -parseFloat(lat) : parseFloat(lat);
          metadata.longitude = lonDir === 'W' ? -parseFloat(lon) : parseFloat(lon);
          if (alt) {
            metadata.altitude = parseFloat(alt);
          }
        }
      }

      // duration (in milliseconds)
      if (generalTrack.Duration) {
        metadata.duration = parseFloat(generalTrack.Duration)
      }
    }

    // extract video dimensions from video track
    const videoTrack = result?.media?.track?.find((t) => t['@type'] === 'Video');
    if (videoTrack && '@type' in videoTrack && videoTrack['@type'] === 'Video') {
      metadata.width = videoTrack.Width;
      metadata.height = videoTrack.Height;
    }

    // reset for next file
    mediainfo.reset();
    return metadata;
  } catch (error) {
    console.error('Failed to extract metadata from', file.name, error);
    return {};
  }
}
