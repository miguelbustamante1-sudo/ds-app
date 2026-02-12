#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Local Environment Setup Script
# Builds and runs the entire stack (app + database) in Docker.
# This NEVER touches production.
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ENV_LOCAL="$PROJECT_ROOT/.env.local"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.local.yml"

# ---- Check .env.local exists ----
if [ ! -f "$ENV_LOCAL" ]; then
  echo "Error: .env.local not found at $ENV_LOCAL"
  echo "Create it with the required environment variables (see HowToRunLocally.md)."
  exit 1
fi

# ---- Check Docker is available ----
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed or not in PATH."
  exit 1
fi

if ! docker info &> /dev/null; then
  echo "Error: Docker daemon is not running. Please start Docker and try again."
  exit 1
fi

cd "$PROJECT_ROOT"

# ---- Step 1: Start the database ----
echo ""
echo "Starting local PostgreSQL container..."
docker compose -f "$COMPOSE_FILE" up -d postgres-local

echo "Waiting for PostgreSQL to be ready..."
until docker compose -f "$COMPOSE_FILE" exec -T postgres-local pg_isready -U postgres -d ds_app_local &> /dev/null; do
  sleep 1
done
echo "PostgreSQL is ready."

# ---- Step 2: Push Prisma schema to local database ----
echo ""
echo "Pushing Prisma schema to local database..."
docker compose -f "$COMPOSE_FILE" --profile setup run --rm db-setup

# ---- Step 3: Seed the database ----
SEED_FILE="$SCRIPT_DIR/seed.sql"
if [ -f "$SEED_FILE" ]; then
  echo ""
  echo "Seeding the database..."
  docker compose -f "$COMPOSE_FILE" exec -T postgres-local psql -U postgres -d ds_app_local -f /dev/stdin < "$SEED_FILE" 2>&1 || true
  echo "Seed complete (duplicate rows are skipped on re-runs)."
fi

# ---- Step 4: Build and start the application ----
echo ""
echo "Building and starting the application..."
docker compose -f "$COMPOSE_FILE" up -d --build app

echo ""
echo "============================================================"
echo "Local environment is running!"
echo ""
echo "  App:            http://localhost:3000"
echo "  Database:       localhost:5433 (user: postgres / password: postgres)"
echo ""
echo "  View logs:      docker compose -f docker-compose.local.yml logs -f app"
echo "  Stop all:       docker compose -f docker-compose.local.yml down"
echo "  Reset DB:       docker compose -f docker-compose.local.yml down -v"
echo "============================================================"
