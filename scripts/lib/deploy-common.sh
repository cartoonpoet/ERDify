#!/usr/bin/env bash
# ERDify 배포 스크립트 공통 라이브러리 — 단독 실행이 아니라 source 해서 쓴다.
#
# 호스트마다 다른 것(리포 경로 / docker CLI 경로 / compose 오버라이드)을 "프로필" 한 곳에
# 모아 두고, scripts/deploy.sh·scripts/setup.sh는 프로필을 로드해서 동일한 흐름을 돈다.
# 모든 기본값은 동명의 환경변수로 덮어쓸 수 있다(테스트가 이걸로 가짜 docker를 주입한다).
#
# 테스트: scripts/test/deploy-test.sh

erdify_log() {
  echo "==> $*"
}

erdify_warn() {
  echo "WARN: $*" >&2
}

erdify_die() {
  echo "ERROR: $*" >&2
  exit 1
}

# 배포 대상별 기본값을 채운다. $1 = dev | prod
erdify_load_profile() {
  local target="${1:-}"

  case "$target" in
    dev)
      : "${ERDIFY_REPO_DIR:=/opt/erdify/repo}"
      : "${ERDIFY_STATE_DIR:=/opt/erdify/deploy-state}"
      # 개발 서버(Ubuntu)의 docker는 root 소유 소켓이라 sudo가 필요하다.
      : "${ERDIFY_DOCKER:=sudo docker}"
      : "${ERDIFY_APP_OVERRIDE:=}"
      : "${ERDIFY_SHARED_OVERRIDE:=}"
      ;;
    prod)
      : "${ERDIFY_REPO_DIR:=/Users/junhoson/erdify-production/repo}"
      : "${ERDIFY_STATE_DIR:=/Users/junhoson/erdify-production/deploy-state}"
      # Docker Desktop의 CLI는 PATH에 없을 수 있어(self-hosted runner 세션) 절대 경로로 고정한다.
      : "${ERDIFY_DOCKER:=/Users/junhoson/.docker/bin/docker}"
      # Apple Silicon에서 linux/amd64 앱 이미지를 에뮬레이션으로 돌리기 위한 오버라이드.
      : "${ERDIFY_APP_OVERRIDE:=docker-compose.mac-app.yml}"
      : "${ERDIFY_SHARED_OVERRIDE:=docker-compose.mac-shared.yml}"
      ;;
    *)
      erdify_die "ERDIFY_TARGET은 'dev' 또는 'prod'여야 합니다 (받은 값: '${target}')"
      ;;
  esac

  : "${ERDIFY_APP_PROJECT:=erdify}"
  : "${ERDIFY_SHARED_PROJECT:=erdify-shared}"
  : "${ERDIFY_ENV_FILE:=${ERDIFY_REPO_DIR}/.env}"
  : "${ERDIFY_HEALTH_TIMEOUT:=180}"
  : "${ERDIFY_HEALTH_INTERVAL:=5}"
  : "${ERDIFY_API_PORT:=4000}"
  # 앱 compose가 관리하는 서비스 — 헬스 검증 대상이기도 하다.
  : "${ERDIFY_APP_SERVICES:=api web landing}"

  ERDIFY_TARGET_NAME="$target"

  ERDIFY_DOCKER_CMD=()
  read -r -a ERDIFY_DOCKER_CMD <<<"$ERDIFY_DOCKER"
  [ "${#ERDIFY_DOCKER_CMD[@]}" -gt 0 ] || erdify_die "ERDIFY_DOCKER가 비어 있습니다"

  ERDIFY_APP_COMPOSE_ARGS=(-p "$ERDIFY_APP_PROJECT" -f "${ERDIFY_REPO_DIR}/docker-compose.app.yml")
  if [ -n "$ERDIFY_APP_OVERRIDE" ]; then
    ERDIFY_APP_COMPOSE_ARGS+=(-f "${ERDIFY_REPO_DIR}/${ERDIFY_APP_OVERRIDE}")
  fi
  ERDIFY_APP_COMPOSE_ARGS+=(--env-file "$ERDIFY_ENV_FILE")

  ERDIFY_SHARED_COMPOSE_ARGS=(-p "$ERDIFY_SHARED_PROJECT" -f "${ERDIFY_REPO_DIR}/docker-compose.shared.yml")
  if [ -n "$ERDIFY_SHARED_OVERRIDE" ]; then
    ERDIFY_SHARED_COMPOSE_ARGS+=(-f "${ERDIFY_REPO_DIR}/${ERDIFY_SHARED_OVERRIDE}")
  fi
  ERDIFY_SHARED_COMPOSE_ARGS+=(--env-file "$ERDIFY_ENV_FILE")
}

