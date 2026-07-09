#!/usr/bin/env bash
set -euo pipefail

TASK="reddit-lead-scanner-redesign"
SYSTEM_PROMPT="prompts/fable/system/ai-consulting-product-reviewer.md"
PACKET_DIR=".tmp/fable-packets"
EVIDENCE_DIR=".tmp/fable-evidence/reddit-scanner-redesign"
MAX_PACKET_TOKENS="27000"
MAX_INPUT_TOKENS="30000"
MAX_OUTPUT_TOKENS="4500"
EFFORT="medium"

usage() {
  cat <<'USAGE'
Usage:
  scripts/reddit_scanner_fable_redesign.sh
      Fetch the latest published Reddit lead source, build a Fable evidence
      packet, and run the dry-run preview only. This does not call Anthropic.

  scripts/reddit_scanner_fable_redesign.sh --run PACKET_PATH APPROVAL_ID
      Make the real Fable call using a reviewed packet and approval id.

Default mode never calls Anthropic. It writes local evidence under
.tmp/fable-evidence/reddit-scanner-redesign/, writes a packet under
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

await mkdir(".tmp/fable-evidence/reddit-scanner-redesign", { recursive: true });
await writeFile(
  ".tmp/fable-evidence/reddit-scanner-redesign/published-reddit-source.json",
  JSON.stringify(
    {
      fileName: reddit.fileName,
      status: reddit.status,
    },
    null,
    2,
  ) + "\n",
);
await writeFile(
  ".tmp/fable-evidence/reddit-scanner-redesign/latest-reddit-digest.md",
  reddit.markdown,
);

const replyToday = leadBlocks(section(reddit.markdown, "Reply Today")).map(summarizeLead);
const watch = leadBlocks(section(reddit.markdown, "Maybe / Watch")).map(summarizeLead);
const summary = [
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
  "## Codex Review Of Latest Reply Today Leads",
  "",
  "These are the latest promoted Reddit leads and why Duncan judged them poor quality:",
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
  "## Status JSON",
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
      sourceFamilyDiagnostics: reddit.status?.sourceFamilyDiagnostics,
    },
    null,
    2,
  ),
  "```",
  "",
].join("\n");
await writeFile(
  ".tmp/fable-evidence/reddit-scanner-redesign/latest-reddit-failure-summary.md",
  summary,
);

console.log("Wrote Reddit evidence files under .tmp/fable-evidence/reddit-scanner-redesign/");
NODE

before_listing="$(mktemp)"
after_listing="$(mktemp)"
trap 'rm -f "$before_listing" "$after_listing"' EXIT

find "$PACKET_DIR" -maxdepth 1 -type f -name "*-${TASK}.md" -print | sort > "$before_listing"

python3 scripts/build_fable_packet.py \
  --task "$TASK" \
  --title "Reddit lead scanner redesign for AI consulting buyers" \
  --question "From first principles, redesign the Reddit-only lead-finding tool Duncan should use for AI consulting buyer discovery, using the current scanner and latest failed output only as evidence of what not to preserve." \
  --max-estimated-tokens "$MAX_PACKET_TOKENS" \
  --note "Do not run or recommend non-Reddit sources. This is Reddit-only, but the current scripts, queues, fields, and digest shape are not sacred." \
  --note "The latest published Reddit run fetched 362 posts, scored 16, and promoted 5 Reply Today leads; Duncan judged the promoted leads very poor." \
  --note "The desired scanner should identify the speaker and intent first: business operator with their own problem, help-seeking behavior, plausible paid AI/workflow help, and natural public reply path." \
  --note "A scan returning zero Contact Today leads is acceptable and preferable to a full queue of weak false positives." \
  --note "Use the current implementation snippets only to understand the failure mode and migration path; do not assume the correct answer is to patch the current scoring model." \
  --source "$EVIDENCE_DIR/latest-reddit-failure-summary.md" \
  --source docs/reddit-lead-scanner-leadsrover-quality-spec.md:1:120 \
  --source docs/reddit-lead-scanner-leadsrover-quality-spec.md:372:590 \
  --source config/reddit-lead-monitor.json:1:170 \
  --source scripts/reddit-lead-monitor.mjs:631:735 \
  --source scripts/reddit-lead-monitor.mjs:2124:2420 \
  --source scripts/reddit-lead-monitor.mjs:2472:2525 \
  --source scripts/reddit-lead-monitor.mjs:2965:3103 \
  --source scripts/fixtures/reddit-lead-scanner-quality.json:1:220 \
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
