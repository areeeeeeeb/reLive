package services

import (
	"context"

	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/areeeeeeeb/reLive/backend-go/dto"
	"github.com/areeeeeeeb/reLive/backend-go/models"
)

type UserService struct {
	store         *database.Store
	searchService *SearchService
}

func NewUserService(store *database.Store, searchService *SearchService) *UserService {
	return &UserService{store: store, searchService: searchService}
}

// Sync handles Auth0 login/signup — updates on conflict because user info
// (email, display name) can change in the OAuth provider.
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

// GetByID retrieves a user by their internal ID.
func (s *UserService) GetByID(ctx context.Context, userID int) (*models.User, error) {
	return s.store.GetUserByID(ctx, userID)
}

// UpdateProfile updates a user's display name, profile picture, and bio.
// Null values for profilePicture and bio explicitly clear those fields.
func (s *UserService) UpdateProfile(ctx context.Context, userID int, displayName string, profilePicture *string, bio *string) (*models.User, error) {
	return s.store.UpdateUserProfile(ctx, userID, displayName, profilePicture, bio)
}


func (s *UserService) Search(ctx context.Context, req dto.SearchRequest) (*dto.UserSearchResponse, error) {
	if err := s.searchService.ValidateMaxResults(req.MaxResults); err != nil {
		return nil, err
	}

	users, err := s.store.SearchUsers(ctx, req.Q, req.MaxResults)
	if err != nil {
		return nil, err
	}

	results := s.BuildSearchResults(users)
	meta := s.searchService.BuildSearchMeta(req, len(results))
	return &dto.UserSearchResponse{
		Results: results,
		Meta:    meta,
	}, nil
}

func (s *UserService) BuildSearchResults(users []models.User) []dto.UserSearchItem {
	results := make([]dto.UserSearchItem, 0, len(users))
	for _, user := range users {
		results = append(results, dto.UserSearchItem{
			ID:                user.ID,
			Username:          user.Username,
			DisplayName:       user.DisplayName,
			ProfilePictureURL: user.ProfilePictureURL,
		})
	}
	return results
}
