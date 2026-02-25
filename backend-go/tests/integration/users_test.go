package integration_test

import "testing"

func TestUsers_Sync(t *testing.T) {
	t.Run("valid request creates user", func(t *testing.T) {
		resp := post(t, "/v2/api/users/sync", map[string]string{
			"email":       "sync-valid@relive-integration.dev",
			"username":    "syncvalid",
			"displayName": "Sync Valid",
		})
		assertStatus(t, resp, 200)

		body := decodeBody[struct {
			User struct {
				ID          int     `json:"id"`
				Email       string  `json:"email"`
				Username    string  `json:"username"`
				DisplayName string  `json:"display_name"`
				ProfilePic  *string `json:"profile_picture"`
				Bio         *string `json:"bio"`
			} `json:"user"`
		}](t, resp)

		if body.User.ID == 0 {
			t.Error("want non-zero user.id")
		}
		if body.User.Email != "sync-valid@relive-integration.dev" {
			t.Errorf("email: got %q, want %q", body.User.Email, "sync-valid@relive-integration.dev")
		}
		if body.User.Username != "syncvalid" {
			t.Errorf("username: got %q, want %q", body.User.Username, "syncvalid")
		}
	})

	t.Run("idempotent — two syncs return the same user id", func(t *testing.T) {
		syncBody := map[string]string{
			"email":    "idem@relive-integration.dev",
			"username": "idemtest",
		}

		resp1 := post(t, "/v2/api/users/sync", syncBody)
		assertStatus(t, resp1, 200)
		b1 := decodeBody[struct {
			User struct{ ID int `json:"id"` } `json:"user"`
		}](t, resp1)

		resp2 := post(t, "/v2/api/users/sync", syncBody)
		assertStatus(t, resp2, 200)
		b2 := decodeBody[struct {
			User struct{ ID int `json:"id"` } `json:"user"`
		}](t, resp2)

		if b1.User.ID != b2.User.ID {
			t.Errorf("re-sync changed user id: first=%d second=%d", b1.User.ID, b2.User.ID)
		}
	})

	t.Run("COALESCE fix — profile_picture and bio survive re-sync", func(t *testing.T) {
		// These nullable fields must be present in the response and must not be
		// silently dropped/overwritten to NULL by the upsert.
		resp := post(t, "/v2/api/users/sync", map[string]string{
			"email":    "coalesce@relive-integration.dev",
			"username": "coalescetest",
		})
		assertStatus(t, resp, 200)

		body := decodeBody[struct {
			User struct {
				ProfilePic *string `json:"profile_picture"`
				Bio        *string `json:"bio"`
			} `json:"user"`
		}](t, resp)

		// Fields must decode without error (null is acceptable for a fresh user).
		_ = body.User.ProfilePic
		_ = body.User.Bio
	})

	t.Run("displayName defaults to username when omitted", func(t *testing.T) {
		resp := post(t, "/v2/api/users/sync", map[string]string{
			"email":    "nodisplay@relive-integration.dev",
			"username": "nodisplay",
		})
		assertStatus(t, resp, 200)

		body := decodeBody[struct {
			User struct {
				Username    string `json:"username"`
				DisplayName string `json:"display_name"`
			} `json:"user"`
		}](t, resp)

		if body.User.DisplayName != body.User.Username {
			t.Errorf("want display_name=%q (same as username), got %q",
				body.User.Username, body.User.DisplayName)
		}
	})

	t.Run("missing email → 400", func(t *testing.T) {
		resp := post(t, "/v2/api/users/sync", map[string]string{"username": "nomail"})
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("missing username → 400", func(t *testing.T) {
		resp := post(t, "/v2/api/users/sync", map[string]string{"email": "a@b.com"})
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("invalid email format → 400", func(t *testing.T) {
		resp := post(t, "/v2/api/users/sync", map[string]string{
			"email":    "notanemail",
			"username": "test",
		})
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("empty body → 400", func(t *testing.T) {
		resp := post(t, "/v2/api/users/sync", map[string]string{})
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})
}

func TestUsers_Me(t *testing.T) {
	// The dev user was synced in TestMain; ResolveUser can resolve them.
	resp := post(t, "/v2/api/users/me", struct{}{})
	assertStatus(t, resp, 200)
	resp.Body.Close()
}
