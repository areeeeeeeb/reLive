-- Add new columns to videos table for extended functionality

ALTER TABLE videos
  ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT 'private',
  ADD COLUMN event_type VARCHAR(50),
  ADD COLUMN event_id INTEGER,
  ADD COLUMN latitude DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION,
  ADD COLUMN recorded_at TIMESTAMP,
  ADD COLUMN width INTEGER,
  ADD COLUMN height INTEGER,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN deleted_at TIMESTAMP;

-- Indexes for common queries
CREATE INDEX idx_videos_event ON videos(event_type, event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_videos_visibility ON videos(visibility);
CREATE INDEX idx_videos_recorded_at ON videos(recorded_at) WHERE recorded_at IS NOT NULL;
CREATE INDEX idx_videos_deleted_at ON videos(deleted_at) WHERE deleted_at IS NULL;

