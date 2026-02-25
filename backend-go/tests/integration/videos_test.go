package integration_test

import (
	"bytes"
	"fmt"
	"net/http"
	"strconv"
	"testing"
)

func TestVideos_Stubs(t *testing.T) {
	t.Run("GET /videos → 501", func(t *testing.T) {
		resp := get(t, "/v2/api/videos")
		assertStatus(t, resp, 501)
		resp.Body.Close()
	})

	t.Run("GET /videos/:id → 501", func(t *testing.T) {
		resp := get(t, "/v2/api/videos/1")
		assertStatus(t, resp, 501)
		resp.Body.Close()
	})

	t.Run("DELETE /videos/:id → 501", func(t *testing.T) {
		resp := doDelete(t, "/v2/api/videos/1")
		assertStatus(t, resp, 501)
		resp.Body.Close()
	})
}

func TestVideos_UploadInit_Validation(t *testing.T) {
	t.Run("empty body → 400", func(t *testing.T) {
		resp := post(t, "/v2/api/videos/upload/init", map[string]any{})
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("missing sizeBytes → 400", func(t *testing.T) {
		resp := post(t, "/v2/api/videos/upload/init", map[string]any{
			"filename":    "test.mp4",
			"contentType": "video/mp4",
		})
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("sizeBytes=0 → 400 (min=1)", func(t *testing.T) {
		resp := post(t, "/v2/api/videos/upload/init", map[string]any{
			"filename":    "test.mp4",
			"contentType": "video/mp4",
			"sizeBytes":   0,
		})
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("missing contentType → 400", func(t *testing.T) {
		resp := post(t, "/v2/api/videos/upload/init", map[string]any{
			"filename":  "test.mp4",
			"sizeBytes": 1048576,
		})
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("missing filename → 400", func(t *testing.T) {
		resp := post(t, "/v2/api/videos/upload/init", map[string]any{
			"contentType": "video/mp4",
			"sizeBytes":   1048576,
		})
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	// Non-video content type passes binding validation but is rejected by the
	// service layer. Returns 500 until the error-handling pass maps it to 4xx.
	t.Run("non-video contentType → 500", func(t *testing.T) {
		resp := post(t, "/v2/api/videos/upload/init", map[string]any{
			"filename":    "evil.txt",
			"contentType": "text/plain",
			"sizeBytes":   1048576,
		})
		assertStatus(t, resp, 500)
		resp.Body.Close()
	})
}

func TestVideos_UploadConfirm_Validation(t *testing.T) {
	t.Run("non-integer video id → 400", func(t *testing.T) {
		resp := post(t, "/v2/api/videos/notanid/upload/confirm", map[string]any{
			"uploadId": "fake",
			"parts":    []map[string]any{{"partNumber": 1, "etag": `"abc"`}},
		})
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("missing uploadId → 400", func(t *testing.T) {
		resp := post(t, "/v2/api/videos/1/upload/confirm", map[string]any{
			"parts": []map[string]any{{"partNumber": 1, "etag": `"abc"`}},
		})
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("missing parts → 400", func(t *testing.T) {
		resp := post(t, "/v2/api/videos/1/upload/confirm", map[string]any{
			"uploadId": "fake",
		})
		assertStatus(t, resp, 400)
		resp.Body.Close()
	})

	t.Run("non-existent video id → 500", func(t *testing.T) {
		resp := post(t, "/v2/api/videos/99999999/upload/confirm", map[string]any{
			"uploadId": "fake",
			"parts":    []map[string]any{{"partNumber": 1, "etag": `"abc"`}},
		})
		assertStatus(t, resp, 500)
		resp.Body.Close()
	})
}

func TestVideos_FullUploadFlow(t *testing.T) {
	if !hasS3Creds() {
		t.Skip("skipping: Spaces credentials not configured (set DO_SPACES_BUCKET, DO_SPACES_KEY, DO_SPACES_SECRET)")
	}

	const fileSize = 1 * 1024 * 1024 // 1 MB → single part (partSize = MinPartSize = 5 MB, count = 1)
	testData := make([]byte, fileSize)

	// ── 1. Init upload ────────────────────────────────────────────────────────
	initResp := post(t, "/v2/api/videos/upload/init", map[string]any{
		"filename":    "integration-test.mp4",
		"contentType": "video/mp4",
		"sizeBytes":   fileSize,
	})
	assertStatus(t, initResp, 200)

	init := decodeBody[struct {
		VideoID  int      `json:"videoId"`
		UploadID string   `json:"uploadId"`
		PartURLs []string `json:"partUrls"`
		PartSize int64    `json:"partSize"`
	}](t, initResp)

	if init.VideoID == 0 {
		t.Fatal("want non-zero videoId")
	}
	if init.UploadID == "" {
		t.Fatal("want non-empty uploadId")
	}
	if len(init.PartURLs) == 0 {
		t.Fatal("want at least one partUrl")
	}

	// ── 2. Upload the single part directly to the S3 presigned URL ───────────
	partReq, err := http.NewRequest(http.MethodPut, init.PartURLs[0], bytes.NewReader(testData))
	if err != nil {
		t.Fatalf("build S3 PUT request: %v", err)
	}
	partReq.Header.Set("Content-Type", "video/mp4")
	partReq.ContentLength = int64(len(testData))

	partResp, err := http.DefaultClient.Do(partReq)
	if err != nil {
		t.Fatalf("S3 part PUT: %v", err)
	}
	partResp.Body.Close()

	if partResp.StatusCode != 200 {
		t.Fatalf("S3 part PUT: got %d, want 200", partResp.StatusCode)
	}

	// S3 returns the ETag with surrounding quotes, e.g. "\"d8e8fca2...\""
	etag := partResp.Header.Get("ETag")
	if etag == "" {
		t.Fatal("S3 part PUT: no ETag in response headers")
	}

	// ── 3. Confirm upload ─────────────────────────────────────────────────────
	confirmPath := "/v2/api/videos/" + strconv.Itoa(init.VideoID) + "/upload/confirm"
	confirmBody := map[string]any{
		"uploadId": init.UploadID,
		"parts":    []map[string]any{{"partNumber": 1, "etag": etag}},
	}

	confirmResp := post(t, confirmPath, confirmBody)
	assertStatus(t, confirmResp, 200)

	confirmed := decodeBody[struct {
		VideoID int    `json:"videoId"`
		Status  string `json:"status"`
	}](t, confirmResp)

	if confirmed.Status != "completed" {
		t.Errorf("confirm status: got %q, want %q", confirmed.Status, "completed")
	}
	if confirmed.VideoID != init.VideoID {
		t.Errorf("confirm videoId: got %d, want %d", confirmed.VideoID, init.VideoID)
	}

	// ── 4. Re-confirm — video is now completed, not pending_upload ────────────
	reConfirmResp := post(t, confirmPath, confirmBody)
	assertStatus(t, reConfirmResp, 500)

	body := decodeBody[map[string]any](t, reConfirmResp)
	errMsg, _ := body["error"].(string)
	if errMsg == "" {
		t.Error("want error message in re-confirm 500 response")
	}
	fmt.Printf("    re-confirm error (expected): %s\n", errMsg)
}
