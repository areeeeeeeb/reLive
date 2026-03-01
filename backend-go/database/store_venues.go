package database

import (
	"context"

	"github.com/areeeeeeeb/reLive/backend-go/models"
	"github.com/jackc/pgx/v5"
)

const venueCols = `
	id,
	name,
	latitude,
	longitude,
	city,
	region,
	country_code,
	address,
	google_place_id,
	created_at,
	deleted_at
`

func scanVenue(row pgx.Row) (*models.Venue, error) {
	var v models.Venue
	if err := row.Scan(
		&v.ID,
		&v.Name,
		&v.Latitude,
		&v.Longitude,
		&v.City,
		&v.Region,
		&v.CountryCode,
		&v.Address,
		&v.GooglePlaceID,
		&v.CreatedAt,
		&v.DeletedAt,
	); err != nil {
		return nil, err
	}
	return &v, nil
}

func scanVenues(rows pgx.Rows, allowPartial bool) ([]models.Venue, error) {
	defer rows.Close()
	venues := make([]models.Venue, 0)
	for rows.Next() {
		v, err := scanVenue(rows)
		if err != nil {
			if allowPartial {
				continue
			}
			return venues, err
		}
		venues = append(venues, *v)
	}
	return venues, rows.Err()
}

func (s *Store) ListVenuesByIDs(ctx context.Context, ids []int) ([]models.Venue, error) {
	if len(ids) == 0 {
		return []models.Venue{}, nil
	}

	const q = `
	SELECT ` + venueCols + `
	FROM venues
	WHERE deleted_at IS NULL
	  AND id = ANY($1::int[])`

	rows, err := s.pool.Query(ctx, q, ids)
	if err != nil {
		return nil, err
	}

	return scanVenues(rows, true)
}
