-- ============================================================================
-- Allow unresolved songs with raw artist text
-- ============================================================================

ALTER TABLE songs
    ALTER COLUMN artist_id DROP NOT NULL,
    ADD COLUMN artist_name_raw VARCHAR(255);

ALTER TABLE songs
    ADD CONSTRAINT songs_verified_requires_artist_chk
        CHECK (NOT is_verified OR artist_id IS NOT NULL);
