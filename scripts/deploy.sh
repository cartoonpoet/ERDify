#!/bin/bash
set -euo pipefail

REPO_DIR=/opt/erdify/repo
SLOT_DIR=/opt/erdify/active-slot
STATE_FILE="$REPO_DIR/.active-slot"
HEALTH_RETRIES=30
HEALTH_INTERVAL=5

# ── Determine slots ──────────────────────────────────────────────────────────
CURRENT_SLOT="none"
[ -f "$STATE_FILE" ] && CURRENT_SLOT=$(cat "$STATE_FILE")

if [ "$CURRENT_SLOT" = "blue" ]; then
  NEW_SLOT=green
else
  NEW_SLOT=blue
fi

echo "==> Blue/Green deploy: $CURRENT_SLOT → $NEW_SLOT"

APP_COMPOSE="sudo docker compose -p erdify-$NEW_SLOT -f $REPO_DIR/docker-compose.app.yml --env-file $REPO_DIR/.env"

# ── Pull new images ───────────────────────────────────────────────────────────
echo "==> Pulling images for slot: $NEW_SLOT..."
$APP_COMPOSE pull

# ── Start new slot ────────────────────────────────────────────────────────────
echo "==> Starting $NEW_SLOT slot..."
$APP_COMPOSE up -d

# ── Health check ─────────────────────────────────────────────────────────────
echo "==> Waiting for erdify-${NEW_SLOT}-api-1 to become healthy..."
CONTAINER="erdify-${NEW_SLOT}-api-1"
for i in $(seq 1 $HEALTH_RETRIES); do
  STATUS=$(sudo docker inspect --format='{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo "starting")
  echo "   [$i/$HEALTH_RETRIES] $CONTAINER → $STATUS"
  [ "$STATUS" = "healthy" ] && break
  if [ "$i" = "$HEALTH_RETRIES" ]; then
    echo "==> Health check timed out! Rolling back $NEW_SLOT..."
    $APP_COMPOSE down
    exit 1
  fi
  sleep $HEALTH_INTERVAL
done

# ── Switch nginx upstream ─────────────────────────────────────────────────────
echo "==> Switching nginx traffic to $NEW_SLOT..."
mkdir -p "$SLOT_DIR"
cp "$REPO_DIR/nginx/slots/$NEW_SLOT.conf" "$SLOT_DIR/upstream.conf"
sudo docker exec erdify-shared-nginx-1 nginx -s reload

# ── Persist active slot ───────────────────────────────────────────────────────
echo "$NEW_SLOT" | sudo tee "$STATE_FILE" > /dev/null

# ── Drain & stop old slot ─────────────────────────────────────────────────────
if [ "$CURRENT_SLOT" != "none" ]; then
  echo "==> Draining old slot ($CURRENT_SLOT) for 10s..."
  sleep 10
  sudo docker compose -p erdify-$CURRENT_SLOT \
    -f "$REPO_DIR/docker-compose.app.yml" \
    --env-file "$REPO_DIR/.env" \
    down
fi

# ── Cleanup ───────────────────────────────────────────────────────────────────
sudo docker image prune -f || true

echo "==> Deployment complete. Active slot: $NEW_SLOT"
