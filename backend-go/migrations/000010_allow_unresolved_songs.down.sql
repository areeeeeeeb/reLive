ALTER TABLE songs
    DROP CONSTRAINT IF EXISTS songs_verified_requires_artist_chk,
    DROP COLUMN IF EXISTS artist_name_raw;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM songs WHERE artist_id IS NULL) THEN
        RAISE EXCEPTION 'cannot set songs.artist_id back to NOT NULL while unresolved songs exist';
    END IF;
END $$;

ALTER TABLE songs
    ALTER COLUMN artist_id SET NOT NULL;
