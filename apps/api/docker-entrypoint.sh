#!/bin/sh
set -e

DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/[^/].*|\1|')
DB_PORT=${DB_PORT:-5432}

echo "[entrypoint] Waiting for postgres at ${DB_HOST}:${DB_PORT}..."
until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  sleep 2
done
echo "[entrypoint] Postgres is ready."

echo "[entrypoint] Running database migrations..."
./node_modules/.bin/typeorm migration:run -d node_modules/@erdify/db/dist/data-source.js

echo "[entrypoint] Starting API server..."
exec node dist/main.js
