import express, { Request, Response } from 'express';
import multer from 'multer';
import { uploadVideo, deleteVideo } from '../config/spaces';
import pool from '../config/database';
import fs from 'fs/promises';
import { extractVideoMetadata } from '../utils/videoMetadata';
import { detectConcert } from '../services/concertDetection';
import { matchSongByFingerprint } from '../services/songMatching';

const router = express.Router();

// Configure multer for temporary file storage
const upload = multer({
  dest: '/tmp/uploads/',
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
});

/**
 * POST /api/videos/upload
 * Upload video with full pipeline including song matching
 */
router.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  let tempFilePath: string | undefined;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    tempFilePath = req.file.path;
    const userId = req.body.userId || 1;
    const title = req.body.title || 'Untitled Video';
    const description = req.body.description || '';

    console.log('');
    console.log('🎬 ========================================');
    console.log('   VIDEO UPLOAD PIPELINE STARTED');
    console.log('🎬 ========================================');
    console.log(`   File: ${req.file.originalname}`);
    console.log(`   Size: ${(req.file.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   Type: ${req.file.mimetype}`);
    console.log('');

    // STEP 1: Extract metadata
    console.log('1️⃣  STEP 1: Extracting metadata...');
    const metadata = await extractVideoMetadata(tempFilePath);
    console.log('');

    // STEP 2: Upload to DigitalOcean Spaces
    console.log('2️⃣  STEP 2: Uploading to DigitalOcean Spaces...');
    const uploadResult = await uploadVideo(tempFilePath, {
      folder: 'concerts',
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
    });
    console.log('   ✅ Upload complete!');
    console.log('   🔗 CDN URL:', uploadResult.cdnUrl);
    console.log('');

    // STEP 3: Save to database
    console.log('3️⃣  STEP 3: Saving to database...');
    const insertQuery = `
      INSERT INTO videos (
        user_id, title, description,
        video_url, video_key,
        duration_seconds, recorded_at,
        latitude, longitude,
        device_make, device_model,
        location_city, location_state, location_country,
        width, height
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const dbResult = await pool.query(insertQuery, [
      userId,
      title,
      description,
      uploadResult.cdnUrl,
      uploadResult.key,
      metadata.duration || null,
      metadata.recordedAt || null,
      metadata.latitude || null,
      metadata.longitude || null,
      metadata.deviceMake || null,
      metadata.deviceModel || null,
      metadata.locationCity || null,
      metadata.locationState || null,
      metadata.locationCountry || null,
      metadata.width || null,
      metadata.height || null,
    ]);

    const video = dbResult.rows[0];
    console.log('   ✅ Database record created');
    console.log('   🆔 Video ID:', video.id);
    console.log('');

    // STEP 4: Concert Detection (if GPS + timestamp available)
    let concertDetectionResult = null;
    if (metadata.latitude && metadata.longitude && metadata.recordedAt) {
      console.log('4️⃣  STEP 4: Detecting concert...');
      
      concertDetectionResult = await detectConcert({
        videoId: video.id,
        userId: userId,
        latitude: metadata.latitude,
        longitude: metadata.longitude,
        recordedAt: metadata.recordedAt,
        locationCity: metadata.locationCity,
        locationState: metadata.locationState,
        locationCountry: metadata.locationCountry,
      });
      
      if (concertDetectionResult.success) {
        console.log('   ✅ Concert detected!');
      } else {
        console.log('   ℹ️  No concert match found');
      }
      console.log('');
    } else {
      console.log('4️⃣  STEP 4: Skipping concert detection (no GPS or timestamp)');
      console.log('');
    }

    // STEP 5: Song Matching via Audio Fingerprinting (Phase 4)
    let songMatchResult = null;
    const concertId = concertDetectionResult?.match?.concertId;
    
    console.log('5️⃣  STEP 5: Matching song via audio fingerprinting...');
    try {
      songMatchResult = await matchSongByFingerprint(
        video.id,
        tempFilePath,
        concertId
      );

      if (songMatchResult.success) {
        console.log('   ✅ Song matched automatically!');
      } else {
        console.log(`   ℹ️  ${songMatchResult.message}`);
        console.log('   → User can select from setlist or enter manually later');
      }
    } catch (error) {
      console.error('   ⚠️  Song matching failed (non-critical):', error);
      // Don't fail the upload if song matching fails
    }
    console.log('');

    // STEP 6: Clean up temp file
    console.log('6️⃣  STEP 6: Cleaning up...');
    await fs.unlink(tempFilePath);
    console.log('   ✅ Temp file deleted');
    console.log('');

    console.log('✅ ========================================');
    console.log('   PIPELINE COMPLETE!');
    console.log('✅ ========================================');
    console.log('');

    // Return success response with concert and song info
    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully!',
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        videoUrl: video.video_url,
        thumbnailUrl: video.thumbnail_url,
        duration: video.duration_seconds,
        recordedAt: video.recorded_at,
        songId: video.song_id, // Will be set if song matching succeeded
        createdAt: video.created_at,
      },
      metadata: {
        hasGPS: !!(metadata.latitude && metadata.longitude),
        hasTimestamp: !!metadata.recordedAt,
        latitude: metadata.latitude,
        longitude: metadata.longitude,
        location: {
          city: metadata.locationCity,
          state: metadata.locationState,
          country: metadata.locationCountry,
        },
        device: {
          make: metadata.deviceMake,
          model: metadata.deviceModel,
        },
        dimensions: {
          width: metadata.width,
          height: metadata.height,
        },
      },
      concert: concertDetectionResult?.match ? {
        id: concertDetectionResult.match.concertId,
        artistId: concertDetectionResult.match.artistId,
        artistName: concertDetectionResult.match.details.artistName,
        venueId: concertDetectionResult.match.venueId,
        venueName: concertDetectionResult.match.details.venueName,
        venueCity: concertDetectionResult.match.details.venueCity,
        date: concertDetectionResult.match.details.concertDate,
        tourName: concertDetectionResult.match.details.tourName,
        confidence: concertDetectionResult.match.confidence,
        distance: concertDetectionResult.match.details.distance,
        daysDifference: concertDetectionResult.match.details.daysDifference,
        setlistFetched: concertDetectionResult.match.setlistFetched,
        songsCount: concertDetectionResult.match.songsCount
      } : null,
      song: songMatchResult?.success ? {
        id: songMatchResult.songId,
        title: songMatchResult.match?.songTitle,
        artistName: songMatchResult.match?.artistName,
        albumName: songMatchResult.match?.albumName,
        confidence: songMatchResult.confidence,
        method: songMatchResult.method,
      } : null,
    });

  } catch (error) {
    console.error('');
    console.error('❌ ========================================');
    console.error('   PIPELINE FAILED');
    console.error('❌ ========================================');
    console.error(error);
    console.error('');

    // Clean up temp file on error
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        console.log('🗑️  Temp file cleaned up');
      } catch (cleanupError) {
        console.error('⚠️  Failed to delete temp file:', cleanupError);
      }
    }

    res.status(500).json({
      error: 'Video upload failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/videos
 * Get all videos
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, concertId, songId, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM videos WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (userId) {
      query += ` AND user_id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }

    if (concertId) {
      query += ` AND concert_id = $${paramCount}`;
      params.push(concertId);
      paramCount++;
    }

    if (songId) {
      query += ` AND song_id = $${paramCount}`;
      params.push(songId);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      videos: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Fetch videos error:', error);
    res.status(500).json({
      error: 'Failed to fetch videos',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/videos/:id
 * Get specific video
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM videos WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Increment view count
    await pool.query('UPDATE videos SET views_count = views_count + 1 WHERE id = $1', [id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch video error:', error);
    res.status(500).json({
      error: 'Failed to fetch video',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/videos/:id
 * Delete video from Spaces and database
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get video details
    const videoResult = await pool.query(
      'SELECT video_key FROM videos WHERE id = $1',
      [id]
    );

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const { video_key } = videoResult.rows[0];

    // Delete from DigitalOcean Spaces
    await deleteVideo(video_key);

    // Delete from database
    await pool.query('DELETE FROM videos WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      error: 'Failed to delete video',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;