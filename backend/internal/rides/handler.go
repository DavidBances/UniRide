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

// Handler exposes ride HTTP handlers.
type Handler struct {
	repository domain.TripRepository
	logger     *slog.Logger
}

// NewHandler creates a ride handler.
func NewHandler(repository domain.TripRepository, logger *slog.Logger) *Handler {
	if logger == nil {
		logger = slog.Default()
	}

	return &Handler{
		repository: repository,
		logger:     logger,
	}
}

// RegisterRoutes registers ride routes.
func (h *Handler) RegisterRoutes(routeGroup *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	routeGroup.GET("", h.List)
	routeGroup.GET("/:id", h.GetByID)
	routeGroup.POST("", authMiddleware, h.Create)
}

// GetByID returns the ride details for a single ride.
func (h *Handler) GetByID(c *gin.Context) {
	rideID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || rideID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ride id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	ride, err := h.repository.GetRideDetailsByID(ctx, rideID)
	if err != nil {
		if errors.Is(err, domain.ErrRideNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ride not found"})
			return
		}

		h.logger.Error("failed to get ride details", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get ride details"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ride": mapRideDetailsResponse(ride)})
}

// List returns the list of available rides.
func (h *Handler) List(c *gin.Context) {
	filters, err := parseRideFilters(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	trips, err := h.repository.ListOpenTrips(ctx, filters)
	if err != nil {
		h.logger.Error("failed to list rides", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list rides"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"rides": mapTripsResponse(trips),
	})
}

// Create handles ride creation requests.
func (h *Handler) Create(c *gin.Context) {
	var req createRideRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON body"})
		return
	}

	departureDate, price, err := validateCreateRideRequest(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetInt64("authUserID")
	trip := &domain.Trip{
		DriverID:       userID,
		Origin:         strings.TrimSpace(req.Origin),
		Destination:    strings.TrimSpace(req.Destination),
		DepartureDate:  departureDate,
		AvailableSeats: req.AvailableSeats,
		PricePerSeat:   price,
		Status:         "open",
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	if err := h.repository.Create(ctx, trip); err != nil {
		h.logger.Error("failed to create ride", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create ride"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "ride created successfully",
		"ride":    mapTripResponse(trip),
	})
}

func validateCreateRideRequest(req createRideRequest) (time.Time, float64, error) {
	if strings.TrimSpace(req.Origin) == "" ||
		strings.TrimSpace(req.Destination) == "" ||
		strings.TrimSpace(req.DepartureDate) == "" ||
		req.AvailableSeats == 0 ||
		(req.Price == nil && req.PricePerSeat == nil) {
		return time.Time{}, 0, errInvalidRideInput
	}

	departureDate, err := parseDepartureDate(req.DepartureDate)
	if err != nil {
		return time.Time{}, 0, errInvalidRideDate
	}

	if !departureDate.After(time.Now()) {
		return time.Time{}, 0, errPastRideDate
	}

	if req.AvailableSeats <= 0 {
		return time.Time{}, 0, errInvalidSeats
	}

	price := 0.0
	if req.Price != nil {
		price = *req.Price
	} else if req.PricePerSeat != nil {
		price = *req.PricePerSeat
	}

	if price < 0 {
		return time.Time{}, 0, errInvalidPrice
	}

	return departureDate, price, nil
}

func parseRideFilters(c *gin.Context) (domain.TripFilters, error) {
	filters := domain.TripFilters{
		Origin:      c.Query("origin"),
		Destination: c.Query("destination"),
	}

	if rawDate := strings.TrimSpace(c.Query("departureDate")); rawDate != "" {
		departureDate, err := time.Parse("2006-01-02", rawDate)
		if err != nil {
			return domain.TripFilters{}, errors.New("departureDate must use YYYY-MM-DD format")
		}

		filters.DepartureDate = &departureDate
	}

	if rawSeats := strings.TrimSpace(c.Query("availableSeats")); rawSeats != "" {
		seats, err := strconv.Atoi(rawSeats)
		if err != nil || seats <= 0 {
			return domain.TripFilters{}, errInvalidSeats
		}

		filters.AvailableSeats = &seats
	}

	return filters, nil
}

func parseDepartureDate(value string) (time.Time, error) {
	if parsed, err := time.Parse(time.RFC3339, value); err == nil {
		return parsed, nil
	}

	parsedDate, err := time.Parse("2006-01-02", value)
	if err != nil {
		return time.Time{}, err
	}

	return parsedDate, nil
}

func mapTripsResponse(trips []*domain.Trip) []gin.H {
	response := make([]gin.H, 0, len(trips))
	for _, trip := range trips {
		response = append(response, mapTripResponse(trip))
	}

	return response
}

func mapTripResponse(trip *domain.Trip) gin.H {
	return gin.H{
		"id":             trip.ID,
		"driverId":       trip.DriverID,
		"origin":         trip.Origin,
		"destination":    trip.Destination,
		"departureDate":  trip.DepartureDate,
		"availableSeats": trip.AvailableSeats,
		"price":          trip.PricePerSeat,
		"status":         trip.Status,
		"createdAt":      trip.CreatedAt,
		"averageRating":  trip.AverageRating,
		"reviewCount":    trip.ReviewCount,
	}
}

func mapRideDetailsResponse(ride *domain.RideDetails) gin.H {
	return gin.H{
		"id":             ride.ID,
		"driverId":       ride.DriverID,
		"origin":         ride.Origin,
		"destination":    ride.Destination,
		"departureDate":  ride.DepartureDate,
		"availableSeats": ride.AvailableSeats,
		"pricePerSeat":   ride.PricePerSeat,
		"status":         ride.Status,
		"createdAt":      ride.CreatedAt,
		"averageRating":  ride.AverageRating,
		"reviewCount":    ride.ReviewCount,
		"driver": gin.H{
			"id":        ride.Driver.ID,
			"username":  ride.Driver.Username,
			"email":     ride.Driver.Email,
			"createdAt": ride.Driver.CreatedAt,
		},
	}
}
