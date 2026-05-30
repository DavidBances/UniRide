// Package config handles application configuration from environment variables.
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config holds the application configuration loaded from environment variables.
type Config struct {
	Port            string
	GinMode         string
	CORSAllowOrigin string
	JWTSecret       string
	RunDBMigrations bool
	DBSchemaPath    string
	DBHost          string
	DBPort          string
	DBUser          string
	DBPassword      string
	DBName          string
	DBSSLMode       string
}

// Load reads configuration from environment variables and validates required values.
func Load() (*Config, error) {
	if err := loadDotEnv(".env"); err != nil {
		return nil, err
	}

	cfg := &Config{
		Port:            getEnv("PORT", "8080"),
		GinMode:         getEnv("GIN_MODE", "debug"),
		CORSAllowOrigin: getEnv("CORS_ALLOW_ORIGIN", "*"),
		JWTSecret:       getEnv("JWT_SECRET", ""),
		DBSchemaPath:    getEnv("DB_SCHEMA_PATH", "db/init.sql"),
		DBHost:          getEnv("DB_HOST", getEnv("POSTGRES_HOST", "")),
		DBPort:          getEnv("DB_PORT", getEnv("POSTGRES_PORT", "5432")),
		DBUser:          getEnv("DB_USER", getEnv("POSTGRES_USER", "")),
		DBPassword:      getEnv("DB_PASSWORD", getEnv("POSTGRES_PASSWORD", "")),
		DBName:          getEnv("DB_NAME", getEnv("POSTGRES_DB", "")),
		DBSSLMode:       getEnv("DB_SSLMODE", "disable"),
	}

	runDBMigrations, err := parseBoolEnv("RUN_DB_MIGRATIONS", false)
	if err != nil {
		return nil, err
	}
	cfg.RunDBMigrations = runDBMigrations

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Validate checks that all required configuration values are present and valid.
func (c *Config) Validate() error {
	var validationErrors []error

	requiredValues := map[string]string{
		"PORT":        c.Port,
		"JWT_SECRET":  c.JWTSecret,
		"DB_HOST":     c.DBHost,
		"DB_USER":     c.DBUser,
		"DB_PASSWORD": c.DBPassword,
		"DB_NAME":     c.DBName,
	}

	for key, value := range requiredValues {
		if strings.TrimSpace(value) == "" {
			validationErrors = append(validationErrors, fmt.Errorf("%s is required", key))
		}
	}

	if c.Port != "" && !isValidPort(c.Port) {
		validationErrors = append(validationErrors, errors.New("PORT must be a valid TCP port"))
	}

	if c.DBPort != "" && !isValidPort(c.DBPort) {
		validationErrors = append(validationErrors, errors.New("DB_PORT must be a valid TCP port"))
	}

	if len(validationErrors) > 0 {
		return fmt.Errorf("invalid configuration: %w", errors.Join(validationErrors...))
	}

	return nil
}

// DatabaseDSN builds a PostgreSQL DSN for database/sql.
func (c *Config) DatabaseDSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.DBHost,
		c.DBPort,
		c.DBUser,
		c.DBPassword,
		c.DBName,
		c.DBSSLMode,
	)
}

func getEnv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}

	return fallback
}

func isValidPort(value string) bool {
	port, err := strconv.Atoi(value)
	if err != nil {
		return false
	}

	return port >= 1 && port <= 65535
}

func parseBoolEnv(key string, fallback bool) (bool, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback, nil
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, fmt.Errorf("%s must be a boolean value", key)
	}

	return parsed, nil
}

func loadDotEnv(path string) error {
	content, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}

		return fmt.Errorf("failed to read .env file: %w", err)
	}

	lines := strings.Split(string(content), "\n")

	for index, line := range lines {
		line = strings.TrimSpace(line)

		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		line = strings.TrimPrefix(line, "export ")
		parts := strings.SplitN(line, "=", 2)

		if len(parts) != 2 {
			return fmt.Errorf("invalid .env format at line %d", index+1)
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])
		value = strings.Trim(value, `"'`)

		if key == "" {
			return fmt.Errorf("empty environment variable name at line %d", index+1)
		}

		if os.Getenv(key) == "" {
			if err := os.Setenv(key, value); err != nil {
				return fmt.Errorf("failed to set environment variable %s: %w", key, err)
			}
		}
	}

	return nil
}
