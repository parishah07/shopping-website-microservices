#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

require_cmd docker

services=( $(discover_services) )

for svc in "${services[@]}"; do
  image="$(image_tag_for "$svc")"
  echo "Building $image from $svc"
  docker build -t "$image" "$ROOT_DIR/$svc"
done
