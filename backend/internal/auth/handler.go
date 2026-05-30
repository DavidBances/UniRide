// Package auth contains authentication handlers and business logic.
package auth

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/shared/httpx"
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
		httpx.Error(c, http.StatusBadRequest, "invalid_request_body", "invalid request body", httpx.ValidationDetails(err))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	registeredUser, err := h.service.Register(ctx, RegisterInput(req))

	if err != nil {
		h.handleRegisterError(c, err)
		return
	}

	httpx.Success(c, http.StatusCreated, gin.H{
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
		httpx.Error(c, http.StatusBadRequest, "invalid_request_body", "invalid request body", httpx.ValidationDetails(err))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	// Log the login attempt (avoid logging passwords)
	h.logger.Info("login attempt", "email", req.Email, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"))

	authenticatedUser, err := h.service.Login(ctx, LoginInput(req))

	if err != nil {
		h.logger.Info("login attempt failed", "email", req.Email, "error", err, "request_id", c.GetString("requestID"))
		h.handleLoginError(c, err)
		return
	}

	h.logger.Info("login successful", "user_id", authenticatedUser.ID, "email", authenticatedUser.Email, "request_id", c.GetString("requestID"))

	httpx.Success(c, http.StatusOK, gin.H{
		"token": authenticatedUser.Token,
		"user": gin.H{
			"id":       authenticatedUser.ID,
			"username": authenticatedUser.Username,
			"email":    authenticatedUser.Email,
		},
	})
}

// Me returns the profile of the currently authenticated user.
func (h *Handler) Me(c *gin.Context) {
	userID := c.GetInt64("authUserID")
	username, _ := c.Get("authUsername")
	email, _ := c.Get("authEmail")

	httpx.Success(c, http.StatusOK, gin.H{
		"user": gin.H{
			"id":       userID,
			"username": username,
			"email":    email,
		},
	})
}

func (h *Handler) handleRegisterError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalidRegisterInput),
		errors.Is(err, ErrInvalidEmailFormat),
		errors.Is(err, ErrWeakPassword):
		httpx.Error(c, http.StatusBadRequest, "invalid_register_input", err.Error(), nil)

	case errors.Is(err, users.ErrUsernameAlreadyExists),
		errors.Is(err, users.ErrEmailAlreadyExists),
		errors.Is(err, users.ErrUserAlreadyExists):
		httpx.Error(c, http.StatusConflict, "user_already_exists", err.Error(), nil)

	default:
		h.logger.Error("failed to register user", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"))
		httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to create user", nil)
	}
}

func (h *Handler) handleLoginError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalidLoginInput),
		errors.Is(err, ErrInvalidEmailFormat):
		httpx.Error(c, http.StatusBadRequest, "invalid_login_input", err.Error(), nil)

	case errors.Is(err, ErrInvalidCredentials):
		httpx.Error(c, http.StatusUnauthorized, "invalid_credentials", err.Error(), nil)

	default:
		h.logger.Error("failed to login user", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"))
		httpx.Error(c, http.StatusInternalServerError, "internal_server_error", "failed to login", nil)
	}
}
