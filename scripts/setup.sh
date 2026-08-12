#!/usr/bin/env bash
#
# ERDify 공용 인프라 준비 — 네트워크/볼륨을 보장하고 shared 서비스(postgres·nginx·certbot)를 올린다.
# 여러 번 실행해도 안전하다(생성은 "없을 때만", 삭제는 하지 않는다).
#
# 사용법:
#   ERDIFY_TARGET=dev  scripts/setup.sh
#   ERDIFY_TARGET=prod scripts/setup.sh
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=scripts/lib/deploy-common.sh
. "${SCRIPT_DIR}/lib/deploy-common.sh"

erdify_load_profile "${ERDIFY_TARGET:-}"

ensure_network() {
  if erdify_docker network inspect "$1" >/dev/null 2>&1; then
    echo "  network ${1}: 이미 존재"
  else
    erdify_docker network create "$1"
  fi
}

# 기존 데이터 볼륨은 절대 재생성하지 않는다 — inspect로 존재를 확인하고 없을 때만 만든다.
ensure_volume() {
  if erdify_docker volume inspect "$1" >/dev/null 2>&1; then
    echo "  volume ${1}: 이미 존재 (그대로 둠)"
  else
    erdify_docker volume create "$1"
  fi
}

erdify_log "Docker 네트워크 확인..."
ensure_network erdify-proxy
ensure_network erdify-db

# docker-compose.shared.yml · docker-compose.app.yml이 참조하는 볼륨 전부.
# certbot_certs·certbot_webroot가 빠지면 nginx가 인증서를 못 찾아 443이 뜨지 않고,
# 갱신 challenge도 webroot를 공유하지 못한다.
ERDIFY_VOLUMES=(
  erdify_postgres_data
  erdify_uploads
  certbot_certs
  certbot_webroot
)

erdify_log "Docker 볼륨 확인..."
for volume in "${ERDIFY_VOLUMES[@]}"; do
  ensure_volume "$volume"
done

erdify_log "shared 서비스 기동 (postgres · nginx · certbot)..."
erdify_shared_compose up -d

erdify_log "준비 완료. 앱 배포는 scripts/deploy.sh를 실행하세요."
