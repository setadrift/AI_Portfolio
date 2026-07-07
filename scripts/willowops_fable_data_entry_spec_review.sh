#!/usr/bin/env bash
set -euo pipefail

TASK="willowops-data-entry-spec-review"
PACKET_DIR=".tmp/fable-packets"
SPEC_PATH="docs/willow-grey-data-entry-intake-build-spec.md"
MAX_PACKET_TOKENS="9000"
MAX_INPUT_TOKENS="12000"
MAX_OUTPUT_TOKENS="4000"
EFFORT="medium"

usage() {
  cat <<'USAGE'
Usage:
  scripts/willowops_fable_data_entry_spec_review.sh
      Build a fresh evidence packet and run the Fable dry-run preview only.

  scripts/willowops_fable_data_entry_spec_review.sh --run PACKET_PATH APPROVAL_ID
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

if [[ ! -f "$SPEC_PATH" ]]; then
  echo "Missing data-entry spec: $SPEC_PATH" >&2
  exit 1
fi

mkdir -p "$PACKET_DIR"

before_listing="$(mktemp)"
after_listing="$(mktemp)"
trap 'rm -f "$before_listing" "$after_listing"' EXIT

find "$PACKET_DIR" -maxdepth 1 -type f -name "*-${TASK}.md" -print | sort > "$before_listing"

python3 scripts/build_fable_packet.py \
  --task "$TASK" \
  --title "WillowOps data-entry intake spec review" \
  --question "Review whether the data-entry intake build spec is the safest, most credible prototype direction for Willow Grey and what should change before implementation." \
  --max-estimated-tokens "$MAX_PACKET_TOKENS" \
  --note "User wants a generic, boring, repeatable AI implementation tied to manual data entry hours Lucy mentioned." \
  --note "Avoid overfitting to interiors-specific supplier, enquiry, or procurement assumptions." \
  --note "Review the spec; do not write code." \
  --source "$SPEC_PATH"

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
