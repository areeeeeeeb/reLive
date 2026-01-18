// migrations/[timestamp]_update-videos-for-spaces.js

exports.up = (pgm) => {
  // Remove old Cloudinary columns
  pgm.dropColumn('videos', 'cloudinary_public_id');
  pgm.dropColumn('videos', 'cloudinary_url');
  
  // Add DigitalOcean Spaces columns
  pgm.addColumn('videos', {
    video_url: { type: 'text', notNull: false }, // Make nullable first
    video_key: { type: 'varchar(500)', notNull: false },
    
    // Additional metadata columns
    width: { type: 'integer' },
    height: { type: 'integer' },
    file_size_bytes: { type: 'bigint' },
    
    // Device info
    device_make: { type: 'varchar(100)' },
    device_model: { type: 'varchar(100)' },
    
    // Location details
    location_city: { type: 'varchar(100)' },
    location_state: { type: 'varchar(100)' },
    location_country: { type: 'varchar(100)' },
  });
  
  // Add index for video_key
  pgm.createIndex('videos', 'video_key');
  
  // If you want to make video_url and video_key required after migration:
  // pgm.alterColumn('videos', 'video_url', { notNull: true });
  // pgm.alterColumn('videos', 'video_key', { notNull: true });
};

exports.down = (pgm) => {
  // Reverse the changes
  pgm.dropIndex('videos', 'video_key');
  
  pgm.dropColumn('videos', 'video_url');
  pgm.dropColumn('videos', 'video_key');
  pgm.dropColumn('videos', 'width');
  pgm.dropColumn('videos', 'height');
  pgm.dropColumn('videos', 'file_size_bytes');
  pgm.dropColumn('videos', 'device_make');
  pgm.dropColumn('videos', 'device_model');
  pgm.dropColumn('videos', 'location_city');
  pgm.dropColumn('videos', 'location_state');
  pgm.dropColumn('videos', 'location_country');
  
  // Add back Cloudinary columns
  pgm.addColumn('videos', {
    cloudinary_public_id: { type: 'varchar(255)', notNull: true },
    cloudinary_url: { type: 'text', notNull: true },
  });
};