#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

require_cmd docker
require_cmd docker-compose || true

COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.yml}"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found at $COMPOSE_FILE"
  exit 1
fi

# Export image tags so compose can pick them up via environment substitution
# Convert service names like "api-gateway" to "API_GATEWAY_IMAGE"
to_env_var() {
  echo "$1" | tr '[:lower:]' '[:upper:]' | tr '-' '_'
}

services=( $(discover_services) )
for svc in "${services[@]}"; do
  env_name="$(to_env_var "$svc")_IMAGE"
  export "$env_name"="$(image_tag_for "$svc")"
done

# Basic deployment using docker compose
if command -v docker compose >/dev/null 2>&1; then
  docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
else
  docker-compose -f "$COMPOSE_FILE" up -d --remove-orphans
fi
