CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Base users (IDs 1-6). Password for all: "password123"
-- The backend overrides admin's hash at startup to "admin123".
INSERT INTO users (id, username, email, password_hash, created_at) VALUES
    (1, 'admin',  'admin@uni.es',  '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO', CURRENT_TIMESTAMP),
    (2, 'marta',  'marta@uni.es',  '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO', CURRENT_TIMESTAMP),
    (3, 'carlos', 'carlos@uni.es', '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO', CURRENT_TIMESTAMP),
    (4, 'lucia',  'lucia@uni.es',  '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO', CURRENT_TIMESTAMP),
    (5, 'pablo',  'pablo@uni.es',  '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO', CURRENT_TIMESTAMP),
    (6, 'sara',   'sara@uni.es',   '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('users', 'id'),
    COALESCE((SELECT MAX(id) FROM users), 1),
    true
);


CREATE TABLE IF NOT EXISTS ride (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_date TIMESTAMP NOT NULL,
    available_seats INTEGER NOT NULL CHECK (available_seats > 0),
    price_per_seat NUMERIC(10, 2) NOT NULL CHECK (price_per_seat >= 0),
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ride_status_departure_date ON ride(status, departure_date);
CREATE INDEX IF NOT EXISTS idx_ride_origin_lower ON ride(LOWER(origin));
CREATE INDEX IF NOT EXISTS idx_ride_destination_lower ON ride(LOWER(destination));

-- Base rides (IDs 1-4). IDs 5+ are managed by seeds.sql.
-- Times use CURRENT_DATE + specific interval so they are always future-dated
-- on a fresh database creation and have a realistic hour of day.
INSERT INTO ride (id, driver_id, origin, destination, departure_date, available_seats, price_per_seat, status, created_at) VALUES
    -- Morning commute to campus (08:00)
    (1, 2, 'Centro de León',          'Campus de Vegazana', CURRENT_DATE + INTERVAL '7 days 8 hours',          3, 1.50, 'open',      CURRENT_TIMESTAMP),
    -- Morning commute from a nearby neighbourhood (08:30)
    (2, 3, 'San Andrés del Rabanedo', 'Campus de Vegazana', CURRENT_DATE + INTERVAL '3 days 8 hours 30 minutes', 2, 2.00, 'open',      CURRENT_TIMESTAMP),
    -- Afternoon return from campus to city centre (14:00)
    (3, 1, 'Campus de Vegazana',      'Centro de León',     CURRENT_DATE + INTERVAL '10 days 14 hours',        4, 1.50, 'open',      CURRENT_TIMESTAMP),
    -- Weekend trip (Friday 16:00, completed 10 days ago)
    (4, 2, 'León',                    'Valladolid',         CURRENT_DATE + INTERVAL '-10 days 16 hours',       3, 10.00, 'completed', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('ride', 'id'),
    COALESCE((SELECT MAX(id) FROM ride), 1),
    true
);


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

-- Base bookings: show an active ride with a booking and a completed ride with a passenger.
INSERT INTO bookings (ride_id, user_id, seats_reserved, status) VALUES
    (1, 4, 1, 'confirmed'),   -- lucia  on Centro de León → Campus de Vegazana
    (2, 5, 1, 'confirmed'),   -- pablo  on San Andrés del Rabanedo → Campus de Vegazana
    (4, 3, 1, 'confirmed')    -- carlos on completed León → Valladolid
ON CONFLICT (ride_id, user_id) DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('bookings', 'id'),
    COALESCE((SELECT MAX(id) FROM bookings), 1),
    true
);


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

-- carlos reviews marta for the completed León → Valladolid weekend trip
INSERT INTO reviews (ride_id, reviewer_id, reviewed_user_id, rating, comment) VALUES
    (4, 3, 2, 5, 'Muy puntual y simpática. Coche cómodo para el viaje a Valladolid.')
ON CONFLICT (ride_id, reviewer_id, reviewed_user_id) DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('reviews', 'id'),
    COALESCE((SELECT MAX(id) FROM reviews), 1),
    true
);
