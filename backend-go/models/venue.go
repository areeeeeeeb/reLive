package models

import (
    "math"
    "time"
)

// Venue represents a event venue location
type Venue struct {
    ID        int       `db:"id" json:"id"`
    Name      string    `db:"name" json:"name"`
    City      string    `db:"city" json:"city"`
    State     *string   `db:"state" json:"state"`       // Nullable
    Country   string    `db:"country" json:"country"`
    Latitude  float64   `db:"latitude" json:"latitude"`
    Longitude float64   `db:"longitude" json:"longitude"`
    CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// VenueWithEvents includes the venue's events
type VenueWithEvents struct {
    Venue
    Events []Event `json:"events"`
}

// DistanceTo calculates distance to another point using Haversine formula (in km)
func (v *Venue) DistanceTo(lat, lng float64) float64 {
    return HaversineDistance(v.Latitude, v.Longitude, lat, lng)
}

// HaversineDistance calculates distance between two GPS coordinates in kilometers
func HaversineDistance(lat1, lng1, lat2, lng2 float64) float64 {
    const earthRadiusKm = 6371.0

    lat1Rad := lat1 * math.Pi / 180
    lat2Rad := lat2 * math.Pi / 180
    dLat := (lat2 - lat1) * math.Pi / 180
    dLng := (lng2 - lng1) * math.Pi / 180

    a := math.Sin(dLat/2)*math.Sin(dLat/2) +
        math.Cos(lat1Rad)*math.Cos(lat2Rad)*
            math.Sin(dLng/2)*math.Sin(dLng/2)

    c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

    return earthRadiusKm * c
}