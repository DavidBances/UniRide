CREATE TABLE reviews (
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

CREATE INDEX idx_reviews_ride_id ON reviews(ride_id);
CREATE INDEX idx_reviews_reviewed_user_id ON reviews(reviewed_user_id);
