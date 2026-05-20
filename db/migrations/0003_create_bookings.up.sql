CREATE TABLE bookings (
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
    ride_id INTEGER NOT NULL REFERENCES ride(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seats_reserved INTEGER NOT NULL CHECK (seats_reserved > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bookings_ride_user_unique UNIQUE (ride_id, user_id)
);

CREATE INDEX idx_bookings_ride_id ON bookings(ride_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
