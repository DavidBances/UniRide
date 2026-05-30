// Package bookings contains booking HTTP handlers and booking business logic.
package bookings

import (
	"context"
<<<<<<< Updated upstream
=======
	"errors"
	"fmt"
>>>>>>> Stashed changes
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/domain"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/shared/httpx"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/users"
)

const requestTimeout = 5 * time.Second

// Handler exposes booking HTTP handlers.
type Handler struct {
	bookingRepository domain.BookingRepository
	tripRepository    domain.TripRepository
	userRepository    userRepository
	logger            *slog.Logger
}

type userRepository interface {
	GetByID(ctx context.Context, id int64) (users.User, error)
}

type createBookingRequest struct {
	RideID        int64 `json:"rideId" binding:"required,min=1"`
	SeatsReserved int   `json:"seatsReserved" binding:"required,min=1"`
}

// NewHandler creates a booking handler.
func NewHandler(bookingRepository domain.BookingRepository, tripRepository domain.TripRepository, userRepository userRepository, logger *slog.Logger) *Handler {
	if logger == nil {
		logger = slog.Default()
	}

	return &Handler{
		bookingRepository: bookingRepository,
		tripRepository:    tripRepository,
		userRepository:    userRepository,
		logger:            logger,
	}
}

// RegisterRoutes registers booking routes.
func (h *Handler) RegisterRoutes(routeGroup *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	routeGroup.GET("", h.List)
	routeGroup.POST("", authMiddleware, h.Create)
	routeGroup.DELETE("/:id", authMiddleware, h.Delete)
}

