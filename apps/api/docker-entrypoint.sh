#!/bin/sh
set -e

# 컨테이너는 root로 시작한다(마운트된 uploads 볼륨의 소유권을 맞추기 위해) — 이후 실제
# 애플리케이션 프로세스는 su-exec으로 node 유저로 낮춰서 실행한다.
mkdir -p /app/uploads
chown -R node:node /app/uploads

DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/[^/].*|\1|')
DB_PORT=${DB_PORT:-5432}

echo "[entrypoint] Waiting for postgres at ${DB_HOST}:${DB_PORT}..."
until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  sleep 2
done
echo "[entrypoint] Postgres is ready."

echo "[entrypoint] Running database migrations..."
su-exec node ./node_modules/.bin/typeorm migration:run -d node_modules/@erdify/db/dist/data-source.js

echo "[entrypoint] Starting API server..."
exec su-exec node node dist/main.js
