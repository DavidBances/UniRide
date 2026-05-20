package bookings

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/auth"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/domain"
)

func TestListCurrentUserRequiresAuthentication(t *testing.T) {
	router, _ := setupBookingRouter(t)

	request := httptest.NewRequest(http.MethodGet, "/me/bookings", nil)
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, response.Code)
	}
}

func TestListCurrentUserUsesAuthenticatedUserID(t *testing.T) {
	router, repo := setupBookingRouter(t)

	request := httptest.NewRequest(http.MethodGet, "/me/bookings", nil)
	request.Header.Set("Authorization", "Bearer "+bookingTestToken(t, 77))
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusOK, response.Code, response.Body.String())
	}

	if repo.userID != 77 {
		t.Fatalf("expected user id 77, got %d", repo.userID)
	}
}

func setupBookingRouter(t *testing.T) (*gin.Engine, *fakeBookingRepository) {
	t.Helper()

	gin.SetMode(gin.TestMode)

	repo := &fakeBookingRepository{}
	handler := NewHandler(repo, nil, nil)
	router := gin.New()
	group := router.Group("/me", auth.Middleware("test-secret"))
	group.GET("/bookings", handler.ListCurrentUser)

	return router, repo
}

func bookingTestToken(t *testing.T, userID int64) string {
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

type fakeBookingRepository struct {
	userID int64
}

func (r *fakeBookingRepository) ListByUserID(_ context.Context, userID int64) ([]*domain.Booking, error) {
	r.userID = userID

	return []*domain.Booking{
		{
			ID:            1,
			RideID:        2,
			UserID:        userID,
			SeatsReserved: 1,
			Status:        "confirmed",
			CreatedAt:     time.Now(),
			Ride: domain.BookingRideSummary{
				ID:            2,
				Origin:        "Madrid",
				Destination:   "Barcelona",
				DepartureDate: time.Date(2099, 5, 20, 10, 0, 0, 0, time.UTC),
				Price:         15,
				Status:        "open",
			},
		},
	}, nil
}

func (r *fakeBookingRepository) Create(_ context.Context, booking *domain.Booking) error {
	booking.ID = 1
	return nil
}

func (r *fakeBookingRepository) DeleteByID(_ context.Context, _ int64) error {
	return nil
}

func (r *fakeBookingRepository) GetByID(_ context.Context, bookingID int64) (*domain.Booking, error) {
	return &domain.Booking{
		ID:     bookingID,
		UserID: r.userID,
	}, nil
}
