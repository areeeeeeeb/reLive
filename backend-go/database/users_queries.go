package database

import (
	"errors"

	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserQueries struct {
	pool *pgxpool.Pool
}

func NewUserQueries(pool *pgxpool.Pool) *UserQueries {
	return &UserQueries{pool: pool}
}

func (uq *UserQueries) GetByID(c *gin.Context, userID int) {
	// TODO
}

func (uq *UserQueries) Upsert(c *gin.Context, user *models.User) (*models.User, error) {
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
		profile_picture = EXCLUDED.profile_picture,
		bio = EXCLUDED.bio,
		updated_at = NOW()
	RETURNING
		id, auth0_id, email, username, display_name, profile_picture, bio, created_at, updated_at`

	var out models.User
	var profilePicture *string
	var bio *string

	err := uq.pool.QueryRow(
		c.Request.Context(),
		q,
		user.Auth0ID,
		user.Email,
		user.Username,
		user.DisplayName,
		user.ProfilePictureURL,
		user.Bio,
	).Scan(
		&out.ID,
		&out.Auth0ID,
		&out.Email,
		&out.Username,
		&out.DisplayName,
		&profilePicture,
		&bio,
		&out.CreatedAt,
		&out.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	out.ProfilePictureURL = profilePicture
	out.Bio = bio
	return &out, nil
}