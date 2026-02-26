package models

import "time"

// ConcertDetectRequest holds client-provided metadata used to match against concerts.
// All fields are optional — results degrade gracefully if some are absent.
type ConcertDetectRequest struct {
	RecordedAt *time.Time `json:"recordedAt"`
	Latitude   *float64   `json:"latitude"`
	Longitude  *float64   `json:"longitude"`
}

// ConcertMatch pairs a concert candidate with its detection confidence score.
type ConcertMatch struct {
	Concert Concert `json:"concert"`
	Score   float64 `json:"score"`
}

// ConcertDetectResult is returned from POST /concerts/detect.
// Matches holds up to 3 candidates ordered by score descending, empty if none found.
type ConcertDetectResult struct {
	Detected bool           `json:"detected"`
	Matches  []ConcertMatch `json:"matches"`
}
