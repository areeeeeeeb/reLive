package integration_test

import "testing"

func TestConcerts_Get(t *testing.T) {
	t.Run("non-integer id → 400", func(t *testing.T) {
		resp := get(t, "/v2/api/concerts/notanid")
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("non-existent id → 404", func(t *testing.T) {
		resp := get(t, "/v2/api/concerts/99999999")
		assertStatus(t, resp, 404)
		resp.Body.Close()
	})
}

func TestConcerts_Acts(t *testing.T) {
	t.Run("non-integer id → 400", func(t *testing.T) {
		resp := get(t, "/v2/api/concerts/notanid/acts")
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("non-existent concert → 404", func(t *testing.T) {
		resp := get(t, "/v2/api/concerts/99999999/acts")
		assertStatus(t, resp, 404)
		resp.Body.Close()
	})
}

func TestConcerts_SongPerformances(t *testing.T) {
	t.Run("non-integer id → 400", func(t *testing.T) {
		resp := get(t, "/v2/api/concerts/notanid/song-performances")
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("non-existent concert → 404", func(t *testing.T) {
		resp := get(t, "/v2/api/concerts/99999999/song-performances")
		assertStatus(t, resp, 404)
		resp.Body.Close()
	})
}

func TestConcerts_Videos(t *testing.T) {
	t.Run("non-integer id → 400", func(t *testing.T) {
		resp := get(t, "/v2/api/concerts/notanid/videos")
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("non-existent concert → 404", func(t *testing.T) {
		resp := get(t, "/v2/api/concerts/99999999/videos")
		assertStatus(t, resp, 404)
		resp.Body.Close()
	})
}
