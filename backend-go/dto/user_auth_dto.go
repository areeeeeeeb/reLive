package dto

// SyncUserRequest for syncing user from Auth0 on login
type SyncUserRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Username    string `json:"username" binding:"required"`
	DisplayName string `json:"displayName"` // optional
}

// TestSyncRequest for local testing (bypasses auth)
type TestSyncRequest struct {
	Auth0ID     string `json:"auth0Id" binding:"required"`
	Email       string `json:"email" binding:"required,email"`
	Username    string `json:"username" binding:"required"`
	DisplayName string `json:"displayName"`
}

// UpdateProfileRequest for updating user profile in-app.
// ProfilePicture and Bio are pointers — JSON null explicitly clears the field.
type UpdateProfileRequest struct {
	DisplayName    string  `json:"displayName" binding:"required"`
	ProfilePicture *string `json:"profilePicture"`
	Bio            *string `json:"bio"`
}
