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

If you do not have `make` on Windows, use the manual commands in the sections below.

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

## Environment Variables (.env)

This project expects a root `.env` file for PostgreSQL. If you dont have the file, ask a colaborator for the values.

Backend defaults are defined in `backend/internal/config/config.go`, so the API can also read equivalent DB values from `DB_*` variables if needed.

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

Set these production variables in Render, without committing real secrets:

- Backend: `JWT_SECRET`, `CORS_ALLOW_ORIGIN`, `GIN_MODE=release`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSLMODE=require`.
- Frontend: `VITE_API_BASE_URL` with the public backend URL, for example `https://uniride-backend.onrender.com`.

After provisioning the database, apply the SQL schema from `db/init.sql` or the migration files in `db/migrations/` using the provider SQL console or `psql`. Then verify:

1. Backend `/health` responds publicly.
2. Frontend opens publicly.
3. Frontend requests go to the public backend URL.
4. `CORS_ALLOW_ORIGIN` matches the public frontend URL.

## Quick Verification Checklist

Use this checklist to confirm local setup is complete:

1. `docker compose up -d` starts PostgreSQL successfully.
2. `go run ./backend/cmd/server` serves `/health` at port 8080.
3. `npm run dev` in `frontend/` serves the app at port 5173.
4. `go test -v -race ./...` and `npm run test` pass.
5. `npx playwright test` runs when backend and frontend are up.

