# Testing

This document explains how to run the automated and manual tests for UniRide so a reviewer can validate functionality quickly.

## Backend tests

Run unit and integration tests with Go's test tool from the repository root:

```bash
go test ./backend/...
```

Notes:
- Some integration tests expect a working database or use mocks. Check `backend/tests` for integration scenarios.
- If a test fails due to a port conflict, ensure no other service is using the configured port or set `PORT` to a free port.

## Frontend tests

Use the project-local `package.json` scripts in `frontend`.

Install dependencies (once):
```bash
cd frontend
npm install
```

Run tests:
```bash
npm test
```

Notes:
- Tests assume `VITE_API_BASE_URL` is empty or points to a test backend. For isolated frontend unit tests, leave `VITE_API_BASE_URL` empty so the tests mock network calls.

## Manual end-to-end testing (quick smoke)

1. Start a local Postgres (Docker) and the backend:

```bash
docker-compose up -d postgres
go run ./backend/cmd/server
```

2. Build and serve the frontend (dev server):

```bash
cd frontend
npm run dev
```

3. Open the frontend in the browser and perform core flows:
- register / login
- create a trip (as driver)
- request a seat (as passenger)
- approve/reject the request (as driver)
- rate participants

## Test coverage and CI
- The repository includes GitHub Actions templates (suggested) to run tests on push. Ensure tests are executed in CI with a reproducible DB (Docker or service).
