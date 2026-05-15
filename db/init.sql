CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_date TIMESTAMP NOT NULL,
    available_seats INTEGER NOT NULL CHECK (available_seats > 0),
    price_per_seat NUMERIC(10, 2) NOT NULL CHECK (price_per_seat >= 0),
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trips_status_departure_date ON trips(status, departure_date);
CREATE INDEX IF NOT EXISTS idx_trips_origin_lower ON trips(LOWER(origin));
CREATE INDEX IF NOT EXISTS idx_trips_destination_lower ON trips(LOWER(destination));

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    ride_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seats_reserved INTEGER NOT NULL CHECK (seats_reserved > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bookings_ride_user_unique UNIQUE (ride_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_ride_id ON bookings(ride_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
