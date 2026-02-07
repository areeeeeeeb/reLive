-- Seed test user for development
INSERT INTO users (auth0_id, email, username, display_name, profile_picture, bio, created_at, updated_at)
VALUES (
    'test|000000000000',
    'test@relive.dev',
    'testuser',
    'Test User',
    NULL,
    'Test account for development',
    NOW(),
    NOW()
)
ON CONFLICT (auth0_id) DO NOTHING;
