// Package auth contains authentication handlers and business logic.
package auth

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/users"
	"golang.org/x/crypto/bcrypt"
)

var (
	// ErrInvalidCredentials is returned when the email or password is incorrect.
	ErrInvalidCredentials = errors.New("invalid credentials")

	// ErrInvalidEmailFormat is returned when the email format is invalid.
	ErrInvalidEmailFormat = errors.New("invalid email format")

	// ErrInvalidRegisterInput is returned when the register input is incomplete.
	ErrInvalidRegisterInput = errors.New("username, email and password are required")

	// ErrInvalidLoginInput is returned when the login input is incomplete.
	ErrInvalidLoginInput = errors.New("email and password are required")

	// ErrWeakPassword is returned when the password does not meet the minimum length.
	ErrWeakPassword = errors.New("password must have at least 8 characters")
)

// RegisterInput contains the data required to register a user.
type RegisterInput struct {
	Username string
	Email    string
	Password string
}

// LoginInput contains the data required to authenticate a user.
type LoginInput struct {
	Email    string
	Password string
}

// AuthenticatedUser is returned after a successful login.
type AuthenticatedUser struct {
	ID       int64
	Username string
	Email    string
}

// RegisteredUser is returned after a successful registration.
type RegisteredUser struct {
	ID        int64
	Username  string
	Email     string
	CreatedAt time.Time
}

// Service handles authentication business logic.
type Service struct {
	userRepository *users.Repository
}

// NewService creates an authentication service.
func NewService(userRepository *users.Repository) *Service {
	return &Service{
		userRepository: userRepository,
	}
}

// Register creates a new user account.
func (s *Service) Register(ctx context.Context, input RegisterInput) (RegisteredUser, error) {
	username := strings.TrimSpace(input.Username)
	email := normalizeEmail(input.Email)
	password := input.Password

	if username == "" || email == "" || password == "" {
		return RegisteredUser{}, ErrInvalidRegisterInput
	}

	if !isValidEmail(email) {
		return RegisteredUser{}, ErrInvalidEmailFormat
	}

	if len(password) < 8 {
		return RegisteredUser{}, ErrWeakPassword
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return RegisteredUser{}, fmt.Errorf("failed to hash password: %w", err)
	}

	user, err := s.userRepository.Create(ctx, users.CreateUserParams{
		Username:     username,
		Email:        email,
		PasswordHash: string(passwordHash),
	})
	if err != nil {
		return RegisteredUser{}, err
	}

	return RegisteredUser{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		CreatedAt: user.CreatedAt,
	}, nil
}

// Login validates user credentials.
func (s *Service) Login(ctx context.Context, input LoginInput) (AuthenticatedUser, error) {
	email := normalizeEmail(input.Email)
	password := input.Password

	if email == "" || password == "" {
		return AuthenticatedUser{}, ErrInvalidLoginInput
	}

	if !isValidEmail(email) {
		return AuthenticatedUser{}, ErrInvalidEmailFormat
	}

	user, err := s.userRepository.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, users.ErrUserNotFound) {
			return AuthenticatedUser{}, ErrInvalidCredentials
		}

		return AuthenticatedUser{}, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return AuthenticatedUser{}, ErrInvalidCredentials
	}

	return AuthenticatedUser{
		ID:       user.ID,
		Username: user.Username,
		Email:    user.Email,
	}, nil
}

func normalizeEmail(email string) string {
	return strings.TrimSpace(strings.ToLower(email))
}

func isValidEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}
