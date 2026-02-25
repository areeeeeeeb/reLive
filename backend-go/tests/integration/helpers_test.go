package integration_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"testing"
)

// get makes a GET request to the test server.
func get(t *testing.T, path string) *http.Response {
	t.Helper()
	resp, err := http.Get(ts.URL + path)
	if err != nil {
		t.Fatalf("GET %s: %v", path, err)
	}
	return resp
}

// post makes a POST request with a JSON-encoded body to the test server.
func post(t *testing.T, path string, body any) *http.Response {
	t.Helper()
	b, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal POST body for %s: %v", path, err)
	}
	resp, err := http.Post(ts.URL+path, "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatalf("POST %s: %v", path, err)
	}
	return resp
}

// doDelete makes a DELETE request to the test server.
func doDelete(t *testing.T, path string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodDelete, ts.URL+path, nil)
	if err != nil {
		t.Fatalf("build DELETE %s: %v", path, err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("DELETE %s: %v", path, err)
	}
	return resp
}

// assertStatus checks the HTTP status code and reports a failure with the
// response body if it doesn't match.
func assertStatus(t *testing.T, resp *http.Response, want int) {
	t.Helper()
	if resp.StatusCode != want {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		t.Errorf("want HTTP %d, got %d  |  body: %s", want, resp.StatusCode, body)
	}
}

// decodeBody JSON-decodes the response body into T and closes the body.
func decodeBody[T any](t *testing.T, resp *http.Response) T {
	t.Helper()
	defer resp.Body.Close()
	var v T
	if err := json.NewDecoder(resp.Body).Decode(&v); err != nil {
		t.Fatalf("decode response body: %v", err)
	}
	return v
}

// ptr returns a pointer to v. Useful for building requests with optional fields.
func ptr[T any](v T) *T { return &v }

// hasS3Creds reports whether Spaces credentials are fully configured.
// Tests that require real S3 calls should call t.Skip() when this is false.
func hasS3Creds() bool {
	return os.Getenv("DO_SPACES_BUCKET") != "" &&
		os.Getenv("DO_SPACES_KEY") != "" &&
		os.Getenv("DO_SPACES_SECRET") != ""
}
