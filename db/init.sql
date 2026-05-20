CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (id, username, email, password_hash, created_at) VALUES
    (1, 'admin', 'admin@uni.es', '$2a$10$w6D9tP7h7m8Q9J8z0QK8eOq2vW4QYlq6aYQk1q4QhM3oQ8xJtNQxkC', CURRENT_TIMESTAMP),
    (2, 'marta', 'marta@uni.es', '$2a$10$w6D9tP7h7m8Q9J8z0QK8eOq2vW4QYlq6aYQk1q4QhM3oQ8xJtNQxkC', CURRENT_TIMESTAMP),
    (3, 'carlos', 'carlos@uni.es', '$2a$10$w6D9tP7h7m8Q9J8z0QK8eOq2vW4QYlq6aYQk1q4QhM3oQ8xJtNQxkC', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS ride (
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
    ride_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    seats_reserved INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bookings_ride
        FOREIGN KEY (ride_id) REFERENCES trips(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookings_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_bookings_ride_user
        UNIQUE (ride_id, user_id),
    CONSTRAINT chk_bookings_seats_reserved
        CHECK (seats_reserved > 0),
    CONSTRAINT chk_bookings_status
        CHECK (status IN ('pending', 'confirmed', 'cancelled'))
CREATE INDEX IF NOT EXISTS idx_ride_status_departure_date ON ride(status, departure_date);
CREATE INDEX IF NOT EXISTS idx_ride_origin_lower ON ride(LOWER(origin));
CREATE INDEX IF NOT EXISTS idx_ride_destination_lower ON ride(LOWER(destination));

INSERT INTO ride (id, driver_id, origin, destination, departure_date, available_seats, price_per_seat, status, created_at) VALUES
    (1, 2, 'Madrid', 'Barcelona', '2026-05-20 08:30:00', 3, 12.50, 'open', CURRENT_TIMESTAMP),
    (2, 3, 'León', 'Oviedo', '2026-05-21 16:00:00', 2, 8.00, 'open', CURRENT_TIMESTAMP),
    (3, 1, 'Madrid', 'Segovia', '2026-05-22 09:15:00', 4, 6.00, 'open', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    ride_id INTEGER NOT NULL REFERENCES ride(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seats_reserved INTEGER NOT NULL CHECK (seats_reserved > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bookings_ride_user_unique UNIQUE (ride_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_ride_id ON bookings(ride_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
