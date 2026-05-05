// Package main is the entry point for the backend server.
package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/mail"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/config"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/database"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

var logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))

type registerRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authClaims struct {
	UserID   int64  `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	jwt.RegisteredClaims
}

func generateAuthToken(secret string, userID int64, username, email string) (string, error) {
	now := time.Now().UTC()
	claims := authClaims{
		UserID:   userID,
		Username: username,
		Email:    email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatInt(userID, 10),
			Issuer:    "UniRide",
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func authMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authorizationHeader := strings.TrimSpace(c.GetHeader("Authorization"))
		if authorizationHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			return
		}

		parts := strings.SplitN(authorizationHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header"})
			return
		}

		claims := &authClaims{}
		token, err := jwt.ParseWithClaims(
			strings.TrimSpace(parts[1]),
			claims,
			func(token *jwt.Token) (any, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %T", token.Method)
				}

				return []byte(secret), nil
			},
			jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		)
		if err != nil || token == nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		c.Set("authUserID", claims.UserID)
		c.Set("authUsername", claims.Username)
		c.Set("authEmail", claims.Email)
		c.Next()
	}
}

func main() {
	ctx := context.Background()

	cfg := config.Load()

	db, err := database.Connect(ctx, cfg.DatabaseDSN())
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	// Crear usuario de prueba "admin"
	testPasswordHash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		logger.Error("failed to hash test user password", "error", err)
	} else {
		_, err = db.ExecContext(ctx, `
			INSERT INTO users (username, email, password_hash)
			VALUES ($1, $2, $3)
			ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
		`, "admin", "admin@uni.es", string(testPasswordHash))
		if err != nil {
			logger.Error("failed to insert test user", "error", err)
		} else {
			logger.Info("test user 'admin' ensured")
		}
	}

	gin.SetMode(cfg.GinMode)

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api")
	api.GET("/hello", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Hello from the API"})
	})
	loginHandler := func(c *gin.Context) {
		var req loginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON body"})
			return
		}

		req.Email = strings.TrimSpace(strings.ToLower(req.Email))

		if req.Email == "" || req.Password == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "email and password are required"})
			return
		}

		if _, err := mail.ParseAddress(req.Email); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email format"})
			return
		}

		queryCtx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()

		var userID int64
		var username string
		var storedHash string
		err := db.QueryRowContext(
			queryCtx,
			`SELECT id, username, password_hash
			 FROM users
			 WHERE email = $1`,
			req.Email,
		).Scan(&userID, &username, &storedHash)

		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
				return
			}

			logger.Error("database select user error", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to login"})
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
			return
		}

		token, err := generateAuthToken(cfg.JWTSecret, userID, username, req.Email)
		if err != nil {
			logger.Error("failed to generate auth token", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to login"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token": token,
			"user": gin.H{
				"id":       userID,
				"username": username,
				"email":    req.Email,
			},
		})
	}
	auth := r.Group("/auth")
	auth.POST("/login", loginHandler)
	api.POST("/login", loginHandler)
	privateAPI := r.Group("/api/private", authMiddleware(cfg.JWTSecret))
	privateAPI.GET("/me", func(c *gin.Context) {
		userID := c.GetInt64("authUserID")
		username, _ := c.Get("authUsername")
		email, _ := c.Get("authEmail")

		c.JSON(http.StatusOK, gin.H{
			"user": gin.H{
				"id":       userID,
				"username": username,
				"email":    email,
			},
		})
	})
	api.POST("/register", func(c *gin.Context) {
		var req registerRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON body"})
			return
		}

		req.Username = strings.TrimSpace(req.Username)
		req.Email = strings.TrimSpace(strings.ToLower(req.Email))

		if req.Username == "" || req.Email == "" || req.Password == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "username, email and password are required"})
			return
		}

		if _, err := mail.ParseAddress(req.Email); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email format"})
			return
		}

		if len(req.Password) < 8 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "password must have at least 8 characters"})
			return
		}

		passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			logger.Error("password hash error", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process password"})
			return
		}

		queryCtx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()

		var userID int64
		var createdAt time.Time
		err = db.QueryRowContext(
			queryCtx,
			`INSERT INTO users (username, email, password_hash)
			 VALUES ($1, $2, $3)
			 RETURNING id, created_at`,
			req.Username,
			req.Email,
			string(passwordHash),
		).Scan(&userID, &createdAt)

		if err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				switch pgErr.ConstraintName {
				case "users_username_key":
					c.JSON(http.StatusConflict, gin.H{"error": "username already exists"})
				case "users_email_key":
					c.JSON(http.StatusConflict, gin.H{"error": "email already exists"})
				default:
					c.JSON(http.StatusConflict, gin.H{"error": "user already exists"})
				}
				return
			}

			logger.Error("database insert user error", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message": "user registered successfully",
			"user": gin.H{
				"id":         userID,
				"username":   req.Username,
				"email":      req.Email,
				"created_at": createdAt,
			},
		})
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	ctx, stop := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		slog.Info("server listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	slog.Info("shutting down server")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("shutdown error", "error", err)
	}

	logger.Info("server stopped")
}
