// Package config handles application configuration from environment variables.
package config

import (
	"fmt"
	"os"
)

// Config holds the application configuration loaded from environment variables.
type Config struct {
	Port            string
	GinMode         string
	CORSAllowOrigin string
	JWTSecret       string
	DBHost          string
	DBPort          string
	DBUser          string
	DBPassword      string
	DBName          string
	DBSSLMode       string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		Port:            getEnv("PORT", "8080"),
		GinMode:         getEnv("GIN_MODE", "debug"),
		CORSAllowOrigin: getEnv("CORS_ALLOW_ORIGIN", "*"),
		JWTSecret:       getEnv("JWT_SECRET", "dev-jwt-secret-change-me"),
		DBHost:          getEnv("DB_HOST", "localhost"),
		DBPort:          getEnv("DB_PORT", getEnv("POSTGRES_PORT", "5432")),
		DBUser:          getEnv("DB_USER", getEnv("POSTGRES_USER", "UniRideAdmin")),
		DBPassword:      getEnv("DB_PASSWORD", getEnv("POSTGRES_PASSWORD", "UniRide192837465")),
		DBName:          getEnv("DB_NAME", getEnv("POSTGRES_DB", "UniRide")),
		DBSSLMode:       getEnv("DB_SSLMODE", "disable"),
	}
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
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
