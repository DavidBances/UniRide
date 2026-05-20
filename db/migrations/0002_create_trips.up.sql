CREATE TABLE ride (
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

CREATE INDEX idx_ride_status_departure_date ON ride(status, departure_date);
CREATE INDEX idx_ride_origin_lower ON ride(LOWER(origin));
CREATE INDEX idx_ride_destination_lower ON ride(LOWER(destination));
