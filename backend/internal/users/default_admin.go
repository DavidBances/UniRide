// Package users contains user domain models and persistence logic.
package users

import (
	"context"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

const (
	defaultAdminUsername = "admin"
	defaultAdminEmail    = "admin@uni.es"
	defaultAdminPassword = "admin123"
)

// EnsureDefaultAdmin creates or updates the default admin user for local development.
func EnsureDefaultAdmin(ctx context.Context, repository *Repository) error {
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(defaultAdminPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash default admin password: %w", err)
	}

	if err := repository.UpsertDefaultUser(
		ctx,
		defaultAdminUsername,
		defaultAdminEmail,
		string(passwordHash),
	); err != nil {
		return err
	}

	return nil
}
