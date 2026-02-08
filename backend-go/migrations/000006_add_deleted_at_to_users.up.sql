-- Add soft-delete column to users
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;

