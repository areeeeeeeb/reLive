package integration_test

import "testing"

func TestArtists_Search(t *testing.T) {
	t.Run("returns artists array", func(t *testing.T) {
		resp := get(t, "/v2/api/artists/search?q=radiohead")
		assertStatus(t, resp, 200)

		body := decodeBody[struct {
			Artists []any `json:"artists"`
		}](t, resp)
		if body.Artists == nil {
			t.Error("want artists array in response, got nil")
		}
	})

	t.Run("max_results is respected", func(t *testing.T) {
		resp := get(t, "/v2/api/artists/search?q=a&max_results=3")
		assertStatus(t, resp, 200)

		body := decodeBody[struct {
			Artists []any `json:"artists"`
		}](t, resp)
		if len(body.Artists) > 3 {
			t.Errorf("max_results=3: got %d results, want ≤ 3", len(body.Artists))
		}
	})

	t.Run("max_results hard-capped at 50", func(t *testing.T) {
		resp := get(t, "/v2/api/artists/search?q=a&max_results=999")
		assertStatus(t, resp, 200)

		body := decodeBody[struct {
			Artists []any `json:"artists"`
		}](t, resp)
		if len(body.Artists) > 50 {
			t.Errorf("hard cap 50: got %d results", len(body.Artists))
		}
	})

	t.Run("missing q → 400", func(t *testing.T) {
		resp := get(t, "/v2/api/artists/search")
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("invalid source value → 400", func(t *testing.T) {
		resp := get(t, "/v2/api/artists/search?q=test&source=invalid")
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})
}

func TestArtists_Get(t *testing.T) {
	t.Run("non-integer id → 400", func(t *testing.T) {
		resp := get(t, "/v2/api/artists/notanid")
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("non-existent id → 404", func(t *testing.T) {
		resp := get(t, "/v2/api/artists/99999999")
		assertStatus(t, resp, 404)
		resp.Body.Close()
	})
}
