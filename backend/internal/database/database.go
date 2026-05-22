package database

import (
	"context"
	"database/sql"
	"fmt"
	"os"

	// PostgreSQL driver
	_ "github.com/jackc/pgx/v5/stdlib"
)

// Connect opens a connection to the PostgreSQL database and tests it.
func Connect(ctx context.Context, dsn string) (*sql.DB, error) {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, fmt.Errorf("error opening database: %w", err)
	}

	if err := db.PingContext(ctx); err != nil {
		if closeErr := db.Close(); closeErr != nil {
			return nil, fmt.Errorf("error pinging database: %w; error closing database: %w", err, closeErr)
		}

		return nil, fmt.Errorf("error pinging database: %w", err)
	}

	return db, nil
}

// ApplySchemaFile executes an idempotent SQL schema file against the database.
func ApplySchemaFile(ctx context.Context, db *sql.DB, path string) error {
	content, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("failed to read database schema file %q: %w", path, err)
	}

	if _, err := db.ExecContext(ctx, string(content)); err != nil {
		return fmt.Errorf("failed to apply database schema file %q: %w", path, err)
	}

	return nil
}
