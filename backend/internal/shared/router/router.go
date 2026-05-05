// Package router centralizes HTTP route registration.
package router

import (
"net/http"

"github.com/gin-gonic/gin"
"github.com/isw2-unileon/proyect-scaffolding/backend/internal/auth"
"github.com/isw2-unileon/proyect-scaffolding/backend/internal/bookings"
"github.com/isw2-unileon/proyect-scaffolding/backend/internal/rides"
)

// Dependencies contains the handlers required by the HTTP router.
type Dependencies struct {
AuthHandler    *auth.Handler
RideHandler    *rides.Handler
BookingHandler *bookings.Handler
JWTSecret      string
}

// New creates and configures the HTTP router.
func New(dependencies Dependencies) *gin.Engine {
engine := gin.New()
engine.Use(gin.Logger(), gin.Recovery())

engine.GET("/health", func(c *gin.Context) {
c.JSON(http.StatusOK, gin.H{"status": "ok"})
})

authGroup := engine.Group("/auth")
authGroup.POST("/register", dependencies.AuthHandler.Register)
authGroup.POST("/login", dependencies.AuthHandler.Login)

api := engine.Group("/api")
api.GET("/hello", func(c *gin.Context) {
c.JSON(http.StatusOK, gin.H{"message": "Hello from the API"})
})

api.POST("/login", dependencies.AuthHandler.Login)

// Temporary backward-compatible route for existing frontend calls.
// New clients should use POST /auth/register.
api.POST("/register", dependencies.AuthHandler.Register)

privateAPI := api.Group("/private", auth.Middleware(dependencies.JWTSecret))
privateAPI.GET("/me", dependencies.AuthHandler.Me)

ridesGroup := api.Group("/rides")
dependencies.RideHandler.RegisterRoutes(ridesGroup)

bookingsGroup := api.Group("/bookings")
dependencies.BookingHandler.RegisterRoutes(bookingsGroup)

return engine
}
