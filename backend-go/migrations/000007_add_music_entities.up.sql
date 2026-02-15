-- ============================================================================
-- Music entity tables: artists, songs, venues, concerts, acts
-- ============================================================================

CREATE TABLE venues (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    city            VARCHAR(255),
    region          VARCHAR(255),
    country_code    VARCHAR(2) NOT NULL,
    address         TEXT,
    google_place_id VARCHAR(255),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

CREATE TABLE artists (
    id                 SERIAL PRIMARY KEY,
    name               VARCHAR(255) NOT NULL,
    musicbrainz_id     VARCHAR(36) UNIQUE,
    spotify_id         VARCHAR(255) UNIQUE,
    rym_id             VARCHAR(255) UNIQUE,
    image_url          TEXT,
    is_verified        BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at         TIMESTAMP
);

CREATE TABLE songs (
    id                        SERIAL PRIMARY KEY,
    title                     VARCHAR(255) NOT NULL,
    artist_id                 INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    duration_seconds          INTEGER,
    musicbrainz_recording_id  VARCHAR(36) UNIQUE,
    isrc                      VARCHAR(12) UNIQUE,
    is_verified               BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at                TIMESTAMP
);

CREATE TABLE concerts (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(255),
    venue_id     INTEGER REFERENCES venues(id) ON DELETE SET NULL,
    artist_id    INTEGER REFERENCES artists(id) ON DELETE SET NULL,  -- convenience denorm, NULL for multi-artist events
    date         TIMESTAMP NOT NULL,
    setlistfm_id VARCHAR(255) UNIQUE,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMP
);

CREATE TABLE acts (
    id         SERIAL PRIMARY KEY,
    concert_id INTEGER NOT NULL REFERENCES concerts(id) ON DELETE CASCADE,
    artist_id  INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    act_type   VARCHAR(50),

    start_time TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    UNIQUE (concert_id, artist_id)
);

-- ============================================================================
-- Update videos table
-- ============================================================================

ALTER TABLE videos
    ADD COLUMN act_id  INTEGER REFERENCES acts(id) ON DELETE SET NULL,
    ADD COLUMN song_id INTEGER REFERENCES songs(id) ON DELETE SET NULL;

-- ============================================================================
-- Indexes
-- ============================================================================

-- Artists
CREATE INDEX idx_artists_name ON artists(name);
CREATE INDEX idx_artists_musicbrainz_id ON artists(musicbrainz_id) WHERE musicbrainz_id IS NOT NULL;
CREATE INDEX idx_artists_spotify_id ON artists(spotify_id) WHERE spotify_id IS NOT NULL;
CREATE INDEX idx_artists_rym_id ON artists(rym_id) WHERE rym_id IS NOT NULL;
CREATE INDEX idx_artists_deleted_at ON artists(deleted_at) WHERE deleted_at IS NULL;

-- Songs
CREATE INDEX idx_songs_artist_id ON songs(artist_id);
CREATE INDEX idx_songs_title ON songs(title);
CREATE INDEX idx_songs_deleted_at ON songs(deleted_at) WHERE deleted_at IS NULL;

-- Venues
CREATE INDEX idx_venues_google_place_id ON venues(google_place_id) WHERE google_place_id IS NOT NULL;
CREATE INDEX idx_venues_deleted_at ON venues(deleted_at) WHERE deleted_at IS NULL;

-- Concerts
CREATE INDEX idx_concerts_venue_id ON concerts(venue_id) WHERE venue_id IS NOT NULL;
CREATE INDEX idx_concerts_artist_id ON concerts(artist_id) WHERE artist_id IS NOT NULL;
CREATE INDEX idx_concerts_date ON concerts(date);
CREATE INDEX idx_concerts_setlistfm_id ON concerts(setlistfm_id) WHERE setlistfm_id IS NOT NULL;
CREATE INDEX idx_concerts_deleted_at ON concerts(deleted_at) WHERE deleted_at IS NULL;

-- Acts
CREATE INDEX idx_acts_concert_id ON acts(concert_id);
CREATE INDEX idx_acts_artist_id ON acts(artist_id);
CREATE INDEX idx_acts_act_type ON acts(act_type) WHERE act_type IS NOT NULL;

-- Videos (new columns)
CREATE INDEX idx_videos_act_id ON videos(act_id) WHERE act_id IS NOT NULL;
CREATE INDEX idx_videos_song_id ON videos(song_id) WHERE song_id IS NOT NULL;
