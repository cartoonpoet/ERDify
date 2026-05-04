#!/bin/bash
set -euo pipefail

REPO_DIR=/opt/erdify/repo
SLOT_DIR=/opt/erdify/active-slot

echo "==> Creating Docker networks..."
sudo docker network create erdify-proxy 2>/dev/null || echo "  erdify-proxy already exists"
sudo docker network create erdify-db    2>/dev/null || echo "  erdify-db already exists"

echo "==> Creating Docker volumes..."
sudo docker volume create erdify_postgres_data 2>/dev/null || echo "  volume already exists"
sudo docker volume create erdify_uploads       2>/dev/null || echo "  volume already exists"

echo "==> Initializing active-slot directory..."
mkdir -p "$SLOT_DIR"
if [ ! -f "$SLOT_DIR/upstream.conf" ]; then
  # Placeholder so nginx can start; deploy.sh will overwrite with real container names
  cat > "$SLOT_DIR/upstream.conf" << 'EOF'
upstream erdify_api     { server localhost:4000; }
upstream erdify_web     { server localhost:80; }
upstream erdify_landing { server localhost:8080; }
EOF
  echo "  Created placeholder upstream.conf"
fi

echo "==> Starting shared services (postgres + nginx)..."
sudo docker compose -p erdify-shared \
  -f "$REPO_DIR/docker-compose.shared.yml" \
  --env-file "$REPO_DIR/.env" \
  up -d

echo "==> Setup complete. Run scripts/deploy.sh to perform the first deployment."
