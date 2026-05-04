#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
./node_modules/.bin/typeorm migration:run -d node_modules/@erdify/db/dist/data-source.js

echo "[entrypoint] Starting API server..."
exec node dist/main.js
