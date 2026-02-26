ALTER TABLE videos DROP COLUMN IF EXISTS detection_status;

DROP INDEX IF EXISTS idx_videos_queued_thumbnail;

ALTER TABLE videos RENAME COLUMN thumbnail_status TO processing_status;

CREATE INDEX idx_videos_queued_processing
    ON videos (created_at, id)
    WHERE processing_status = 'queued' AND deleted_at IS NULL;
