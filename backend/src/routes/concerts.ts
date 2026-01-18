import express, { Request, Response } from 'express';
import pool from '../config/database';

const router = express.Router();

// Helper to safely extract string from query params
const getString = (value: any): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
};

// ============================================================================
// CONCERT ENDPOINTS
// ============================================================================

/**
 * GET /api/concerts
 * Get all concerts with optional filters
 * Query params: artistId, venueId, userId, date, limit, offset
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { artistId, venueId, userId, date, limit = '50', offset = '0' } = req.query;
    
    let query = `
      SELECT 
        c.*,
        a.name as artist_name,
        v.name as venue_name,
        v.city as venue_city,
        v.state as venue_state,
        v.country as venue_country,
        (SELECT COUNT(*) FROM videos WHERE concert_id = c.id) as video_count,
        (SELECT COUNT(DISTINCT user_id) FROM videos WHERE concert_id = c.id) as attendee_count
      FROM concerts c
      JOIN artists a ON c.artist_id = a.id
      JOIN venues v ON c.venue_id = v.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 1;
    
    const artistIdStr = getString(artistId);
    if (artistIdStr) {
      query += ` AND c.artist_id = $${paramCount}`;
      params.push(artistIdStr);
      paramCount++;
    }
    
    const venueIdStr = getString(venueId);
    if (venueIdStr) {
      query += ` AND c.venue_id = $${paramCount}`;
      params.push(venueIdStr);
      paramCount++;
    }
    
    const userIdStr = getString(userId);
    if (userIdStr) {
      query += ` AND EXISTS (
        SELECT 1 FROM attendees 
        WHERE concert_id = c.id AND user_id = $${paramCount}
      )`;
      params.push(userIdStr);
      paramCount++;
    }
    
    const dateStr = getString(date);
    if (dateStr) {
      query += ` AND DATE(c.concert_date) = $${paramCount}`;
      params.push(dateStr);
      paramCount++;
    }
    
    const limitNum = Number(getString(limit as any) || '50');
    const offsetNum = Number(getString(offset as any) || '0');
    
    query += ` ORDER BY c.concert_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitNum, offsetNum);
    
    const result = await pool.query(query, params);
    
    res.json({
      concerts: result.rows,
      count: result.rows.length,
      page: Math.floor(offsetNum / limitNum) + 1,
      limit: limitNum,
    });
  } catch (error) {
    console.error('Get concerts error:', error);
    res.status(500).json({
      error: 'Failed to get concerts',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/concerts/search
 * Search for concerts
 * Query params: q (general search), artistName, city, date
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, artistName, city, date } = req.query;
    
    let query = `
      SELECT 
        c.*,
        a.name as artist_name,
        v.name as venue_name,
        v.city as venue_city,
        v.state as venue_state,
        v.country as venue_country,
        (SELECT COUNT(*) FROM videos WHERE concert_id = c.id) as video_count
      FROM concerts c
      JOIN artists a ON c.artist_id = a.id
      JOIN venues v ON c.venue_id = v.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 1;
    
    // General search query (searches artist + venue + city)
    const qStr = getString(q);
    if (qStr) {
      query += ` AND (
        LOWER(a.name) LIKE LOWER($${paramCount}) OR
        LOWER(v.name) LIKE LOWER($${paramCount}) OR
        LOWER(v.city) LIKE LOWER($${paramCount})
      )`;
      params.push(`%${qStr}%`);
      paramCount++;
    }
    
    // Specific filters
    const artistNameStr = getString(artistName);
    if (artistNameStr) {
      query += ` AND LOWER(a.name) LIKE LOWER($${paramCount})`;
      params.push(`%${artistNameStr}%`);
      paramCount++;
    }
    
    const cityStr = getString(city);
    if (cityStr) {
      query += ` AND LOWER(v.city) LIKE LOWER($${paramCount})`;
      params.push(`%${cityStr}%`);
      paramCount++;
    }
    
    const dateStr = getString(date);
    if (dateStr) {
      query += ` AND DATE(c.concert_date) = $${paramCount}`;
      params.push(dateStr);
      paramCount++;
    }
    
    query += ` ORDER BY c.concert_date DESC LIMIT 50`;
    
    const result = await pool.query(query, params);
    
    res.json({
      concerts: result.rows,
      count: result.rows.length,
      query: qStr || '',
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
 * GET /api/concerts/:id/videos
 * Get all videos from a specific concert
 */
