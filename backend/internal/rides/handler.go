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
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/shared/httpx"
)

const requestTimeout = 5 * time.Second

var (
	errInvalidRideInput = errors.New("origin, destination, departureDate, availableSeats and price are required")
	errInvalidRideDate  = errors.New("departureDate must be a valid ISO 8601 datetime or YYYY-MM-DD date")
	errPastRideDate     = errors.New("departureDate must be in the future")
	errInvalidSeats     = errors.New("availableSeats must be greater than 0")
	errInvalidPrice     = errors.New("price must be greater than or equal to 0")
	errInvalidRideID    = errors.New("invalid ride id")
)

type createRideRequest struct {
	Origin         string   `json:"origin"`
	Destination    string   `json:"destination"`
	DepartureDate  string   `json:"departureDate"`
	AvailableSeats int      `json:"availableSeats"`
	Price          *float64 `json:"price"`
	PricePerSeat   *float64 `json:"pricePerSeat"`
}

type updateRideRequest struct {
	Origin         string   `json:"origin"`
	Destination    string   `json:"destination"`
	DepartureDate  string   `json:"departureDate"`
	AvailableSeats int      `json:"availableSeats"`
	Price          *float64 `json:"price"`
	PricePerSeat   *float64 `json:"pricePerSeat"`
}

// validate checks if the ride update request is valid and returns the parsed departure date.
func (req *updateRideRequest) validate() (time.Time, error) {
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
	if logger == nil {
		logger = slog.Default()
	}

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
	routeGroup.PUT("/:id", authMiddleware, h.UpdateCurrentUserRide)
	routeGroup.GET("/:id", h.GetByID)
	routeGroup.GET("", h.ListRides)
}

// Create handles the POST /rides endpoint to create a new ride.
func (h *Handler) Create(c *gin.Context) {
	var req createRideRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Error(c, http.StatusBadRequest, "invalid_ride_payload", errInvalidRideInput.Error(), httpx.ValidationDetails(err))
		return
	}

	parsedDate, err := req.validate()
	if err != nil {
		httpx.Error(c, http.StatusBadRequest, "invalid_ride_payload", err.Error(), nil)
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

	// Log attempt to create a ride
	h.logger.Info("create ride attempt", "driver_id", driverID, "origin", req.Origin, "destination", req.Destination, "departureDate", req.DepartureDate, "availableSeats", req.AvailableSeats, "request_id", c.GetString("requestID"))

	if err := h.repo.Create(ctx, trip); err != nil {
		h.logger.Error("failed to create ride", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"), "driver_id", driverID)
		httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to create ride", nil)
		return
	}

	h.logger.Info("ride created", "ride_id", trip.ID, "driver_id", driverID, "request_id", c.GetString("requestID"))

	httpx.Success(c, http.StatusCreated, gin.H{
		"message": "ride created successfully",
		"ride":    trip,
	})
}

// UpdateCurrentUserRide handles ride edits for the authenticated driver.
func (h *Handler) UpdateCurrentUserRide(c *gin.Context) {
	rideID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || rideID <= 0 {
		httpx.Error(c, http.StatusBadRequest, "invalid_ride_id", errInvalidRideID.Error(), nil)
		return
	}

	var req updateRideRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Error(c, http.StatusBadRequest, "invalid_ride_payload", errInvalidRideInput.Error(), httpx.ValidationDetails(err))
		return
	}

	parsedDate, err := req.validate()
	if err != nil {
		httpx.Error(c, http.StatusBadRequest, "invalid_ride_payload", err.Error(), nil)
		return
	}

	price := req.Price
	if price == nil {
		price = req.PricePerSeat
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	trip, err := h.repo.GetByID(ctx, rideID)
	if err != nil {
		if errors.Is(err, domain.ErrRideNotFound) {
			httpx.Error(c, http.StatusNotFound, "ride_not_found", "ride not found", nil)
			return
		}
		h.logger.Error("failed to load ride for update", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"), "ride_id", rideID)
		httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to update ride", nil)
		return
	}

	if trip.DriverID != c.GetInt64("authUserID") {
		httpx.Error(c, http.StatusForbidden, "forbidden_ride_edit", "cannot edit someone else's ride", nil)
		return
	}

	trip.Origin = req.Origin
	trip.Destination = req.Destination
	trip.DepartureDate = parsedDate
	trip.AvailableSeats = req.AvailableSeats
	if price != nil {
		trip.PricePerSeat = *price
	}
	if trip.AvailableSeats == 0 {
		trip.Status = "full"
	} else {
		trip.Status = "open"
	}

	if err := h.repo.Update(ctx, trip); err != nil {
		h.logger.Error("failed to update ride", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"), "ride_id", rideID)
		httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to update ride", nil)
		return
	}

	httpx.Success(c, http.StatusOK, gin.H{
		"message": "ride updated successfully",
		"ride": gin.H{
			"id":             trip.ID,
			"origin":         trip.Origin,
			"destination":    trip.Destination,
			"departureDate":  trip.DepartureDate.Format(time.RFC3339),
			"availableSeats": trip.AvailableSeats,
			"price":          trip.PricePerSeat,
			"status":         trip.Status,
		},
	})
}

// GetByID handles the GET /rides/:id endpoint.
func (h *Handler) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		httpx.Error(c, http.StatusBadRequest, "invalid_ride_id", "invalid ride id", nil)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	ride, err := h.repo.GetRideDetailsByID(ctx, id)
	if err != nil {
		if errors.Is(err, domain.ErrRideNotFound) {
			httpx.Error(c, http.StatusNotFound, "ride_not_found", "ride not found", nil)
			return
		}
		h.logger.Error("failed to get ride details", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"), "ride_id", id)
		httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to fetch ride", nil)
		return
	}

	httpx.Success(c, http.StatusOK, gin.H{
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
		h.logger.Error("failed to find active trips", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"), "origin", filters.Origin, "destination", filters.Destination)
		httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to fetch rides", nil)
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

	httpx.Success(c, http.StatusOK, gin.H{
		"rides": responses,
	})
}

// ListCurrentUserRides handles the GET /me/rides endpoint to return rides published by the user.
func (h *Handler) ListCurrentUserRides(c *gin.Context) {
	userID := c.GetInt64("authUserID")

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	trips, err := h.repo.ListByDriverID(ctx, userID)
	if err != nil {
		h.logger.Error("failed to find user trips", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"), "user_id", userID)
		httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to fetch user rides", nil)
		return
	}

	responses := make([]gin.H, 0, len(trips))
	for _, t := range trips {
		responses = append(responses, gin.H{
			"id":             t.ID,
			"origin":         t.Origin,
			"destination":    t.Destination,
			"departureDate":  t.DepartureDate.Format(time.RFC3339),
			"availableSeats": t.AvailableSeats,
			"price":          t.PricePerSeat,
			"status":         t.Status,
			"bookingsCount":  t.BookingsCount,
		})
	}

	httpx.Success(c, http.StatusOK, gin.H{
		"rides": responses,
	})
}
