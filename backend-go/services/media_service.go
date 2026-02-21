package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/areeeeeeeb/reLive/backend-go/models"
)

// MediaService is a stateless wrapper around video bytes processing tools.
// No DB, no S3, no domain knowledge. Takes file paths, returns raw data.
type MediaService struct{}

func NewMediaService() (*MediaService, error) {
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		return nil, fmt.Errorf("ffmpeg not found: %w", err)
	}
	if _, err := exec.LookPath("ffprobe"); err != nil {
		return nil, fmt.Errorf("ffprobe not found: %w", err)
	}
	return &MediaService{}, nil
}

// ==============================
// ffmpeg and ffprobe
// ==============================

// ffprobe JSON output structures
type ffprobeOutput struct {
	Streams []ffprobeStream `json:"streams"`
	Format  ffprobeFormat   `json:"format"`
}

type ffprobeFormat struct {
	Duration string            `json:"duration"`
	Tags     map[string]string `json:"tags"`
}

type ffprobeStream struct {
	CodecType      string `json:"codec_type"`
	CodecTagString string `json:"codec_tag_string"`
	Width          int    `json:"width"`
	Height         int    `json:"height"`
}

// extractGPS tries known tag keys for GPS coordinates (Android, iOS).
// Returns nil, nil if no GPS tags are present. Returns an error if a tag is
// present but fails to parse — callers should log this.
func extractGPS(tags map[string]string) (*models.GPSCoordinates, error) {
	androidKey := "location"
	iosKey := "com.apple.quicktime.location.ISO6709"

	if loc, ok := tags[androidKey]; ok {
		if gps := parseGPSFromTag(loc); gps.Latitude != 0 || gps.Longitude != 0 {
			return &gps, nil
		}
		return nil, fmt.Errorf("failed to parse GPS from android tag: %q", loc)
	}

	if loc, ok := tags[iosKey]; ok {
		if gps := parseGPSFromTag(loc); gps.Latitude != 0 || gps.Longitude != 0 {
			return &gps, nil
		}
		return nil, fmt.Errorf("failed to parse GPS from iOS tag: %q", loc)
	}

	return nil, nil
}

// extractTimestamp tries known tag keys for recording time.
// Returns nil, nil if no timestamp tag is present. Returns an error if the tag
// is present but fails to parse — callers should log this.
func extractTimestamp(tags map[string]string) (*time.Time, error) {
	if ts, ok := tags["creation_time"]; ok {
		t, err := time.Parse(time.RFC3339Nano, ts)
		if err != nil {
			return nil, fmt.Errorf("failed to parse creation_time %q: %w", ts, err)
		}
		return &t, nil
	}
	return nil, nil
}

// parseGPSFromTag parses ISO 6709 GPS string like "+40.7128-074.0060/" into coordinates.
func parseGPSFromTag(tag string) models.GPSCoordinates {
	tag = strings.TrimSuffix(tag, "/")
	if tag == "" {
		return models.GPSCoordinates{}
	}

	// Find the second +/- which starts the longitude
	secondSign := -1
	for i := 1; i < len(tag); i++ {
		if tag[i] == '+' || tag[i] == '-' {
			secondSign = i
			break
		}
	}
	if secondSign == -1 {
		return models.GPSCoordinates{}
	}

	lat, errLat := strconv.ParseFloat(tag[:secondSign], 64)
	lng, errLng := strconv.ParseFloat(tag[secondSign:], 64)
	if errLat != nil || errLng != nil {
		return models.GPSCoordinates{}
	}

	return models.GPSCoordinates{Latitude: lat, Longitude: lng}
}

// ProbeMetadata runs ffprobe on a local file and returns parsed metadata.
func (m *MediaService) ProbeMetadata(ctx context.Context, filePath string) (*models.VideoMetadata, error) {
	cmd := exec.CommandContext(ctx, "ffprobe",
		"-v", "error",
		"-of", "json",
		"-show_format",
		"-show_streams",
		filePath,
	)

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("ffprobe failed: %w", err)
	}

	var probe ffprobeOutput
	if err := json.Unmarshal(output, &probe); err != nil {
		return nil, fmt.Errorf("failed to parse ffprobe output: %w", err)
	}

	metadata := &models.VideoMetadata{}

	if probe.Format.Duration != "" {
		if d, err := strconv.ParseFloat(probe.Format.Duration, 64); err == nil {
			metadata.Duration = &d
		}
	}

	for _, stream := range probe.Streams {
		// we should be getting a video stream
		if stream.CodecType == "video" {
			w, h := stream.Width, stream.Height
			metadata.Width = &w
			metadata.Height = &h
			break
		}
	}

	gps, err := extractGPS(probe.Format.Tags)
	if err != nil {
		log.Printf("extractGPS: %v", err)
	}
	metadata.GPS = gps

	ts, err := extractTimestamp(probe.Format.Tags)
	if err != nil {
		log.Printf("extractTimestamp: %v", err)
	}
	metadata.Timestamp = ts

	return metadata, nil
}

// ExtractFrame extracts a single JPEG frame at the given offset (seconds).
func (m *MediaService) ExtractFrame(ctx context.Context, filePath string, offsetSeconds float64) ([]byte, error) {
	cmd := exec.CommandContext(ctx, "ffmpeg",
		"-ss", fmt.Sprintf("%.2f", offsetSeconds), // -ss before -i is fast seek. fast but may be slightly off
		"-i", filePath,
		"-frames:v", "1",   // output exactly 1 frame
		"-f", "image2",     // output format
		"-c:v", "mjpeg",    // codec
		"-q:v", "3",        // quality
		"pipe:1",           // output JPEG bytes to stdout, so we can output with cmd.Output()
	)

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("ffmpeg frame extraction failed: %w", err)
	}

	if len(output) == 0 {
		return nil, fmt.Errorf("ffmpeg produced empty output")
	}

	return output, nil
}

// ==============================
// ACRCloud SDK
// ==============================
