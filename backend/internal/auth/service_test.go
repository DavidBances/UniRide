package auth

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/users"
	"golang.org/x/crypto/bcrypt"
)

// mockUserRepository es una base de datos en memoria para nuestros tests
type mockUserRepository struct {
	usersByEmail map[string]*users.User
	createErr    error
	findByErr    error
}

func (m *mockUserRepository) Create(ctx context.Context, params users.CreateUserParams) (users.User, error) {
	if m.createErr != nil {
		return users.User{}, m.createErr
	}
	u := users.User{
		ID:           1,
		Username:     params.Username,
		Email:        params.Email,
		PasswordHash: params.PasswordHash,
		CreatedAt:    time.Now(),
	}
	m.usersByEmail[params.Email] = &u
	return u, nil
}

func (m *mockUserRepository) FindByEmail(ctx context.Context, email string) (users.User, error) {
	if m.findByErr != nil {
		return users.User{}, m.findByErr
	}
	if u, ok := m.usersByEmail[email]; ok {
		return *u, nil
	}
	return users.User{}, users.ErrUserNotFound
}

func TestRegister_Success(t *testing.T) {
	mockRepo := &mockUserRepository{
		usersByEmail: make(map[string]*users.User),
	}
	svc := NewService(mockRepo, "test-secret")

	input := RegisterInput{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}

	user, err := svc.Register(context.Background(), input)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if user.Username != "testuser" {
		t.Errorf("expected testuser, got %s", user.Username)
	}
}

func TestRegister_DuplicateEmail(t *testing.T) {
	errDuplicate := errors.New("duplicate email")
	mockRepo := &mockUserRepository{
		usersByEmail: make(map[string]*users.User),
		createErr:    errDuplicate, // Simulamos que la base de datos se queja
	}
	svc := NewService(mockRepo, "test-secret")

	input := RegisterInput{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}

	_, err := svc.Register(context.Background(), input)
	if err != errDuplicate {
		t.Fatalf("expected duplicate email error, got %v", err)
	}
}

func TestLogin_Success(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	mockRepo := &mockUserRepository{
		usersByEmail: map[string]*users.User{
			"test@example.com": {
				ID:           1,
				Username:     "testuser",
				Email:        "test@example.com",
				PasswordHash: string(hash), // Guardamos el hash real
			},
		},
	}
	svc := NewService(mockRepo, "test-secret")

	input := LoginInput{
		Email:    "test@example.com",
		Password: "password123", // Contraseña en texto plano
	}

	authRes, err := svc.Login(context.Background(), input)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if authRes.Token == "" {
		t.Error("expected valid JWT token, got empty string")
	}
}

func TestLogin_InvalidPassword(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	mockRepo := &mockUserRepository{
		usersByEmail: map[string]*users.User{
			"test@example.com": {
				ID:           1,
				Email:        "test@example.com",
				PasswordHash: string(hash),
			},
		},
	}
	svc := NewService(mockRepo, "test-secret")

	input := LoginInput{
		Email:    "test@example.com",
		Password: "wrongpassword",
	}

	_, err := svc.Login(context.Background(), input)
	if !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("expected ErrInvalidCredentials, got %v", err)
	}
}

func TestGenerateToken(t *testing.T) {
	svc := NewService(nil, "test-secret")
	token, err := svc.generateToken(1, "testuser", "test@example.com")
	if err != nil || len(token) == 0 {
		t.Fatalf("expected valid token, got error: %v", err)
	}
}
