package rides

import (
	"context"
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

func TestCreateRideRequiresAuthentication(t *testing.T) {
	router, _ := setupRideRouter(t)

	request := httptest.NewRequest(http.MethodPost, "/rides", strings.NewReader(`{}`))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, response.Code)
	}
}

func TestCreateRideStoresAuthenticatedDriver(t *testing.T) {
	router, repo := setupRideRouter(t)
	body := `{
		"origin": "Madrid",
		"destination": "Barcelona",
		"departureDate": "2099-05-20T08:30:00Z",
		"availableSeats": 3,
		"price": 12.50
	}`

	request := httptest.NewRequest(http.MethodPost, "/rides", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+testToken(t, 42))
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusCreated, response.Code, response.Body.String())
	}

	if repo.created == nil {
		t.Fatal("expected trip to be stored")
	}

	if repo.created.DriverID != 42 {
		t.Fatalf("expected driver id 42, got %d", repo.created.DriverID)
	}

	if repo.created.AvailableSeats != 3 {
		t.Fatalf("expected 3 seats, got %d", repo.created.AvailableSeats)
	}
}

func TestCreateRideRejectsInvalidSeats(t *testing.T) {
	router, _ := setupRideRouter(t)
	body := `{
		"origin": "Madrid",
		"destination": "Barcelona",
		"departureDate": "2099-05-20T08:30:00Z",
		"availableSeats": -1,
		"price": 12.50
	}`

	request := httptest.NewRequest(http.MethodPost, "/rides", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+testToken(t, 42))
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, response.Code)
	}
}

func TestListRidesAppliesFilters(t *testing.T) {
	router, repo := setupRideRouter(t)

	request := httptest.NewRequest(http.MethodGet, "/rides?origin=Madrid&destination=Barcelona&departureDate=2099-05-20&availableSeats=2", nil)
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.Code)
	}

	if repo.filters.Origin != "Madrid" || repo.filters.Destination != "Barcelona" {
		t.Fatalf("unexpected text filters: %+v", repo.filters)
	}

	if repo.filters.DepartureDate == nil || repo.filters.DepartureDate.Format("2006-01-02") != "2099-05-20" {
		t.Fatalf("unexpected date filter: %+v", repo.filters.DepartureDate)
	}

	if repo.filters.AvailableSeats == nil || *repo.filters.AvailableSeats != 2 {
		t.Fatalf("unexpected seats filter: %+v", repo.filters.AvailableSeats)
	}
}

func setupRideRouter(t *testing.T) (*gin.Engine, *fakeTripRepository) {
	t.Helper()

	gin.SetMode(gin.TestMode)

	repo := &fakeTripRepository{}
	handler := NewHandler(repo, nil)
	router := gin.New()
	group := router.Group("/rides")
	handler.RegisterRoutes(group, auth.Middleware("test-secret"))

	return router, repo
}

func testToken(t *testing.T, userID int64) string {
	t.Helper()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":  userID,
		"username": "student",
		"email":    "student@uni.es",
		"exp":      time.Now().Add(time.Hour).Unix(),
	})

	signedToken, err := token.SignedString([]byte("test-secret"))
	if err != nil {
		t.Fatalf("failed to sign test token: %v", err)
	}

	return signedToken
}

type fakeTripRepository struct {
	created *domain.Trip
	filters domain.TripFilters
}

func (r *fakeTripRepository) Create(_ context.Context, trip *domain.Trip) error {
	trip.ID = 10
	trip.CreatedAt = time.Now()
	r.created = trip

	return nil
}

func (r *fakeTripRepository) GetByID(_ context.Context, _ int64) (*domain.Trip, error) {
	return nil, nil
}

func (r *fakeTripRepository) ListOpenTrips(_ context.Context, filters domain.TripFilters) ([]*domain.Trip, error) {
	r.filters = filters

	return []*domain.Trip{
		{
			ID:             10,
			DriverID:       42,
			Origin:         "Madrid",
			Destination:    "Barcelona",
			DepartureDate:  time.Date(2099, 5, 20, 8, 30, 0, 0, time.UTC),
			AvailableSeats: 3,
			PricePerSeat:   12.50,
			Status:         "open",
			CreatedAt:      time.Now(),
		},
	}, nil
}
