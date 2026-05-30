package config

import (
	"os"
	"strings"
	"testing"
)

func TestLoadUsesRequiredEnvironmentValues(t *testing.T) {
	t.Setenv("PORT", "9090")
	t.Setenv("GIN_MODE", "release")
	t.Setenv("CORS_ALLOW_ORIGIN", "https://app.example.com")
	t.Setenv("JWT_SECRET", "production-secret")
	t.Setenv("DB_HOST", "db.example.com")
	t.Setenv("DB_PORT", "5432")
	t.Setenv("DB_USER", "uniride")
	t.Setenv("DB_PASSWORD", "top-secret")
	t.Setenv("DB_NAME", "uniride_prod")
	t.Setenv("DB_SSLMODE", "require")
	t.Setenv("RUN_DB_MIGRATIONS", "true")
	t.Setenv("DB_SCHEMA_PATH", "db/init.sql")

	tempDir := t.TempDir()
	changeWorkingDirectory(t, tempDir)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}

	if cfg.Port != "9090" {
		t.Fatalf("expected PORT to be loaded, got %q", cfg.Port)
	}

	if cfg.JWTSecret != "production-secret" {
		t.Fatalf("expected JWT secret to be loaded, got %q", cfg.JWTSecret)
	}

	if cfg.DatabaseDSN() != "host=db.example.com port=5432 user=uniride password=top-secret dbname=uniride_prod sslmode=require" {
		t.Fatalf("unexpected DSN: %s", cfg.DatabaseDSN())
	}

	if !cfg.RunDBMigrations {
		t.Fatal("expected RUN_DB_MIGRATIONS to be true")
	}
}

func TestValidateRequiresDeploymentSecrets(t *testing.T) {
	cfg := &Config{
		Port:         "8080",
		JWTSecret:    "",
		DBHost:       "",
		DBUser:       "",
		DBPassword:   "",
		DBName:       "",
		DBPort:       "5432",
		DBSSLMode:    "require",
		DBSchemaPath: "db/init.sql",
	}

	err := cfg.Validate()
	if err == nil {
		t.Fatal("expected validation error, got nil")
	}

	message := err.Error()
	for _, expected := range []string{"JWT_SECRET is required", "DB_HOST is required", "DB_USER is required", "DB_PASSWORD is required", "DB_NAME is required"} {
		if !strings.Contains(message, expected) {
			t.Fatalf("expected error message to contain %q, got %q", expected, message)
		}
	}
}

func changeWorkingDirectory(t *testing.T, dir string) {
	t.Helper()

	previousDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("Getwd() failed: %v", err)
	}

	if err := os.Chdir(dir); err != nil {
		t.Fatalf("Chdir() failed: %v", err)
	}

	t.Cleanup(func() {
		if err := os.Chdir(previousDir); err != nil {
			t.Fatalf("failed to restore working directory: %v", err)
		}
	})
}
