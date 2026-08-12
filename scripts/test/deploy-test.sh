#!/usr/bin/env bash
#
# scripts/deploy.sh · scripts/setup.sh 동작 테스트.
# 가짜 docker(scripts/test/fake-docker.sh)를 PATH에 심어 실제 도커 없이 결정적으로 돈다.
#
#   bash scripts/test/deploy-test.sh
set -uo pipefail

REPO_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
DEPLOY_SH="${REPO_ROOT}/scripts/deploy.sh"
SETUP_SH="${REPO_ROOT}/scripts/setup.sh"

pass=0
fail=0
current_case=""

start_case() {
  current_case="$1"
}

ok() {
  pass=$((pass + 1))
  echo "  ok   — $1"
}

ng() {
  fail=$((fail + 1))
  echo "  FAIL — [${current_case}] $1" >&2
}

assert_contains() {
  local haystack="$1" needle="$2" what="$3"
  case "$haystack" in
    *"$needle"*) ok "$what" ;;
    *)
      ng "$what — '${needle}'을(를) 찾지 못함. 실제:
${haystack}"
      ;;
  esac
}

assert_not_contains() {
  local haystack="$1" needle="$2" what="$3"
  case "$haystack" in
    *"$needle"*)
      ng "$what — '${needle}'이(가) 있으면 안 됨. 실제:
${haystack}"
      ;;
    *) ok "$what" ;;
  esac
}

assert_equals() {
  if [ "$1" = "$2" ]; then
    ok "$3"
  else
    ng "$3 — 기대 '$1', 실제 '$2'"
  fi
}

# ── 샌드박스 ────────────────────────────────────────────────────────────────
SANDBOX=$(mktemp -d)
trap 'rm -rf "$SANDBOX"' EXIT

mkdir -p "${SANDBOX}/bin"
cp "${REPO_ROOT}/scripts/test/fake-docker.sh" "${SANDBOX}/bin/docker"
chmod +x "${SANDBOX}/bin/docker"

case_no=0

# 케이스마다 격리된 state/log 디렉터리를 만들고 공통 환경변수를 설정한다.
new_case_env() {
  case_no=$((case_no + 1))
  CASE_DIR="${SANDBOX}/case-${case_no}"
  mkdir -p "${CASE_DIR}/state" "${CASE_DIR}/fake" "${CASE_DIR}/repo"

  export FAKE_DOCKER_LOG="${CASE_DIR}/docker.log"
  export FAKE_DOCKER_STATE="${CASE_DIR}/fake"
  : >"$FAKE_DOCKER_LOG"

  export ERDIFY_STATE_DIR="${CASE_DIR}/state"
  export ERDIFY_REPO_DIR="${CASE_DIR}/repo"
  export ERDIFY_DOCKER="${SANDBOX}/bin/docker"
  export ERDIFY_HEALTH_TIMEOUT=2
  export ERDIFY_HEALTH_INTERVAL=1
  unset IMAGE_TAG
}

run_deploy() {
  ( "$DEPLOY_SH" "$@" ) >"${CASE_DIR}/out.txt" 2>&1
  echo "$?"
}

docker_log() {
  cat "$FAKE_DOCKER_LOG"
}

state_value() {
  if [ -f "${ERDIFY_STATE_DIR}/$1" ]; then
    tr -d '[:space:]' <"${ERDIFY_STATE_DIR}/$1"
  else
    printf '<none>'
  fi
}

# ── 1. prod 프로필이 실제로 존재하는 Mac 절대 경로를 가리키는가 ──────────────
start_case "prod 프로필"
echo "[1] prod 프로필 기본값"
case_no=$((case_no + 1))
CASE_DIR="${SANDBOX}/case-${case_no}"
mkdir -p "$CASE_DIR"
prod_config=$(env -u ERDIFY_REPO_DIR -u ERDIFY_STATE_DIR -u ERDIFY_DOCKER \
  -u ERDIFY_APP_OVERRIDE -u ERDIFY_SHARED_OVERRIDE \
  ERDIFY_TARGET=prod "$DEPLOY_SH" --print-config 2>&1)
