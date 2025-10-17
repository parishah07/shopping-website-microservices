#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

# Placeholder for container/image scanning using Trivy (open-source)
if command -v trivy >/dev/null 2>&1; then
  services=( $(discover_services) )
  for svc in "${services[@]}"; do
    image="$(image_tag_for "$svc")"
    echo "Scanning $image"
    trivy image --no-progress --exit-code 0 "$image"
  done
else
  echo "Trivy not installed; skipping image scan"
fi
