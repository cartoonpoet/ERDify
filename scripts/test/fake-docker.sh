#!/usr/bin/env bash
#
# scripts/test/deploy-test.sh가 PATH에 `docker`라는 이름으로 심는 테스트 더블.
# 호출 인자와 그때의 IMAGE_TAG를 로그에 남기고, 상태 디렉터리의 파일로 응답을 조작한다.
#
#   $FAKE_DOCKER_LOG    호출 로그 (한 줄에 `IMAGE_TAG=<tag> ARGS=<인자>`)
#   $FAKE_DOCKER_STATE  응답 제어 파일 디렉터리
#                       예) api-exit=1, api-exit-prod-new=1, pull-exit=1, status-erdify-api-1=unhealthy
set -uo pipefail

printf 'IMAGE_TAG=%s ARGS=%s\n' "${IMAGE_TAG:-}" "$*" >>"$FAKE_DOCKER_LOG"

# 태그별 파일(<name>-<IMAGE_TAG>)이 있으면 그걸, 없으면 <name>, 그것도 없으면 기본값.
read_state() {
  local name="$1" fallback="$2"
  local tagged="${FAKE_DOCKER_STATE}/${name}-${IMAGE_TAG:-}"
  local plain="${FAKE_DOCKER_STATE}/${name}"

  if [ -n "${IMAGE_TAG:-}" ] && [ -f "$tagged" ]; then
    cat "$tagged"
  elif [ -f "$plain" ]; then
    cat "$plain"
  else
    printf '%s' "$fallback"
  fi
}

case "${1:-}" in
  inspect)
    # docker inspect -f <fmt> <name> — 컨테이너/네트워크/볼륨 공용
    name="${*: -1}"
    status=$(read_state "status-${name}" "$(read_state status-default healthy)")
    [ "$status" = "missing" ] && exit 1
    printf '%s\n' "$status"
    ;;
  exec)
    case "${3:-}" in
      wget)
        printf '%s' "$(read_state api-body '{"status":"ok","service":"erdify-api"}')"
        exit "$(read_state api-exit 0)"
        ;;
      nginx)
        exit "$(read_state nginx-exit 0)"
        ;;
      *) ;;
    esac
    ;;
  compose)
    shift
    sub=""
    while [ "$#" -gt 0 ]; do
      case "$1" in
        -p | -f | --env-file) shift 2 ;;
        -*) shift ;;
        *)
          sub="$1"
          break
          ;;
      esac
    done
    case "$sub" in
      pull) exit "$(read_state pull-exit 0)" ;;
      up) exit "$(read_state up-exit 0)" ;;
      *) ;;
    esac
    ;;
  network | volume)
    # `docker <kind> inspect <name>` / `docker <kind> create <name>`.
    # 존재 여부는 상태 파일 `<kind>-missing-<name>`로 조작한다 — 파일이 있으면 "없음"(exit 1).
    kind="$1"
    name="${*: -1}"
    marker="${FAKE_DOCKER_STATE}/${kind}-missing-${name}"
    case "${2:-}" in
      inspect)
        [ -f "$marker" ] && exit 1
        ;;
      create)
        # 실제 docker처럼 만든 뒤에는 존재하게 된다(같은 스크립트를 두 번 돌리는 멱등성 테스트용).
        rm -f "$marker"
        ;;
      *) ;;
    esac
    ;;
  image) ;;
  *) ;;
esac

exit 0
