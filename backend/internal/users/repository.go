// Package users contains user domain models and persistence logic.
package users

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

var (
	// ErrUserNotFound is returned when a user does not exist.
	ErrUserNotFound = errors.New("user not found")

	// ErrUsernameAlreadyExists is returned when the username is already registered.
	ErrUsernameAlreadyExists = errors.New("username already exists")

	// ErrEmailAlreadyExists is returned when the email is already registered.
	ErrEmailAlreadyExists = errors.New("email already exists")

	// ErrUserAlreadyExists is returned when a database uniqueness constraint is violated.
	ErrUserAlreadyExists = errors.New("user already exists")
)

// User represents a registered application user.
type User struct {
	ID           int64
	Username     string
	Email        string
	PasswordHash string
	CreatedAt    time.Time
}

// CreateUserParams contains the data required to create a user.
type CreateUserParams struct {
	Username     string
	Email        string
	PasswordHash string
}

// Repository handles user persistence.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a user repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{
		db: db,
	}
}

// Create inserts a new user in the database.
func (r *Repository) Create(ctx context.Context, params CreateUserParams) (User, error) {
	var user User

	err := r.db.QueryRowContext(
		ctx,
		`INSERT INTO users (username, email, password_hash)
		 VALUES ($1, $2, $3)
		 RETURNING id, username, email, password_hash, created_at`,
		params.Username,
		params.Email,
		params.PasswordHash,
	).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.CreatedAt,
	)

	if err != nil {
		return User{}, mapUserDatabaseError(err)
	}

	return user, nil
}

// FindByEmail returns a user by email.
func (r *Repository) FindByEmail(ctx context.Context, email string) (User, error) {
	var user User

	err := r.db.QueryRowContext(
		ctx,
		`SELECT id, username, email, password_hash, created_at
		 FROM users
		 WHERE email = $1`,
		email,
	).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return User{}, ErrUserNotFound
		}

		return User{}, fmt.Errorf("failed to find user by email: %w", err)
	}

	return user, nil
}

// UpsertDefaultUser creates or updates a default user.
// This is useful for local development and demos.
func (r *Repository) UpsertDefaultUser(ctx context.Context, username string, email string, passwordHash string) error {
	_, err := r.db.ExecContext(
		ctx,
		`INSERT INTO users (username, email, password_hash)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (username)
		 DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash`,
		username,
		email,
		passwordHash,
	)

	if err != nil {
		return fmt.Errorf("failed to upsert default user: %w", err)
	}

	return nil
}

func mapUserDatabaseError(err error) error {
	var pgErr *pgconn.PgError

	if !errors.As(err, &pgErr) {
		return fmt.Errorf("user database error: %w", err)
	}

	if pgErr.Code != "23505" {
		return fmt.Errorf("user database error: %w", err)
	}

	switch pgErr.ConstraintName {
	case "users_username_key":
		return ErrUsernameAlreadyExists
	case "users_email_key":
		return ErrEmailAlreadyExists
	default:
		return ErrUserAlreadyExists
	}
}
