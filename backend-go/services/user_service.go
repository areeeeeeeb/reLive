package services

import (
	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/gin-gonic/gin"
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
func (us *UserService) Sync(c *gin.Context, auth0ID, email, username, displayName string) (*models.User, error) {
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
	return us.store.UpsertUser(c, user)
}