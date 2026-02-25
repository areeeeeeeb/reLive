package integration_test

import "testing"

func TestSongs_Search(t *testing.T) {
	t.Run("returns songs array", func(t *testing.T) {
		resp := get(t, "/v2/api/songs/search?q=creep")
		assertStatus(t, resp, 200)

		body := decodeBody[struct {
			Songs []any `json:"songs"`
		}](t, resp)
		if body.Songs == nil {
			t.Error("want songs array in response, got nil")
		}
	})

	t.Run("max_results is respected", func(t *testing.T) {
		resp := get(t, "/v2/api/songs/search?q=a&max_results=3")
		assertStatus(t, resp, 200)

		body := decodeBody[struct {
			Songs []any `json:"songs"`
		}](t, resp)
		if len(body.Songs) > 3 {
			t.Errorf("max_results=3: got %d results, want ≤ 3", len(body.Songs))
		}
	})

	t.Run("max_results hard-capped at 50", func(t *testing.T) {
		resp := get(t, "/v2/api/songs/search?q=a&max_results=999")
		assertStatus(t, resp, 200)

		body := decodeBody[struct {
			Songs []any `json:"songs"`
		}](t, resp)
		if len(body.Songs) > 50 {
			t.Errorf("hard cap 50: got %d results", len(body.Songs))
		}
	})

	t.Run("missing q → 400", func(t *testing.T) {
		resp := get(t, "/v2/api/songs/search")
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("invalid source value → 400", func(t *testing.T) {
		resp := get(t, "/v2/api/songs/search?q=test&source=invalid")
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})
}

func TestSongs_Get(t *testing.T) {
	t.Run("non-integer id → 400", func(t *testing.T) {
		resp := get(t, "/v2/api/songs/notanid")
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("non-existent id → 404", func(t *testing.T) {
		resp := get(t, "/v2/api/songs/99999999")
		assertStatus(t, resp, 404)
		resp.Body.Close()
	})
}
