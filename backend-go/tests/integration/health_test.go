package integration_test

import "testing"

func TestHealth(t *testing.T) {
	t.Run("GET /health returns ok", func(t *testing.T) {
		resp := get(t, "/health")
		assertStatus(t, resp, 200)

		body := decodeBody[map[string]any](t, resp)
		if body["status"] != "ok" {
			t.Errorf("want status=ok, got %v", body["status"])
		}
	})

	t.Run("GET /health/db returns connected", func(t *testing.T) {
		resp := get(t, "/health/db")
		assertStatus(t, resp, 200)

		body := decodeBody[map[string]any](t, resp)
		if body["database"] != "connected" {
			t.Errorf("want database=connected, got %v", body["database"])
		}
	})

	t.Run("GET /v2/api/ returns version", func(t *testing.T) {
		resp := get(t, "/v2/api/")
		assertStatus(t, resp, 200)

		body := decodeBody[map[string]any](t, resp)
		if _, ok := body["version"]; !ok {
			t.Errorf("want version field in response, got %v", body)
		}
	})
}
