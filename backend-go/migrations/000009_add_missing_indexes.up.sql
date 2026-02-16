-- ============================================================================
-- Add missing partial index on song_performances.deleted_at
-- ============================================================================

CREATE INDEX idx_song_performances_deleted_at ON song_performances(deleted_at) WHERE deleted_at IS NULL;

