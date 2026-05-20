package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/domain"
)

type reviewRepository struct {
	db *sql.DB
}

// NewReviewRepository creates a PostgreSQL review repository.
func NewReviewRepository(db *sql.DB) domain.ReviewRepository {
	return &reviewRepository{db: db}
}

func (r *reviewRepository) Create(ctx context.Context, review *domain.Review) error {
	err := r.db.QueryRowContext(
		ctx,
		`INSERT INTO reviews (ride_id, reviewer_id, reviewed_user_id, rating, comment)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, created_at`,
		review.RideID,
		review.ReviewerID,
		review.ReviewedUserID,
		review.Rating,
		review.Comment,
	).Scan(&review.ID, &review.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create review: %w", err)
	}

	return nil
}
