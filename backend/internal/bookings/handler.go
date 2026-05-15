// Package bookings contains booking HTTP handlers and future booking business logic.
package bookings

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/domain"
)

const requestTimeout = 5 * time.Second

// Handler exposes booking HTTP handlers.
type Handler struct {
	repository domain.BookingRepository
	logger     *slog.Logger
}

// NewHandler creates a booking handler.
func NewHandler(repository domain.BookingRepository, logger *slog.Logger) *Handler {
	if logger == nil {
		logger = slog.Default()
	}

	return &Handler{
		repository: repository,
		logger:     logger,
	}
}

// RegisterRoutes registers booking routes.
func (h *Handler) RegisterRoutes(routeGroup *gin.RouterGroup) {
	routeGroup.GET("", h.List)
	routeGroup.POST("", h.Create)
}

// ListCurrentUser returns bookings for the authenticated user only.
func (h *Handler) ListCurrentUser(c *gin.Context) {
	userID := c.GetInt64("authUserID")

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	bookings, err := h.repository.ListByUserID(ctx, userID)
	if err != nil {
		h.logger.Error("failed to list current user bookings", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list bookings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"bookings": mapBookingsResponse(bookings),
	})
}

// List returns the list of user bookings.
// This endpoint is prepared for future booking implementation.
func (h *Handler) List(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message":  "bookings endpoint ready",
		"bookings": []gin.H{},
	})
}

// Create prepares the booking creation endpoint.
// This endpoint is prepared for future booking implementation.
func (h *Handler) Create(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{
		"message": "booking creation is not implemented yet",
	})
}

func mapBookingsResponse(bookings []*domain.Booking) []gin.H {
	response := make([]gin.H, 0, len(bookings))
	for _, booking := range bookings {
		response = append(response, gin.H{
			"id":            booking.ID,
			"seatsReserved": booking.SeatsReserved,
			"status":        booking.Status,
			"createdAt":     booking.CreatedAt,
			"ride": gin.H{
				"id":          booking.Ride.ID,
				"route":       booking.Ride.Origin + " → " + booking.Ride.Destination,
				"origin":      booking.Ride.Origin,
				"destination": booking.Ride.Destination,
				"date":        booking.Ride.DepartureDate,
				"price":       booking.Ride.Price,
				"status":      booking.Ride.Status,
			},
		})
	}

	return response
}
