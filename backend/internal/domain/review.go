package domain

import (
	"context"
	"time"
)

// Review represents a user rating for a completed ride.
type Review struct {
	ID             int64
	RideID         int64
	ReviewerID     int64
	ReviewedUserID int64
	Rating         int
	Comment        string
	CreatedAt      time.Time
}

// ReviewRepository defines data access for ride reviews.
type ReviewRepository interface {
	Create(ctx context.Context, review *Review) error
}