// ListCurrentUser returns bookings for the authenticated user only.
func (h *Handler) ListCurrentUser(c *gin.Context) {
	userID := c.GetInt64("authUserID")

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	bookings, err := h.bookingRepository.ListByUserID(ctx, userID)
	if err != nil {
		h.logger.Error("failed to list current user bookings", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"), "user_id", userID)
		httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to list bookings", nil)
		return
	}

	httpx.Success(c, http.StatusOK, gin.H{
		"bookings": mapBookingsResponse(bookings),
	})
}

// List returns the list of user bookings.
func (h *Handler) List(c *gin.Context) {
	httpx.Success(c, http.StatusOK, gin.H{
		"message":  "bookings endpoint ready",
		"bookings": []gin.H{},
	})
}

// ListRideBookings returns the reservations for a ride owned by the authenticated user.
func (h *Handler) ListRideBookings(c *gin.Context) {
	rideID, err := strconv.ParseInt(c.Param("rideId"), 10, 64)
	if err != nil || rideID <= 0 {
		httpx.Error(c, http.StatusBadRequest, "invalid_ride_id", "invalid ride id", nil)
		return
	}

	userID := c.GetInt64("authUserID")

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	ride, err := h.tripRepository.GetByID(ctx, rideID)
	if err != nil {
		if errors.Is(err, domain.ErrRideNotFound) {
			httpx.Error(c, http.StatusNotFound, "ride_not_found", "ride not found", nil)
			return
		}
		h.logger.Error("failed to get ride", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"), "ride_id", rideID)
		httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to fetch ride", nil)
		return
	}

	if ride.DriverID != userID {
		httpx.Error(c, http.StatusForbidden, "forbidden_ride_bookings", "cannot view reservations for someone else's ride", nil)
		return
	}

	bookings, err := h.bookingRepository.ListByRideID(ctx, rideID)
	if err != nil {
		h.logger.Error("failed to list ride bookings", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"), "ride_id", rideID)
		httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to list ride bookings", nil)
		return
	}

	httpx.Success(c, http.StatusOK, gin.H{"bookings": mapRideBookingsResponse(bookings)})
}

// Create handles booking creation.
func (h *Handler) Create(c *gin.Context) {
	var req createBookingRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Error(c, http.StatusBadRequest, "invalid_booking_payload", "rideId and seatsReserved are required", httpx.ValidationDetails(err))
		return
	}

	userID := c.GetInt64("authUserID")

	// Log booking creation attempt
	h.logger.Info("create booking attempt", "user_id", userID, "ride_id", req.RideID, "seats", req.SeatsReserved, "request_id", c.GetString("requestID"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	if h.userRepository != nil {
		if _, err := h.userRepository.GetByID(ctx, userID); err != nil {
			if err == users.ErrUserNotFound {
				httpx.Error(c, http.StatusUnauthorized, "authenticated_user_not_found", "authenticated user not found", nil)
				return
			}

			h.logger.Error("failed to load authenticated user", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"), "user_id", userID)
			httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to validate user", nil)
			return
		}
	}

	// Get the ride to check available seats
	ride, err := h.tripRepository.GetByID(ctx, req.RideID)
	if err != nil {
		if errors.Is(err, domain.ErrRideNotFound) {
			httpx.Error(c, http.StatusNotFound, "ride_not_found", "ride not found", nil)
			return
		}

		h.logger.Error("failed to get ride", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"), "ride_id", req.RideID)
		httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to get ride", nil)
		return
	}

	// Validate seats
	if req.SeatsReserved > ride.AvailableSeats {
		httpx.Error(c, http.StatusBadRequest, "insufficient_available_seats", "not enough available seats", gin.H{"availableSeats": ride.AvailableSeats})
		return
	}

	// Reducimos los asientos disponibles en el viaje
	ride.AvailableSeats -= req.SeatsReserved
	if ride.AvailableSeats == 0 {
		ride.Status = "full" // Si no quedan plazas, marcamos el viaje como lleno
	}

	if err := h.tripRepository.Update(ctx, ride); err != nil {
		h.logger.Error("failed to update ride seats", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"), "ride_id", ride.ID)
		httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to update ride", nil)
		return
	}

	booking := &domain.Booking{
		RideID:        req.RideID,
		UserID:        userID,
		SeatsReserved: req.SeatsReserved,
		Status:        "confirmed",
	}

	if err := h.bookingRepository.Create(ctx, booking); err != nil {
		h.logger.Error("failed to create booking", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"), "ride_id", req.RideID, "user_id", userID)
		httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to create booking", nil)
		return
	}

<<<<<<< Updated upstream
	c.JSON(http.StatusCreated, gin.H{
=======
	h.logger.Info("booking created", "booking_id", booking.ID, "user_id", userID, "ride_id", booking.RideID, "seats", booking.SeatsReserved, "request_id", c.GetString("requestID"))

	// Extraer email del JWT y enviar notificación de forma asíncrona
	authHeader := c.GetHeader("Authorization")
	go func(header, origin, dest string, seats int, price float64) {
		tokenString := strings.TrimPrefix(header, "Bearer ")
		var userEmail string
		if token, _, err := new(jwt.Parser).ParseUnverified(tokenString, jwt.MapClaims{}); err == nil {
			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				if email, ok := claims["email"].(string); ok {
					userEmail = email
				}
			}
		}

		if userEmail != "" {
			subject := "Reserva confirmada - UniRide"
			body := fmt.Sprintf("Hola,\n\nTu reserva para el viaje de %s a %s ha sido confirmada.\nAsientos reservados: %d\nPrecio total: %.2f EUR\n\n¡Buen viaje!", origin, dest, seats, price*float64(seats))
			sendEmailSafe(userEmail, subject, body, h.logger)
		}
	}(authHeader, ride.Origin, ride.Destination, req.SeatsReserved, ride.PricePerSeat)

	httpx.Success(c, http.StatusCreated, gin.H{
>>>>>>> Stashed changes
		"message": "booking created successfully",
		"booking": gin.H{
			"id":            booking.ID,
			"rideId":        booking.RideID,
			"seatsReserved": booking.SeatsReserved,
			"status":        booking.Status,
			"createdAt":     booking.CreatedAt,
		},
	})
}

// Delete handles booking deletion.
func (h *Handler) Delete(c *gin.Context) {
	bookingIDStr := c.Param("id")
	bookingID, err := strconv.ParseInt(bookingIDStr, 10, 64)
	if err != nil || bookingID <= 0 {
		httpx.Error(c, http.StatusBadRequest, "invalid_booking_id", "invalid booking id", nil)
		return
	}

	userID := c.GetInt64("authUserID")

	// Log booking deletion attempt
	h.logger.Info("delete booking attempt", "booking_id", bookingID, "user_id", userID, "request_id", c.GetString("requestID"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	// Verify the booking belongs to the user
	booking, err := h.bookingRepository.GetByID(ctx, bookingID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			httpx.Error(c, http.StatusNotFound, "booking_not_found", "booking not found", nil)
		} else {
			h.logger.Error("failed to get booking", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"), "booking_id", bookingID)
			httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to get booking", nil)
		}
		return
	}

	if booking.UserID != userID {
		httpx.Error(c, http.StatusForbidden, "forbidden_booking_delete", "cannot delete someone else's booking", nil)
		return
	}

	if err := h.bookingRepository.DeleteByID(ctx, bookingID); err != nil {
		h.logger.Error("failed to delete booking", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"), "booking_id", bookingID)
		httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to delete booking", nil)
		return
	}

	// Restore available seats to the ride
	ride, err := h.tripRepository.GetByID(ctx, booking.RideID)
	if err == nil {
		ride.AvailableSeats += booking.SeatsReserved
		if ride.Status == "full" {
			ride.Status = "open"
		}
		if err := h.tripRepository.Update(ctx, ride); err != nil {
			h.logger.Error("failed to restore ride seats", "error", err)
		}
	}

	h.logger.Info("booking deleted", "booking_id", bookingID, "user_id", userID, "ride_id", booking.RideID, "request_id", c.GetString("requestID"))

	httpx.Success(c, http.StatusOK, gin.H{
		"message": "booking deleted successfully",
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
				"id":            booking.Ride.ID,
				"route":         booking.Ride.Origin + " → " + booking.Ride.Destination,
				"origin":        booking.Ride.Origin,
				"destination":   booking.Ride.Destination,
				"date":          booking.Ride.DepartureDate,
				"price":         booking.Ride.Price,
				"status":        booking.Ride.Status,
				"averageRating": booking.Ride.AverageRating,
				"reviewCount":   booking.Ride.ReviewCount,
			},
		})
	}

	return response
}
<<<<<<< Updated upstream
=======

func mapRideBookingsResponse(bookings []*domain.Booking) []gin.H {
	response := make([]gin.H, 0, len(bookings))
	for _, booking := range bookings {
		response = append(response, gin.H{
			"id":            booking.ID,
			"rideId":        booking.RideID,
			"seatsReserved": booking.SeatsReserved,
			"status":        booking.Status,
			"createdAt":     booking.CreatedAt,
			"passenger": gin.H{
				"id":       booking.Passenger.ID,
				"username": booking.Passenger.Username,
				"email":    booking.Passenger.Email,
			},
		})
	}

	return response
}

// sendEmailSafe sends an email safely without panicking, using environment SMTP configuration.
func sendEmailSafe(to, subject, body string, logger *slog.Logger) {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")

	if host == "" || port == "" {
		logger.Info("SMTP configuration not found, skipping email notification", "to", to, "subject", subject)
		return
	}

	addr := host + ":" + port
	auth := smtp.PlainAuth("", user, pass, host)

	msg := []byte("To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
		body + "\r\n")

	from := user
	if from == "" {
		from = "noreply@uniride.com"
	}

	err := smtp.SendMail(addr, auth, from, []string{to}, msg)
	if err != nil {
		logger.Error("failed to send email notification", "error", err, "to", to)
	} else {
		logger.Info("email notification sent successfully", "to", to, "subject", subject)
	}
}
>>>>>>> Stashed changes
