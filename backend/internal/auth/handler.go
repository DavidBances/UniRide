// Package auth contains authentication handlers and business logic.
package auth

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/users"
)

const requestTimeout = 5 * time.Second

type registerRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Handler exposes authentication HTTP handlers.
type Handler struct {
	service *Service
	logger  *slog.Logger
}

// NewHandler creates an authentication handler.
func NewHandler(service *Service, logger *slog.Logger) *Handler {
	if logger == nil {
		logger = slog.Default()
	}

	return &Handler{
		service: service,
		logger:  logger,
	}
}

// Register handles user registration requests.
func (h *Handler) Register(c *gin.Context) {
	var req registerRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON body"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	registeredUser, err := h.service.Register(ctx, RegisterInput{
		Username: req.Username,
		Email:    req.Email,
		Password: req.Password,
	})

	if err != nil {
		h.handleRegisterError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "user registered successfully",
		"user": gin.H{
			"id":         registeredUser.ID,
			"username":   registeredUser.Username,
			"email":      registeredUser.Email,
			"created_at": registeredUser.CreatedAt,
		},
	})
}

// Login handles user login requests.
func (h *Handler) Login(c *gin.Context) {
	var req loginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON body"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	authenticatedUser, err := h.service.Login(ctx, LoginInput{
		Email:    req.Email,
		Password: req.Password,
	})

	if err != nil {
		h.handleLoginError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "login successful",
		"user": gin.H{
			"id":       authenticatedUser.ID,
			"username": authenticatedUser.Username,
			"email":    authenticatedUser.Email,
		},
	})
}

func (h *Handler) handleRegisterError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalidRegisterInput),
		errors.Is(err, ErrInvalidEmailFormat),
		errors.Is(err, ErrWeakPassword):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})

	case errors.Is(err, users.ErrUsernameAlreadyExists),
		errors.Is(err, users.ErrEmailAlreadyExists),
		errors.Is(err, users.ErrUserAlreadyExists):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})

	default:
		h.logger.Error("failed to register user", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
	}
}

func (h *Handler) handleLoginError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalidLoginInput),
		errors.Is(err, ErrInvalidEmailFormat):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})

	case errors.Is(err, ErrInvalidCredentials):
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})

	default:
		h.logger.Error("failed to login user", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to login"})
	}
}
