#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH="${GOOGLE_ADS_CONFIG_PATH:-/Users/duncananderson/.codex/google-ads.yaml}"

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Google Ads config not found: $CONFIG_PATH" >&2
  exit 1
fi

exec uv run \
  --quiet \
  --with google-ads \
  python "$@"
