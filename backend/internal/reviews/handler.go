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
		c.JSON(http.StatusBadRequest, gin.H{"error": "rideId and rating between 1 and 5 are required"})
		return
	}

	reviewerID := c.GetInt64("authUserID")

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	ride, err := h.tripRepository.GetByID(ctx, req.RideID)
	if err != nil {
		if errors.Is(err, domain.ErrRideNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ride not found"})
			return
		}

		h.logger.Error("failed to get ride for review", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get ride"})
		return
	}

	if ride.Status != "completed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only completed rides can be reviewed"})
		return
	}

	if ride.DriverID == reviewerID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "drivers cannot review their own rides"})
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
		h.logger.Error("failed to create review", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create review"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
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
