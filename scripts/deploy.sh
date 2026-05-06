#!/bin/bash
set -euo pipefail

REPO_DIR=/opt/erdify/repo
APP_COMPOSE="sudo docker compose -p erdify -f $REPO_DIR/docker-compose.app.yml --env-file $REPO_DIR/.env"

echo "==> Pulling latest images..."
$APP_COMPOSE pull

echo "==> Starting app services..."
$APP_COMPOSE up -d

echo "==> Waiting for API container to be ready..."
until sudo docker exec erdify-api-1 echo ok 2>/dev/null; do sleep 2; done

echo "==> Reloading nginx..."
sudo docker exec erdify-shared-nginx-1 nginx -s reload 2>/dev/null || sudo docker restart erdify-shared-nginx-1

echo "==> Cleaning up old images..."
sudo docker image prune -f || true

echo "==> Deployment complete."
