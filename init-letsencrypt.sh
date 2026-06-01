#!/bin/bash
set -euo pipefail

EMAIL="${CERTBOT_EMAIL:?사용법: CERTBOT_EMAIL=your@email.com bash init-letsencrypt.sh}"
DOMAINS=("erdify.kro.kr" "erdify-app.kro.kr")
COMPOSE_FILE="docker-compose.shared.yml"

echo "=== [1/4] 볼륨 생성 및 임시 self-signed 인증서 생성 ==="
docker volume create certbot_certs 2>/dev/null || true
docker volume create certbot_webroot 2>/dev/null || true

docker run --rm \
  -v certbot_certs:/etc/letsencrypt \
  --entrypoint sh certbot/certbot -c "
    for domain in erdify.kro.kr erdify-app.kro.kr; do
      mkdir -p /etc/letsencrypt/live/\$domain
      openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout /etc/letsencrypt/live/\$domain/privkey.pem \
        -out /etc/letsencrypt/live/\$domain/fullchain.pem \
        -subj \"/CN=\$domain\" 2>/dev/null
      echo \"임시 인증서 생성 완료: \$domain\"
    done
  "

echo "=== [2/4] nginx 기동 (임시 인증서로 80·443 포함) ==="
docker compose -f "$COMPOSE_FILE" up -d nginx
echo "nginx 준비 대기 중..."
sleep 3

echo "=== [3/4] 실제 Let's Encrypt 인증서 발급 ==="
for domain in "${DOMAINS[@]}"; do
  echo "--- $domain 인증서 발급 중 ---"
  docker run --rm \
    -v certbot_certs:/etc/letsencrypt \
    -v certbot_webroot:/var/www/certbot \
    certbot/certbot certonly \
      --webroot \
      --webroot-path /var/www/certbot \
      --email "$EMAIL" \
      --agree-tos \
      --no-eff-email \
      -d "$domain"
done

echo "=== [4/4] nginx reload (실제 인증서 적용) ==="
docker exec erdify-nginx-1 nginx -s reload

echo ""
echo "=== 완료! 전체 서비스 기동 ==="
echo "  docker compose -f docker-compose.shared.yml -f docker-compose.app.yml up -d"
