package domain

import (
	"context"
	"time"
)

// User represents a registered account in the system.
type User struct {
	ID           int64
	Username     string
	Email        string
	PasswordHash string
	CreatedAt    time.Time
}

// UserRepository defines the contract for user data access.
// This interface allows the service layer to be independent of SQL details.
type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByEmail(ctx context.Context, email string) (*User, error)
}
