// Package reviews contains ride review HTTP handlers.
package reviews

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/domain"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/shared/httpx"
)

const requestTimeout = 5 * time.Second

type createReviewRequest struct {
	RideID  int64  `json:"rideId" binding:"required,min=1"`
	Rating  int    `json:"rating" binding:"required,min=1,max=5"`
	Comment string `json:"comment"`
}

// Handler exposes review HTTP handlers.
type Handler struct {
	reviewRepository domain.ReviewRepository
	tripRepository   domain.TripRepository
	logger           *slog.Logger
}

// NewHandler creates a review handler.
func NewHandler(reviewRepository domain.ReviewRepository, tripRepository domain.TripRepository, logger *slog.Logger) *Handler {
	if logger == nil {
		logger = slog.Default()
	}

	return &Handler{
		reviewRepository: reviewRepository,
		tripRepository:   tripRepository,
		logger:           logger,
	}
}

// RegisterRoutes registers review routes.
func (h *Handler) RegisterRoutes(routeGroup *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	routeGroup.POST("", authMiddleware, h.Create)
}

// Create handles completed ride review creation.
func (h *Handler) Create(c *gin.Context) {
	var req createReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Error(c, http.StatusBadRequest, "invalid_review_payload", "rideId and rating between 1 and 5 are required", httpx.ValidationDetails(err))
		return
	}

	reviewerID := c.GetInt64("authUserID")

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	ride, err := h.tripRepository.GetByID(ctx, req.RideID)
	if err != nil {
		if errors.Is(err, domain.ErrRideNotFound) {
			httpx.Error(c, http.StatusNotFound, "ride_not_found", "ride not found", nil)
			return
		}

		h.logger.Error("failed to get ride for review", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"), "ride_id", req.RideID)
		httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to get ride", nil)
		return
	}

	if ride.Status != "completed" {
		httpx.Error(c, http.StatusBadRequest, "ride_not_completed", "only completed rides can be reviewed", nil)
		return
	}

	if ride.DriverID == reviewerID {
		httpx.Error(c, http.StatusBadRequest, "self_review_not_allowed", "drivers cannot review their own rides", nil)
		return
	}

	review := &domain.Review{
		RideID:         req.RideID,
		ReviewerID:     reviewerID,
		ReviewedUserID: ride.DriverID,
		Rating:         req.Rating,
		Comment:        strings.TrimSpace(req.Comment),
	}

	if err := h.reviewRepository.Create(ctx, review); err != nil {
		h.logger.Error("failed to create review", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"), "ride_id", req.RideID, "reviewer_id", reviewerID)
		httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to create review", nil)
		return
	}

	httpx.Success(c, http.StatusCreated, gin.H{
		"message": "review created successfully",
		"review": gin.H{
			"id":             review.ID,
			"rideId":         review.RideID,
			"reviewerId":     review.ReviewerID,
			"reviewedUserId": review.ReviewedUserID,
			"rating":         review.Rating,
			"comment":        review.Comment,
			"createdAt":      review.CreatedAt,
		},
	})
}
