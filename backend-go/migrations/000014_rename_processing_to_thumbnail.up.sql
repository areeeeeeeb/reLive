ALTER TABLE videos RENAME COLUMN processing_status TO thumbnail_status;

DROP INDEX IF EXISTS idx_videos_queued_processing;

CREATE INDEX idx_videos_queued_thumbnail
    ON videos (created_at, id)
    WHERE thumbnail_status = 'queued' AND deleted_at IS NULL;

ALTER TABLE videos ADD COLUMN IF NOT EXISTS detection_status TEXT DEFAULT NULL;
