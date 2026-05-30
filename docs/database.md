# Database

This document summarizes the database design and points to the SQL migrations included in the repository.

## Overview
- Database: PostgreSQL
- Migrations path: `db/migrations`
- Schema initialization script: `db/init.sql`

## Main entities

- `users` — application users (id, username, email, hashed_password, role, created_at)
- `trips` — published rides (id, driver_id, origin, destination, departure_date, available_seats, price_per_seat, status, created_at)
- `bookings` — reservations for trips (id, ride_id, user_id, seats_reserved, status, created_at)
- `reviews` — ratings and comments between users (id, ride_id, author_id, receiver_id, rating, comment, created_at)

See the migration files under `db/migrations` for exact DDL used in the project. Each migration file is numbered and contains the `up` and `down` SQL.

## Indexes and constraints
- Foreign keys are used to link `trips.driver_id` to `users.id`, `bookings.ride_id` to `trips.id`, and `bookings.user_id` to `users.id`.
- Use indexes on frequently queried fields: `trips (origin)`, `trips (destination)`, `trips (departure_date)` and `bookings (ride_id)`.

## Local development tips
- Use the included `docker-compose.yml` to start a local Postgres instance.
- Run migrations via the `RUN_DB_MIGRATIONS=true` flag on backend startup or using the project's migration tool if provided.
