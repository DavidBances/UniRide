package domain

import (
	"context"
	"time"
)

// Booking represents a passenger reservation for seats in a trip.
type Booking struct {
	ID            int64
	RideID        int64
	UserID        int64
	SeatsReserved int
	Status        string
	CreatedAt     time.Time
	Ride          BookingRideSummary
}

// BookingRideSummary contains the ride fields needed by profile/dashboard views.
type BookingRideSummary struct {
	ID            int64
	Origin        string
	Destination   string
	DepartureDate time.Time
	Price         float64
	Status        string
	AverageRating float64
	ReviewCount   int
}

// BookingRepository defines data access for user bookings.
type BookingRepository interface {
	ListByUserID(ctx context.Context, userID int64) ([]*Booking, error)
	Create(ctx context.Context, booking *Booking) error
	DeleteByID(ctx context.Context, bookingID int64) error
	GetByID(ctx context.Context, bookingID int64) (*Booking, error)
}
