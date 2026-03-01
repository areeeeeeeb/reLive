# Local Development Setup

Local dev runs PostgreSQL and MinIO (S3-compatible) in Docker. No cloud credentials needed.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [golang-migrate](https://github.com/golang-migrate/migrate) — `go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest`
- [Go 1.25+](https://go.dev/dl/)

---

## First-time setup

```bash
cd backend-go

# 1. Copy the local env template
cp .env.local.example .env

# 2. Start Docker services and run all migrations
make local-setup

# 3. Start the backend
make dev
```

The backend will be running at **http://localhost:8081**.

---

## Daily workflow

```bash
# Start containers (if not already running)
make local-up

# Start backend
make dev

# Stop containers when done
make local-down
```

---

## Services

| Service | URL | Credentials |
|---|---|---|
| Backend API | http://localhost:8081 | — |
| MinIO S3 API | http://localhost:9000 | — |
| MinIO Console | http://localhost:9001 | `minioadmin` / `minioadmin123` |
| PostgreSQL | `localhost:5434` | `relive` / `relive` |

---

## Database

### Migrations

```bash
make migrate-up       # apply all pending migrations
make migrate-down     # roll back one migration
make migrate-status   # show current migration version
make migrate-create   # scaffold a new migration file
```

### Connect with pgAdmin

Register a new server with these settings:

| Field | Value |
|---|---|
| Host | `localhost` |
| Port | `5434` |
| Database | `relive` |
| Username | `relive` |
| Password | `relive` |
| SSL | disabled |

### Connect via psql (no install needed)

```bash
docker exec -it backend-go-postgres-1 psql -U relive -d relive
```

---

## S3 / MinIO

Uploaded files are stored in the `relive-concert-media` bucket.

Browse files at **http://localhost:9001** — login with `minioadmin` / `minioadmin123`.

The bucket is created automatically on `make local-up`.

---

## Auth

Auth0 is bypassed in local dev. Every request is authenticated as the user defined by `DEV_AUTH0_ID` in your `.env`.

```env
DEV_BYPASS_AUTH=true
DEV_AUTH0_ID=local|dev-user
```

Change `DEV_AUTH0_ID` to match a specific `auth0_id` in your local `users` table if you need to test as a specific user.

---

## Reset everything

```bash
make local-reset      # stops containers and wipes all data volumes
make local-setup      # fresh start: recreates containers + remigrates
```

---

## Troubleshooting

**`password authentication failed for user "relive"`**
The Postgres volume was initialized with different credentials. Run:
```bash
make local-reset && make local-setup
```

**Port conflict on `5434` or `9000`/`9001`**
Another process is using that port. Change the host-side port in `docker-compose.local.yml` and update `DATABASE_URL` / `DO_SPACES_ENDPOINT` in your `.env` to match.

**`make dev` fails — database unreachable**
Containers may not be running. Check with:
```bash
docker compose -f docker-compose.local.yml ps
```
