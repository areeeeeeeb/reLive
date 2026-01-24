# Load environment variables from .env
include .env
export

.PHONY: dev migrate-up migrate-down migrate-create migrate-status test

# Development server
dev:
	go run main.go

# Database migrations
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
	@echo "  make dev              - Run development server"
	@echo "  make migrate-up       - Run pending migrations"
	@echo "  make migrate-down     - Rollback last migration"
	@echo "  make migrate-create   - Create new migration"
	@echo "  make migrate-status   - Check migration version"
	@echo "  make test             - Run tests"
	@echo "  make build            - Build binary"