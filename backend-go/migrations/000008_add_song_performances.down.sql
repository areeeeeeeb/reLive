-- Revert: drop song_performance_id, restore song_id on videos
DROP INDEX IF EXISTS idx_videos_song_performance_id;
ALTER TABLE videos DROP COLUMN IF EXISTS song_performance_id;

ALTER TABLE videos
    ADD COLUMN song_id INTEGER REFERENCES songs(id) ON DELETE SET NULL;

CREATE INDEX idx_videos_song_id ON videos(song_id) WHERE song_id IS NOT NULL;

DROP TABLE IF EXISTS song_performances;
