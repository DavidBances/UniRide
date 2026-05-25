package domain

import (
	"context"
	"errors"
	"time"
)

// ErrRideNotFound is returned when a ride cannot be found.
var ErrRideNotFound = errors.New("ride not found")

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
	AverageRating  float64
	ReviewCount    int
	BookingsCount  int
}

// RideDriver contains the public driver information returned in ride detail responses.
type RideDriver struct {
	ID            int64     `json:"id"`
	FullName      string    `json:"full_name,omitempty"`
	Username      string    `json:"username"`
	Email         string    `json:"email"`
	RatingAverage float64   `json:"rating_average"`
	CreatedAt     time.Time `json:"created_at"`
}

// RideDetails contains detailed information about a ride.
type RideDetails struct {
	ID             int64
	DriverID       int64
	Origin         string
	Destination    string
	DepartureDate  time.Time
	AvailableSeats int
	PricePerSeat   float64
	Status         string
	CreatedAt      time.Time
	AverageRating  float64
	ReviewCount    int
	Driver         RideDriver
}

// TripFilters allows filtering trips.
type TripFilters struct {
	Origin         string
	Destination    string
	DepartureDate  *time.Time
	AvailableSeats *int
}

// TripRepository defines the contract for trip operations.
type TripRepository interface {
	Create(ctx context.Context, trip *Trip) error
	GetByID(ctx context.Context, id int64) (*Trip, error)
	GetRideDetailsByID(ctx context.Context, id int64) (*RideDetails, error)
	ListOpenTrips(ctx context.Context, filters TripFilters) ([]*Trip, error)
	Update(ctx context.Context, trip *Trip) error
	ListByDriverID(ctx context.Context, driverID int64) ([]*Trip, error)
}
