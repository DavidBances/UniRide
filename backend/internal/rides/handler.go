// Package rides contains ride HTTP handlers and future ride business logic.
package rides

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Handler exposes ride HTTP handlers.
type Handler struct {
	logger *slog.Logger
}

// NewHandler creates a ride handler.
func NewHandler(logger *slog.Logger) *Handler {
	if logger == nil {
		logger = slog.Default()
	}

	return &Handler{
		logger: logger,
	}
}

// RegisterRoutes registers ride routes.
func (h *Handler) RegisterRoutes(routeGroup *gin.RouterGroup) {
	routeGroup.GET("", h.List)
	routeGroup.POST("", h.Create)
}

// List returns the list of available rides.
// This endpoint is prepared for future Sprint 2 ride implementation.
func (h *Handler) List(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "rides endpoint ready",
		"rides":   []gin.H{},
	})
}

// Create prepares the ride creation endpoint.
// This endpoint is prepared for future Sprint 2 ride implementation.
func (h *Handler) Create(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{
		"message": "ride creation is not implemented yet",
	})
}
