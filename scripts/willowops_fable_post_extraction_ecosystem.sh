#!/usr/bin/env bash
set -euo pipefail

TASK="willowops-post-extraction-ecosystem"
PACKET_DIR=".tmp/fable-packets"
MAX_PACKET_TOKENS="9000"
MAX_INPUT_TOKENS="13000"
MAX_OUTPUT_TOKENS="16000"
EFFORT="medium"

usage() {
  cat <<'USAGE'
Usage:
  scripts/willowops_fable_post_extraction_ecosystem.sh
      Build a fresh evidence packet and run the Fable dry-run preview only.

  scripts/willowops_fable_post_extraction_ecosystem.sh --run PACKET_PATH APPROVAL_ID
      Make the real Fable call using a reviewed packet and approval id.

Default mode never calls Anthropic. It writes a local packet, estimates cost,
and prints the exact approved-run command emitted by scripts/fable_eval.py.
The real response should include a short implementation spec and complete
replacement contents for src/app/willowops-prototype/ScenarioRunner.tsx.
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
  --title "WillowOps post-extraction ecosystem revision" \
  --question "Design and implement the final two post-extraction panels so they clearly show human approval and how reviewed fields map into Willow Grey's broader ecosystem, without redesigning the rest of the prototype." \
  --max-estimated-tokens "$MAX_PACKET_TOKENS" \
  --note "User only wants Fable to handle the final two post-extraction areas: review/human approval and ecosystem routing after fields are extracted." \
  --note "Do not change the extraction API, page.tsx, sample PDF, upload flow, loading state, or technical appendix behavior." \
  --note "Public-site context: Willow Grey offers interior design and project management; their work includes proposals, cost estimates, item specifications, purchasing, supplier issues, out-of-stock/damaged goods, trades, installation, and client updates." \
  --note "Keep it minimal. No workflow strip, no heavy diagram, no dashboard. Make the two panels clearer and more ecosystem-aware." \
  --source src/app/willowops-prototype/ScenarioRunner.tsx

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