assert_contains "$prod_config" "repo_dir=/Users/junhoson/erdify-production/repo" "운영 리포는 Mac 절대 경로"
assert_contains "$prod_config" "state_dir=/Users/junhoson/erdify-production/deploy-state" "배포 상태는 리포 밖(git clean 대상 아님)"
assert_contains "$prod_config" "env_file=/Users/junhoson/erdify-production/repo/.env" "운영 .env는 런타임 리포 안"
assert_contains "$prod_config" "docker=/Users/junhoson/.docker/bin/docker" "Docker CLI 절대 경로"
assert_contains "$prod_config" "docker-compose.mac-app.yml" "앱 compose에 Mac(linux/amd64) 오버라이드 포함"
assert_contains "$prod_config" "docker-compose.mac-shared.yml" "shared compose에 Mac 오버라이드 포함"
assert_contains "$prod_config" "app_project=erdify" "앱 compose 프로젝트명 유지"
assert_contains "$prod_config" "shared_project=erdify-shared" "shared compose 프로젝트명 유지"
assert_not_contains "$prod_config" "sudo" "Mac 운영 호스트에서는 sudo를 쓰지 않음"

# ── 2. dev 프로필 ───────────────────────────────────────────────────────────
start_case "dev 프로필"
echo "[2] dev 프로필 기본값"
dev_config=$(env -u ERDIFY_REPO_DIR -u ERDIFY_STATE_DIR -u ERDIFY_DOCKER \
  -u ERDIFY_APP_OVERRIDE -u ERDIFY_SHARED_OVERRIDE \
  ERDIFY_TARGET=dev "$DEPLOY_SH" --print-config 2>&1)
assert_contains "$dev_config" "repo_dir=/opt/erdify/repo" "개발 서버 리포 경로"
assert_contains "$dev_config" "docker=sudo docker" "개발 서버는 sudo docker"
assert_not_contains "$dev_config" "mac-app" "개발 서버에는 Mac 오버라이드를 붙이지 않음"

# ── 3. 알 수 없는 타깃은 즉시 실패 ──────────────────────────────────────────
start_case "잘못된 타깃"
echo "[3] ERDIFY_TARGET 검증"
new_case_env
export ERDIFY_TARGET=staging
status=$(run_deploy --tag whatever)
assert_equals "1" "$status" "알 수 없는 타깃이면 실패"
assert_equals "" "$(docker_log)" "docker를 호출하지 않음"

# ── 4. 태그가 없으면 배포하지 않는다 ────────────────────────────────────────
start_case "태그 미지정"
echo "[4] 태그 없이 배포 시도"
new_case_env
export ERDIFY_TARGET=dev
status=$(run_deploy)
assert_equals "1" "$status" "태그를 못 정하면 실패"
assert_not_contains "$(docker_log)" "up -d" "컨테이너를 기동하지 않음"

# ── 5. 정상 배포 ────────────────────────────────────────────────────────────
start_case "정상 배포"
echo "[5] 정상 배포"
new_case_env
export ERDIFY_TARGET=dev
status=$(run_deploy --tag dev-aaa1111)
assert_equals "0" "$status" "헬스가 정상이면 성공"
assert_contains "$(docker_log)" "IMAGE_TAG=dev-aaa1111 ARGS=compose" "요청한 태그로 compose 실행"
assert_contains "$(docker_log)" "ARGS=exec erdify-shared-nginx-1 nginx -t" "nginx 설정을 먼저 검사"
assert_contains "$(docker_log)" "ARGS=exec erdify-shared-nginx-1 nginx -s reload" "nginx는 재시작 대신 reload"
assert_contains "$(docker_log)" "ARGS=exec erdify-api-1 wget" "API /api/health 확인"
assert_equals "dev-aaa1111" "$(state_value current-tag)" "배포 성공 후 현재 태그 기록"

# ── 6. 두 번째 배포에서 직전 태그를 남긴다 ─────────────────────────────────
start_case "직전 태그 기록"
echo "[6] 연속 배포"
status=$(run_deploy --tag dev-bbb2222)
assert_equals "0" "$status" "두 번째 배포 성공"
assert_equals "dev-bbb2222" "$(state_value current-tag)" "현재 태그 갱신"
assert_equals "dev-aaa1111" "$(state_value previous-tag)" "직전 태그 보존 (롤백 대상)"

