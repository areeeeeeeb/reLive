import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const execPromise = promisify(exec);

// ============================================================================
// AUDIO EXTRACTION
// ============================================================================

/**
 * Extract audio segment from video for fingerprinting
 * Extracts 12 seconds from the middle of the video for best results
 * 
 * @param videoPath - Path to video file
 * @param outputPath - Optional output path (defaults to /tmp/audio/)
 * @returns Path to extracted audio file
 */
export async function extractAudioForFingerprinting(
  videoPath: string,
  outputPath?: string
): Promise<string> {
  try {
    console.log('🎧 Extracting audio for fingerprinting...');
    console.log(`   📹 Input: ${videoPath}`);

    // Verify ffmpeg is available
    try {
      await execPromise('ffmpeg -version');
    } catch (error) {
      throw new Error('ffmpeg is not installed. Please install ffmpeg to enable audio fingerprinting.');
    }

    // Get video duration first
    console.log('   ⏱️  Getting video duration...');
    const { stdout: probeOutput } = await execPromise(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    
    const duration = parseFloat(probeOutput.trim());
    console.log(`   ✓ Video duration: ${duration.toFixed(2)}s`);

    if (isNaN(duration) || duration < 5) {
      throw new Error(`Video too short for fingerprinting: ${duration}s (minimum 5s required)`);
    }

    // Calculate extraction parameters
    // Extract 12 seconds from the middle of the video
    const extractDuration = Math.min(12, duration - 2); // Max 12s, but leave 2s buffer
    const startTime = Math.max(0, (duration - extractDuration) / 2);

    console.log(`   📐 Extracting ${extractDuration}s from ${startTime.toFixed(2)}s`);

    // Create output directory if it doesn't exist
    const audioDir = path.dirname(outputPath || '/tmp/audio/temp.wav');
    await fs.mkdir(audioDir, { recursive: true });

    // Generate output filename
    const audioFilePath = outputPath || path.join(
      audioDir,
      `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`
    );

    // Extract audio using ffmpeg
    // -ss: start time
    // -t: duration
    // -vn: no video
    // -acodec pcm_s16le: PCM 16-bit audio (ACRCloud prefers this)
    // -ar 44100: 44.1kHz sample rate
    // -ac 2: stereo (2 channels)
    const ffmpegCommand = `ffmpeg -ss ${startTime} -i "${videoPath}" -t ${extractDuration} -vn -acodec pcm_s16le -ar 44100 -ac 2 "${audioFilePath}" -y`;

    console.log('   🎵 Running ffmpeg...');
    await execPromise(ffmpegCommand);

    // Verify output file exists
    const stats = await fs.stat(audioFilePath);
    console.log(`   ✅ Audio extracted: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   📁 Output: ${audioFilePath}`);

    return audioFilePath;
  } catch (error) {
    console.error('   ❌ Audio extraction failed:', error);
    throw error;
  }
}

/**
 * Clean up temporary audio file
 */
export async function cleanupAudioFile(audioPath: string): Promise<void> {
  try {
    await fs.unlink(audioPath);
    console.log(`   🗑️  Cleaned up audio file: ${audioPath}`);
  } catch (error) {
    console.error(`   ⚠️  Failed to cleanup audio file: ${audioPath}`, error);
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