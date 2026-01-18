/**
 * Migration: Add thumbnail support to concerts table
 *
 * Adds thumbnail_url and thumbnail_key columns to store concert thumbnails
 * extracted from uploaded videos. Thumbnails are stored in DigitalOcean Spaces.
 */

exports.up = (pgm) => {
  // Add thumbnail columns to concerts table
  pgm.addColumn('concerts', {
    thumbnail_url: {
      type: 'text',
      notNull: false,
      comment: 'CDN URL for concert thumbnail image'
    },
    thumbnail_key: {
      type: 'varchar(500)',
      notNull: false,
      comment: 'DigitalOcean Spaces storage key for thumbnail'
    }
  });

  // Add index on thumbnail_key for efficient lookups
  pgm.createIndex('concerts', 'thumbnail_key', {
    name: 'idx_concerts_thumbnail_key'
  });
};

exports.down = (pgm) => {
  // Remove index first
  pgm.dropIndex('concerts', 'thumbnail_key', {
    name: 'idx_concerts_thumbnail_key'
  });

  // Remove thumbnail columns
  pgm.dropColumn('concerts', 'thumbnail_url');
  pgm.dropColumn('concerts', 'thumbnail_key');
};
