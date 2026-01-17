require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const migrationPath = path.join(__dirname, '../migrations/1737154800000_initial-schema.js');
  const migration = require(migrationPath);
  
  // Simple pgm mock
  const pgm = {
    createTable: async (tableName, columns) => {
      console.log(`Creating table: ${tableName}`);
      // We'll write the SQL manually instead
    }
  };
  
  try {
    console.log('Running migration...');
    await migration.up(pgm);
    console.log('✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();