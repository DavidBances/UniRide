// Package main is the entry point for the backend server.
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/auth"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/bookings"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/config"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/database"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/rides"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/shared/router"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/users"
)

var logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))

func main() {
	ctx := context.Background()

	cfg, err := config.Load()
	if err != nil {
		logger.Error("configuration error", "error", err)
		os.Exit(1)
	}

	db, err := database.Connect(ctx, cfg.DatabaseDSN())
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	if err := db.PingContext(ctx); err != nil {
		logger.Error("database ping error", "error", err)
		os.Exit(1)
	}

	userRepository := users.NewRepository(db)

	if err := users.EnsureDefaultAdmin(ctx, userRepository); err != nil {
		logger.Warn("failed to ensure default admin user", "error", err)
	} else {
		logger.Info("default admin user ensured")
	}

	authService := auth.NewService(userRepository, cfg.JWTSecret)
	authHandler := auth.NewHandler(authService, logger)

	rideHandler := rides.NewHandler(logger)
	bookingHandler := bookings.NewHandler(logger)

	gin.SetMode(cfg.GinMode)

	engine := router.New(router.Dependencies{
		AuthHandler:    authHandler,
		RideHandler:    rideHandler,
		BookingHandler: bookingHandler,
		JWTSecret:      cfg.JWTSecret,
	})

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      engine,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	ctx, stop := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		logger.Info("server listening", "addr", server.Addr)

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	logger.Info("shutting down server")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("shutdown error", "error", err)
	}

	logger.Info("server stopped")
}
