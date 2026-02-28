-- Strict migration: enforce constraints only.
-- Ensure existing data is cleaned up before applying this migration.

ALTER TABLE concerts
    ALTER COLUMN name SET NOT NULL;

ALTER TABLE concerts
    ADD CONSTRAINT chk_concerts_name_not_blank CHECK (TRIM(name) <> '');
