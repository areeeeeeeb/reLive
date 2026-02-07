-- Rollback: Remove extended video columns

DROP INDEX IF EXISTS idx_videos_deleted_at;
DROP INDEX IF EXISTS idx_videos_recorded_at;
DROP INDEX IF EXISTS idx_videos_visibility;
DROP INDEX IF EXISTS idx_videos_event;

ALTER TABLE videos DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE videos DROP COLUMN IF EXISTS updated_at;
ALTER TABLE videos DROP COLUMN IF EXISTS height;
ALTER TABLE videos DROP COLUMN IF EXISTS width;
ALTER TABLE videos DROP COLUMN IF EXISTS recorded_at;
ALTER TABLE videos DROP COLUMN IF EXISTS longitude;
ALTER TABLE videos DROP COLUMN IF EXISTS latitude;
ALTER TABLE videos DROP COLUMN IF EXISTS event_id;
ALTER TABLE videos DROP COLUMN IF EXISTS event_type;
ALTER TABLE videos DROP COLUMN IF EXISTS visibility;

