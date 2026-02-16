-- ============================================================================
-- Add song_performances table, replace videos.song_id with song_performance_id
-- ============================================================================

CREATE TABLE song_performances (
    id         SERIAL PRIMARY KEY,
    act_id     INTEGER NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
    song_id    INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    position   INTEGER,           -- position in the setlist (nullable)
    started_at TIMESTAMP,         -- when the song was performed (nullable)
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_song_performances_act_id ON song_performances(act_id);
CREATE INDEX idx_song_performances_song_id ON song_performances(song_id);

-- Replace song_id with song_performance_id on videos
DROP INDEX IF EXISTS idx_videos_song_id;
ALTER TABLE videos DROP COLUMN IF EXISTS song_id;

ALTER TABLE videos
    ADD COLUMN song_performance_id INTEGER REFERENCES song_performances(id) ON DELETE SET NULL;

CREATE INDEX idx_videos_song_performance_id ON videos(song_performance_id) WHERE song_performance_id IS NOT NULL;

