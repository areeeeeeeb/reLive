import express, { Request, Response } from 'express';
import pool from '../config/database';
import { linkVideoToConcert, createAttendeeRecord } from '../services/concertDatabase';

const router = express.Router();

// ============================================================================
// CONCERT ENDPOINTS
// ============================================================================

/**
 * GET /api/concerts/search
 * Search for concerts manually
 * Query params: artistName, city, date (YYYY-MM-DD), page, limit
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { artistName, city, date, page = '1', limit = '20' } = req.query;
    
    let query = `
      SELECT 
        c.*,
        a.name as artist_name,
        v.name as venue_name,
        v.city as venue_city,
        v.state as venue_state,
        v.country as venue_country,
        (SELECT COUNT(*) FROM songs WHERE concert_id = c.id) as songs_count
      FROM concerts c
      JOIN artists a ON c.artist_id = a.id
      JOIN venues v ON c.venue_id = v.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 1;
    
    // Helper to get string value from query param
    const getString = (value: any): string | undefined => {
      if (typeof value === 'string') return value;
      if (Array.isArray(value) && value.length > 0) return value[0];
      return undefined;
    };
    
    // Handle artistName
    const artistNameStr = getString(artistName);
    if (artistNameStr) {
      query += ` AND LOWER(a.name) LIKE LOWER($${paramCount})`;
      params.push(`%${artistNameStr}%`);
      paramCount++;
    }
    
    // Handle city
    const cityStr = getString(city);
    if (cityStr) {
      query += ` AND LOWER(v.city) LIKE LOWER($${paramCount})`;
      params.push(`%${cityStr}%`);
      paramCount++;
    }
    
    // Handle date
    const dateStr = getString(date);
    if (dateStr) {
      query += ` AND DATE(c.concert_date) = $${paramCount}`;
      params.push(dateStr);
      paramCount++;
    }
    
    // Pagination
    const pageNum = Number(getString(page as any) || '1');
    const limitNum = Number(getString(limit as any) || '20');
    
    query += ` ORDER BY c.concert_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitNum, ((pageNum - 1) * limitNum));
    
    const result = await pool.query(query, params);
    
    res.json({
      concerts: result.rows,
      count: result.rows.length,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('Concert search error:', error);
    res.status(500).json({
      error: 'Failed to search concerts',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/concerts/:id
 * Get concert details with setlist
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get concert details
    const concertQuery = `
      SELECT 
        c.*,
        a.name as artist_name,
        a.spotify_id as artist_spotify_id,
        v.name as venue_name,
        v.city as venue_city,
        v.state as venue_state,
        v.country as venue_country,
        v.latitude as venue_latitude,
        v.longitude as venue_longitude
      FROM concerts c
      JOIN artists a ON c.artist_id = a.id
      JOIN venues v ON c.venue_id = v.id
      WHERE c.id = $1
    `;
    
    const concertResult = await pool.query(concertQuery, [id]);
    
    if (concertResult.rows.length === 0) {
      return res.status(404).json({ error: 'Concert not found' });
    }
    
    // Get setlist
    const songsQuery = `
      SELECT * FROM songs 
      WHERE concert_id = $1 
      ORDER BY order_in_setlist ASC, created_at ASC
    `;
    
    const songsResult = await pool.query(songsQuery, [id]);
    
    res.json({
      concert: concertResult.rows[0],
      setlist: songsResult.rows,
    });
  } catch (error) {
    console.error('Get concert error:', error);
    res.status(500).json({
      error: 'Failed to get concert',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/concerts/:id/link-video
 * Manually link a video to a concert
 * Body: { videoId: number, userId: number }
 */
