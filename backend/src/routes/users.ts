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
// USER ENDPOINTS
// ============================================================================

/**
 * GET /api/users/search
 * Search for users by username
 * Query params: q (search query)
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    const qStr = getString(q);
    if (!qStr) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const query = `
      SELECT 
        u.id,
        u.username,
        u.created_at,
        COUNT(DISTINCT v.id) as video_count,
        COUNT(DISTINCT v.concert_id) as concert_count
      FROM users u
      LEFT JOIN videos v ON v.user_id = u.id
      WHERE LOWER(u.username) LIKE LOWER($1)
      GROUP BY u.id, u.username, u.created_at
      ORDER BY video_count DESC
      LIMIT 20
    `;
    
    const result = await pool.query(query, [`%${qStr}%`]);
    
    res.json({
      users: result.rows,
      count: result.rows.length,
      query: qStr,
    });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({
      error: 'Failed to search users',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/users/:userId/profile
 * Get user profile (Letterboxd style)
 * Returns: user info, stats, recent videos, top artists
 */
router.get('/:userId/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    
    // User info
    const userQuery = `
      SELECT id, username, created_at
      FROM users
      WHERE id = $1
    `;
    
    // Stats
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT v.id) as video_count,
        COUNT(DISTINCT v.concert_id) as concert_count,
        COUNT(DISTINCT c.artist_id) as artist_count,
        COUNT(DISTINCT c.venue_id) as venue_count
      FROM videos v
      LEFT JOIN concerts c ON v.concert_id = c.id
      WHERE v.user_id = $1
    `;
    
    // Recent videos (with concert info)
    const videosQuery = `
      SELECT 
        v.*,
        c.id as concert_id,
        a.name as artist_name,
        ve.name as venue_name,
        ve.city as venue_city,
        c.concert_date,
        s.title as song_title
      FROM videos v
      LEFT JOIN concerts c ON v.concert_id = c.id
      LEFT JOIN artists a ON c.artist_id = a.id
      LEFT JOIN venues ve ON c.venue_id = ve.id
      LEFT JOIN songs s ON v.song_id = s.id
      WHERE v.user_id = $1
      ORDER BY v.created_at DESC
      LIMIT 20
    `;
    
    // Favorite artists (most videos)
    const artistsQuery = `
      SELECT 
        a.id,
        a.name,
        COUNT(v.id) as video_count
      FROM videos v
      JOIN concerts c ON v.concert_id = c.id
      JOIN artists a ON c.artist_id = a.id
      WHERE v.user_id = $1
      GROUP BY a.id, a.name
      ORDER BY video_count DESC
      LIMIT 5
    `;
    
    const [userResult, statsResult, videosResult, artistsResult] = await Promise.all([
      pool.query(userQuery, [userId]),
      pool.query(statsQuery, [userId]),
      pool.query(videosQuery, [userId]),
      pool.query(artistsQuery, [userId]),
    ]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: userResult.rows[0],
      stats: statsResult.rows[0],
      recentVideos: videosResult.rows,
      topArtists: artistsResult.rows,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      error: 'Failed to get user profile',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/users/:userId/home
 * Get user's home page data
 * Returns: recent concerts, platform stats, recent activity feed
 */
router.get('/:userId/home', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    
    // User's recent concerts
    const recentConcertsQuery = `
      SELECT DISTINCT
        c.*,
        a.name as artist_name,
        v.name as venue_name,
        v.city as venue_city,
        (SELECT COUNT(*) FROM videos WHERE concert_id = c.id AND user_id = $1) as my_video_count,
        (SELECT COUNT(*) FROM videos WHERE concert_id = c.id) as total_video_count
      FROM concerts c
      JOIN artists a ON c.artist_id = a.id
      JOIN venues v ON c.venue_id = v.id
      JOIN videos vid ON vid.concert_id = c.id
      WHERE vid.user_id = $1
      ORDER BY c.concert_date DESC
      LIMIT 10
    `;
    
    // Platform stats
    const platformStatsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM videos) as total_videos,
        (SELECT COUNT(*) FROM concerts) as total_concerts,
        (SELECT COUNT(*) FROM artists) as total_artists,
        (SELECT COUNT(DISTINCT user_id) FROM videos) as total_users
    `;
    
    // Recent activity (other users)
    const activityQuery = `
      SELECT 
        v.*,
        u.username,
        a.name as artist_name,
        ve.name as venue_name,
        c.concert_date
      FROM videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN concerts c ON v.concert_id = c.id
      LEFT JOIN artists a ON c.artist_id = a.id
      LEFT JOIN venues ve ON c.venue_id = ve.id
      WHERE v.user_id != $1
      ORDER BY v.created_at DESC
      LIMIT 10
    `;
    
    const [recentConcertsResult, platformStatsResult, activityResult] = await Promise.all([
      pool.query(recentConcertsQuery, [userId]),
      pool.query(platformStatsQuery),
      pool.query(activityQuery, [userId]),
    ]);
    
    res.json({
      myRecentConcerts: recentConcertsResult.rows,
      platformStats: platformStatsResult.rows[0],
      recentActivity: activityResult.rows,
    });
  } catch (error) {
    console.error('Get user home error:', error);
    res.status(500).json({
      error: 'Failed to get user home',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/users/:userId/videos
 * Get all videos for a specific user
 */
router.get('/:userId/videos', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    
    const query = `
      SELECT 
        v.*,
        c.id as concert_id,
        a.name as artist_name,
        ve.name as venue_name,
        ve.city as venue_city,
        c.concert_date,
        s.title as song_title
      FROM videos v
      LEFT JOIN concerts c ON v.concert_id = c.id
      LEFT JOIN artists a ON c.artist_id = a.id
      LEFT JOIN venues ve ON c.venue_id = ve.id
      LEFT JOIN songs s ON v.song_id = s.id
      WHERE v.user_id = $1
      ORDER BY v.recorded_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    
    res.json({
      userId: parseInt(userId),
      videos: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get user videos error:', error);
    res.status(500).json({
      error: 'Failed to get user videos',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;