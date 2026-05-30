package rides

import (
	"context"
	"encoding/json"
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

func TestCreateRideRejectsPastDate(t *testing.T) {
	router, _ := setupRideRouter(t)
	body := `{
		"origin": "Madrid",
		"destination": "Barcelona",
		"departureDate": "2020-05-20T08:30:00Z",
		"availableSeats": 3,
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

func TestCreateRideRejectsMissingOriginOrDestination(t *testing.T) {
	router, _ := setupRideRouter(t)
	body := `{
		"origin": "",
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

func TestGetRideByIDReturnsRideDetails(t *testing.T) {
	router, repo := setupRideRouter(t)
	repo.detail = &domain.RideDetails{
		ID:             99,
		DriverID:       42,
		Origin:         "Madrid",
		Destination:    "Barcelona",
		DepartureDate:  time.Date(2099, 5, 20, 8, 30, 0, 0, time.UTC),
		AvailableSeats: 3,
		PricePerSeat:   12.5,
		Status:         "open",
		CreatedAt:      time.Now(),
		Driver: domain.RideDriver{
			ID:        42,
			Username:  "driver42",
			Email:     "driver42@uni.es",
			CreatedAt: time.Now(),
		},
	}

	request := httptest.NewRequest(http.MethodGet, "/rides/99", nil)
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusOK, response.Code, response.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	ride, ok := payload["ride"].(map[string]any)
	if !ok {
		t.Fatalf("expected ride payload, got %+v", payload)
	}

	if ride["origin"] != "Madrid" || ride["destination"] != "Barcelona" {
		t.Fatalf("unexpected ride payload: %+v", ride)
	}

	driver, ok := ride["driver"].(map[string]any)
	if !ok {
		t.Fatalf("expected driver payload, got %+v", ride)
	}

	if driver["username"] != "driver42" {
		t.Fatalf("unexpected driver payload: %+v", driver)
	}
}

func TestGetRideByIDReturns404WhenMissing(t *testing.T) {
	router, repo := setupRideRouter(t)
	repo.detailErr = domain.ErrRideNotFound

	request := httptest.NewRequest(http.MethodGet, "/rides/123", nil)
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusNotFound, response.Code, response.Body.String())
	}
}

func TestListCurrentUserRidesRequiresAuthentication(t *testing.T) {
	router, _ := setupRideRouter(t)

	request := httptest.NewRequest(http.MethodGet, "/me/rides", nil)
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, response.Code)
	}
}

func TestListCurrentUserRidesUsesAuthenticatedUserID(t *testing.T) {
	router, repo := setupRideRouter(t)

	request := httptest.NewRequest(http.MethodGet, "/me/rides", nil)
	request.Header.Set("Authorization", "Bearer "+testToken(t, 42))
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusOK, response.Code, response.Body.String())
	}

	if repo.driverID != 42 {
		t.Fatalf("expected driver id 42, got %d", repo.driverID)
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

	meGroup := router.Group("/me", auth.Middleware("test-secret"))
	meGroup.GET("/rides", handler.ListCurrentUserRides)

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
	created   *domain.Trip
	detail    *domain.RideDetails
	detailErr error
	filters   domain.TripFilters
	driverID  int64
}

func (r *fakeTripRepository) Create(_ context.Context, trip *domain.Trip) error {
	trip.ID = 10
	trip.CreatedAt = time.Now()
	r.created = trip

	return nil
}

func (r *fakeTripRepository) ListByDriverID(_ context.Context, driverID int64) ([]*domain.Trip, error) {
	r.driverID = driverID
	return []*domain.Trip{
		{
			ID:             10,
			DriverID:       driverID,
			Origin:         "Madrid",
			Destination:    "Barcelona",
			DepartureDate:  time.Date(2099, 5, 20, 8, 30, 0, 0, time.UTC),
			AvailableSeats: 3,
			PricePerSeat:   12.50,
			Status:         "open",
			CreatedAt:      time.Now(),
			BookingsCount:  2,
		},
	}, nil
}

func (r *fakeTripRepository) GetByID(_ context.Context, _ int64) (*domain.Trip, error) {
	return nil, nil
}

func (r *fakeTripRepository) GetRideDetailsByID(_ context.Context, _ int64) (*domain.RideDetails, error) {
	if r.detailErr != nil {
		return nil, r.detailErr
	}

	return r.detail, nil
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

func (r *fakeTripRepository) Update(_ context.Context, _ *domain.Trip) error {
	return nil
}
