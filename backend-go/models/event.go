package models

import "time"

// Event represents a music event
type Event struct {
    ID          int       `db:"id" json:"id"`
    ArtistID    int       `db:"artist_id" json:"artist_id"`
    VenueID     int       `db:"venue_id" json:"venue_id"`
    EventDate   time.Time `db:"event_date" json:"event_date"`
    TourName    *string   `db:"tour_name" json:"tour_name"`         // Nullable
    SetlistFMID *string   `db:"setlistfm_id" json:"setlistfm_id"`   // Nullable
    CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

// EventDetails includes related artist, venue, and songs
type EventDetails struct {
    Event
    Artist Artist  `json:"artist"`
    Venue  Venue   `json:"venue"`
    Songs  []Song  `json:"songs,omitempty"`
    Videos []Video `json:"videos,omitempty"`
}

// SearchEventsRequest for searching events
type SearchEventsRequest struct {
    ArtistName string    `json:"artist_name"`
    VenueName  string    `json:"venue_name"`
    City       string    `json:"city"`
    StartDate  time.Time `json:"start_date"`
    EndDate    time.Time `json:"end_date"`
    Latitude   float64   `json:"latitude"`
    Longitude  float64   `json:"longitude"`
    RadiusKM   float64   `json:"radius_km"`
}
