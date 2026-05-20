package reviews

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

func TestCreateReviewRequiresCompletedRide(t *testing.T) {
	router, _, trips := setupReviewRouter(t)
	trips.ride = &domain.Trip{ID: 10, DriverID: 2, Status: "open"}

	request := httptest.NewRequest(http.MethodPost, "/reviews", strings.NewReader(`{"rideId":10,"rating":5}`))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+reviewTestToken(t, 7))
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusBadRequest, response.Code, response.Body.String())
	}
}

func TestCreateReviewStoresAuthenticatedReviewer(t *testing.T) {
	router, reviews, trips := setupReviewRouter(t)
	trips.ride = &domain.Trip{ID: 10, DriverID: 2, Status: "completed"}

	request := httptest.NewRequest(http.MethodPost, "/reviews", strings.NewReader(`{"rideId":10,"rating":4,"comment":"Great ride"}`))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+reviewTestToken(t, 7))
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusCreated, response.Code, response.Body.String())
	}

	if reviews.created == nil {
		t.Fatal("expected review to be created")
	}

	if reviews.created.ReviewerID != 7 || reviews.created.ReviewedUserID != 2 {
		t.Fatalf("unexpected review users: %+v", reviews.created)
	}
}

func TestCreateReviewRejectsSelfReview(t *testing.T) {
	router, _, trips := setupReviewRouter(t)
	trips.ride = &domain.Trip{ID: 10, DriverID: 7, Status: "completed"}

	request := httptest.NewRequest(http.MethodPost, "/reviews", strings.NewReader(`{"rideId":10,"rating":5}`))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+reviewTestToken(t, 7))
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusBadRequest, response.Code, response.Body.String())
	}
}

func setupReviewRouter(t *testing.T) (*gin.Engine, *fakeReviewRepository, *fakeReviewTripRepository) {
	t.Helper()

	gin.SetMode(gin.TestMode)

	reviews := &fakeReviewRepository{}
	trips := &fakeReviewTripRepository{}
	handler := NewHandler(reviews, trips, nil)

	router := gin.New()
	group := router.Group("/reviews")
	handler.RegisterRoutes(group, auth.Middleware("test-secret"))

	return router, reviews, trips
}

func reviewTestToken(t *testing.T, userID int64) string {
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

type fakeReviewRepository struct {
	created *domain.Review
}

func (r *fakeReviewRepository) Create(_ context.Context, review *domain.Review) error {
	review.ID = 99
	review.CreatedAt = time.Now()
	r.created = review

	return nil
}

type fakeReviewTripRepository struct {
	ride *domain.Trip
}

func (r *fakeReviewTripRepository) Create(_ context.Context, _ *domain.Trip) error {
	return nil
}

func (r *fakeReviewTripRepository) GetByID(_ context.Context, _ int64) (*domain.Trip, error) {
	if r.ride == nil {
		return nil, domain.ErrRideNotFound
	}

	return r.ride, nil
}

func (r *fakeReviewTripRepository) GetRideDetailsByID(_ context.Context, _ int64) (*domain.RideDetails, error) {
	return nil, nil
}

func (r *fakeReviewTripRepository) ListOpenTrips(_ context.Context, filters domain.TripFilters) ([]*domain.Trip, error) {
	return nil, nil
}
