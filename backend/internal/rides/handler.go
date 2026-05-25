// Package rides contains ride HTTP handlers and future ride business logic.
package rides

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/domain"
)

const requestTimeout = 5 * time.Second

var (
	errInvalidRideInput = errors.New("origin, destination, departureDate, availableSeats and price are required")
	errInvalidRideDate  = errors.New("departureDate must be a valid ISO 8601 datetime or YYYY-MM-DD date")
	errPastRideDate     = errors.New("departureDate must be in the future")
	errInvalidSeats     = errors.New("availableSeats must be greater than 0")
	errInvalidPrice     = errors.New("price must be greater than or equal to 0")
)

type createRideRequest struct {
	Origin         string   `json:"origin"`
	Destination    string   `json:"destination"`
	DepartureDate  string   `json:"departureDate"`
	AvailableSeats int      `json:"availableSeats"`
	Price          *float64 `json:"price"`
	PricePerSeat   *float64 `json:"pricePerSeat"`
}

// validate checks if the ride request is valid and returns the parsed departure date.
func (req *createRideRequest) validate() (time.Time, error) {
	if strings.TrimSpace(req.Origin) == "" || strings.TrimSpace(req.Destination) == "" || strings.TrimSpace(req.DepartureDate) == "" {
		return time.Time{}, errInvalidRideInput
	}

	if req.AvailableSeats <= 0 {
		return time.Time{}, errInvalidSeats
	}

	price := req.Price
	if price == nil {
		price = req.PricePerSeat
	}
	if price != nil && *price < 0 {
		return time.Time{}, errInvalidPrice
	}

	parsedDate, err := time.Parse(time.RFC3339, req.DepartureDate)
	if err != nil {
		return time.Time{}, errInvalidRideDate
	}

	if parsedDate.Before(time.Now()) {
		return time.Time{}, errPastRideDate
	}

	return parsedDate, nil
}

// Handler exposes ride HTTP endpoints.
type Handler struct {
	repo   domain.TripRepository
	logger *slog.Logger
}

// NewHandler creates a new ride handler.
func NewHandler(repo domain.TripRepository, logger *slog.Logger) *Handler {
	return &Handler{
		repo:   repo,
		logger: logger,
	}
}

// RideResponse maps the domain Trip to the API response format.
type RideResponse struct {
	ID             int64   `json:"id"`
	DriverID       int64   `json:"driverId"`
	Origin         string  `json:"origin"`
	Destination    string  `json:"destination"`
	DepartureDate  string  `json:"departureDate"`
	AvailableSeats int     `json:"availableSeats"`
	Price          float64 `json:"price"`
	Status         string  `json:"status"`
}

// RegisterRoutes registers ride routes.
func (h *Handler) RegisterRoutes(routeGroup *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	routeGroup.POST("", authMiddleware, h.Create)
	routeGroup.GET("/:id", h.GetByID)
	routeGroup.GET("", h.ListRides)
}

// Create handles the POST /rides endpoint to create a new ride.
func (h *Handler) Create(c *gin.Context) {
	var req createRideRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": errInvalidRideInput.Error()})
		return
	}

	parsedDate, err := req.validate()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	price := req.Price
	if price == nil {
		price = req.PricePerSeat
	}

	driverID := c.GetInt64("authUserID")

	trip := &domain.Trip{
		DriverID:       driverID,
		Origin:         req.Origin,
		Destination:    req.Destination,
		DepartureDate:  parsedDate,
		AvailableSeats: req.AvailableSeats,
		Status:         "open",
	}
	if price != nil {
		trip.PricePerSeat = *price
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	if err := h.repo.Create(ctx, trip); err != nil {
		h.logger.Error("failed to create ride", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create ride"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "ride created successfully",
		"ride":    trip,
	})
}

// GetByID handles the GET /rides/:id endpoint.
func (h *Handler) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ride id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	ride, err := h.repo.GetRideDetailsByID(ctx, id)
	if err != nil {
		if errors.Is(err, domain.ErrRideNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ride not found"})
			return
		}
		h.logger.Error("failed to get ride details", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch ride"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ride": gin.H{
			"id":             ride.ID,
			"driverId":       ride.DriverID,
			"origin":         ride.Origin,
			"destination":    ride.Destination,
			"departureDate":  ride.DepartureDate.Format(time.RFC3339),
			"availableSeats": ride.AvailableSeats,
			"price":          ride.PricePerSeat,
			"status":         ride.Status,
			"driver":         ride.Driver,
		},
	})
}

// ListRides handles the GET /rides endpoint to return all active rides.
func (h *Handler) ListRides(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	filters := domain.TripFilters{
		Origin:      c.Query("origin"),
		Destination: c.Query("destination"),
	}

	if dateStr := c.Query("departureDate"); dateStr != "" {
		if parsed, err := time.Parse("2006-01-02", dateStr); err == nil {
			filters.DepartureDate = &parsed
		}
	}

	if seatsStr := c.Query("availableSeats"); seatsStr != "" {
		if seats, err := strconv.Atoi(seatsStr); err == nil {
			filters.AvailableSeats = &seats
		}
	}

	trips, err := h.repo.ListOpenTrips(ctx, filters)
	if err != nil {
		h.logger.Error("failed to find active trips", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch rides"})
		return
	}

	// Inicializamos con 0 para que devuelva un slice [] en JSON y no 'null' (Support empty state response)
	responses := make([]RideResponse, 0, len(trips))
	for _, t := range trips {
		responses = append(responses, RideResponse{
			ID:             t.ID,
			DriverID:       t.DriverID, // Include driver basic info
			Origin:         t.Origin,
			Destination:    t.Destination,
			DepartureDate:  t.DepartureDate.Format(time.RFC3339), // ISO 8601 formating
			AvailableSeats: t.AvailableSeats,
			Price:          t.PricePerSeat,
			Status:         t.Status,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"rides": responses,
	})
}
