package repository

import (
	"context"
	"database/sql"
	"errors"
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
			rd.id,
			rd.origin,
			rd.destination,
			rd.departure_date,
			rd.price_per_seat,
			rd.status
		FROM bookings b
		INNER JOIN ride rd ON rd.id = b.ride_id
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

func (r *bookingRepository) Create(ctx context.Context, booking *domain.Booking) error {
	err := r.db.QueryRowContext(
		ctx,
		`INSERT INTO bookings (ride_id, user_id, seats_reserved, status)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, created_at`,
		booking.RideID,
		booking.UserID,
		booking.SeatsReserved,
		booking.Status,
	).Scan(&booking.ID, &booking.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create booking: %w", err)
	}

	return nil
}

func (r *bookingRepository) DeleteByID(ctx context.Context, bookingID int64) error {
	result, err := r.db.ExecContext(
		ctx,
		`DELETE FROM bookings WHERE id = $1`,
		bookingID,
	)
	if err != nil {
		return fmt.Errorf("failed to delete booking: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return errors.New("booking not found")
	}

	return nil
}

func (r *bookingRepository) GetByID(ctx context.Context, bookingID int64) (*domain.Booking, error) {
	var booking domain.Booking

	err := r.db.QueryRowContext(
		ctx,
		`SELECT
			b.id,
			b.ride_id,
			b.user_id,
			b.seats_reserved,
			b.status,
			b.created_at,
			rd.id,
			rd.origin,
			rd.destination,
			rd.departure_date,
			rd.price_per_seat,
			rd.status
		FROM bookings b
		INNER JOIN ride rd ON rd.id = b.ride_id
		WHERE b.id = $1`,
		bookingID,
	).Scan(
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
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("booking not found")
		}

		return nil, fmt.Errorf("failed to get booking: %w", err)
	}

	return &booking, nil
}