# ── 7. 헬스 실패 시 직전 태그로 자동 롤백 ──────────────────────────────────
start_case "헬스 실패 자동 롤백"
echo "[7] 새 태그 헬스 실패"
: >"$FAKE_DOCKER_LOG"
echo 1 >"${FAKE_DOCKER_STATE}/api-exit-dev-ccc3333"
status=$(run_deploy --tag dev-ccc3333)
assert_equals "1" "$status" "헬스 실패면 워크플로우가 실패해야 하므로 non-zero"
assert_contains "$(docker_log)" "IMAGE_TAG=dev-bbb2222 ARGS=compose" "직전 태그로 롤백 기동"
assert_equals "dev-bbb2222" "$(state_value current-tag)" "현재 태그는 롤백된 태그로 유지"

# ── 8. 실패 경로에서 볼륨/컨테이너를 절대 삭제하지 않는다 ──────────────────
start_case "파괴적 명령 금지"
echo "[8] 파괴적 docker 명령 부재"
all_logs=$(cat "${SANDBOX}"/case-*/docker.log 2>/dev/null)
assert_not_contains "$all_logs" "compose down" "compose down 없음"
assert_not_contains "$all_logs" "volume rm" "volume rm 없음"
assert_not_contains "$all_logs" "volume prune" "volume prune 없음"
assert_not_contains "$all_logs" "system prune" "system prune 없음"
assert_not_contains "$all_logs" "image prune -a" "image prune -a 없음 (dangling만 정리)"
assert_not_contains "$all_logs" "--volumes" "--volumes 플래그 없음"
assert_not_contains "$all_logs" "rm -f" "컨테이너 강제 삭제 없음"

# ── 9. pull 실패는 기동으로 넘어가지 않는다 ────────────────────────────────
start_case "pull 실패"
echo "[9] 이미지 pull 실패"
new_case_env
export ERDIFY_TARGET=dev
echo 1 >"${FAKE_DOCKER_STATE}/pull-exit"
status=$(run_deploy --tag dev-ddd4444)
assert_equals "1" "$status" "pull 실패면 배포 실패"
assert_not_contains "$(docker_log)" "up -d" "pull이 실패하면 up을 시도하지 않음"
assert_equals "<none>" "$(state_value current-tag)" "실패한 배포는 상태를 기록하지 않음"

# ── 10. 수동 롤백 ───────────────────────────────────────────────────────────
start_case "수동 롤백"
echo "[10] --rollback"
new_case_env
export ERDIFY_TARGET=dev
printf 'prod-new\n' >"${ERDIFY_STATE_DIR}/current-tag"
printf 'prod-old\n' >"${ERDIFY_STATE_DIR}/previous-tag"
status=$(run_deploy --rollback)
assert_equals "0" "$status" "롤백 성공"
assert_contains "$(docker_log)" "IMAGE_TAG=prod-old ARGS=compose" "previous-tag로 기동"
assert_equals "prod-old" "$(state_value current-tag)" "롤백 후 현재 태그 갱신"

echo "[11] --rollback 대상이 없으면 실패"
new_case_env
export ERDIFY_TARGET=dev
status=$(run_deploy --rollback)
assert_equals "1" "$status" "직전 태그가 없으면 롤백하지 않고 실패"

# ── 12. --no-pull은 레지스트리를 건드리지 않는다 ───────────────────────────
start_case "--no-pull"
echo "[12] --no-pull"
new_case_env
export ERDIFY_TARGET=dev
status=$(run_deploy --tag dev-eee5555 --no-pull)
assert_equals "0" "$status" "로컬 이미지로 기동 성공"
assert_not_contains "$(docker_log)" "compose -p erdify -f ${ERDIFY_REPO_DIR}/docker-compose.app.yml --env-file ${ERDIFY_REPO_DIR}/.env pull" "pull을 호출하지 않음"

