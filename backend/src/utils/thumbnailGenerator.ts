import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const execPromise = promisify(exec);

// ============================================================================
// THUMBNAIL GENERATION
// ============================================================================

/**
 * Extract thumbnail frame from video at specified position
 * Generates a JPEG image at 720p max resolution for use as concert thumbnails
 *
 * @param videoPath - Path to video file
 * @param outputPath - Optional output path (defaults to /tmp/thumbnails/)
 * @param options - Extraction options
 * @returns Path to generated thumbnail file
 */
export async function extractThumbnailFromVideo(
  videoPath: string,
  outputPath?: string,
  options?: {
    maxWidth?: number;    // default: 1280
    maxHeight?: number;   // default: 720
    quality?: number;     // default: 2 (85% quality)
    position?: number;    // default: 0.5 (midpoint), range 0-1
  }
): Promise<string> {
  try {
    console.log('🖼️  Extracting thumbnail from video...');
    console.log(`   📹 Input: ${videoPath}`);

    // Set default options
    const maxWidth = options?.maxWidth ?? 1280;
    const maxHeight = options?.maxHeight ?? 720;
    const quality = options?.quality ?? 2; // ffmpeg quality: 2-31, lower is better (2 ≈ 85%)
    const position = options?.position ?? 0.5; // 0.5 = midpoint

    // Verify ffmpeg is available
    try {
      await execPromise('ffmpeg -version');
    } catch (error) {
      throw new Error('ffmpeg is not installed. Please install ffmpeg to enable thumbnail generation.');
    }

    // Get video duration first
    console.log('   ⏱️  Getting video duration...');
    const { stdout: probeOutput } = await execPromise(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );

    const duration = parseFloat(probeOutput.trim());
    console.log(`   ✓ Video duration: ${duration.toFixed(2)}s`);

    if (isNaN(duration) || duration < 1) {
      throw new Error(`Video too short for thumbnail extraction: ${duration}s`);
    }

    // Calculate extraction time
    // For very short videos (< 5s), use frame at 2 seconds or position*duration
    // For normal videos, use the specified position
    let extractTime: number;
    if (duration < 5) {
      extractTime = Math.min(2, duration * 0.5);
      console.log(`   ⚠️  Short video: using frame at ${extractTime.toFixed(2)}s instead of midpoint`);
    } else {
      extractTime = duration * position;
      console.log(`   📐 Extracting frame at ${extractTime.toFixed(2)}s (${(position * 100).toFixed(0)}% position)`);
    }

    // Create output directory if it doesn't exist
    const thumbnailDir = path.dirname(outputPath || '/tmp/thumbnails/temp.jpg');
    await fs.mkdir(thumbnailDir, { recursive: true });

    // Generate output filename
    const thumbnailFilePath = outputPath || path.join(
      thumbnailDir,
      `thumbnail_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`
    );

    // Extract thumbnail using ffmpeg
    // -ss: seek to time (before -i for faster processing)
    // -i: input file
    // -vframes 1: extract exactly 1 frame
    // -vf "scale='min(W,iw)':'min(H,ih)':force_original_aspect_ratio=decrease":
    //     scale to max WxH while maintaining aspect ratio, don't upscale
    // -q:v: JPEG quality (2-31, lower is better quality)
    // -y: overwrite output file
    const scaleFilter = `scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease`;
    const ffmpegCommand = `ffmpeg -ss ${extractTime} -i "${videoPath}" -vframes 1 -vf "${scaleFilter}" -q:v ${quality} "${thumbnailFilePath}" -y`;

    console.log('   🎬 Running ffmpeg...');
    await execPromise(ffmpegCommand);

    // Verify output file exists and get size
    const stats = await fs.stat(thumbnailFilePath);
    console.log(`   ✅ Thumbnail generated: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   📁 Output: ${thumbnailFilePath}`);

    return thumbnailFilePath;
  } catch (error) {
    console.error('   ❌ Thumbnail extraction failed:', error);
    throw error;
  }
}

/**
 * Clean up temporary thumbnail file
 */
export async function cleanupThumbnailFile(thumbnailPath: string): Promise<void> {
  try {
    await fs.unlink(thumbnailPath);
    console.log(`   🗑️  Cleaned up thumbnail file: ${thumbnailPath}`);
  } catch (error) {
    console.error(`   ⚠️  Failed to cleanup thumbnail file: ${thumbnailPath}`, error);
  }
}

/**
 * Check if ffmpeg is installed
 */
export async function checkFfmpegAvailable(): Promise<boolean> {
  try {
    await execPromise('ffmpeg -version');
    return true;
  } catch (error) {
    return false;
  }
}
