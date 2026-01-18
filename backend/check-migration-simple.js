require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkMigration() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'concerts'
      ORDER BY ordinal_position
    `);

    console.log('\n✅ Concerts table columns:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });

    const hasThumbnailUrl = result.rows.some(r => r.column_name === 'thumbnail_url');
    const hasThumbnailKey = result.rows.some(r => r.column_name === 'thumbnail_key');

    console.log('\n📊 Migration status:');
    console.log(`   thumbnail_url: ${hasThumbnailUrl ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   thumbnail_key: ${hasThumbnailKey ? '✅ EXISTS' : '❌ MISSING'}`);

    await pool.end();
    process.exit(hasThumbnailUrl && hasThumbnailKey ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkMigration();
