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

CREATE INDEX IF NOT EXISTS idx_ride_status_departure_date ON ride(status, departure_date);
CREATE INDEX IF NOT EXISTS idx_ride_origin_lower ON ride(LOWER(origin));
CREATE INDEX IF NOT EXISTS idx_ride_destination_lower ON ride(LOWER(destination));

INSERT INTO ride (id, driver_id, origin, destination, departure_date, available_seats, price_per_seat, status, created_at) VALUES
    (1, 2, 'Madrid', 'Barcelona', '2026-05-20 08:30:00', 3, 12.50, 'open', CURRENT_TIMESTAMP),
    (2, 3, 'Leon', 'Oviedo', '2026-05-21 16:00:00', 2, 8.00, 'open', CURRENT_TIMESTAMP),
    (3, 1, 'Madrid', 'Segovia', '2026-05-22 09:15:00', 4, 6.00, 'open', CURRENT_TIMESTAMP),
    (4, 2, 'Leon', 'Madrid', '2026-04-15 12:00:00', 1, 10.00, 'completed', CURRENT_TIMESTAMP)
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

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    ride_id INTEGER NOT NULL REFERENCES ride(id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewed_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reviews_ride_reviewer_reviewed_unique UNIQUE (ride_id, reviewer_id, reviewed_user_id),
    CONSTRAINT reviews_no_self_review CHECK (reviewer_id <> reviewed_user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_ride_id ON reviews(ride_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user_id ON reviews(reviewed_user_id);

INSERT INTO bookings (ride_id, user_id, seats_reserved, status) VALUES
    (4, 3, 1, 'confirmed')
ON CONFLICT (ride_id, user_id) DO NOTHING;

INSERT INTO reviews (ride_id, reviewer_id, reviewed_user_id, rating, comment) VALUES
    (4, 3, 2, 5, 'Great completed ride for the demo.')
ON CONFLICT (ride_id, reviewer_id, reviewed_user_id) DO NOTHING;
