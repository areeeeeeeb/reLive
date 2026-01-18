import pool from '../config/database';
import { acrcloudApi, FingerprintMatch } from './acrcloudApi';
import { extractAudioForFingerprinting, cleanupAudioFile } from '../utils/audioExtractor';
import { getConcertDetails } from './concertDatabase';

// ============================================================================
// TYPES
// ============================================================================

export interface SongMatchResult {
  success: boolean;
  method: 'audio_fingerprint' | 'setlist' | 'manual' | 'none';
  songId?: number;
  confidence?: number;
  match?: {
    songTitle: string;
    artistName?: string;
    albumName?: string;
    duration?: number;
    source: 'audio_fingerprint' | 'setlistfm' | 'user_manual';
  };
  message: string;
}

// ============================================================================
// SONG MATCHING FUNCTIONS
// ============================================================================

/**
 * Match video to song using audio fingerprinting
 * This is called automatically during video upload (Option A)
 */
export async function matchSongByFingerprint(
  videoId: number,
  videoFilePath: string,
  concertId?: number
): Promise<SongMatchResult> {
  let audioFilePath: string | undefined = undefined; // ← Fixed type

  try {
    console.log('');
    console.log('🎵 ========================================');
    console.log('   SONG MATCHING STARTED (FINGERPRINT)');
    console.log('🎵 ========================================');
    console.log(`   📹 Video ID: ${videoId}`);
    console.log(`   🎤 Concert ID: ${concertId || 'Not linked'}`);
    console.log('');

    // STEP 1: Extract audio from video
    console.log('1️⃣  STEP 1: Extracting audio...');
    audioFilePath = await extractAudioForFingerprinting(videoFilePath);
    console.log('');

    // STEP 2: Fingerprint audio with ACRCloud
    console.log('2️⃣  STEP 2: Fingerprinting with ACRCloud...');
    const fingerprintResult: FingerprintMatch = await acrcloudApi.identifyAudio(audioFilePath);
    console.log('');

    // STEP 3: Process result
    console.log('3️⃣  STEP 3: Processing result...');

    if (!fingerprintResult.matched || fingerprintResult.confidence < 60) {
      console.log(`   ℹ️  Low confidence or no match (${fingerprintResult.confidence.toFixed(2)}%)`);
      console.log('   → User will need to select from setlist or enter manually');
      console.log('');

      return {
        success: false,
        method: 'none',
        confidence: fingerprintResult.confidence,
        message: fingerprintResult.confidence > 0 && fingerprintResult.confidence < 60
          ? `Low confidence match: ${fingerprintResult.songTitle} by ${fingerprintResult.artistName} (${fingerprintResult.confidence.toFixed(2)}%)`
          : 'No song match found',
      };
    }

    console.log(`   ✅ High confidence match! (${fingerprintResult.confidence.toFixed(2)}%)`);
    console.log(`   🎵 Song: ${fingerprintResult.songTitle}`);
    console.log(`   🎤 Artist: ${fingerprintResult.artistName}`);
    console.log('');

    // STEP 4: Create or find song in database
    console.log('4️⃣  STEP 4: Creating database records...');

    let songId: number;

    if (concertId) {
      // Try to find existing song in concert setlist
      const existingSong = await findSongInConcert(
        concertId,
        fingerprintResult.songTitle!
      );

      if (existingSong) {
        console.log(`   ✓ Found existing song in setlist (id: ${existingSong.id})`);
        songId = existingSong.id;

        // Update with fingerprint data
        await updateSongWithFingerprint(songId, fingerprintResult);
      } else {
        console.log('   → Song not in setlist, creating new entry');
        songId = await createSongFromFingerprint(concertId, fingerprintResult);
      }
    } else {
      console.log('   → No concert linked, creating standalone song');
      // Create a standalone song (not linked to any concert)
      // This shouldn't happen often in Option A, but we handle it
      songId = await createStandaloneSong(fingerprintResult);
    }

    // STEP 5: Link video to song
    console.log('5️⃣  STEP 5: Linking video to song...');
    await linkVideoToSong(videoId, songId);
    console.log('');

    console.log('✅ ========================================');
    console.log('   SONG MATCHING COMPLETE!');
    console.log('✅ ========================================');
    console.log(`   🎵 Song: ${fingerprintResult.songTitle}`);
    console.log(`   📊 Confidence: ${fingerprintResult.confidence.toFixed(2)}%`);
    console.log(`   🆔 Song ID: ${songId}`);
    console.log('');

    return {
      success: true,
      method: 'audio_fingerprint',
      songId,
      confidence: fingerprintResult.confidence,
      match: {
        songTitle: fingerprintResult.songTitle!,
        artistName: fingerprintResult.artistName,
        albumName: fingerprintResult.albumName,
        duration: fingerprintResult.duration,
        source: 'audio_fingerprint',
      },
      message: 'Song matched via audio fingerprinting',
    };
  } catch (error) {
    console.error('');
    console.error('❌ ========================================');
    console.error('   SONG MATCHING FAILED');
    console.error('❌ ========================================');
    console.error(error);
    console.error('');

    return {
      success: false,
      method: 'none',
      message: error instanceof Error ? error.message : 'Audio fingerprinting failed',
    };
  } finally {
    // CLEANUP: Delete temporary audio file
    if (audioFilePath !== undefined) {
      await cleanupAudioFile(audioFilePath);
    }
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Find song in concert setlist by title (fuzzy match)
 */
async function findSongInConcert(
  concertId: number,
  songTitle: string
): Promise<{ id: number; title: string } | null> {
  try {
    // Use ILIKE for case-insensitive partial match
    const query = `
      SELECT id, title 
      FROM songs 
      WHERE concert_id = $1 
        AND LOWER(title) LIKE LOWER($2)
      LIMIT 1
    `;

    const result = await pool.query(query, [concertId, `%${songTitle}%`]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error finding song in concert:', error);
    return null;
  }
}

/**
 * Create song from fingerprint result
 */
async function createSongFromFingerprint(
  concertId: number,
  fingerprint: FingerprintMatch
): Promise<number> {
  try {
    const query = `
      INSERT INTO songs (
        concert_id, title, duration_seconds, 
        source, fingerprint_confidence, audio_fingerprint_data
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const result = await pool.query(query, [
      concertId,
      fingerprint.songTitle,
      fingerprint.duration || null,
      'audio_fingerprint',
      fingerprint.confidence,
      JSON.stringify(fingerprint.rawData),
    ]);

    const songId = result.rows[0].id;
    console.log(`   ✓ Created song: ${fingerprint.songTitle} (id: ${songId})`);
    return songId;
  } catch (error) {
    console.error('Error creating song:', error);
    throw error;
  }
}

/**
 * Create standalone song (no concert)
 */
async function createStandaloneSong(fingerprint: FingerprintMatch): Promise<number> {
  try {
    // For standalone songs, we need a concert_id (foreign key constraint)
    // This is a workaround - in production, you might want to:
    // 1. Make concert_id nullable in songs table, OR
    // 2. Create a "Unknown Concert" placeholder
    // For now, we'll throw an error
    throw new Error('Cannot create standalone song - concert_id is required');
  } catch (error) {
    console.error('Error creating standalone song:', error);
    throw error;
  }
}

/**
 * Update existing song with fingerprint data
 */
async function updateSongWithFingerprint(
  songId: number,
  fingerprint: FingerprintMatch
): Promise<void> {
  try {
    const query = `
      UPDATE songs 
      SET 
        source = 'audio_fingerprint',
        fingerprint_confidence = $1,
        audio_fingerprint_data = $2,
        duration_seconds = COALESCE(duration_seconds, $3)
      WHERE id = $4
    `;

    await pool.query(query, [
      fingerprint.confidence,
      JSON.stringify(fingerprint.rawData),
      fingerprint.duration || null,
      songId,
    ]);

    console.log(`   ✓ Updated song ${songId} with fingerprint data`);
  } catch (error) {
    console.error('Error updating song with fingerprint:', error);
    throw error;
  }
}

/**
 * Link video to song
 */
async function linkVideoToSong(videoId: number, songId: number): Promise<void> {
  try {
    const query = 'UPDATE videos SET song_id = $1 WHERE id = $2';
    await pool.query(query, [songId, videoId]);
    console.log(`   ✓ Linked video ${videoId} to song ${songId}`);
  } catch (error) {
    console.error('Error linking video to song:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { FingerprintMatch };