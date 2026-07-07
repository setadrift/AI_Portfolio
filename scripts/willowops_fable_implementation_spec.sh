#!/usr/bin/env bash
set -euo pipefail

TASK="willowops-implementation-spec"
PACKET_DIR=".tmp/fable-packets"
PRIOR_RESPONSE=".tmp/fable-runs/20260706T135942Z-willowops-followup-prototype-response.md"
MAX_PACKET_TOKENS="18000"
MAX_INPUT_TOKENS="22000"
MAX_OUTPUT_TOKENS="3200"
EFFORT="medium"

usage() {
  cat <<'USAGE'
Usage:
  scripts/willowops_fable_implementation_spec.sh
      Build a fresh evidence packet and run the Fable dry-run preview only.

  scripts/willowops_fable_implementation_spec.sh --run PACKET_PATH APPROVAL_ID
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

if [[ ! -f "$PRIOR_RESPONSE" ]]; then
  echo "Missing prior Fable recommendation: $PRIOR_RESPONSE" >&2
  exit 1
fi

mkdir -p "$PACKET_DIR"

before_listing="$(mktemp)"
after_listing="$(mktemp)"
trap 'rm -f "$before_listing" "$after_listing"' EXIT

find "$PACKET_DIR" -maxdepth 1 -type f -name "*-${TASK}.md" -print | sort > "$before_listing"

python3 scripts/build_fable_packet.py \
  --task "$TASK" \
  --title "WillowOps enquiry-to-discovery implementation spec" \
  --question "What exact implementation spec should Codex follow to rebuild the WillowOps prototype around one enquiry-to-discovery workflow while staying buyer-facing and technically honest?" \
  --max-estimated-tokens "$MAX_PACKET_TOKENS" \
  --note "Audience: Lucy Howson and Willow Grey leadership after an initial interview." \
  --note "Interview signal: disconnected tools, low communication between systems, and manual admin handoffs." \
  --note "Prior Fable recommendation: narrow to one story: Monday enquiry -> AI discovery brief -> reviewed Outlook draft -> board update." \
  --note "Constraint: do not imply live integrations unless the current code proves them; label simulated data clearly." \
  --note "Implementation goal: produce a scoped spec for editing the current Next.js prototype, not a strategy memo." \
  --source "$PRIOR_RESPONSE" \
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
