package bookings

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/auth"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/domain"
)

func TestCreateBookingSuccess(t *testing.T) {
	router, br, tr := setupRouter(t)
	tr.ride = &domain.Trip{ID: 1, AvailableSeats: 4, Status: "open"}

	req := httptest.NewRequest(http.MethodPost, "/bookings", strings.NewReader(`{"rideId":1,"seatsReserved":2}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+testToken(t, 42))

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", w.Code)
	}

	if tr.ride.AvailableSeats != 2 {
		t.Fatalf("expected available seats to be reduced to 2, got %d", tr.ride.AvailableSeats)
	}

	if len(br.bookings) != 1 {
		t.Fatal("expected booking to be saved")
	}
}

func TestCreateBookingInsufficientSeats(t *testing.T) {
	router, _, tr := setupRouter(t)
	tr.ride = &domain.Trip{ID: 1, AvailableSeats: 1, Status: "open"}

	req := httptest.NewRequest(http.MethodPost, "/bookings", strings.NewReader(`{"rideId":1,"seatsReserved":2}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+testToken(t, 42))

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 bad request, got %d", w.Code)
	}
}

func TestDeleteBookingRestoresSeats(t *testing.T) {
	router, br, tr := setupRouter(t)

	tr.ride = &domain.Trip{ID: 1, AvailableSeats: 0, Status: "full"}
	br.bookings[99] = &domain.Booking{
		ID: 99, RideID: 1, UserID: 42, SeatsReserved: 2, Status: "confirmed",
	}

	req := httptest.NewRequest(http.MethodDelete, "/bookings/99", nil)
	req.Header.Set("Authorization", "Bearer "+testToken(t, 42))

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	if len(br.bookings) != 0 {
		t.Fatal("expected booking to be deleted")
	}

	if tr.ride.AvailableSeats != 2 {
		t.Fatalf("expected seats to be restored to 2, got %d", tr.ride.AvailableSeats)
	}

	if tr.ride.Status != "open" {
		t.Fatalf("expected ride status to be restored to open, got %s", tr.ride.Status)
	}
}

func TestBookingRequiresAuthentication(t *testing.T) {
	router, _, _ := setupRouter(t)

	req := httptest.NewRequest(http.MethodPost, "/bookings", strings.NewReader(`{"rideId":1,"seatsReserved":2}`))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 unauthorized, got %d", w.Code)
	}
}

func TestDeleteBookingUnauthorizedUser(t *testing.T) {
	router, br, _ := setupRouter(t)
	br.bookings[99] = &domain.Booking{
		ID: 99, RideID: 1, UserID: 10, SeatsReserved: 2, Status: "confirmed",
	}

	// Intentamos borrar la reserva que pertenece al usuario 10 usando un token del usuario 42
	req := httptest.NewRequest(http.MethodDelete, "/bookings/99", nil)
	req.Header.Set("Authorization", "Bearer "+testToken(t, 42))

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 forbidden, got %d", w.Code)
	}
}

// --- Mocks e Infrastructura de Pruebas ---

type fakeTripRepository struct {
	ride *domain.Trip
}

func (r *fakeTripRepository) Create(ctx context.Context, trip *domain.Trip) error { return nil }
func (r *fakeTripRepository) GetRideDetailsByID(ctx context.Context, id int64) (*domain.RideDetails, error) {
	return nil, nil
}
func (r *fakeTripRepository) ListOpenTrips(ctx context.Context, filters domain.TripFilters) ([]*domain.Trip, error) {
	return nil, nil
}
func (r *fakeTripRepository) ListByDriverID(ctx context.Context, driverID int64) ([]*domain.Trip, error) {
	return nil, nil
}
func (r *fakeTripRepository) GetByID(ctx context.Context, id int64) (*domain.Trip, error) {
	if r.ride != nil && r.ride.ID == id {
		return r.ride, nil
	}
	return nil, domain.ErrRideNotFound
}
func (r *fakeTripRepository) Update(ctx context.Context, trip *domain.Trip) error {
	r.ride = trip
	return nil
}

type fakeBookingRepository struct {
	bookings map[int64]*domain.Booking
	nextID   int64
}

func (r *fakeBookingRepository) Create(ctx context.Context, booking *domain.Booking) error {
	r.nextID++
	booking.ID = r.nextID
	r.bookings[booking.ID] = booking
	return nil
}
func (r *fakeBookingRepository) GetByID(ctx context.Context, id int64) (*domain.Booking, error) {
	if b, ok := r.bookings[id]; ok {
		return b, nil
	}
	return nil, errors.New("booking not found")
}
func (r *fakeBookingRepository) DeleteByID(ctx context.Context, id int64) error {
	delete(r.bookings, id)
	return nil
}
func (r *fakeBookingRepository) ListByUserID(ctx context.Context, userID int64) ([]*domain.Booking, error) {
	return nil, nil
}

func setupRouter(t *testing.T) (*gin.Engine, *fakeBookingRepository, *fakeTripRepository) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	br := &fakeBookingRepository{bookings: make(map[int64]*domain.Booking)}
	tr := &fakeTripRepository{}
	handler := NewHandler(br, tr, nil)

	router := gin.New()
	handler.RegisterRoutes(router.Group("/bookings"), auth.Middleware("test-secret"))
	return router, br, tr
}

func testToken(t *testing.T, userID int64) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"user_id": userID, "exp": time.Now().Add(time.Hour).Unix()})
	s, _ := token.SignedString([]byte("test-secret"))
	return s
}