router.get('/:id/videos', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const query = `
      SELECT 
        v.*,
        u.username,
        u.id as user_id,
        s.title as song_title,
        s.order_in_setlist
      FROM videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN songs s ON v.song_id = s.id
      WHERE v.concert_id = $1
      ORDER BY s.order_in_setlist ASC NULLS LAST, v.recorded_at ASC
    `;
    
    const result = await pool.query(query, [id]);
    
    res.json({
      concertId: parseInt(id),
      videos: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get concert videos error:', error);
    res.status(500).json({
      error: 'Failed to get concert videos',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/concerts/:id/page
 * Get complete concert page data (details + videos + setlist)
 */
router.get('/:id/page', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    // Get concert details
    const concertQuery = `
      SELECT 
        c.*,
        a.name as artist_name,
        a.id as artist_id,
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
    
    // Get all videos
    const videosQuery = `
      SELECT v.*, u.username, s.title as song_title
      FROM videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN songs s ON v.song_id = s.id
      WHERE v.concert_id = $1
      ORDER BY v.recorded_at ASC
    `;
    
    // Get setlist with video counts
    const songsQuery = `
      SELECT s.*, COUNT(v.id) as video_count
      FROM songs s
      LEFT JOIN videos v ON v.song_id = s.id
      WHERE s.concert_id = $1
      GROUP BY s.id
      ORDER BY s.order_in_setlist ASC
    `;
    
    const [concertResult, videosResult, songsResult] = await Promise.all([
      pool.query(concertQuery, [id]),
      pool.query(videosQuery, [id]),
      pool.query(songsQuery, [id]),
    ]);
    
    if (concertResult.rows.length === 0) {
      return res.status(404).json({ error: 'Concert not found' });
    }
    
    res.json({
      concert: concertResult.rows[0],
      videos: videosResult.rows,
      setlist: songsResult.rows,
      stats: {
        totalVideos: videosResult.rows.length,
        totalSongs: songsResult.rows.length,
        attendees: new Set(videosResult.rows.map((v: any) => v.user_id)).size,
      },
    });
  } catch (error) {
    console.error('Get concert page error:', error);
    res.status(500).json({
      error: 'Failed to get concert page',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/concerts/calendar
 * Get concerts by month for calendar view
 * Query params: year, month
 */
router.get('/calendar', async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query;
    
    const yearStr = getString(year);
    const monthStr = getString(month);
    
    if (!yearStr || !monthStr) {
      return res.status(400).json({ error: 'Year and month required' });
    }
    
    const query = `
      SELECT 
        DATE(c.concert_date) as date,
        COUNT(*) as concert_count,
        json_agg(json_build_object(
          'id', c.id,
          'artist', a.name,
          'venue', v.name,
          'city', v.city
        )) as concerts
      FROM concerts c
      JOIN artists a ON c.artist_id = a.id
      JOIN venues v ON c.venue_id = v.id
      WHERE EXTRACT(YEAR FROM c.concert_date) = $1
        AND EXTRACT(MONTH FROM c.concert_date) = $2
      GROUP BY DATE(c.concert_date)
      ORDER BY date ASC
    `;
    
    const result = await pool.query(query, [yearStr, monthStr]);
    
    res.json({
      year: parseInt(yearStr),
      month: parseInt(monthStr),
      days: result.rows,
    });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({
      error: 'Failed to get calendar',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;