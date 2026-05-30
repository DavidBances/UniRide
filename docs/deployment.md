# Deployment

This document explains how to deploy UniRide to a production-like environment and what environment variables and steps are required for a teacher or reviewer to reproduce the deployment.

Supported / recommended platform: Render (also works on any Docker-capable host).

## Services to deploy
- Backend service (Go + Gin)
- Frontend (Vite-built static site)
- PostgreSQL database (managed or self-hosted)

## Required environment variables
The backend expects the following environment variables (no secrets should be committed):

- `PORT` – port to listen on (e.g. `8080`)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` – PostgreSQL connection
- `JWT_SECRET` – HMAC secret for JWT signing
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` – optional SMTP for email notifications
- `RUN_DB_MIGRATIONS` – `true`/`false` to run migrations on startup

The frontend expects:

- `VITE_API_BASE_URL` – base URL of the backend API (e.g. `https://uniride.example.com/api` or empty for same-origin)

## Example Render setup
1. Add a managed PostgreSQL database on Render. Note the connection string / variables.
2. Create two web services: `uniride-backend` and `uniride-frontend`.
3. For `uniride-backend` set env vars: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, and `RUN_DB_MIGRATIONS=true`.
4. For `uniride-frontend` set `VITE_API_BASE_URL` to the backend URL (e.g. `https://uniride-backend.onrender.com/api`).

## Docker Compose (local production test)
The repository includes a `docker-compose.yml` for local testing. Use the compose file to start backend + Postgres.

## Zero-downtime and migrations
- The backend supports a `RUN_DB_MIGRATIONS` flag to run migrations at startup. For production, prefer running migrations separately in CI/CD before swapping traffic.

## Logging & monitoring
- The backend uses structured `slog` logs to stdout. Configure the platform log sink (Render, Docker, or aggregator like Loki) to collect them.
- Include `request_id` in logs to trace requests across services.

## Security recommendations
- Keep `JWT_SECRET` and DB credentials in the platform secret manager — never commit them.
- Use HTTPS for all public endpoints.
- Set minimal CORS rules for the frontend origin.

## Rollback strategy
- Use the platform's versioning to roll back to the previous release if deployment fails.

## Notes for grading
- Provide the reviewer with the Render service names and environment variables (or a `render.yaml`) so they can reproduce the deployment quickly.
