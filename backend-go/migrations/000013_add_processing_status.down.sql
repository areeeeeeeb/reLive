DROP INDEX IF EXISTS idx_videos_queued_processing;

ALTER TABLE videos
    DROP COLUMN IF EXISTS processing_status;
