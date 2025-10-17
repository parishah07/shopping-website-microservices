#!/usr/bin/env bash
set -euo pipefail

# Globals
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
REGISTRY="${REGISTRY:-}"
REGISTRY_NAMESPACE="${REGISTRY_NAMESPACE:-}"
GIT_SHA="${GIT_SHA:-${GITHUB_SHA:-${CI_COMMIT_SHA:-$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo dev)}}}"

# Discover Node services (dirs containing package.json and Dockerfile)
discover_services() {
  find "$ROOT_DIR" -maxdepth 1 -type d \( -name "node_modules" -o -name ".git" -o -name "ci" \) -prune -o -type d -exec bash -lc '[ -f "$1/package.json" ] && [ -f "$1/Dockerfile" ] && basename "$1"' _ {} \; | sort
}

image_tag_for() {
  local service="$1"
  local version="$GIT_SHA"
  if [[ -n "$REGISTRY" ]]; then
    if [[ -n "$REGISTRY_NAMESPACE" ]]; then
      echo "$REGISTRY/$REGISTRY_NAMESPACE/${service}:$version"
    else
      echo "$REGISTRY/${service}:$version"
    fi
  else
    echo "${service}:$version"
  fi
}

require_cmd() {
  local name="$1"
  command -v "$name" >/dev/null 2>&1 || { echo "Missing required command: $name" >&2; exit 1; }
}
