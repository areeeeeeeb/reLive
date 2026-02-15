-- Remove video columns
DROP INDEX IF EXISTS idx_videos_song_id;
DROP INDEX IF EXISTS idx_videos_act_id;

ALTER TABLE videos
    DROP COLUMN IF EXISTS song_id,
    DROP COLUMN IF EXISTS act_id;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS acts;
DROP TABLE IF EXISTS concerts;
DROP TABLE IF EXISTS songs;
DROP TABLE IF EXISTS artists;
DROP TABLE IF EXISTS venues;

