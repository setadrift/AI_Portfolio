#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FIXTURES_DIR="$ROOT_DIR/outputs/willowops-phase-1"

require_ok() {
  local label="$1"
  local method="$2"
  local url="$3"
  local data_file="${4:-}"
  local output
  local status

  if [[ -n "$data_file" ]]; then
    output="$(curl -sS -w '\n%{http_code}' -X "$method" "$url" \
      -H 'Content-Type: application/json' \
      --data-binary "@$data_file")"
  else
    output="$(curl -sS -w '\n%{http_code}' -X "$method" "$url")"
  fi

  status="$(printf '%s' "$output" | tail -n 1)"
  if [[ "$status" != "200" ]]; then
    printf 'FAIL %s (%s)\n' "$label" "$status" >&2
    printf '%s\n' "$output" | sed '$d' >&2
    exit 1
  fi

  printf 'PASS %s\n' "$label"
}

require_ok "dashboard data" "GET" "$BASE_URL/api/willowops/dashboard-data"
require_ok "qualified enquiry scenario" "POST" "$BASE_URL/api/willowops/scenarios/qualified-enquiry" "$FIXTURES_DIR/make-qualified-enquiry-scenario-payload.json"
require_ok "Outlook draft dry run" "POST" "$BASE_URL/api/willowops/microsoft365/outlook-draft" "$FIXTURES_DIR/outlook-draft-request.json"
require_ok "Studio Designer CSV import" "POST" "$BASE_URL/api/willowops/studio-designer/import" "$FIXTURES_DIR/studio-designer-import-request.json"
require_ok "Xero invoice event" "POST" "$BASE_URL/api/willowops/xero/invoice-event" "$FIXTURES_DIR/xero-invoice-overdue-event.json"
require_ok "WhatsApp message draft" "POST" "$BASE_URL/api/willowops/whatsapp/message-draft" "$FIXTURES_DIR/whatsapp-supplier-delay-draft-request.json"
require_ok "weekly leadership report" "GET" "$BASE_URL/api/willowops/reports/leadership-weekly"
require_ok "training handoff guide" "GET" "$BASE_URL/api/willowops/training/handoff"

printf 'WillowOps Phase 1 smoke test passed against %s\n' "$BASE_URL"
