package database

import (
	"context"
	"database/sql"
	"fmt"

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
