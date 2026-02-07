package models

import "time"

// User represents a registered user (with Auth0)
type User struct {
	ID                int       `db:"id" json:"id"`
	Auth0ID           string    `db:"auth0_id" json:"auth0_id"`
	Email             string    `db:"email" json:"email"`
	Username          string    `db:"username" json:"username"`
	DisplayName       string    `db:"display_name" json:"display_name"`
	ProfilePictureURL *string   `db:"profile_picture" json:"profile_picture"` // Nullable
	Bio               *string   `db:"bio" json:"bio"`                         // Nullable
	CreatedAt         time.Time `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time `db:"updated_at" json:"updated_at"`
}
