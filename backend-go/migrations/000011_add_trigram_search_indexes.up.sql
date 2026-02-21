-- Enable pg_trgm and add trigram indexes for better fuzzy search ranking

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_songs_title_trgm ON songs USING GIN (title gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_artists_name_trgm ON artists USING GIN (name gin_trgm_ops) WHERE deleted_at IS NULL;
