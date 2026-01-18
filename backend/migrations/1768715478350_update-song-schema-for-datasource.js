exports.up = (pgm) => {
  // Add source column to track where song data came from
  pgm.addColumn('songs', {
    source: {
      type: 'varchar(50)',
      notNull: true,
      default: 'setlistfm',
      comment: 'Source of song data: setlistfm, audio_fingerprint, or user_manual'
    }
  });

  // Add fingerprint confidence score
  pgm.addColumn('songs', {
    fingerprint_confidence: {
      type: 'decimal(5,2)',
      comment: 'Confidence score from audio fingerprinting (0.00 - 100.00)'
    }
  });

  // Add raw fingerprint data for future re-matching
  pgm.addColumn('songs', {
    audio_fingerprint_data: {
      type: 'jsonb',
      comment: 'Raw fingerprint response data for future analysis'
    }
  });

  // Create index for source lookups
  pgm.createIndex('songs', 'source', {
    name: 'idx_songs_source'
  });

  // Create index for concert_id (if not exists)
  pgm.createIndex('songs', 'concert_id', {
    name: 'idx_songs_concert_id',
    ifNotExists: true
  });

  // Add check constraint for valid source values
  pgm.addConstraint('songs', 'valid_song_source', {
    check: "source IN ('setlistfm', 'audio_fingerprint', 'user_manual')"
  });
};

exports.down = (pgm) => {
  // Remove constraint
  pgm.dropConstraint('songs', 'valid_song_source');

  // Drop indexes
  pgm.dropIndex('songs', 'source', {
    name: 'idx_songs_source',
    ifExists: true
  });

  // Note: We don't drop idx_songs_concert_id because it might have existed before
  // If you want to drop it: pgm.dropIndex('songs', 'concert_id', { name: 'idx_songs_concert_id', ifExists: true });

  // Remove columns
  pgm.dropColumn('songs', 'audio_fingerprint_data');
  pgm.dropColumn('songs', 'fingerprint_confidence');
  pgm.dropColumn('songs', 'source');
};