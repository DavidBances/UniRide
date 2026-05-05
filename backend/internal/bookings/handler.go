// Package bookings contains booking HTTP handlers and future booking business logic.
package bookings

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Handler exposes booking HTTP handlers.
type Handler struct {
	logger *slog.Logger
}

// NewHandler creates a booking handler.
func NewHandler(logger *slog.Logger) *Handler {
	if logger == nil {
		logger = slog.Default()
	}

	return &Handler{
		logger: logger,
	}
}

// RegisterRoutes registers booking routes.
func (h *Handler) RegisterRoutes(routeGroup *gin.RouterGroup) {
	routeGroup.GET("", h.List)
	routeGroup.POST("", h.Create)
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
