#!/bin/sh
set -e

# curl이 없으면 설치 (certbot/certbot Alpine 이미지 대응)
command -v curl || apk add --no-cache curl

trap exit TERM

while :; do
    certbot renew \
        --deploy-hook "curl -sf --unix-socket /var/run/docker.sock \
            -X POST 'http://localhost/containers/erdify-nginx-1/kill?signal=HUP'"
    sleep 12h & wait ${!}
done
