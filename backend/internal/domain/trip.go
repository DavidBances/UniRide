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
}

// RideDriver contains the public driver information returned in ride detail responses.
type RideDriver struct {
	ID        int64     `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"createdAt"`
}

// RideDetails represents a ride with the driver profile included.
type RideDetails struct {
	ID             int64      `json:"id"`
	DriverID       int64      `json:"driverId"`
	Origin         string     `json:"origin"`
	Destination    string     `json:"destination"`
	DepartureDate  time.Time  `json:"departureDate"`
	AvailableSeats int        `json:"availableSeats"`
	PricePerSeat   float64    `json:"pricePerSeat"`
	Status         string     `json:"status"`
	CreatedAt      time.Time  `json:"createdAt"`
	AverageRating  float64    `json:"averageRating"`
	ReviewCount    int        `json:"reviewCount"`
	Driver         RideDriver `json:"driver"`
}

// TripFilters contains optional filters for listing open trips.
type TripFilters struct {
	Origin         string
	Destination    string
	DepartureDate  *time.Time
	AvailableSeats *int
}

// TripRepository defines the contract for trip data access.
type TripRepository interface {
	Create(ctx context.Context, trip *Trip) error
	GetByID(ctx context.Context, id int64) (*Trip, error)
	GetRideDetailsByID(ctx context.Context, id int64) (*RideDetails, error)
	ListOpenTrips(ctx context.Context, filters TripFilters) ([]*Trip, error)
}
