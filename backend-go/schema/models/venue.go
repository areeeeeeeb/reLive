package models

import "time"

type Venue struct {
	ID        int        `db:"id" json:"id"`
	Name      string     `db:"name" json:"name"`
	
	Latitude    *float64   `db:"latitude" json:"latitude,omitempty"`
  	Longitude   *float64   `db:"longitude" json:"longitude,omitempty"`

	City        *string    `db:"city" json:"city,omitempty"`
	Region      *string    `db:"region" json:"region,omitempty"` // state/province/etc
	CountryCode string     `db:"country_code" json:"country_code"` // CA/US/KR

	Address     *string    `db:"address" json:"address,omitempty"`
	GooglePlaceID *string `db:"google_place_id" json:"google_place_id,omitempty"`

	CreatedAt time.Time  `db:"created_at" json:"created_at"`
	DeletedAt *time.Time `db:"deleted_at" json:"-"`
}
