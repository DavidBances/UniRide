# UniRide

UniRide is a university-only ride-sharing platform for short campus commutes. It helps students publish one-time trips, request seats, and coordinate transportation with transparent cost sharing.

## Project Purpose

This repository contains the full UniRide monorepo used for course development and evaluation:

- Backend API in Go (Gin)
- Frontend web app in React + TypeScript (Vite)
- PostgreSQL database (Docker Compose)
- End-to-end tests with Playwright

The goal is to let any developer or teacher run the platform locally with a predictable setup.

## Tech Stack

- Backend: Go, Gin, PostgreSQL driver (pgx)
- Frontend: React, TypeScript, Vite, Vitest, ESLint
- Database: PostgreSQL 16 (Docker)
- E2E testing: Playwright
- Tooling: Makefile, Docker Compose

## Prerequisites

Install the following before starting:

1. Go 1.22+ (or compatible with go.mod)
2. Node.js 20+ and npm 10+
3. Docker Desktop (with Docker Compose)
4. GNU Make (recommended for one-command workflows)

If you do not have `make` on Windows, install it via [Chocolatey](https://chocolatey.org/) (`choco install make`) or use the equivalent manual commands shown in each section below.

## Installation

From the repository root.

macOS/Linux:

```bash
go mod download
cd frontend && npm ci
cd ../e2e && npm ci
cd ..
```

Windows (PowerShell):

```powershell
go mod download
Set-Location frontend
npm ci
Set-Location ..\e2e
npm ci
Set-Location ..
```

Optional (for hot reload and lint tooling used by Makefile):

```bash
go install github.com/air-verse/air@latest
```

## Quick Start Scripts

The repository includes convenience scripts that reset the database, start the backend, and serve the frontend in one step.

### Windows

```bat
probar.bat
```

Run from the repository root. Opens the backend in a separate terminal window and starts the frontend in the current one.

### macOS / Linux

```bash
bash probar.sh
```

Run from the repository root. Starts the backend in the background and the frontend in the foreground.

> **Note:** Both scripts run `docker compose down -v` first, which wipes all existing data. Use them only for a clean demo reset. Make sure to create `.env` files (see [Environment Variables](#environment-variables-env)) before running.

---

## Environment Variables (.env)

Copy the example files and fill in the values before running locally:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item frontend\.env.example frontend\.env
```

**Minimal local `.env` (edit these values):**

```env
PORT=8080
GIN_MODE=debug
CORS_ALLOW_ORIGIN=http://localhost:5173
JWT_SECRET=any-random-string-here
RUN_DB_MIGRATIONS=true
DB_SCHEMA_PATH=db/init.sql

POSTGRES_USER=UniRideAdmin
POSTGRES_PASSWORD=your-password
POSTGRES_DB=UniRide
POSTGRES_PORT=5432

DB_HOST=localhost
DB_PORT=5432
DB_USER=UniRideAdmin
DB_PASSWORD=your-password
DB_NAME=UniRide
DB_SSLMODE=disable
```

**Minimal `frontend/.env`:**

```env
VITE_API_BASE_URL=http://localhost:8080
```

> **Windows note:** Use `[System.IO.File]::WriteAllText` instead of `Out-File` when creating `.env` files in PowerShell 5.1, as `Out-File` adds a BOM that Vite cannot read. Example:
> ```powershell
> [System.IO.File]::WriteAllText("$PWD\frontend\.env", "VITE_API_BASE_URL=http://localhost:8080`n")
> ```

Required backend variables:

- `PORT`
- `JWT_SECRET`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

Recommended deployment variables:

- `GIN_MODE=release`
- `CORS_ALLOW_ORIGIN` set to the deployed frontend URL
- `DB_SSLMODE=require` in hosted environments
- `RUN_DB_MIGRATIONS=true` only when the deployment should apply the schema on startup
- `VITE_API_BASE_URL` set to the deployed backend URL for the frontend build

Secrets such as `JWT_SECRET` and database credentials should be stored in the platform's secret or environment settings, not committed to the repository.

Backend config is loaded from environment variables in `backend/internal/config/config.go`.

### Email Notifications

To enable booking confirmation and cancellation emails, configure an SMTP provider (e.g., Mailtrap, SendGrid, Gmail) by adding the following to your `.env`:

- `SMTP_HOST` (e.g., `smtp.mailtrap.io`)
- `SMTP_PORT` (e.g., `587`)
- `SMTP_USER`
- `SMTP_PASS`

If these are not set, the system will log the intended notification and safely skip sending without blocking the booking flow.

## Production Deployment

The Render blueprint in `render.yaml` defines the backend and frontend services. Set the following values in the platform dashboard or secret store:

- Backend service: `JWT_SECRET`, `CORS_ALLOW_ORIGIN`, database credentials, `DB_SSLMODE`, and optionally `RUN_DB_MIGRATIONS`
- Frontend service: `VITE_API_BASE_URL`

The backend refuses to start if required deployment values are missing, which helps catch misconfigured production environments early.
## Run Locally

Open separate terminals from the repository root.

### 1) Start PostgreSQL

```bash
docker compose up -d
```

### 2) Run Backend API

With Make (hot reload, macOS/Linux):

```bash
make run-backend
```

With Make (hot reload, Windows):

```powershell
make run-backend
```

Without Make:

```bash
go run ./backend/cmd/server
```

Backend default URL: `http://localhost:8080`

Health check: `http://localhost:8080/health`

### 3) Run Frontend

With Make (macOS/Linux):

```bash
make run-frontend
```

With Make (Windows):

```powershell
make run-frontend
```

Without Make (macOS/Linux):

```bash
cd frontend
npm run dev
```

Without Make (Windows PowerShell):

```powershell
Set-Location frontend
npm run dev
```

Frontend default URL: `http://localhost:5173`

## Demo Seed Data

The database ships with minimal base data from `db/init.sql` (applied automatically on first `docker compose up`). Run the seed script to load a richer demo dataset suitable for presentations and manual testing.

### What the seed adds

The seed data represents realistic university ride-sharing scenarios centred on the **University of León's Campus de Vegazana**.

| Resource | Count | Details |
|----------|-------|---------|
| Users | 10 | admin, marta, carlos, lucia, pablo, sara, miguel, elena, jorge, ana |
| Daily commutes to campus | 11 | Morning routes (07:45–09:00) from city centre, neighbourhoods and the train station |
| Returns from campus | 3 | Midday and evening routes back to León and nearby areas |
| Nearby town routes | 4 | Astorga, La Bañeza, Mansilla de las Mulas, Valencia de Don Juan → Campus |
| Weekend trips | 5 | León ↔ Madrid, León ↔ Valladolid, León ↔ Oviedo |
| Completed rides | 2 | Unlock the full booking + review flow |
| Bookings | 31 | Mix of confirmed, pending, and cancelled |
| Reviews | 7 | Ratings from 3 to 5 stars with realistic Spanish comments |

All demo accounts share the same password: **`password123`**

Exception: **`admin@uni.es`** uses **`admin123`** (set by the backend at startup).

**Scenarios available after seeding:**

| Scenario | Ride example |
|---|---|
| Fully open — no bookings yet | Puente Castro → Campus (ride 8), La Lastra → Campus (ride 10) |
| Partially booked | Centro de León → Campus (ride 1, 2/3 taken) |
| Pending booking | San Andrés → Campus (ride 2, 1 confirmed + 1 pending) |
| Cancelled booking | Armunia → Campus (ride 9, 1 confirmed + 1 cancelled) |
| Last seat (1/1 taken) | Residencia San Isidoro → Campus (ride 11) |
| Fully booked (confirmed) | León → Madrid (ride 19, 3/3) · León → Valladolid (ride 20, 2/2) |
| Completed with reviews | Astorga → Campus (ride 22) · León → Oviedo (ride 23) |

### Run the seed

```bash
make seed
```

Manual alternative (macOS/Linux):

```bash
docker compose exec -T postgres psql -U UniRideAdmin -d UniRide \
    -f /docker-entrypoint-initdb.d/seeds.sql
```

Manual alternative (Windows PowerShell):

```powershell
docker compose exec -T postgres psql -U UniRideAdmin -d UniRide `
    -f /docker-entrypoint-initdb.d/seeds.sql
```

> **Note:** `docker compose up -d` must be running before applying the seed. The script is idempotent — re-running it is safe and will not create duplicates.

### Quick-reset a fresh database

```bash
docker compose down -v   # wipe volume
docker compose up -d     # recreates schema + base data via init.sql
make seed                # load full demo dataset
```

## Build Commands

From repository root (macOS/Linux):

```bash
make build-backend
make build-frontend
```

From repository root (Windows PowerShell):

```powershell
make build-backend
make build-frontend
```

Manual alternative (macOS/Linux):

```bash
go build -o backend/bin/server ./backend/cmd/server
cd frontend && npm run build
```

Manual alternative (Windows PowerShell):

```powershell
go build -o backend/bin/server ./backend/cmd/server
Set-Location frontend
npm run build
```

## Ride API Quick Test

Create a ride with an authenticated user token:

```bash
curl -X POST http://localhost:8080/api/rides \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "origin": "Madrid",
    "destination": "Barcelona",
    "departureDate": "2026-05-20T08:30:00Z",
    "availableSeats": 3,
    "price": 12.50
  }'
```

List rides with optional filters:

```bash
curl "http://localhost:8080/api/rides?origin=Madrid&destination=Barcelona&departureDate=2026-05-20&availableSeats=2"
```

Supported query parameters are `origin`, `destination`, `departureDate` (`YYYY-MM-DD`) and `availableSeats` (minimum seats).

List bookings for the authenticated user:

```bash
curl http://localhost:8080/api/me/bookings \
  -H "Authorization: Bearer <token>"
```

Submit a review for a completed ride:

```bash
curl -X POST http://localhost:8080/api/reviews \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"rideId":4,"rating":5,"comment":"Great ride"}'
```

Reviews are linked to the completed ride, the authenticated reviewer and the reviewed driver. Ride responses include `averageRating` and `reviewCount`, and the frontend displays ratings in ride cards and completed bookings.

## Test Commands

### Backend + Frontend unit/integration tests

With Make (macOS/Linux):

```bash
make test
```

With Make (Windows PowerShell):

```powershell
make test
```

Manual alternative (macOS/Linux):

```bash
go test -v -race ./...
cd frontend && npm run test
```

Manual alternative (Windows PowerShell):

```powershell
go test -v -race ./...
Set-Location frontend
npm run test
```

### E2E tests (requires backend and frontend running)

With Make (macOS/Linux):

```bash
make e2e
```

With Make (Windows PowerShell):

```powershell
make e2e
```

Manual alternative (macOS/Linux):

```bash
cd e2e && npx playwright test
```

Manual alternative (Windows PowerShell):

```powershell
Set-Location e2e
npx playwright test
```

## Contribution Rules

1. Create a dedicated branch for each change.
2. Keep commits focused and write clear commit messages.
3. Before opening a PR, run:

```bash
make test
make lint
```

Windows PowerShell alternative:

```powershell
make test
make lint
```

4. Include a concise PR description with:
- What changed
- Why it changed
- How it was tested
5. Request review from teammates before merging.
6. Do not merge if CI is failing.

## Deployment

The repository includes `render.yaml` for a Render-based public deployment:

- Backend: Render Web Service running the Go API.
- Frontend: Render Static Site built from `frontend/`.
- Database: Render PostgreSQL.

Render is the selected hosting platform for Sprint 5. The frontend service is configured as a static site and includes a `/* -> /index.html` rewrite so React Router pages such as `/profile`, `/rides` and `/login` continue working after a browser refresh.

Set these production variables in Render, without committing real secrets:

- Backend: `JWT_SECRET`, `CORS_ALLOW_ORIGIN`, `GIN_MODE=release`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSLMODE=require`.
- Frontend: `VITE_API_BASE_URL` with the public backend URL, for example `https://uniride-backend.onrender.com`.

The Render blueprint enables `RUN_DB_MIGRATIONS=true` for the backend and applies `db/init.sql` on startup. The SQL file is idempotent, so a fresh Render PostgreSQL database receives the required tables and demo data automatically, and service restarts do not recreate existing rows.

Expected public URLs when using the service names from `render.yaml`:

- Frontend: `https://uniride-frontend.onrender.com`
- Backend: `https://uniride-backend.onrender.com`

Set the cross-service values after Render creates the services:

- Frontend `VITE_API_BASE_URL=https://uniride-backend.onrender.com`
- Backend `CORS_ALLOW_ORIGIN=https://uniride-frontend.onrender.com`

After provisioning the services, verify:

1. Backend `/health` responds publicly.
2. Frontend opens publicly.
3. Frontend requests go to the public backend URL.
4. `CORS_ALLOW_ORIGIN` matches the public frontend URL.
5. Direct refresh works for `/login`, `/rides` and `/profile`.
6. Mobile and desktop layouts are readable in the public frontend URL.

After provisioning, verify the deployment with:

## Quick Verification Checklist

Use this checklist to confirm local setup is complete:

1. `docker compose up -d` starts PostgreSQL successfully.
2. `go run ./backend/cmd/server` serves `/health` at port 8080.
3. `npm run dev` in `frontend/` serves the app at port 5173.
4. `go test -v -race ./...` and `npm run test` pass.
5. `npx playwright test` runs when backend and frontend are up.

