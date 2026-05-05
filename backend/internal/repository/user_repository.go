package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/domain"
)

// userRepository implements domain.UserRepository for PostgreSQL.
type userRepository struct {
	db *sql.DB
}

// NewUserRepository creates a new PostgreSQL user repository.
func NewUserRepository(db *sql.DB) domain.UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *domain.User) error {
	// TODO: Implement SQL INSERT logic
	return errors.New("Create user not implemented yet")
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	// TODO: Implement SQL SELECT logic
	return nil, errors.New("GetByEmail not implemented yet")
}
