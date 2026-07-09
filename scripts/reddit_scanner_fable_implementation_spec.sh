#!/usr/bin/env bash
set -euo pipefail

TASK="reddit-lead-scanner-implementation-spec"
SYSTEM_PROMPT="prompts/fable/system/ai-consulting-product-reviewer.md"
PACKET_DIR=".tmp/fable-packets"
EVIDENCE_DIR=".tmp/fable-evidence/reddit-scanner-implementation-spec"
REDESIGN_RESPONSE="${REDESIGN_RESPONSE:-}"
MAX_PACKET_TOKENS="58000"
MAX_INPUT_TOKENS="70000"
MAX_OUTPUT_TOKENS="10000"
EFFORT="high"

usage() {
  cat <<'USAGE'
Usage:
  scripts/reddit_scanner_fable_implementation_spec.sh
      Build a Fable evidence packet for a comprehensive Reddit scanner
      implementation spec and run dry-run preview only. This does not call
      Anthropic.

  REDESIGN_RESPONSE=.tmp/fable-runs/...-response.md scripts/reddit_scanner_fable_implementation_spec.sh
      Use a specific prior Fable redesign response.

  scripts/reddit_scanner_fable_implementation_spec.sh --run PACKET_PATH APPROVAL_ID
      Make the real Fable call using a reviewed packet and approval id.

Default mode never calls Anthropic. It writes local evidence under
.tmp/fable-evidence/reddit-scanner-implementation-spec/, writes a packet under
.tmp/fable-packets/, estimates cost, and prints the exact approved-run command
emitted by scripts/fable_eval.py.
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
    --system-prompt "$SYSTEM_PROMPT" \
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

if [[ -z "$REDESIGN_RESPONSE" ]]; then
  REDESIGN_RESPONSE="$(ls -t .tmp/fable-runs/*-reddit-lead-scanner-redesign-response.md 2>/dev/null | head -n 1 || true)"
fi

if [[ -z "$REDESIGN_RESPONSE" || ! -f "$REDESIGN_RESPONSE" ]]; then
  echo "Missing prior Fable redesign response. Set REDESIGN_RESPONSE=path/to/response.md." >&2
  exit 1
fi

mkdir -p "$PACKET_DIR" "$EVIDENCE_DIR"

node --input-type=module <<'NODE'
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { get } from "@vercel/blob";

async function loadDotEnv(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return Object.fromEntries(
      raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const index = line.indexOf("=");
          return [
            line.slice(0, index).trim(),
            line.slice(index + 1).trim().replace(/^["']|["']$/g, ""),
          ];
        }),
    );
  } catch {
    return {};
  }
}

