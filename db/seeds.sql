-- ============================================================
-- UniRide Demo Seed Data  —  University of León / Campus de Vegazana
-- ============================================================
-- Populates the database with realistic university ride-sharing
-- scenarios for presentations and manual testing.
--
-- Data represents the typical use cases of UniRide:
--   - Daily commutes to/from Campus de Vegazana
--   - Routes from nearby towns and neighbourhoods
--   - Weekend trips back to students' home cities
--   - Varied occupancy: empty, partial, last seat, fully booked
--   - Booking states: confirmed, pending, cancelled
--   - Completed rides with reviews
--
-- This file runs automatically alongside init.sql on the first
-- `docker compose up` (both live in docker-entrypoint-initdb.d/).
-- All statements are idempotent — safe to re-run at any time.
--
-- Demo credentials (all accounts):  password = password123
-- Exception: admin@uni.es           password = admin123
--
-- Run with Make:
--   make seed
--
-- Run manually (macOS/Linux):
--   docker compose exec -T postgres psql -U UniRideAdmin -d UniRide \
--       -f /docker-entrypoint-initdb.d/seeds.sql
--
-- Run manually (Windows PowerShell):
--   docker compose exec -T postgres psql -U UniRideAdmin -d UniRide `
--       -f /docker-entrypoint-initdb.d/seeds.sql
-- ============================================================


-- ------------------------------------------------------------
-- Demo users  (10 accounts, password: password123)
-- ------------------------------------------------------------
INSERT INTO users (id, username, email, password_hash) VALUES
    ( 1, 'admin',  'admin@uni.es',  '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO'),
    ( 2, 'marta',  'marta@uni.es',  '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO'),
    ( 3, 'carlos', 'carlos@uni.es', '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO'),
    ( 4, 'lucia',  'lucia@uni.es',  '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO'),
    ( 5, 'pablo',  'pablo@uni.es',  '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO'),
    ( 6, 'sara',   'sara@uni.es',   '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO'),
    ( 7, 'miguel', 'miguel@uni.es', '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO'),
    ( 8, 'elena',  'elena@uni.es',  '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO'),
    ( 9, 'jorge',  'jorge@uni.es',  '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO'),
    (10, 'ana',    'ana@uni.es',    '$2a$10$imEMlzhTqILoWhbWPJVos.iaN5OZOwLxlcThfmWyHeBVgDPcPN0qO')
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1), true);


-- ------------------------------------------------------------
-- Fix init.sql rides if their departure_date is now in the past
-- (safe no-op when dates are already in the future)
-- ------------------------------------------------------------
UPDATE ride SET departure_date = CURRENT_DATE + INTERVAL '7 days 8 hours'
    WHERE id = 1 AND departure_date < CURRENT_TIMESTAMP;

UPDATE ride SET departure_date = CURRENT_DATE + INTERVAL '3 days 8 hours 30 minutes'
    WHERE id = 2 AND departure_date < CURRENT_TIMESTAMP;

UPDATE ride SET departure_date = CURRENT_DATE + INTERVAL '10 days 14 hours'
    WHERE id = 3 AND departure_date < CURRENT_TIMESTAMP;


-- ------------------------------------------------------------
-- Demo rides (IDs 5-21)
--
-- IDs 5-11  : Morning commutes to Campus de Vegazana
-- IDs 12-14 : Afternoon / evening returns from Campus de Vegazana
-- IDs 15-18 : Routes from nearby towns to Campus de Vegazana
-- IDs 19-21 : Weekend trips (León ↔ Madrid / Valladolid / Oviedo)
-- IDs 22-23 : Completed rides for the review flow
-- ------------------------------------------------------------
INSERT INTO ride (id, driver_id, origin, destination, departure_date, available_seats, price_per_seat, status) VALUES

    -- ── Morning commutes to campus (07:45-09:00) ──────────────────────
    -- Ride  5: Partial — 2 of 3 seats taken
    ( 5, 4, 'Trobajo del Camino',              'Campus de Vegazana', CURRENT_DATE + INTERVAL  '2 days 8 hours',           3, 2.00, 'open'),
    -- Ride  6: 1 seat taken, 1 free
    ( 6, 5, 'Eras de Renueva',                 'Campus de Vegazana', CURRENT_DATE + INTERVAL  '1 day  7 hours 45 minutes', 2, 1.00, 'open'),
    -- Ride  7: 1 confirmed + 1 pending
    ( 7, 6, 'Estación de tren de León',        'Campus de Vegazana', CURRENT_DATE + INTERVAL  '4 days 8 hours 30 minutes', 2, 1.50, 'open'),
    -- Ride  8: Fully open — no bookings yet
    ( 8, 7, 'Puente Castro',                   'Campus de Vegazana', CURRENT_DATE + INTERVAL  '6 days 8 hours 15 minutes', 3, 1.50, 'open'),
    -- Ride  9: 1 confirmed + 1 cancelled (demonstrates cancelled state)
    ( 9, 8, 'Armunia',                         'Campus de Vegazana', CURRENT_DATE + INTERVAL  '3 days 8 hours',           2, 1.50, 'open'),
    -- Ride 10: Fully open
    (10, 9, 'La Lastra',                       'Campus de Vegazana', CURRENT_DATE + INTERVAL  '5 days 8 hours 15 minutes', 3, 1.50, 'open'),
    -- Ride 11: Last seat — 1 of 1 confirmed (fully booked from seeds)
    (11,10, 'Residencia Univ. San Isidoro',    'Campus de Vegazana', CURRENT_DATE + INTERVAL  '2 days 7 hours 45 minutes', 1, 1.00, 'open'),

    -- ── Afternoon / evening returns from campus (13:45-20:00) ─────────
    -- Ride 12: Partial — 1 of 3 taken
    (12, 4, 'Campus de Vegazana',              'Centro de León',              CURRENT_DATE + INTERVAL  '2 days 14 hours',         3, 1.50, 'open'),
    -- Ride 13: Fully open
    (13, 5, 'Campus de Vegazana',              'Estación de tren de León',    CURRENT_DATE + INTERVAL  '4 days 13 hours 45 minutes', 2, 1.50, 'open'),
    -- Ride 14: 1 of 2 taken
    (14, 6, 'Campus de Vegazana',              'San Andrés del Rabanedo',     CURRENT_DATE + INTERVAL  '3 days 19 hours',         2, 2.00, 'open'),

    -- ── Nearby towns → Campus de Vegazana ────────────────────────────
    -- Ride 15: Partial — 1 of 3 taken
    (15, 7, 'Astorga',                         'Campus de Vegazana', CURRENT_DATE + INTERVAL  '4 days 8 hours 30 minutes', 3, 5.00, 'open'),
    -- Ride 16: 1 of 2 taken
    (16, 8, 'La Bañeza',                       'Campus de Vegazana', CURRENT_DATE + INTERVAL  '7 days 8 hours',           2, 6.00, 'open'),
    -- Ride 17: 2 of 3 taken (1 pending, 1 confirmed)
    (17, 9, 'Mansilla de las Mulas',           'Campus de Vegazana', CURRENT_DATE + INTERVAL  '8 days 8 hours 15 minutes', 3, 4.00, 'open'),
    -- Ride 18: Fully open
    (18,10, 'Valencia de Don Juan',            'Campus de Vegazana', CURRENT_DATE + INTERVAL  '5 days 8 hours 45 minutes', 2, 5.00, 'open'),

    -- ── Weekend trips (León ↔ other cities) ──────────────────────────
    -- Ride 19: Friday departure — FULLY BOOKED (3/3 confirmed)
    (19, 2, 'León',                            'Madrid',             CURRENT_DATE + INTERVAL  '3 days 16 hours',          3, 18.00, 'open'),
    -- Ride 20: Friday departure — FULLY BOOKED (2/2 confirmed)
    (20, 3, 'León',                            'Valladolid',         CURRENT_DATE + INTERVAL  '4 days 17 hours',          2, 10.00, 'open'),
    -- Ride 21: Sunday return — 1 of 3 taken
    (21, 4, 'Madrid',                          'León',               CURRENT_DATE + INTERVAL  '6 days 19 hours',          3, 18.00, 'open'),

    -- ── Completed rides (for the review flow) ────────────────────────
    -- Ride 22: Astorga → Campus, completed last week
    (22, 9, 'Astorga',                         'Campus de Vegazana', CURRENT_DATE + INTERVAL '-7 days 8 hours 30 minutes', 2, 5.00, 'completed'),
    -- Ride 23: León → Oviedo, completed 5 days ago
    (23, 6, 'León',                            'Oviedo',             CURRENT_DATE + INTERVAL '-5 days 16 hours',          3, 12.00, 'completed')

ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('ride', 'id'), COALESCE((SELECT MAX(id) FROM ride), 1), true);


-- ------------------------------------------------------------
-- Bookings
-- Legend: ✓ confirmed  ⏳ pending  ✗ cancelled
-- ------------------------------------------------------------
INSERT INTO bookings (ride_id, user_id, seats_reserved, status) VALUES

    -- Ride 1  (Centro de León → Campus, init.sql)
    (1, 4, 1, 'confirmed'),   -- ✓ lucia   [also in init.sql — idempotent]
    (1, 6, 1, 'confirmed'),   -- ✓ sara    [2 of 3 seats taken]

    -- Ride 2  (San Andrés → Campus, init.sql)
    (2, 5, 1, 'confirmed'),   -- ✓ pablo   [also in init.sql — idempotent]
    (2, 7, 1, 'pending'),     -- ⏳ miguel  [1 confirmed + 1 pending]

    -- Ride 4  (León → Valladolid, completed, init.sql)
    (4, 3, 1, 'confirmed'),   -- ✓ carlos  [also in init.sql — idempotent]
    (4, 4, 1, 'confirmed'),   -- ✓ lucia   [both can review marta]

    -- Ride 5  (Trobajo → Campus)
    (5, 3, 1, 'confirmed'),   -- ✓ carlos
    (5, 8, 1, 'confirmed'),   -- ✓ elena   [2 of 3 taken]

    -- Ride 6  (Eras de Renueva → Campus)
    (6, 2, 1, 'confirmed'),   -- ✓ marta   [1 of 2 taken]

    -- Ride 7  (Estación → Campus)
    (7, 4, 1, 'confirmed'),   -- ✓ lucia
    (7, 9, 1, 'pending'),     -- ⏳ jorge   [1 confirmed + 1 pending]

    -- Ride 8  (Puente Castro → Campus) — NO bookings: fully open

    -- Ride 9  (Armunia → Campus)
    (9, 2, 1, 'confirmed'),   -- ✓ marta
    (9, 5, 1, 'cancelled'),   -- ✗ pablo   [cancelled booking]

    -- Ride 10 (La Lastra → Campus) — NO bookings: fully open

    -- Ride 11 (Residencia San Isidoro → Campus)
    (11, 3, 1, 'confirmed'),  -- ✓ carlos  [1 of 1 — last seat taken]

    -- Ride 12 (Campus → Centro de León)
    (12, 7, 1, 'confirmed'),  -- ✓ miguel  [1 of 3]

    -- Ride 13 (Campus → Estación) — NO bookings: fully open

    -- Ride 14 (Campus → San Andrés)
    (14, 8, 1, 'confirmed'),  -- ✓ elena   [1 of 2]

    -- Ride 15 (Astorga → Campus)
    (15, 2, 1, 'confirmed'),  -- ✓ marta   [1 of 3]

    -- Ride 16 (La Bañeza → Campus)
    (16, 9, 1, 'confirmed'),  -- ✓ jorge   [1 of 2]

    -- Ride 17 (Mansilla → Campus)
    (17, 3, 1, 'confirmed'),  -- ✓ carlos
    (17,10, 1, 'pending'),    -- ⏳ ana     [1 confirmed + 1 pending]

    -- Ride 18 (Valencia de Don Juan → Campus) — NO bookings: fully open

    -- Ride 19 (León → Madrid) — FULLY BOOKED
    (19, 4, 1, 'confirmed'),  -- ✓ lucia
    (19, 8, 1, 'confirmed'),  -- ✓ elena
    (19, 7, 1, 'confirmed'),  -- ✓ miguel  [3/3 confirmed]

    -- Ride 20 (León → Valladolid) — FULLY BOOKED
    (20, 5, 1, 'confirmed'),  -- ✓ pablo
    (20,10, 1, 'confirmed'),  -- ✓ ana     [2/2 confirmed]

    -- Ride 21 (Madrid → León)
    (21, 6, 1, 'confirmed'),  -- ✓ sara    [1 of 3]

    -- Ride 22 (Astorga → Campus, completed)
    (22, 2, 1, 'confirmed'),  -- ✓ marta
    (22, 3, 1, 'confirmed'),  -- ✓ carlos  [both can review jorge]

    -- Ride 23 (León → Oviedo, completed)
    (23, 4, 1, 'confirmed'),  -- ✓ lucia
    (23, 5, 1, 'confirmed'),  -- ✓ pablo
    (23, 7, 1, 'confirmed')   -- ✓ miguel  [all three can review sara]

ON CONFLICT (ride_id, user_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('bookings', 'id'), COALESCE((SELECT MAX(id) FROM bookings), 1), true);


-- ------------------------------------------------------------
-- Reviews for completed rides (varied ratings 3-5 ★)
-- ------------------------------------------------------------
INSERT INTO reviews (ride_id, reviewer_id, reviewed_user_id, rating, comment) VALUES

    -- Ride 4: León → Valladolid  (driver: marta)
    (4, 3, 2, 5, 'Muy puntual y simpática. Coche cómodo para el viaje a Valladolid.'),   -- [also in init.sql]
    (4, 4, 2, 4, 'Buena compañera de viaje. Llegamos a tiempo y el trayecto fue agradable.'),

    -- Ride 22: Astorga → Campus de Vegazana  (driver: jorge)
    (22, 2, 9, 5, '¡Genial! Sale puntual desde Astorga y conduce con calma. Lo recomiendo.'),
    (22, 3, 9, 4, 'Buen viaje desde Astorga. Coche limpio y conducción tranquila.'),

    -- Ride 23: León → Oviedo  (driver: sara)
    (23, 4, 6, 5, 'Sara es una conductora excelente. Llegamos antes de lo previsto a Oviedo.'),
    (23, 5, 6, 4, 'Viaje muy cómodo y sin incidencias. Música agradable durante todo el trayecto.'),
    (23, 7, 6, 3, 'Correcto, aunque salimos tarde. El viaje en sí fue bien.')

ON CONFLICT (ride_id, reviewer_id, reviewed_user_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('reviews', 'id'), COALESCE((SELECT MAX(id) FROM reviews), 1), true);
