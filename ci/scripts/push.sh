#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

require_cmd docker

if [[ -z "${REGISTRY:-}" ]]; then
  echo "REGISTRY is not set; skipping push"
  exit 0
fi

services=( $(discover_services) )
for svc in "${services[@]}"; do
  image="$(image_tag_for "$svc")"
  echo "Pushing $image"
  docker push "$image"
done
