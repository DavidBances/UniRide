package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/domain"
)

// tripRepository implements domain.TripRepository for PostgreSQL.
type tripRepository struct {
	db *sql.DB
}

// NewTripRepository creates a new PostgreSQL trip repository.
func NewTripRepository(db *sql.DB) domain.TripRepository {
	return &tripRepository{db: db}
}

func (r *tripRepository) Create(ctx context.Context, trip *domain.Trip) error {
	err := r.db.QueryRowContext(
		ctx,
		`INSERT INTO trips (driver_id, origin, destination, departure_date, available_seats, price_per_seat, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, created_at`,
		trip.DriverID,
		trip.Origin,
		trip.Destination,
		trip.DepartureDate,
		trip.AvailableSeats,
		trip.PricePerSeat,
		trip.Status,
	).Scan(&trip.ID, &trip.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create trip: %w", err)
	}

	return nil
}

func (r *tripRepository) GetByID(ctx context.Context, id int64) (*domain.Trip, error) {
	var trip domain.Trip

	err := r.db.QueryRowContext(
		ctx,
		`SELECT id, driver_id, origin, destination, departure_date, available_seats, price_per_seat, status, created_at
		 FROM trips
		 WHERE id = $1`,
		id,
	).Scan(
		&trip.ID,
		&trip.DriverID,
		&trip.Origin,
		&trip.Destination,
		&trip.DepartureDate,
		&trip.AvailableSeats,
		&trip.PricePerSeat,
		&trip.Status,
		&trip.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get trip: %w", err)
	}

	return &trip, nil
}

func (r *tripRepository) ListOpenTrips(ctx context.Context, filters domain.TripFilters) ([]*domain.Trip, error) {
	query := `SELECT id, driver_id, origin, destination, departure_date, available_seats, price_per_seat, status, created_at
		FROM trips
		WHERE status = 'open'`
	args := []any{}
	conditions := []string{}

	if strings.TrimSpace(filters.Origin) != "" {
		args = append(args, "%"+strings.TrimSpace(filters.Origin)+"%")
		conditions = append(conditions, fmt.Sprintf("origin ILIKE $%d", len(args)))
	}

	if strings.TrimSpace(filters.Destination) != "" {
		args = append(args, "%"+strings.TrimSpace(filters.Destination)+"%")
		conditions = append(conditions, fmt.Sprintf("destination ILIKE $%d", len(args)))
	}

	if filters.DepartureDate != nil {
		args = append(args, filters.DepartureDate.Format("2006-01-02"))
		conditions = append(conditions, fmt.Sprintf("departure_date::date = $%d::date", len(args)))
	}

	if filters.AvailableSeats != nil {
		args = append(args, *filters.AvailableSeats)
		conditions = append(conditions, fmt.Sprintf("available_seats >= $%d", len(args)))
	}

	if len(conditions) > 0 {
		query += " AND " + strings.Join(conditions, " AND ")
	}

	query += " ORDER BY departure_date ASC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list trips: %w", err)
	}
	defer rows.Close()

	trips := []*domain.Trip{}
	for rows.Next() {
		var trip domain.Trip
		if err := rows.Scan(
			&trip.ID,
			&trip.DriverID,
			&trip.Origin,
			&trip.Destination,
			&trip.DepartureDate,
			&trip.AvailableSeats,
			&trip.PricePerSeat,
			&trip.Status,
			&trip.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan trip: %w", err)
		}

		trips = append(trips, &trip)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read trips: %w", err)
	}

	return trips, nil
}
