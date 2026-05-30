-- ============================================================
-- UniRide Demo Seed Data
-- ============================================================
-- Populates the database with demo users, rides, bookings, and
-- reviews for presentations and manual testing. Safe to re-run
-- on any database state (all statements are idempotent).
--
-- Demo credentials (all accounts):  password = password123
--
-- Run with Make:
--   make seed
--
-- Run manually:
--   docker compose exec -T postgres psql -U UniRideAdmin -d UniRide \
--       -f /docker-entrypoint-initdb.d/seeds.sql
-- ============================================================


-- ------------------------------------------------------------
-- Demo users  (7 accounts, password: password123)
-- ------------------------------------------------------------
INSERT INTO users (id, username, email, password_hash) VALUES
    (1, 'admin',  'admin@uni.es',  '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO'),
    (2, 'marta',  'marta@uni.es',  '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO'),
    (3, 'carlos', 'carlos@uni.es', '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO'),
    (4, 'lucia',  'lucia@uni.es',  '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO'),
    (5, 'pablo',  'pablo@uni.es',  '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO'),
    (6, 'sara',   'sara@uni.es',   '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO'),
    (7, 'miguel', 'miguel@uni.es', '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO')
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1), true);


-- ------------------------------------------------------------
-- Fix existing rides whose departure_date has already passed
-- ------------------------------------------------------------
UPDATE ride SET departure_date = CURRENT_TIMESTAMP + INTERVAL '3 days'
    WHERE id = 1 AND departure_date < CURRENT_TIMESTAMP;

UPDATE ride SET departure_date = CURRENT_TIMESTAMP + INTERVAL '5 days'
    WHERE id = 2 AND departure_date < CURRENT_TIMESTAMP;

UPDATE ride SET departure_date = CURRENT_TIMESTAMP + INTERVAL '7 days'
    WHERE id = 3 AND departure_date < CURRENT_TIMESTAMP;


-- ------------------------------------------------------------
-- Demo rides
-- Upcoming (ids 5-11) and completed (ids 12-13) for testing
-- the full booking + review flow.
-- ------------------------------------------------------------
INSERT INTO ride (id, driver_id, origin, destination, departure_date, available_seats, price_per_seat, status) VALUES
    ( 5, 4, 'León',      'Valladolid', CURRENT_TIMESTAMP + INTERVAL  '2 days',  3,  7.50, 'open'),
    ( 6, 5, 'Madrid',    'Toledo',     CURRENT_TIMESTAMP + INTERVAL  '4 days',  2,  9.00, 'open'),
    ( 7, 6, 'Barcelona', 'Valencia',   CURRENT_TIMESTAMP + INTERVAL  '6 days',  4, 15.00, 'open'),
    ( 8, 7, 'Sevilla',   'Málaga',     CURRENT_TIMESTAMP + INTERVAL  '8 days',  3, 11.00, 'open'),
    ( 9, 2, 'Madrid',    'Salamanca',  CURRENT_TIMESTAMP + INTERVAL '10 days',  3,  8.50, 'open'),
    (10, 3, 'León',      'Burgos',     CURRENT_TIMESTAMP + INTERVAL '12 days',  2,  6.50, 'open'),
    (11, 4, 'Valencia',  'Alicante',   CURRENT_TIMESTAMP + INTERVAL '14 days',  4, 10.00, 'open'),
    (12, 5, 'Madrid',    'Ávila',      CURRENT_TIMESTAMP - INTERVAL '10 days',  2,  7.00, 'completed'),
    (13, 6, 'Zaragoza',  'Pamplona',   CURRENT_TIMESTAMP -  INTERVAL  '5 days', 3,  9.50, 'completed')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('ride', 'id'), COALESCE((SELECT MAX(id) FROM ride), 1), true);


-- ------------------------------------------------------------
-- Sample bookings
-- ------------------------------------------------------------
INSERT INTO bookings (ride_id, user_id, seats_reserved, status) VALUES
    -- Upcoming rides
    ( 1, 4, 1, 'confirmed'),   -- lucia   on Madrid → Barcelona
    ( 1, 5, 1, 'confirmed'),   -- pablo   on Madrid → Barcelona
    ( 2, 6, 1, 'confirmed'),   -- sara    on León → Oviedo
    ( 5, 3, 2, 'confirmed'),   -- carlos  on León → Valladolid
    ( 6, 7, 1, 'pending'),     -- miguel  on Madrid → Toledo (not yet confirmed)
    ( 7, 3, 1, 'confirmed'),   -- carlos  on Barcelona → Valencia
    -- Completed rides (needed to unlock review flow)
    (12, 3, 1, 'confirmed'),   -- carlos  on Madrid → Ávila
    (12, 4, 1, 'confirmed'),   -- lucia   on Madrid → Ávila
    (13, 7, 2, 'confirmed')    -- miguel  on Zaragoza → Pamplona
ON CONFLICT (ride_id, user_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('bookings', 'id'), COALESCE((SELECT MAX(id) FROM bookings), 1), true);


-- ------------------------------------------------------------
-- Reviews for completed rides
-- ------------------------------------------------------------
INSERT INTO reviews (ride_id, reviewer_id, reviewed_user_id, rating, comment) VALUES
    -- Ride 4: León → Madrid  (driver: marta)
    (4, 3, 2, 5, 'Great completed ride for the demo.'),
    -- Ride 12: Madrid → Ávila  (driver: pablo)
    (12, 3, 5, 5, 'Excellent driver, very punctual and friendly!'),
    (12, 4, 5, 4, 'Good ride, comfortable car.'),
    -- Ride 13: Zaragoza → Pamplona  (driver: sara)
    (13, 7, 6, 4, 'Nice trip, great conversation en route.')
ON CONFLICT (ride_id, reviewer_id, reviewed_user_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('reviews', 'id'), COALESCE((SELECT MAX(id) FROM reviews), 1), true);
