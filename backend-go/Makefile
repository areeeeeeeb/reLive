# Load environment variables from .env
include .env
export

.PHONY: dev migrate-up migrate-down migrate-create migrate-status test \
        local-up local-down local-reset local-setup

# ── Local infrastructure ──────────────────────────────────────────────────────

# Start local PostgreSQL + MinIO (detached)
local-up:
	docker compose -f docker-compose.local.yml up -d

# Stop local services (keeps volumes)
local-down:
	docker compose -f docker-compose.local.yml down

# Wipe volumes and stop — full clean slate
local-reset:
	docker compose -f docker-compose.local.yml down -v

# First-time setup: start services, wait for healthy, then migrate
local-setup: local-up
	@echo "Waiting for services to be healthy..."
	@docker compose -f docker-compose.local.yml wait postgres minio minio-init 2>/dev/null || sleep 8
	@$(MAKE) migrate-up

# ── Development server ────────────────────────────────────────────────────────

dev:
	go run main.go

# Database migrations
# install golang-migrate with: go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest

migrate-up:
	migrate -path migrations/ -database "${DATABASE_URL}" up

migrate-down:
	migrate -path migrations/ -database "${DATABASE_URL}" down 1

migrate-create:
	@read -p "Migration name: " name; \
	migrate create -ext sql -dir migrations/ -seq $$name
migrate-status:
	migrate -path migrations/ -database "${DATABASE_URL}" version

# Testing
test:
	go test ./...

test-verbose:
	go test -v ./...

# Build
build:
	go build -o bin/relive-backend main.go

# Run tests + build
check: test build

# Clean
clean:
	rm -rf bin/
	rm -rf tmp/

# Help
help:
	@echo "Available commands:"
	@echo ""
	@echo "  Local infrastructure (Docker):"
	@echo "  make local-setup      - First-time: start services + migrate"
	@echo "  make local-up         - Start PostgreSQL + MinIO"
	@echo "  make local-down       - Stop services (keep data)"
	@echo "  make local-reset      - Stop services and wipe all data"
	@echo ""
	@echo "  Development:"
	@echo "  make dev              - Run development server"
	@echo "  make migrate-up       - Run pending migrations"
	@echo "  make migrate-down     - Rollback last migration"
	@echo "  make migrate-create   - Create new migration"
	@echo "  make migrate-status   - Check migration version"
	@echo "  make test             - Run tests"
	@echo "  make build            - Build binary"