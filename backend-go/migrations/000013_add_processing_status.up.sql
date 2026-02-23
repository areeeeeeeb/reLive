ALTER TABLE videos
    ADD COLUMN processing_status TEXT DEFAULT NULL;

-- processing_status is omitted from the index columns because the WHERE clause already
-- pins this index to only 'queued' rows — including it would be redundant.
CREATE INDEX idx_videos_queued_processing
    ON videos (created_at, id)
    WHERE processing_status = 'queued' AND deleted_at IS NULL;