router.post('/:id/link-video', async (req: Request, res: Response) => {
  try {
    const concertId = parseInt(req.params.id as string);
    const { videoId, userId } = req.body;
    
    if (!videoId || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields: videoId, userId' 
      });
    }
    
    // Verify concert exists
    const concertCheck = await pool.query(
      'SELECT id FROM concerts WHERE id = $1',
      [concertId]
    );
    
    if (concertCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Concert not found' });
    }
    
    // Verify video exists
    const videoCheck = await pool.query(
      'SELECT id FROM videos WHERE id = $1',
      [videoId]
    );
    
    if (videoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Link video to concert
    await linkVideoToConcert(videoId, concertId);
    
    // Create attendee record
    await createAttendeeRecord(userId, concertId);
    
    res.json({
      success: true,
      message: 'Video linked to concert successfully',
      videoId,
      concertId,
    });
  } catch (error) {
    console.error('Link video error:', error);
    res.status(500).json({
      error: 'Failed to link video to concert',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// SONG ENDPOINTS
// ============================================================================

/**
 * POST /api/songs/link-video
 * Manually link a video to a song
 * Body: { videoId: number, songId?: number, songTitle?: string, concertId?: number }
 * Either provide songId (existing song) OR songTitle+concertId (create new)
 */
router.post('/link-video', async (req: Request, res: Response) => {
  try {
    const { videoId, songId, songTitle, concertId } = req.body;
    
    if (!videoId) {
      return res.status(400).json({ error: 'Missing required field: videoId' });
    }
    
    let finalSongId = songId;
    
    // If songId not provided, create new song
    if (!finalSongId) {
      if (!songTitle || !concertId) {
        return res.status(400).json({
          error: 'Must provide either songId OR (songTitle + concertId)',
        });
      }
      
      // Create new song
      const insertQuery = `
        INSERT INTO songs (concert_id, title, source)
        VALUES ($1, $2, $3)
        RETURNING id
      `;
      
      const result = await pool.query(insertQuery, [
        concertId,
        songTitle,
        'user_manual',
      ]);
      
      finalSongId = result.rows[0].id;
      console.log(`✓ Created new song: ${songTitle} (id: ${finalSongId})`);
    }
    
    // Link video to song
    await pool.query(
      'UPDATE videos SET song_id = $1 WHERE id = $2',
      [finalSongId, videoId]
    );
    
    console.log(`✓ Linked video ${videoId} to song ${finalSongId}`);
    
    // Get song details to return
    const songQuery = `
      SELECT s.*, c.artist_id, a.name as artist_name
      FROM songs s
      JOIN concerts c ON s.concert_id = c.id
      JOIN artists a ON c.artist_id = a.id
      WHERE s.id = $1
    `;
    
    const songResult = await pool.query(songQuery, [finalSongId]);
    
    res.json({
      success: true,
      message: 'Video linked to song successfully',
      videoId,
      song: songResult.rows[0],
    });
  } catch (error) {
    console.error('Link video to song error:', error);
    res.status(500).json({
      error: 'Failed to link video to song',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/songs/concert/:concertId
 * Get all songs for a concert (setlist)
 */
router.get('/concert/:concertId', async (req: Request, res: Response) => {
  try {
    const { concertId } = req.params;
    
    const query = `
      SELECT * FROM songs
      WHERE concert_id = $1
      ORDER BY order_in_setlist ASC, created_at ASC
    `;
    
    const result = await pool.query(query, [concertId]);
    
    res.json({
      songs: result.rows,
      count: result.rows.length,
      concertId: parseInt(concertId as string),
    });
  } catch (error) {
    console.error('Get concert songs error:', error);
    res.status(500).json({
      error: 'Failed to get concert songs',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/videos/:id/concert
 * Update video's concert (for changing auto-detected concert)
 */
router.patch('/:id/concert', async (req: Request, res: Response) => {
  try {
    const videoId = parseInt(req.params.id as string);
    const { concertId, userId } = req.body;
    
    if (concertId === null) {
      // Unlink concert
      await pool.query('UPDATE videos SET concert_id = NULL WHERE id = $1', [videoId]);
      
      return res.json({
        success: true,
        message: 'Concert unlinked from video',
        videoId,
      });
    }
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }
    
    // Link to new concert
    await linkVideoToConcert(videoId, concertId);
    await createAttendeeRecord(userId, concertId);
    
    res.json({
      success: true,
      message: 'Video concert updated successfully',
      videoId,
      concertId,
    });
  } catch (error) {
    console.error('Update video concert error:', error);
    res.status(500).json({
      error: 'Failed to update video concert',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/videos/:id/song
 * Update video's song
 */
router.patch('/:id/song', async (req: Request, res: Response) => {
  try {
    const videoId = parseInt(req.params.id as string);
    const { songId } = req.body;
    
    if (songId === null) {
      // Unlink song
      await pool.query('UPDATE videos SET song_id = NULL WHERE id = $1', [videoId]);
      
      return res.json({
        success: true,
        message: 'Song unlinked from video',
        videoId,
      });
    }
    
    // Link to new song
    await pool.query(
      'UPDATE videos SET song_id = $1 WHERE id = $2',
      [songId, videoId]
    );
    
    res.json({
      success: true,
      message: 'Video song updated successfully',
      videoId,
      songId,
    });
  } catch (error) {
    console.error('Update video song error:', error);
    res.status(500).json({
      error: 'Failed to update video song',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;