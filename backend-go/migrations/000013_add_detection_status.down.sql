DROP INDEX IF EXISTS idx_videos_pending_detection;

ALTER TABLE videos
    DROP COLUMN IF EXISTS detection_status;
