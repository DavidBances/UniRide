package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/domain"
)

// tripRepository implements domain.TripRepository for PostgreSQL.
type tripRepository struct {
	db *sql.DB
}

// NewTripRepository creates a new PostgreSQL trip repository.
func NewTripRepository(db *sql.DB) domain.TripRepository {
	return &tripRepository{db: db}
}

func (r *tripRepository) Create(ctx context.Context, trip *domain.Trip) error {
	// TODO: Implement SQL INSERT logic
	return errors.New("Create trip not implemented yet")
}

func (r *tripRepository) GetByID(ctx context.Context, id int64) (*domain.Trip, error) {
	// TODO: Implement SQL SELECT logic
	return nil, errors.New("GetByID not implemented yet")
}

func (r *tripRepository) ListOpenTrips(ctx context.Context) ([]*domain.Trip, error) {
	// TODO: Implement SQL SELECT list logic
	return nil, errors.New("ListOpenTrips not implemented yet")
}
