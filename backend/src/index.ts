import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool, { testConnection } from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // For video uploads

// Basic health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Server is running!'
  });
});

// Database health check
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


// Test database tables
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    availableEndpoints: [
      'GET /health',
      'GET /health/db', 
      'GET /health/tables'
    ]
  });
});

// Routes (we'll add these next)
// app.use('/api/videos', videosRouter);
// app.use('/api/concerts', concertsRouter);
// app.use('/api/users', usersRouter);

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🗄️  Database check: http://localhost:${PORT}/health/db`);
  console.log(`📋 Tables check: http://localhost:${PORT}/health/tables`);
  console.log('');
  
  // Test database on startup
  await testConnection();
});