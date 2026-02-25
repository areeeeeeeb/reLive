package database

import (
	"context"
	"errors"

	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/jackc/pgx/v5"
)

const userCols = `
	id,
	auth0_id,
	email,
	username,
	display_name,
	profile_picture,
	bio,
	created_at,
	updated_at,
	deleted_at
`

func scanUser(row pgx.Row) (*models.User, error) {
	var u models.User
	err := row.Scan(
		&u.ID,
		&u.Auth0ID,
		&u.Email,
		&u.Username,
		&u.DisplayName,
		&u.ProfilePictureURL,
		&u.Bio,
		&u.CreatedAt,
		&u.UpdatedAt,
		&u.DeletedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *Store) GetUserByID(ctx context.Context, userID int) (*models.User, error) {
	const q = `
	SELECT ` + userCols + `
	FROM users
	WHERE id = $1 AND deleted_at IS NULL`

	return scanUser(s.pool.QueryRow(ctx, q, userID))
}

func (s *Store) GetUserByAuth0ID(ctx context.Context, auth0ID string) (*models.User, error) {
	const q = `
	SELECT ` + userCols + `
	FROM users
	WHERE auth0_id = $1 AND deleted_at IS NULL`

	return scanUser(s.pool.QueryRow(ctx, q, auth0ID))
}

func (s *Store) UpsertUser(ctx context.Context, user *models.User) (*models.User, error) {
	if user == nil {
		return nil, errors.New("user is nil")
	}
	if user.Auth0ID == "" {
		return nil, errors.New("missing auth0_id")
	}
	if user.Email == "" || user.Username == "" || user.DisplayName == "" {
		return nil, errors.New("missing required fields: email/username/displayName")
	}

	const q = `
	INSERT INTO users (auth0_id, email, username, display_name, profile_picture, bio)
	VALUES ($1, $2, $3, $4, $5, $6)
	ON CONFLICT (auth0_id)
	DO UPDATE SET
		email = EXCLUDED.email,
		username = EXCLUDED.username,
		display_name = EXCLUDED.display_name,
		profile_picture = COALESCE(users.profile_picture, EXCLUDED.profile_picture),
		bio = COALESCE(users.bio, EXCLUDED.bio),
		updated_at = NOW()
	RETURNING ` + userCols

	return scanUser(s.pool.QueryRow(
		ctx,
		q,
		user.Auth0ID,
		user.Email,
		user.Username,
		user.DisplayName,
		user.ProfilePictureURL,
		user.Bio,
	))
}

