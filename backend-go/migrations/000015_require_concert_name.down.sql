ALTER TABLE concerts
    DROP CONSTRAINT IF EXISTS chk_concerts_name_not_blank;

ALTER TABLE concerts
    ALTER COLUMN name DROP NOT NULL;
