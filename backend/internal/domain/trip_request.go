package domain

import (
	"context"
	"time"
)

// TripRequest represents a passenger's request to join a trip (equivalent to "Booking").
type TripRequest struct {
	ID          int64
	TripID      int64
	PassengerID int64
	Status      string
	Message     string
	CreatedAt   time.Time
}

// TripRequestRepository defines the contract for trip requests data access.
type TripRequestRepository interface {
	Create(ctx context.Context, req *TripRequest) error
	GetByTripID(ctx context.Context, tripID int64) ([]*TripRequest, error)
	UpdateStatus(ctx context.Context, requestID int64, status string) error
}
