#!/usr/bin/env bash
set -euo pipefail

TASK="willowops-data-entry-spec-revision"
PACKET_DIR=".tmp/fable-packets"
SPEC_PATH="docs/willow-grey-data-entry-intake-build-spec.md"
REVIEW_PATH=".tmp/fable-runs/20260706T145513Z-willowops-data-entry-spec-review-response.md"
MAX_PACKET_TOKENS="12000"
MAX_INPUT_TOKENS="15000"
MAX_OUTPUT_TOKENS="6000"
EFFORT="medium"

usage() {
  cat <<'USAGE'
Usage:
  scripts/willowops_fable_data_entry_spec_revision.sh
      Build a fresh evidence packet and run the Fable dry-run preview only.

  scripts/willowops_fable_data_entry_spec_revision.sh --run PACKET_PATH APPROVAL_ID
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

for required_file in "$SPEC_PATH" "$REVIEW_PATH"; do
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
  --title "WillowOps data-entry intake spec revision" \
  --question "Revise the data-entry intake build spec into an implementation-ready spec that avoids overfitting to the existing page or supplier-update prototype." \
  --max-estimated-tokens "$MAX_PACKET_TOKENS" \
  --note "The existing prototype page and runner are intentionally omitted. The next build should be from scratch." \
  --note "Incorporate the Fable review feedback: remove supplier-delay/procurement overfit, make every extracted field traceable, show confidence, and simplify review states." \
  --note "Do not write code. Return a revised build spec only." \
  --source "$SPEC_PATH" \
  --source "$REVIEW_PATH"

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
