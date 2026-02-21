-- Composite partial index for ClaimQueuedVideos.
-- Allows Postgres to seek directly to queued rows already sorted by created_at,
-- and cover the subquery (SELECT id) without hitting the table.
CREATE INDEX idx_videos_queue_status_created
    ON videos (status, created_at, id)
    WHERE deleted_at IS NULL;
