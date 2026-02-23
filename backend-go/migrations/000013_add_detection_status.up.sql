ALTER TABLE videos
    ADD COLUMN detection_status TEXT DEFAULT NULL;

-- detection_status is omitted from the index columns because the WHERE clause already
-- pins this index to only 'pending' rows — including it would be redundant.
CREATE INDEX idx_videos_pending_detection
    ON videos (created_at, id)
    WHERE detection_status = 'pending' AND deleted_at IS NULL;
