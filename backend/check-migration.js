const pool = require('./dist/config/database').default;

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

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkMigration();
