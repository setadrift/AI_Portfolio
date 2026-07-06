#!/usr/bin/env bash
set -euo pipefail

TASK="willowops-design-led-build-spec"
PACKET_DIR=".tmp/fable-packets"
DIRECTION_RESPONSE=".tmp/fable-runs/20260706T135942Z-willowops-followup-prototype-response.md"
IMPLEMENTATION_RESPONSE=".tmp/fable-runs/20260706T140558Z-willowops-implementation-spec-response.md"
MAX_PACKET_TOKENS="22000"
MAX_INPUT_TOKENS="28000"
MAX_OUTPUT_TOKENS="12000"
EFFORT="medium"

usage() {
  cat <<'USAGE'
Usage:
  scripts/willowops_fable_design_build_spec.sh
      Build a fresh evidence packet and run the Fable dry-run preview only.

  scripts/willowops_fable_design_build_spec.sh --run PACKET_PATH APPROVAL_ID
      Make the real Fable call using a reviewed packet and approval id.

Default mode never calls Anthropic. It writes a local packet, estimates cost,
and prints the exact approved-run command emitted by scripts/fable_eval.py.
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

for required_file in "$DIRECTION_RESPONSE" "$IMPLEMENTATION_RESPONSE"; do
  if [[ ! -f "$required_file" ]]; then
    echo "Missing required Fable context: $required_file" >&2
    exit 1
  fi
done

mkdir -p "$PACKET_DIR"

before_listing="$(mktemp)"
after_listing="$(mktemp)"
trap 'rm -f "$before_listing" "$after_listing"' EXIT

find "$PACKET_DIR" -maxdepth 1 -type f -name "*-${TASK}.md" -print | sort > "$before_listing"

python3 scripts/build_fable_packet.py \
  --task "$TASK" \
  --title "WillowOps design-led build spec" \
  --question "What design-led implementation spec should Codex follow to rebuild this prototype into a polished, minimal, buyer-facing demo without overfitting to the current page design?" \
  --max-estimated-tokens "$MAX_PACKET_TOKENS" \
  --note "Audience: Lucy Howson and Willow Grey leadership after an initial interview." \
  --note "User concern: the current prototype design is not liked and should not constrain the new build." \
  --note "Design instruction: treat existing UI as raw material, not a visual target; redesign hierarchy, layout, copy, and interactions as needed." \
  --note "Scope constraint: one workflow only: new enquiry -> AI discovery brief -> reviewed Outlook draft -> board update." \
  --note "Honesty constraint: simulated data and local mock endpoints only; do not imply live Monday.com or Outlook connectivity." \
  --source "$DIRECTION_RESPONSE" \
  --source "$IMPLEMENTATION_RESPONSE" \
  --source src/app/willowops-prototype/page.tsx:1:335 \
  --source src/app/willowops-prototype/ScenarioRunner.tsx:1:183 \
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
