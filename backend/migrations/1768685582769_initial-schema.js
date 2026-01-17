exports.up = (pgm) => {
  // Users table
  pgm.createTable('users', {
    id: 'id',
    auth0_id: { type: 'varchar(255)', notNull: true, unique: true },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    username: { type: 'varchar(50)', notNull: true, unique: true },
    display_name: { type: 'varchar(100)' },
    profile_picture_url: { type: 'text' },
    bio: { type: 'text' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Artists table
  pgm.createTable('artists', {
    id: 'id',
    name: { type: 'varchar(255)', notNull: true },
    spotify_id: { type: 'varchar(255)', unique: true },
    image_url: { type: 'text' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Venues table
  pgm.createTable('venues', {
    id: 'id',
    name: { type: 'varchar(255)', notNull: true },
    city: { type: 'varchar(100)', notNull: true },
    state: { type: 'varchar(100)' },
    country: { type: 'varchar(100)', notNull: true },
    latitude: { type: 'decimal(10,8)' },
    longitude: { type: 'decimal(11,8)' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Concerts table
  pgm.createTable('concerts', {
    id: 'id',
    artist_id: {
      type: 'integer',
      notNull: true,
      references: 'artists',
      onDelete: 'CASCADE'
    },
    venue_id: {
      type: 'integer',
      notNull: true,
      references: 'venues',
      onDelete: 'CASCADE'
    },
    concert_date: { type: 'timestamp', notNull: true },
    tour_name: { type: 'varchar(255)' },
    pollstar_id: { type: 'varchar(255)', unique: true },
    setlistfm_id: { type: 'varchar(255)', unique: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Attendees table
  pgm.createTable('attendees', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE'
    },
    concert_id: {
      type: 'integer',
      notNull: true,
      references: 'concerts',
      onDelete: 'CASCADE'
    },
    attended_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Unique constraint for user-concert pair
  pgm.addConstraint('attendees', 'unique_user_concert', {
    unique: ['user_id', 'concert_id']
  });

  // Songs table
  pgm.createTable('songs', {
    id: 'id',
    concert_id: {
      type: 'integer',
      notNull: true,
      references: 'concerts',
      onDelete: 'CASCADE'
    },
    title: { type: 'varchar(255)', notNull: true },
    order_in_setlist: { type: 'integer' },
    duration_seconds: { type: 'integer' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Videos table
  pgm.createTable('videos', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE'
    },
    concert_id: {
      type: 'integer',
      references: 'concerts',
      onDelete: 'SET NULL'
    },
    song_id: {
      type: 'integer',
      references: 'songs',
      onDelete: 'SET NULL'
    },
    title: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    cloudinary_public_id: { type: 'varchar(255)', notNull: true },
    cloudinary_url: { type: 'text', notNull: true },
    thumbnail_url: { type: 'text' },
    duration_seconds: { type: 'integer' },
    recorded_at: { type: 'timestamp' },
    latitude: { type: 'decimal(10,8)' },
    longitude: { type: 'decimal(11,8)' },
    views_count: { type: 'integer', notNull: true, default: 0 },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Create indexes for performance
  pgm.createIndex('concerts', 'artist_id');
  pgm.createIndex('concerts', 'venue_id');
  pgm.createIndex('concerts', 'concert_date');
  pgm.createIndex('attendees', 'user_id');
  pgm.createIndex('attendees', 'concert_id');
  pgm.createIndex('songs', 'concert_id');
  pgm.createIndex('videos', 'user_id');
  pgm.createIndex('videos', 'concert_id');
  pgm.createIndex('videos', 'song_id');
};

exports.down = (pgm) => {
  // Drop tables in reverse order (foreign keys)
  pgm.dropTable('videos');
  pgm.dropTable('songs');
  pgm.dropTable('attendees');
  pgm.dropTable('concerts');
  pgm.dropTable('venues');
  pgm.dropTable('artists');
  pgm.dropTable('users');
};