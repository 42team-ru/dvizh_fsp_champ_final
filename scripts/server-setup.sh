#!/usr/bin/env bash
# Разовая подготовка чистого VPS (Ubuntu/Debian): ставит Docker и создаёт .env.
#   ./scripts/server-setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a
: "${VPS_HOST:?Задайте VPS_HOST в .env}"
: "${VPS_DIR:=/opt/app}"
PASS=$(openssl rand -hex 16)
S3PASS=$(openssl rand -hex 24)
ssh "$VPS_HOST" "command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
  mkdir -p $VPS_DIR && cd $VPS_DIR
  [ -f .env ] || printf 'DB_PASSWORD=$PASS\nS3_SECRET_KEY=$S3PASS\nDOMAIN=:80\n' > .env
  echo 'OK. Правьте $VPS_DIR/.env (DOMAIN) при необходимости.'"
