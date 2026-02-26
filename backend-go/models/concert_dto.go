package models

import "time"

// ConcertDetectRequest holds client-provided metadata used to match a video to a concert.
// All fields are optional
type ConcertDetectRequest struct {
	RecordedAt *time.Time `json:"recordedAt"`
	Latitude   *float64   `json:"latitude"`
	Longitude  *float64   `json:"longitude"`
	Duration   *float64   `json:"duration"` // seconds
	Width      *int       `json:"width"`
	Height     *int       `json:"height"`
}

// ConcertMatch pairs a concert candidate with its detection confidence score.
type ConcertMatch struct {
	Concert Concert `json:"concert"`
	Score   float64 `json:"score"` 
}

// ConcertDetectResult is returned synchronously from POST /videos/:id/concert/detect.
// Matches holds up to 3 candidates ordered by score descending, empty if none found.
type ConcertDetectResult struct {
	Detected bool           `json:"detected"`
	Matches  []ConcertMatch `json:"matches"`
}
