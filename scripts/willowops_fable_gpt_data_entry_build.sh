#!/usr/bin/env bash
set -euo pipefail

TASK="willowops-gpt-data-entry-build"
PACKET_DIR=".tmp/fable-packets"
REVISION_PATH=".tmp/fable-runs/20260706T145917Z-willowops-data-entry-spec-revision-response.md"
MAX_PACKET_TOKENS="14000"
MAX_INPUT_TOKENS="18000"
MAX_OUTPUT_TOKENS="22000"
EFFORT="medium"

usage() {
  cat <<'USAGE'
Usage:
  scripts/willowops_fable_gpt_data_entry_build.sh
      Build a fresh evidence packet and run the Fable dry-run preview only.

  scripts/willowops_fable_gpt_data_entry_build.sh --run PACKET_PATH APPROVAL_ID
      Make the real Fable call using a reviewed packet and approval id.

Default mode never calls Anthropic. It writes a local packet, estimates cost,
and prints the exact approved-run command emitted by scripts/fable_eval.py.
The real response should contain complete contents for page.tsx,
ScenarioRunner.tsx, and the new data-entry extraction route.
USAGE
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ "${1:-}" == "--run" ]]; then
  packet_path="${2:-}"
  approval_id="${3:-}"
  if [[ -z "$packet_path" || -z "$approval_id" ]]; then
    usage >&2
    exit 2
  fi

  python3 scripts/fable_eval.py \
    --task "$TASK" \
    --packet "$packet_path" \
    --max-input-tokens "$MAX_INPUT_TOKENS" \
    --max-tokens "$MAX_OUTPUT_TOKENS" \
    --effort "$EFFORT" \
    --require-approved-run-id "$approval_id"
  exit 0
fi

if [[ $# -gt 0 ]]; then
  usage >&2
  exit 2
fi

if [[ ! -f "$REVISION_PATH" ]]; then
  echo "Missing revised data-entry spec: $REVISION_PATH" >&2
  exit 1
fi

mkdir -p "$PACKET_DIR"

before_listing="$(mktemp)"
after_listing="$(mktemp)"
trap 'rm -f "$before_listing" "$after_listing"' EXIT

find "$PACKET_DIR" -maxdepth 1 -type f -name "*-${TASK}.md" -print | sort > "$before_listing"

python3 scripts/build_fable_packet.py \
  --task "$TASK" \
  --title "WillowOps GPT-backed data-entry intake build" \
  --question "Generate complete source files for a fresh GPT-backed WillowOps data-entry intake prototype with paste/upload input, review-first extraction, and no live writes." \
  --max-estimated-tokens "$MAX_PACKET_TOKENS" \
  --note "Build from scratch. The existing WillowOps page and runner are intentionally omitted to avoid overfitting." \
  --note "Use a real OpenAI-backed extraction endpoint for paste/upload data, with fallback if the key is missing or the API fails." \
  --note "The repo already documents OPENAI_API_KEY in .env.example for backend-only extraction use." \
  --note "Return exactly three complete file sections: page.tsx, ScenarioRunner.tsx, and route.ts." \
  --note "Do not write to external systems; reviewed destination previews are examples only." \
  --source "$REVISION_PATH" \
  --source src/lib/portal/alex/receipt-extraction.ts \
  --source src/app/api/portal/alex/receipts/extract/route.ts

find "$PACKET_DIR" -maxdepth 1 -type f -name "*-${TASK}.md" -print | sort > "$after_listing"
packet_path="$(comm -13 "$before_listing" "$after_listing" | tail -n 1)"

if [[ -z "$packet_path" ]]; then
  echo "Could not identify newly created packet." >&2
  exit 1
fi

echo
echo "Dry-run preview only. No Anthropic request will be made."
python3 scripts/fable_eval.py \
  --task "$TASK" \
  --packet "$packet_path" \
  --max-input-tokens "$MAX_INPUT_TOKENS" \
  --max-tokens "$MAX_OUTPUT_TOKENS" \
  --effort "$EFFORT" \
  --dry-run
