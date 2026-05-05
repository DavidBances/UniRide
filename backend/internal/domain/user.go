package domain

import (
	"context"
	"time"
)

// User represents a registered account in the system.
type User struct {
	ID           int64     `json:"id"`
	Username     string    `json:"username" validate:"required"`
	Email        string    `json:"email" validate:"required,email"`
	PasswordHash string    `json:"-"` // El guion evita que el hash viaje por red accidentalmente
	CreatedAt    time.Time `json:"created_at"`
}

// UserRepository defines the contract for user data access.
// This interface allows the service layer to be independent of SQL details.
type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByEmail(ctx context.Context, email string) (*User, error)
}
