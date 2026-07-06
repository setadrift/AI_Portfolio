#!/usr/bin/env bash
set -euo pipefail

TASK="willowops-code-build"
PACKET_DIR=".tmp/fable-packets"
DESIGN_RESPONSE=".tmp/fable-runs/20260706T141139Z-willowops-design-led-build-spec-response.md"
MAX_PACKET_TOKENS="26000"
MAX_INPUT_TOKENS="32000"
MAX_OUTPUT_TOKENS="20000"
EFFORT="medium"

usage() {
  cat <<'USAGE'
Usage:
  scripts/willowops_fable_code_build.sh
      Build a fresh evidence packet and run the Fable dry-run preview only.

  scripts/willowops_fable_code_build.sh --run PACKET_PATH APPROVAL_ID
      Make the real Fable call using a reviewed packet and approval id.

Default mode never calls Anthropic. It writes a local packet, estimates cost,
and prints the exact approved-run command emitted by scripts/fable_eval.py.
The real response should contain complete replacement contents for page.tsx and
ScenarioRunner.tsx, not a patch.
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

if [[ ! -f "$DESIGN_RESPONSE" ]]; then
  echo "Missing design-led Fable response: $DESIGN_RESPONSE" >&2
  exit 1
fi

mkdir -p "$PACKET_DIR"

before_listing="$(mktemp)"
after_listing="$(mktemp)"
trap 'rm -f "$before_listing" "$after_listing"' EXIT

find "$PACKET_DIR" -maxdepth 1 -type f -name "*-${TASK}.md" -print | sort > "$before_listing"

python3 scripts/build_fable_packet.py \
  --task "$TASK" \
  --title "WillowOps design-led full-file code build" \
  --question "Generate complete replacement contents for page.tsx and ScenarioRunner.tsx to build a fresh WillowOps prototype from endpoint contracts and business constraints, without referencing the existing page implementation." \
  --max-estimated-tokens "$MAX_PACKET_TOKENS" \
  --note "Return exactly two file sections with complete TypeScript contents. Do not return a patch or diff." \
  --note "Edit only src/app/willowops-prototype/page.tsx and src/app/willowops-prototype/ScenarioRunner.tsx." \
  --note "Use the design-led Fable response as the source of truth for the target experience." \
  --note "The existing page and runner implementations are intentionally omitted to avoid design overfitting." \
  --source "$DESIGN_RESPONSE" \
  --source src/lib/willowops/prototype-data.ts:99:260 \
  --source src/lib/willowops/prototype-data.ts:310:467 \
  --source src/app/api/willowops/scenarios/qualified-enquiry/route.ts \
  --source src/app/api/willowops/microsoft365/outlook-draft/route.ts

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
