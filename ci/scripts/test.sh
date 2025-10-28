#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

require_cmd docker

services=( $(discover_services) )
if [[ ${#services[@]} -eq 0 ]]; then
  echo "No services discovered; skipping tests"
  exit 0
fi

# If services had tests we would run npm test. For now, just npm ci && lint placeholder
for svc in "${services[@]}"; do
  pushd "$ROOT_DIR/$svc" >/dev/null
  if [[ -f package-lock.json || -f npm-shrinkwrap.json ]]; then
    npm ci --ignore-scripts --no-audit --fund=false
  else
    npm install --ignore-scripts --no-audit --fund=false
  fi
  if npm run | grep -q " test"; then
    npm test --silent
  else
    echo "No test script for $svc; skipping"
  fi
  popd >/dev/null
done
