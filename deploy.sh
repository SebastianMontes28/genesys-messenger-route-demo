#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/srv/apps/genesys-messenger-route-demo"

cd "$APP_DIR"

docker compose build
docker compose up -d --remove-orphans
docker compose ps
