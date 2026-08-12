#!/usr/bin/env bash
#
# ERDify 앱 배포 — 지정한 이미지 태그를 pull → up -d → 헬스 검증한다.
# 헬스 검증에 실패하면 직전 태그로 자동 롤백한 뒤 실패로 끝난다.
#
# 볼륨(postgres 데이터·uploads·certbot 인증서)은 어떤 경로에서도 삭제하지 않는다.
# `compose down`, `volume rm`, `prune --volumes`는 이 스크립트에 존재하지 않는다.
#
# 사용법:
#   ERDIFY_TARGET=dev  scripts/deploy.sh --tag dev-<sha>
#   ERDIFY_TARGET=prod scripts/deploy.sh --tag prod-<sha>
#   ERDIFY_TARGET=prod scripts/deploy.sh --rollback            # 직전 태그로 되돌림
#   ERDIFY_TARGET=prod scripts/deploy.sh --rollback --tag prod-<sha>
#   ERDIFY_TARGET=prod scripts/deploy.sh --no-pull             # 재부팅 후 로컬 이미지로 기동
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=scripts/lib/deploy-common.sh
. "${SCRIPT_DIR}/lib/deploy-common.sh"

usage() {
  cat <<'EOF'
사용법: ERDIFY_TARGET=dev|prod scripts/deploy.sh [옵션]

  --tag TAG        배포할 이미지 태그 (환경변수 IMAGE_TAG로도 지정 가능)
  --rollback       직전 태그(state의 previous-tag)로 되돌린다
  --no-pull        레지스트리 pull 없이 로컬 이미지로 기동 (재부팅 복구용)
  --print-config   해석된 프로필 설정만 출력하고 종료
  -h, --help       이 도움말
EOF
}

requested_tag="${IMAGE_TAG:-}"
mode="deploy"
do_pull=1
print_config=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --tag)
      [ "$#" -ge 2 ] || erdify_die "--tag 뒤에 태그가 필요합니다"
      requested_tag="$2"
      shift 2
      ;;
    --rollback)
      mode="rollback"
      shift
      ;;
    --no-pull)
      do_pull=0
      shift
      ;;
    --print-config)
      print_config=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      erdify_die "알 수 없는 인자: $1"
      ;;
  esac
done

erdify_load_profile "${ERDIFY_TARGET:-}"

if [ "$print_config" -eq 1 ]; then
  erdify_print_config
  exit 0
fi

current_tag=$(erdify_state_read current-tag || true)
previous_tag=$(erdify_state_read previous-tag || true)

resolve_tag() {
  if [ "$mode" = "rollback" ]; then
    if [ -n "$requested_tag" ]; then
      printf '%s\n' "$requested_tag"
      return 0
    fi
    [ -n "$previous_tag" ] || erdify_die "롤백할 직전 태그가 없습니다 (${ERDIFY_STATE_DIR}/previous-tag). --tag로 직접 지정하세요"
    printf '%s\n' "$previous_tag"
    return 0
  fi

  if [ -n "$requested_tag" ]; then
    printf '%s\n' "$requested_tag"
    return 0
  fi
  # 태그를 절대 추측하지 않는다 — compose 기본값(:latest)으로 조용히 흘러가면
  # dev/prod가 같은 태그를 두고 경쟁하게 된다.
  [ -n "$current_tag" ] || erdify_die "배포할 이미지 태그가 없습니다. --tag 또는 IMAGE_TAG로 지정하세요"
  printf '%s\n' "$current_tag"
}

target_tag=$(resolve_tag)

# nginx 설정은 bind mount라 컨테이너 재생성 없이 reload로 반영된다.
# 문법 검사(nginx -t)를 먼저 하므로 잘못된 설정이 서비스를 끊는 일은 없다.
reload_nginx() {
  local container="${ERDIFY_SHARED_PROJECT}-nginx-1"

  if [ "$(erdify_container_status "$container")" = "missing" ]; then
    erdify_warn "${container}가 없어 nginx reload를 건너뜁니다 (scripts/setup.sh를 먼저 실행하세요)"
    return 0
  fi

  erdify_log "nginx 설정 검사 및 reload..."
  erdify_docker exec "$container" nginx -t
  erdify_docker exec "$container" nginx -s reload
}

# 태그 하나를 실제로 기동한다. 성공하면 0, 실패하면 1.
release() {
  local tag="$1"
  local allow_pull="$2"

  erdify_log "이미지 태그 ${tag} 배포 (target=${ERDIFY_TARGET_NAME})"
  export IMAGE_TAG="$tag"

  if [ "$allow_pull" -eq 1 ]; then
    erdify_log "이미지 pull..."
    if ! erdify_app_compose pull; then
      erdify_warn "이미지 pull 실패 (${tag})"
      return 1
    fi
  fi

  erdify_log "앱 서비스 기동..."
  if ! erdify_app_compose up -d; then
    erdify_warn "compose up 실패 (${tag})"
    return 1
  fi

  erdify_log "헬스 검증..."
  erdify_verify_health
}

reload_nginx

if release "$target_tag" "$do_pull"; then
  if [ -n "$current_tag" ] && [ "$current_tag" != "$target_tag" ]; then
    erdify_state_write previous-tag "$current_tag"
  fi
  erdify_state_write current-tag "$target_tag"

  # dangling 이미지만 정리한다. `-a`나 `--volumes`는 절대 쓰지 않는다.
  erdify_log "dangling 이미지 정리..."
  erdify_docker image prune -f || erdify_warn "image prune 실패 (무시)"

  erdify_log "배포 완료: ${target_tag}"
  exit 0
fi

# ── 실패 경로 ────────────────────────────────────────────────────────────────
# 볼륨은 그대로 두고 이미지 태그만 직전 것으로 되돌린다.
if [ "$mode" = "rollback" ]; then
  erdify_die "롤백 대상 ${target_tag} 기동에 실패했습니다 — 수동 확인이 필요합니다"
fi

if [ -z "$current_tag" ] || [ "$current_tag" = "$target_tag" ]; then
  erdify_die "배포 실패(${target_tag}) — 되돌릴 직전 태그가 없어 롤백하지 않았습니다"
fi

erdify_warn "배포 실패(${target_tag}) — 직전 태그 ${current_tag}(으)로 롤백합니다"
if release "$current_tag" "$do_pull"; then
  erdify_state_write current-tag "$current_tag"
  erdify_die "배포 실패(${target_tag}) — ${current_tag}(으)로 롤백 완료"
fi

erdify_die "배포 실패(${target_tag}) 및 ${current_tag} 롤백도 실패 — 수동 개입이 필요합니다"
