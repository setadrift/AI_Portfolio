#!/usr/bin/env bash
set -euo pipefail

TASK="willowops-followup-prototype"
PACKET_DIR=".tmp/fable-packets"
MAX_PACKET_TOKENS="14000"
MAX_INPUT_TOKENS="18000"
MAX_OUTPUT_TOKENS="2500"
EFFORT="medium"

usage() {
  cat <<'USAGE'
Usage:
  scripts/willowops_fable_targeted_prototype.sh
      Build a fresh evidence packet and run the Fable dry-run preview only.

  scripts/willowops_fable_targeted_prototype.sh --run PACKET_PATH APPROVAL_ID
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

mkdir -p "$PACKET_DIR"

before_listing="$(mktemp)"
after_listing="$(mktemp)"
trap 'rm -f "$before_listing" "$after_listing"' EXIT

find "$PACKET_DIR" -maxdepth 1 -type f -name "*-${TASK}.md" -print | sort > "$before_listing"

python3 scripts/build_fable_packet.py \
  --task "$TASK" \
  --title "WillowOps targeted prototype build direction" \
  --question "What is the single best targeted prototype to build next so the follow-up feels credible, simple, and directly tied to Willow Grey's disconnected-tool and manual-admin pain?" \
  --max-estimated-tokens "$MAX_PACKET_TOKENS" \
  --note "Audience: Lucy Howson and Willow Grey leadership after an initial interview." \
  --note "Interview signal: they described many tools, little communication between tools, and a lot of manual admin handoff." \
  --note "Positioning goal: show the advantage of an independent contractor by proposing a small, well-scoped workflow with immediate lift." \
  --note "Job context: connect Monday.com, Studio Designer, Microsoft 365, Outlook, Xero, WhatsApp, Make.com, Zapier, and AI platforms where useful." \
  --note "Prototype goal: show one simple business problem solved by connected systems, not a broad internal platform." \
  --note "Budget preference: spend up to about one dollar if the extra context improves the recommendation." \
  --source src/app/willowops-prototype/page.tsx:1:335 \
  --source src/app/willowops-prototype/ScenarioRunner.tsx:1:183 \
  --source src/lib/willowops/prototype-data.ts:99:260 \
  --source src/lib/willowops/prototype-data.ts:310:467

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