# compose 파일이 실제로 요구하는 볼륨 — setup.sh가 이 전부를 보장해야 한다.
# (certbot_certs·certbot_webroot가 빠지면 nginx가 인증서를 못 찾아 443이 뜨지 않는다)
REQUIRED_VOLUMES="erdify_postgres_data erdify_uploads certbot_certs certbot_webroot"
REQUIRED_NETWORKS="erdify-proxy erdify-db"

run_setup() {
  local status=0
  ( ERDIFY_TARGET=prod "$SETUP_SH" ) >"${CASE_DIR}/setup-$1.txt" 2>&1 || status=$?
  echo "$status"
}

count_occurrences() {
  grep -c -- "$1" "$FAKE_DOCKER_LOG" || true
}

# ── 13. setup.sh는 기존 볼륨을 재생성하지 않는다 ───────────────────────────
start_case "setup 멱등성"
echo "[13] setup.sh 멱등성 (볼륨이 이미 있는 호스트)"
new_case_env
export ERDIFY_TARGET=prod
assert_equals "0" "$(run_setup 1)" "setup.sh 성공"
for volume in $REQUIRED_VOLUMES; do
  assert_contains "$(docker_log)" "ARGS=volume inspect ${volume}" "볼륨 ${volume} 존재를 먼저 확인"
  assert_not_contains "$(docker_log)" "volume create ${volume}" "이미 있는 ${volume}은(는) 재생성하지 않음"
done
for network in $REQUIRED_NETWORKS; do
  assert_contains "$(docker_log)" "ARGS=network inspect ${network}" "네트워크 ${network} 존재를 먼저 확인"
  assert_not_contains "$(docker_log)" "network create ${network}" "이미 있는 ${network}은(는) 재생성하지 않음"
done
assert_contains "$(docker_log)" "docker-compose.mac-shared.yml" "prod shared 기동에 Mac 오버라이드 사용"

# ── 14. 빈 호스트에서는 필요한 볼륨/네트워크를 전부 만든다 ─────────────────
start_case "setup 최초 실행"
echo "[14] setup.sh 최초 실행 (볼륨/네트워크가 없는 호스트)"
new_case_env
export ERDIFY_TARGET=prod
for volume in $REQUIRED_VOLUMES; do
  : >"${FAKE_DOCKER_STATE}/volume-missing-${volume}"
done
for network in $REQUIRED_NETWORKS; do
  : >"${FAKE_DOCKER_STATE}/network-missing-${network}"
done
assert_equals "0" "$(run_setup 1)" "빈 호스트에서도 setup.sh 성공"
for volume in $REQUIRED_VOLUMES; do
  assert_contains "$(docker_log)" "ARGS=volume create ${volume}" "없는 볼륨 ${volume}은(는) 생성"
done
for network in $REQUIRED_NETWORKS; do
  assert_contains "$(docker_log)" "ARGS=network create ${network}" "없는 네트워크 ${network}은(는) 생성"
done

echo "[15] 최초 실행 직후 재실행 — 생성은 한 번뿐"
: >"$FAKE_DOCKER_LOG"
assert_equals "0" "$(run_setup 2)" "재실행 성공"
for volume in $REQUIRED_VOLUMES; do
  assert_equals "0" "$(count_occurrences "volume create ${volume}")" "두 번째 실행에서 ${volume}을(를) 다시 만들지 않음"
  assert_contains "$(docker_log)" "ARGS=volume inspect ${volume}" "재실행에서도 ${volume}은(는) inspect만"
done

# ── 16. setup 경로에도 파괴적 명령이 없다 ──────────────────────────────────
start_case "setup 파괴적 명령 금지"
echo "[16] 전체 로그 재확인"
all_logs=$(cat "${SANDBOX}"/case-*/docker.log 2>/dev/null)
assert_not_contains "$all_logs" "volume rm" "볼륨 삭제 없음"
assert_not_contains "$all_logs" "volume prune" "볼륨 prune 없음"
assert_not_contains "$all_logs" "network rm" "네트워크 삭제 없음"
assert_not_contains "$all_logs" "compose down" "compose down 없음"
assert_not_contains "$all_logs" "--volumes" "--volumes 플래그 없음"

echo
echo "통과 ${pass}건, 실패 ${fail}건"
[ "$fail" -eq 0 ] || exit 1