function section(markdown, heading) {
  return (markdown.split(`\n## ${heading}\n`)[1] || "").split(/\n## /)[0] || "";
}

function leadBlocks(sectionText) {
  return sectionText
    .split(/\n(?=### [1-5]\/5 - )/g)
    .filter((block) => block.startsWith("### "));
}

function field(block, label) {
  const match = block.match(new RegExp(`^- ${label}: (.*)$`, "m"));
  return match?.[1]?.trim() || "";
}

function summarizeLead(block) {
  const heading = block.match(/^### ([1-5])\/5 - r\/(.+?) - (.+)$/m);
  return {
    score: heading?.[1] || "",
    subreddit: heading?.[2] || "",
    title: heading?.[3] || "",
    postedDate: field(block, "Posted date"),
    url: field(block, "URL"),
    author: field(block, "Author"),
    pattern: field(block, "Pattern"),
    leadType: field(block, "Lead type"),
    buyerSituation: field(block, "Buyer situation"),
    queue: field(block, "Queue"),
    recommendedAction: field(block, "Recommended action"),
    evidenceSummary: field(block, "Evidence summary"),
    explicitEvidence: field(block, "Explicit evidence"),
    missingEvidence: field(block, "Missing evidence"),
    sourceSnippet: field(block, "Source quote or snippet"),
    sourceQuery: field(block, "Source query"),
  };
}

const env = { ...(await loadDotEnv(".env.local")), ...process.env };
if (env.BLOB_READ_WRITE_TOKEN) {
  process.env.BLOB_READ_WRITE_TOKEN = env.BLOB_READ_WRITE_TOKEN;
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error("Missing BLOB_READ_WRITE_TOKEN. Add it to .env.local or export it.");
}

const result = await get("admin/leads/latest.json", {
  access: "private",
  useCache: false,
});
if (!result || result.statusCode !== 200) {
  throw new Error(`Failed to fetch admin/leads/latest.json: ${result?.statusCode ?? "unknown"}`);
}

const raw = await new Response(result.stream).text();
const payload = JSON.parse(raw);
const reddit = payload.sources?.find((source) => source.id === "reddit");
if (!reddit?.markdown) {
  throw new Error("Published lead bundle did not include a Reddit markdown source.");
}

await mkdir(".tmp/fable-evidence/reddit-scanner-implementation-spec", { recursive: true });

const replyToday = leadBlocks(section(reddit.markdown, "Reply Today")).map(summarizeLead);
const watch = leadBlocks(section(reddit.markdown, "Maybe / Watch")).map(summarizeLead);
const failureSummary = [
  "# Latest Reddit Scanner Failure Summary",
  "",
  `- published_file: ${reddit.fileName || "unknown"}`,
  `- generated_at: ${reddit.status?.generatedAt || "unknown"}`,
  `- scan_mode: ${reddit.status?.scanMode || "unknown"}`,
  `- raw_posts_fetched: ${reddit.status?.fetchedPosts ?? "unknown"}`,
  `- candidates_scored: ${reddit.status?.candidatesScored ?? "unknown"}`,
  `- reply_today_count: ${replyToday.length}`,
  `- watch_count: ${watch.length}`,
  "",
  "## Human Review Of Latest Reply Today Leads",
  "",
  "- r/UnaAI / FP&A technical skills article: thought leadership or content, not a buyer asking for help.",
  "- r/TalesFromTheCreeps / The Scanner: fiction/story content, complete false positive.",
  "- r/PropertyManagement / landlord asking whether to switch PM company: real pain, but consumer/landlord vendor-selection problem, not AI/workflow consulting buyer intent.",
  "- r/AIDevelopmentSolution / top real estate app development companies: promotional/listicle content, likely seller or SEO.",
  "- r/AI_Agents / visual developer agent post: product/builder discussion or promotion, not a business buyer.",
  "",
  "## Reply Today JSON Summary",
  "",
  "```json",
  JSON.stringify(replyToday, null, 2),
  "```",
  "",
  "## Watch JSON Summary",
  "",
  "```json",
  JSON.stringify(watch, null, 2),
  "```",
  "",
  "## Status Summary JSON",
  "",
  "```json",
  JSON.stringify(
    {
      ok: reddit.status?.ok,
      generatedAt: reddit.status?.generatedAt,
      scanMode: reddit.status?.scanMode,
      fetchedPosts: reddit.status?.fetchedPosts,
      candidatesScored: reddit.status?.candidatesScored,
      leadsIncluded: reddit.status?.leadsIncluded,
      queryDiagnostics: reddit.status?.queryDiagnostics,
      sourceFamilyDiagnostics: reddit.status?.sourceFamilyDiagnostics,
    },
    null,
    2,
  ),
  "```",
  "",
].join("\n");

await writeFile(
  ".tmp/fable-evidence/reddit-scanner-implementation-spec/latest-reddit-failure-summary.md",
  failureSummary,
);
console.log("Wrote Reddit implementation evidence under .tmp/fable-evidence/reddit-scanner-implementation-spec/");
NODE

before_listing="$(mktemp)"
after_listing="$(mktemp)"
trap 'rm -f "$before_listing" "$after_listing"' EXIT

find "$PACKET_DIR" -maxdepth 1 -type f -name "*-${TASK}.md" -print | sort > "$before_listing"

python3 scripts/build_fable_packet.py \
  --task "$TASK" \
  --title "Reddit lead scanner implementation spec" \
  --question "Create a comprehensive implementation spec for rebuilding Duncan's Reddit-only lead scanner around quote-grounded speaker/intent classification, using the prior Fable redesign response as the accepted product direction." \
  --max-estimated-tokens "$MAX_PACKET_TOKENS" \
  --note "This is Reddit-only. Do not propose job boards, n8n community, Upwork, marketplaces, or broad web search." \
  --note "Duncan's target lead is a real business owner/operator/manager/responsible employee who may want to hire an AI/workflow implementation expert; do not optimize for generic AI discussion, tool mentions, or curiosity." \
  --note "Do not overfit to property/real-estate, Monday/Zapier/Make, the latest failed run, or the current scanner architecture. Treat those as evidence and migration context, not product boundaries." \
  --note "The prior Fable redesign response should be treated as context and design direction, not as a final implementation spec." \
  --note "Be more concrete than the prior response: define data contracts, JSON schema, pipeline stages, admin UX, fixtures, and staged implementation plan." \
  --note "Codex will implement from this spec later; do not write full code, but include exact enum values, contracts, and test cases." \
  --source "$REDESIGN_RESPONSE" \
  --source "$EVIDENCE_DIR/latest-reddit-failure-summary.md" \
  --source prompts/fable/tasks/reddit-lead-scanner-redesign.md \
  --source docs/reddit-lead-scanner-leadsrover-quality-spec.md:1:120 \
  --source docs/reddit-lead-scanner-leadsrover-quality-spec.md:372:590 \
  --source config/reddit-lead-monitor.json:1:260 \
  --source config/reddit-lead-feedback.json:1:179 \
  --source scripts/reddit-lead-monitor.mjs:631:735 \
  --source scripts/reddit-lead-monitor.mjs:2072:2123 \
  --source scripts/reddit-lead-monitor.mjs:2124:2525 \
  --source scripts/reddit-lead-monitor.mjs:2661:2810 \
  --source scripts/reddit-lead-monitor.mjs:2965:3103 \
  --source src/lib/portal/admin/leads.ts:20:180 \
  --source src/lib/portal/admin/leads.ts:954:1045 \
  --source src/lib/portal/admin/lead-db.ts:12:79 \
  --source src/lib/portal/admin/lead-db.ts:139:238 \
  --source src/lib/portal/admin/lead-db.ts:238:380 \
  --source src/app/portal/admin/leads/LeadsDashboard.tsx:24:180 \
  --source src/app/portal/admin/leads/LeadsDashboard.tsx:1061:1235 \
  --source src/app/api/portal/admin/leads/run/route.ts:84:131 \
  --source scripts/lib/supabase-admin-leads.mjs:1:180 \
  --source scripts/fixtures/reddit-lead-scanner-quality.json:1:260 \
  --source scripts/fixtures/reddit-lead-scanner-quality.json:400:470

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
  --system-prompt "$SYSTEM_PROMPT" \
  --packet "$packet_path" \
  --max-input-tokens "$MAX_INPUT_TOKENS" \
  --max-tokens "$MAX_OUTPUT_TOKENS" \
  --effort "$EFFORT" \
  --dry-run