erdify_print_config() {
  echo "target=${ERDIFY_TARGET_NAME}"
  echo "repo_dir=${ERDIFY_REPO_DIR}"
  echo "state_dir=${ERDIFY_STATE_DIR}"
  echo "env_file=${ERDIFY_ENV_FILE}"
  echo "docker=${ERDIFY_DOCKER}"
  echo "app_project=${ERDIFY_APP_PROJECT}"
  echo "shared_project=${ERDIFY_SHARED_PROJECT}"
  echo "app_override=${ERDIFY_APP_OVERRIDE}"
  echo "shared_override=${ERDIFY_SHARED_OVERRIDE}"
  echo "app_compose_args=${ERDIFY_APP_COMPOSE_ARGS[*]}"
  echo "shared_compose_args=${ERDIFY_SHARED_COMPOSE_ARGS[*]}"
}

erdify_docker() {
  "${ERDIFY_DOCKER_CMD[@]}" "$@"
}

erdify_app_compose() {
  erdify_docker compose "${ERDIFY_APP_COMPOSE_ARGS[@]}" "$@"
}

erdify_shared_compose() {
  erdify_docker compose "${ERDIFY_SHARED_COMPOSE_ARGS[@]}" "$@"
}

# 배포 상태 파일. 리포 밖에 두는 이유: 배포마다 `git clean -fd`가 도는 경로라
# 리포 안에 두면 롤백 정보가 매번 지워진다.
erdify_state_read() {
  local file="${ERDIFY_STATE_DIR}/$1"
  [ -f "$file" ] || return 1
  local value
  value=$(tr -d '[:space:]' <"$file")
  [ -n "$value" ] || return 1
  printf '%s\n' "$value"
}

erdify_state_write() {
  mkdir -p "$ERDIFY_STATE_DIR"
  printf '%s\n' "$2" >"${ERDIFY_STATE_DIR}/$1"
}

erdify_container_name() {
  printf '%s-%s-1\n' "$ERDIFY_APP_PROJECT" "$1"
}

# 헬스체크가 정의된 컨테이너는 Health.Status를, 없으면 State.Status를 본다.
erdify_container_status() {
  erdify_docker inspect \
    -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
    "$1" 2>/dev/null || echo "missing"
}

erdify_wait_for_container() {
  local name="$1"
  local waited=0
  local status=""

  while [ "$waited" -lt "$ERDIFY_HEALTH_TIMEOUT" ]; do
    status=$(erdify_container_status "$name")
    case "$status" in
      healthy | running)
        erdify_log "$name: ${status}"
        return 0
        ;;
    esac
    sleep "$ERDIFY_HEALTH_INTERVAL"
    waited=$((waited + ERDIFY_HEALTH_INTERVAL))
  done

  erdify_warn "$name이(가) ${ERDIFY_HEALTH_TIMEOUT}초 안에 정상이 되지 않았습니다 (마지막 상태: ${status:-unknown})"
  return 1
}

# 컨테이너 안에서 /api/health를 직접 때린다 — 호스트 포트 매핑이나 DNS에 의존하지 않는다.
erdify_check_api_endpoint() {
  local container
  container=$(erdify_container_name api)
  local body=""

  if ! body=$(erdify_docker exec "$container" wget -q -O - \
    "http://localhost:${ERDIFY_API_PORT}/api/health" 2>/dev/null); then
    erdify_warn "${container}의 /api/health 응답이 없습니다"
    return 1
  fi

  case "$body" in
    *'"status":"ok"'*)
      erdify_log "API /api/health: ok"
      return 0
      ;;
    *)
      erdify_warn "예상치 못한 /api/health 응답: ${body}"
      return 1
      ;;
  esac
}

# 앱 서비스 전체 헬스 검증. 하나라도 실패하면 1을 반환한다(호출자가 롤백/실패 처리).
erdify_verify_health() {
  local service container

  for service in $ERDIFY_APP_SERVICES; do
    container=$(erdify_container_name "$service")
    erdify_wait_for_container "$container" || return 1
  done

  erdify_check_api_endpoint || return 1
  return 0
}
