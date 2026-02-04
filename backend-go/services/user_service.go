package services

import (
	"context"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
)

type UserService struct {
	store *database.Store
}

func NewUserService(store *database.Store) *UserService {
	return &UserService{store: store}
}

// sync handles Auth0 login/signup
// updates on conflict because user info
// email, display name can change in the OAuth provider
func (s *UserService) Sync(ctx context.Context, auth0ID, email, username, displayName string) (*models.User, error) {
	if displayName == "" {
		displayName = username
	}
	user := &models.User{
		Auth0ID:           auth0ID,
		Email:             email,
		Username:          username,
		DisplayName:       displayName,
		ProfilePictureURL: nil,
		Bio:               nil,
	}
	return s.store.UpsertUser(ctx, user)
}