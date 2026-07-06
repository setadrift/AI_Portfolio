#!/usr/bin/env bash
set -euo pipefail

TASK="willowops-supplier-update-revision"
PACKET_DIR=".tmp/fable-packets"
MAX_PACKET_TOKENS="26000"
MAX_INPUT_TOKENS="32000"
MAX_OUTPUT_TOKENS="20000"
EFFORT="medium"

usage() {
  cat <<'USAGE'
Usage:
  scripts/willowops_fable_supplier_revision.sh
      Build a fresh evidence packet and run the Fable dry-run preview only.

  scripts/willowops_fable_supplier_revision.sh --run PACKET_PATH APPROVAL_ID
      Make the real Fable call using a reviewed packet and approval id.

Default mode never calls Anthropic. It writes a local packet, estimates cost,
and prints the exact approved-run command emitted by scripts/fable_eval.py.
The real response should contain complete replacement contents for page.tsx and
ScenarioRunner.tsx.
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
  --title "WillowOps supplier-update prototype revision" \
  --question "Generate complete replacement contents for page.tsx and ScenarioRunner.tsx to revise the WillowOps prototype into a safer supplier-update/project-action demo." \
  --max-estimated-tokens "$MAX_PACKET_TOKENS" \
  --note "User decision: move away from enquiry/discovery because it assumes too much about Willow Grey's sales process and domain judgment." \
  --note "New target: a boring, repeatable supplier-update/procurement-chaser workflow that gives clear admin lift." \
  --note "Research signal: interior design operations commonly involve vendor order tracking, procurement, delivery changes, project communication, and inbox/document chasing." \
  --note "Return exactly two file sections with complete TypeScript contents. Do not return a patch or diff." \
  --note "Edit only src/app/willowops-prototype/page.tsx and src/app/willowops-prototype/ScenarioRunner.tsx." \
  --source src/app/willowops-prototype/page.tsx \
  --source src/app/willowops-prototype/ScenarioRunner.tsx \
  --source src/lib/willowops/prototype-data.ts:138:260 \
  --source src/lib/willowops/prototype-data.ts:261:360 \
  --source src/app/api/willowops/studio-designer/import/route.ts \
  --source src/app/api/willowops/whatsapp/message-draft/route.ts

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
