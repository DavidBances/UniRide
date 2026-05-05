package domain

import (
	"context"
	"time"
)

// Trip represents a ride published by a driver (equivalent to "Ride").
type Trip struct {
	ID             int64
	DriverID       int64
	Origin         string
	Destination    string
	DepartureDate  time.Time
	AvailableSeats int
	PricePerSeat   float64
	Status         string
	CreatedAt      time.Time
}

// TripRepository defines the contract for trip data access.
type TripRepository interface {
	Create(ctx context.Context, trip *Trip) error
	GetByID(ctx context.Context, id int64) (*Trip, error)
	ListOpenTrips(ctx context.Context) ([]*Trip, error)
}
