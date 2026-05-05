package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/domain"
)

// tripRequestRepository implements domain.TripRequestRepository for PostgreSQL.
type tripRequestRepository struct {
	db *sql.DB
}

// NewTripRequestRepository creates a new PostgreSQL trip request repository.
func NewTripRequestRepository(db *sql.DB) domain.TripRequestRepository {
	return &tripRequestRepository{db: db}
}

func (r *tripRequestRepository) Create(ctx context.Context, req *domain.TripRequest) error {
	// TODO: Implement SQL INSERT logic
	return errors.New("Create trip request not implemented yet")
}

func (r *tripRequestRepository) GetByTripID(ctx context.Context, tripID int64) ([]*domain.TripRequest, error) {
	// TODO: Implement SQL SELECT logic
	return nil, errors.New("GetByTripID not implemented yet")
}

func (r *tripRequestRepository) UpdateStatus(ctx context.Context, requestID int64, status string) error {
	// TODO: Implement SQL UPDATE logic
	return errors.New("UpdateStatus not implemented yet")
}
