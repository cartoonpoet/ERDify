#!/bin/bash
set -euo pipefail

REPO_DIR=/opt/erdify/repo

echo "==> Creating Docker networks..."
sudo docker network create erdify-proxy 2>/dev/null || echo "  erdify-proxy already exists"
sudo docker network create erdify-db    2>/dev/null || echo "  erdify-db already exists"

echo "==> Creating Docker volumes..."
sudo docker volume create erdify_postgres_data 2>/dev/null || echo "  volume already exists"
sudo docker volume create erdify_uploads       2>/dev/null || echo "  volume already exists"

echo "==> Starting shared services (postgres + nginx)..."
sudo docker compose -p erdify-shared \
  -f "$REPO_DIR/docker-compose.shared.yml" \
  --env-file "$REPO_DIR/.env" \
  up -d

echo "==> Setup complete. Run scripts/deploy.sh to deploy the app."
