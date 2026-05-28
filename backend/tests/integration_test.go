package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/auth"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/bookings"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/domain"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/rides"
)

// --- In-Memory Repositories para Integración ---

type inMemoryTripRepo struct {
	trips  map[int64]*domain.Trip
	nextID int64
}

func (r *inMemoryTripRepo) Create(ctx context.Context, trip *domain.Trip) error {
	r.nextID++
	trip.ID = r.nextID
	trip.CreatedAt = time.Now()
	r.trips[trip.ID] = trip
	return nil
}

func (r *inMemoryTripRepo) GetByID(ctx context.Context, id int64) (*domain.Trip, error) {
	if trip, ok := r.trips[id]; ok {
		return trip, nil
	}
	return nil, domain.ErrRideNotFound
}

func (r *inMemoryTripRepo) GetRideDetailsByID(ctx context.Context, id int64) (*domain.RideDetails, error) {
	if trip, ok := r.trips[id]; ok {
		return &domain.RideDetails{
			ID:             trip.ID,
			DriverID:       trip.DriverID,
			Origin:         trip.Origin,
			Destination:    trip.Destination,
			DepartureDate:  trip.DepartureDate,
			AvailableSeats: trip.AvailableSeats,
			PricePerSeat:   trip.PricePerSeat,
			Status:         trip.Status,
			CreatedAt:      trip.CreatedAt,
			Driver: domain.RideDriver{
				ID:       trip.DriverID,
				Username: "testdriver",
			},
		}, nil
	}
	return nil, domain.ErrRideNotFound
}

func (r *inMemoryTripRepo) ListOpenTrips(ctx context.Context, filters domain.TripFilters) ([]*domain.Trip, error) {
	var result []*domain.Trip
	for _, t := range r.trips {
		if t.Status == "open" || t.Status == "completed" {
			result = append(result, t)
		}
	}
	return result, nil
}

func (r *inMemoryTripRepo) Update(ctx context.Context, trip *domain.Trip) error {
	if _, ok := r.trips[trip.ID]; ok {
		r.trips[trip.ID] = trip
		return nil
	}
	return domain.ErrRideNotFound
}

func (r *inMemoryTripRepo) ListByDriverID(ctx context.Context, driverID int64) ([]*domain.Trip, error) {
	var result []*domain.Trip
	for _, t := range r.trips {
		if t.DriverID == driverID {
			result = append(result, t)
		}
	}
	return result, nil
}

type inMemoryBookingRepo struct {
	bookings map[int64]*domain.Booking
	nextID   int64
}

func (r *inMemoryBookingRepo) Create(ctx context.Context, booking *domain.Booking) error {
	r.nextID++
	booking.ID = r.nextID
	booking.CreatedAt = time.Now()
	r.bookings[booking.ID] = booking
	return nil
}

func (r *inMemoryBookingRepo) GetByID(ctx context.Context, id int64) (*domain.Booking, error) {
	if b, ok := r.bookings[id]; ok {
		return b, nil
	}
	return nil, errors.New("booking not found")
}

func (r *inMemoryBookingRepo) DeleteByID(ctx context.Context, id int64) error {
	delete(r.bookings, id)
	return nil
}

func (r *inMemoryBookingRepo) ListByUserID(ctx context.Context, userID int64) ([]*domain.Booking, error) {
	var result []*domain.Booking
	for _, b := range r.bookings {
		if b.UserID == userID {
			result = append(result, b)
		}
	}
	return result, nil
}

func testToken(userID int64) string {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"user_id": userID, "exp": time.Now().Add(time.Hour).Unix()})
	s, _ := token.SignedString([]byte("test-secret"))
	return s
}

// --- Integration Test ---

func TestBusinessFlows(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	tripRepo := &inMemoryTripRepo{trips: make(map[int64]*domain.Trip)}
	bookRepo := &inMemoryBookingRepo{bookings: make(map[int64]*domain.Booking)}

	rideHandler := rides.NewHandler(tripRepo, nil)
	bookingHandler := bookings.NewHandler(bookRepo, tripRepo, nil)

	authMiddleware := auth.Middleware("test-secret")

	rideHandler.RegisterRoutes(router.Group("/api/rides"), authMiddleware)
	bookingHandler.RegisterRoutes(router.Group("/api/bookings"), authMiddleware)

	driverID := int64(1)
	passengerID := int64(2)

	// 1. Test authenticated access
	req := httptest.NewRequest(http.MethodPost, "/api/rides", bytes.NewReader([]byte(`{}`)))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized, got %d", w.Code)
	}

	// 2. Test create ride flow
	ridePayload := `{
		"origin": "Madrid",
		"destination": "León",
		"departureDate": "2099-12-31T10:00:00Z",
		"availableSeats": 3,
		"price": 15.5
	}`
	req = httptest.NewRequest(http.MethodPost, "/api/rides", bytes.NewReader([]byte(ridePayload)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+testToken(driverID))
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d", w.Code)
	}

	var createRideResp map[string]any
	json.Unmarshal(w.Body.Bytes(), &createRideResp)
	rideMap := createRideResp["ride"].(map[string]any)
	rideID := int64(rideMap["ID"].(float64))

	if rideID == 0 {
		t.Fatalf("expected ride ID to be returned")
	}

	// 3. Test list rides flow
	req = httptest.NewRequest(http.MethodGet, "/api/rides", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", w.Code)
	}
	if !bytes.Contains(w.Body.Bytes(), []byte("Madrid")) {
		t.Fatalf("expected response to contain origin Madrid")
	}

	// 4. Test booking flow
	bookPayload := fmt.Sprintf(`{"rideId": %d, "seatsReserved": 2}`, rideID)
	req = httptest.NewRequest(http.MethodPost, "/api/bookings", bytes.NewReader([]byte(bookPayload)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+testToken(passengerID))
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d", w.Code)
	}

	var createBookResp map[string]any
	json.Unmarshal(w.Body.Bytes(), &createBookResp)
	bookMap := createBookResp["booking"].(map[string]any)
	bookingID := int64(bookMap["id"].(float64))

	if bookingID == 0 {
		t.Fatalf("expected booking ID to be returned")
	}

	// Verify seats were reduced
	if trip, _ := tripRepo.GetByID(context.Background(), rideID); trip.AvailableSeats != 1 {
		t.Fatalf("expected 1 available seat, got %d", trip.AvailableSeats)
	}

	// 5. Test cancel booking flow
	req = httptest.NewRequest(http.MethodDelete, fmt.Sprintf("/api/bookings/%d", bookingID), nil)
	req.Header.Set("Authorization", "Bearer "+testToken(passengerID))
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", w.Code)
	}

	// Verify seats were restored
	if trip, _ := tripRepo.GetByID(context.Background(), rideID); trip.AvailableSeats != 3 {
		t.Fatalf("expected 3 available seats after cancel, got %d", trip.AvailableSeats)
	}
}
