package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/domain"
)

type bookingRepository struct {
	db *sql.DB
}

// NewBookingRepository creates a PostgreSQL booking repository.
func NewBookingRepository(db *sql.DB) domain.BookingRepository {
	return &bookingRepository{db: db}
}

func (r *bookingRepository) ListByUserID(ctx context.Context, userID int64) ([]*domain.Booking, error) {
	rows, err := r.db.QueryContext(
		ctx,
		`SELECT
			b.id,
			b.ride_id,
			b.user_id,
			b.seats_reserved,
			b.status,
			b.created_at,
			t.id,
			t.origin,
			t.destination,
			t.departure_date,
			t.price_per_seat,
			t.status
		FROM bookings b
		INNER JOIN trips t ON t.id = b.ride_id
		WHERE b.user_id = $1
		ORDER BY b.created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list user bookings: %w", err)
	}
	defer rows.Close()

	bookings := []*domain.Booking{}
	for rows.Next() {
		var booking domain.Booking
		if err := rows.Scan(
			&booking.ID,
			&booking.RideID,
			&booking.UserID,
			&booking.SeatsReserved,
			&booking.Status,
			&booking.CreatedAt,
			&booking.Ride.ID,
			&booking.Ride.Origin,
			&booking.Ride.Destination,
			&booking.Ride.DepartureDate,
			&booking.Ride.Price,
			&booking.Ride.Status,
		); err != nil {
			return nil, fmt.Errorf("failed to scan user booking: %w", err)
		}

		bookings = append(bookings, &booking)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read user bookings: %w", err)
	}

	return bookings, nil
}
