import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool, { testConnection } from './config/database';
import videosRouter from './routes/videos';
import manualSelectionRouter from './routes/manualSelection';
import concertsRouter from './routes/concerts';
import usersRouter from './routes/users';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Backend running" });
});


// Health check routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Server is running!'
  });
});

app.get('/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time, version() as version');
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: result.rows[0].time,
      version: result.rows[0].version
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/health/tables', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    res.json({
      status: 'ok',
      tables: result.rows.map(row => row.table_name),
      count: result.rows.length
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/health/system', async (req, res) => {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execPromise = promisify(exec);
  
  const checks: any = {
    ffmpeg: { installed: false, error: '' },
    ffprobe: { installed: false, error: '' }
  };

  try {
    await execPromise('ffmpeg -version');
    checks.ffmpeg.installed = true;
  } catch (error) {
    checks.ffmpeg.error = 'Not found';
  }

  try {
    await execPromise('ffprobe -version');
    checks.ffprobe.installed = true;
  } catch (error) {
    checks.ffprobe.error = 'Not found';
  }

  res.json(checks);
});

// ============================================================================
// API ROUTES
// ============================================================================

// Video routes - Upload and CRUD
app.use('/api/videos', videosRouter);

// Concert routes - List, details, videos
app.use('/api/concerts', concertsRouter);

// User routes - Profile, home, search
app.use('/api/users', usersRouter);

// Manual selection routes - Concert/song linking and updates
// Note: This router has endpoints for /api/concerts, /api/songs, and /api/videos
// It's mounted AFTER concertsRouter so it doesn't conflict
app.use('/api/concerts', manualSelectionRouter);  // Adds: POST /:id/link-video
app.use('/api/songs', manualSelectionRouter);      // Adds: POST /link-video, GET /concert/:id
app.use('/api/videos', manualSelectionRouter);     // Adds: PATCH /:id/concert, PATCH /:id/song

// ============================================================================
// 404 HANDLER - MUST BE LAST
// ============================================================================
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: [
      // Health checks
      'GET /health',
      'GET /health/db', 
      'GET /health/tables',
        'GET /health/system',
      
      // Video endpoints
      'POST /api/videos/upload',
      'GET /api/videos',
      'GET /api/videos/:id',
      'DELETE /api/videos/:id',
      'PATCH /api/videos/:id/concert',
      'PATCH /api/videos/:id/song',
      
      // Concert endpoints
      'GET /api/concerts',
      'GET /api/concerts/search',
      'GET /api/concerts/calendar',
      'GET /api/concerts/:id',
      'GET /api/concerts/:id/videos',
      'GET /api/concerts/:id/page',
      'POST /api/concerts/:id/link-video',
      
      // Song endpoints
      'POST /api/songs/link-video',
      'GET /api/songs/concert/:concertId',
      
      // User endpoints
      'GET /api/users/search',
      'GET /api/users/:userId/profile',
      'GET /api/users/:userId/home',
      'GET /api/users/:userId/videos',
    ]
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🗄️  Database check: http://localhost:${PORT}/health/db`);
  console.log(`📋 Tables check: http://localhost:${PORT}/health/tables`);
  console.log('');
  console.log('📹 VIDEO ENDPOINTS:');
  console.log(`   POST http://localhost:${PORT}/api/videos/upload`);
  console.log(`   GET  http://localhost:${PORT}/api/videos`);
  console.log('');
  console.log('🎸 CONCERT ENDPOINTS:');
  console.log(`   GET  http://localhost:${PORT}/api/concerts`);
  console.log(`   GET  http://localhost:${PORT}/api/concerts/:id/videos`);
  console.log('');
  console.log('👤 USER ENDPOINTS:');
  console.log(`   GET  http://localhost:${PORT}/api/users/:userId/profile`);
  console.log(`   GET  http://localhost:${PORT}/api/users/:userId/home`);
  console.log('');
  
  await testConnection();
});