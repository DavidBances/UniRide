// Package router centralizes HTTP route registration.
package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/auth"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/bookings"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/reviews"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/rides"
)

// Dependencies contains the handlers required by the HTTP router.
type Dependencies struct {
	AuthHandler     *auth.Handler
	RideHandler     *rides.Handler
	BookingHandler  *bookings.Handler
	ReviewHandler   *reviews.Handler
	JWTSecret       string
	CORSAllowOrigin string
}

// New creates and configures the HTTP router.
func New(dependencies Dependencies) *gin.Engine {
	engine := gin.New()
	engine.Use(gin.Logger(), gin.Recovery())
	engine.Use(corsMiddleware(dependencies.CORSAllowOrigin))

	// Global rate limiting: 10 requests per second, burst of 20
	globalLimiter := RateLimitMiddleware(10, 20)
	engine.Use(globalLimiter)

	// Strict rate limiting for Auth routes: 1 req/sec, burst of 5
	authLimiter := RateLimitMiddleware(1, 5)

	engine.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	authGroup := engine.Group("/auth", authLimiter)
	authGroup.POST("/register", dependencies.AuthHandler.Register)
	authGroup.POST("/login", dependencies.AuthHandler.Login)

	api := engine.Group("/api")
	api.GET("/hello", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Hello from the API"})
	})

	// Temporary backward-compatible route for existing frontend calls.
	// New clients should use POST /auth/login.
	api.POST("/login", authLimiter, dependencies.AuthHandler.Login)

	// Temporary backward-compatible route for existing frontend calls.
	// New clients should use POST /auth/register.
	api.POST("/register", authLimiter, dependencies.AuthHandler.Register)

	privateAPI := api.Group("/private", auth.Middleware(dependencies.JWTSecret))
	privateAPI.GET("/me", dependencies.AuthHandler.Me)

	apiMeGroup := api.Group("/me", auth.Middleware(dependencies.JWTSecret))
	apiMeGroup.GET("/bookings", dependencies.BookingHandler.ListCurrentUser)
	apiMeGroup.GET("/rides", dependencies.RideHandler.ListCurrentUserRides)

	meGroup := engine.Group("/me", auth.Middleware(dependencies.JWTSecret))
	meGroup.GET("/bookings", dependencies.BookingHandler.ListCurrentUser)
	meGroup.GET("/rides", dependencies.RideHandler.ListCurrentUserRides)

	ridesGroup := api.Group("/rides")
	dependencies.RideHandler.RegisterRoutes(ridesGroup, auth.Middleware(dependencies.JWTSecret))

	rootRidesGroup := engine.Group("/rides")
	dependencies.RideHandler.RegisterRoutes(rootRidesGroup, auth.Middleware(dependencies.JWTSecret))

	bookingsGroup := api.Group("/bookings")
	dependencies.BookingHandler.RegisterRoutes(bookingsGroup, auth.Middleware(dependencies.JWTSecret))

	rootBookingsGroup := engine.Group("/bookings")
	dependencies.BookingHandler.RegisterRoutes(rootBookingsGroup, auth.Middleware(dependencies.JWTSecret))

	reviewsGroup := api.Group("/reviews")
	dependencies.ReviewHandler.RegisterRoutes(reviewsGroup, auth.Middleware(dependencies.JWTSecret))

	rootReviewsGroup := engine.Group("/reviews")
	dependencies.ReviewHandler.RegisterRoutes(rootReviewsGroup, auth.Middleware(dependencies.JWTSecret))

	return engine
}

func corsMiddleware(allowOrigin string) gin.HandlerFunc {
	if allowOrigin == "" {
		allowOrigin = "*"
	}

	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", allowOrigin)
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
