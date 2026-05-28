// Package bookings contains booking HTTP handlers and booking business logic.
package bookings

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/domain"
)

const requestTimeout = 5 * time.Second

// Handler exposes booking HTTP handlers.
type Handler struct {
	bookingRepository domain.BookingRepository
	tripRepository    domain.TripRepository
	logger            *slog.Logger
}

type createBookingRequest struct {
	RideID        int64 `json:"rideId" binding:"required,min=1"`
	SeatsReserved int   `json:"seatsReserved" binding:"required,min=1"`
}

// NewHandler creates a booking handler.
func NewHandler(bookingRepository domain.BookingRepository, tripRepository domain.TripRepository, logger *slog.Logger) *Handler {
	if logger == nil {
		logger = slog.Default()
	}

	return &Handler{
		bookingRepository: bookingRepository,
		tripRepository:    tripRepository,
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
		h.logger.Error("failed to list current user bookings", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list bookings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"bookings": mapBookingsResponse(bookings),
	})
}

// List returns the list of user bookings.
func (h *Handler) List(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message":  "bookings endpoint ready",
		"bookings": []gin.H{},
	})
}

// Create handles booking creation.
func (h *Handler) Create(c *gin.Context) {
	var req createBookingRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: rideId and seatsReserved are required"})
		return
	}

	userID := c.GetInt64("authUserID")

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	// Get the ride to check available seats
	ride, err := h.tripRepository.GetByID(ctx, req.RideID)
	if err != nil {
		h.logger.Error("failed to get ride", "error", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "ride not found"})
		return
	}

	// Validate seats
	if req.SeatsReserved > ride.AvailableSeats {
		c.JSON(http.StatusBadRequest, gin.H{"error": "not enough available seats"})
		return
	}

	// Reducimos los asientos disponibles en el viaje
	ride.AvailableSeats -= req.SeatsReserved
	if ride.AvailableSeats == 0 {
		ride.Status = "full" // Si no quedan plazas, marcamos el viaje como lleno
	}

	if err := h.tripRepository.Update(ctx, ride); err != nil {
		h.logger.Error("failed to update ride seats", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update ride"})
		return
	}

	booking := &domain.Booking{
		RideID:        req.RideID,
		UserID:        userID,
		SeatsReserved: req.SeatsReserved,
		Status:        "confirmed",
	}

	if err := h.bookingRepository.Create(ctx, booking); err != nil {
		h.logger.Error("failed to create booking", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create booking"})
		return
	}

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

	c.JSON(http.StatusCreated, gin.H{
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid booking id"})
		return
	}

	userID := c.GetInt64("authUserID")

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	// Verify the booking belongs to the user
	booking, err := h.bookingRepository.GetByID(ctx, bookingID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "booking not found"})
		} else {
			h.logger.Error("failed to get booking", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get booking"})
		}
		return
	}

	if booking.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "cannot delete someone else's booking"})
		return
	}

	if err := h.bookingRepository.DeleteByID(ctx, bookingID); err != nil {
		h.logger.Error("failed to delete booking", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete booking"})
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

		// Extraer email del JWT y enviar notificación asíncrona de cancelación
		authHeader := c.GetHeader("Authorization")
		go func(header, origin, dest string, seats int) {
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
				subject := "Reserva cancelada - UniRide"
				body := fmt.Sprintf("Hola,\n\nTu reserva para el viaje de %s a %s ha sido cancelada correctamente.\nSe han liberado %d asientos.\n\nEsperamos verte pronto en otro viaje.", origin, dest, seats)
				sendEmailSafe(userEmail, subject, body, h.logger)
			}
		}(authHeader, ride.Origin, ride.Destination, booking.SeatsReserved)
	}

	c.JSON(http.StatusOK, gin.H{
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
