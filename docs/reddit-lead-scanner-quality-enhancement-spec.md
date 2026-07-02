# Reddit Lead Scanner Quality Enhancement Spec

## Purpose

The current Reddit scanner is useful for explicit implementation requests, but it still over-indexes on posts that already say "automation", "Airtable", "Zapier", "Make", "CRM", or "paid help". Those posts are valid, but they are usually crowded, tool-specific, or low-differentiation.

The next enhancement should make the scanner better at finding consulting-fit Reddit posts where the poster describes a real operational breakdown before they know they need AI or automation help.

This spec builds on `docs/reddit-lead-scanner-cleanup-spec.md`. The cleanup spec established scan modes, global Reddit search, and broader community-pain admission. This spec defines the end-to-end implementation needed to improve lead quality, outreach posture, admin review, and validation.

## Current State

### Existing Inputs

- `config/reddit-lead-monitor.json` defines four scan modes:
  - `broad-buyer-intent`
  - `staffing-recruiting`
  - `local-service-ops`
  - `tool-specific-automation`
- Each mode has `channels` and `searchQueries`.
- `scripts/reddit-lead-monitor.mjs` fetches subreddit feeds and global Reddit search results, filters candidates, scores them with an LLM or deterministic fallback, writes a dated markdown digest, and writes `latest-status.json`.
- `/api/portal/admin/leads/run` accepts `mode`, runs `scripts/reddit-lead-monitor.mjs`, then publishes through bundled app code when Blob publishing is available.
- `src/lib/portal/admin/leads.ts` parses digest markdown into portal rows and already supports parser fields that Reddit output does not fully use yet, including:
  - `Lead type`
  - `Free-to-pursue path`
  - `Recommended action`
  - `postedDate`
  - `discoveredDate`
- Production portal publishing depends on bundled app code in `src/lib/portal/admin/leads.ts`; any implementation that adds script helpers or config files must verify that the production route can still read the files it needs.

### Existing Quality Problem

The scorer currently caps many advice-shaped posts through `isAdviceOnlyPost()`. That is correct for generic "what CRM should I use?" threads, but it is too blunt for advice-shaped posts with specific business pain, such as:

- a service business outgrowing spreadsheets for live project profitability,
- an owner managing daily recurring department tasks by whiteboard and photo messages,
- a recruiter losing hours on intake-call-to-outreach handoff,
- a tax or bookkeeping operator trying to split, rename, classify, or reconcile documents,
- a local service operator missing calls, quotes, or follow-ups.

The scanner needs to distinguish:

- generic advice: low score or watch,
- operational pain with no explicit buying language: comment-first lead,
- explicit paid/project request: DM-now lead.

## Goals

1. Add an archetype-based discovery layer across verticals and failure modes.
2. Preserve strict rejection of sellers, job seekers, market research, and vague AI curiosity.
3. Separate lead quality from outreach posture so a 4/5 consulting-fit lead can still be "comment first" rather than "DM now".
4. Improve Reddit search queries using fielded and boolean search syntax supported by Reddit search.
5. Add optional comment-context enrichment so suggested replies do not repeat existing comments.
6. Surface lead type, archetype, vertical, failure mode, and outreach posture in the digest and portal.
7. Preserve posted-date freshness and parser-facing markdown contracts.
8. Keep all outreach manual. No automatic Reddit comments or DMs.

## Non-Goals

- No automated posting, automated DMs, inbox access, cookie use, login-only scraping, or API bypassing.
- No lead-padding to hit an arbitrary count.
- No weakening of freshness rules by using discovery date as posted date.
- No migration to a separate lead system.
- No marketplace-only fallback when Reddit is thin.

## Product Model

### Lead Score

`score` remains a 1 to 5 fit score.

- `5`: explicit paid/hiring/project request with a clear implementation path.
- `4`: specific recurring business workflow pain with strong consulting fit, even if the correct action is only a public comment.
- `3`: useful watch item, advice thread, broad tool recommendation, or early trust-building opportunity without enough operational specificity.
- `1-2`: seller, job seeker, market research, vague discussion, or poor fit.

### Outreach Posture

Add `outreachPosture` as a distinct field from `score`.

Allowed values:

- `dm_now`: explicit paid help, implementation request, project scope, budget, or hiring language.
- `dm_if_engaged`: strong fit, but DM only after OP replies, asks a follow-up, or profile allows contact and the community norms are permissive.
- `comment_first`: real operational pain where a useful public reply is the right first move.
- `watch`: useful pattern or weak signal; do not engage yet.
- `ignore`: reject.

Mapping to existing `recommendedAction`:

- `dm_now` -> `dm`
- `dm_if_engaged` -> `dm_if_engaged`
- `comment_first` -> `comment`
- `watch` -> `watch`
- `ignore` -> `ignore`

The portal can continue using `recommendedAction` for queue behavior while the digest and parser expose `Outreach posture` for clarity.

## Archetype Model

Add an explicit archetype layer. Each archetype represents a vertical plus a failure mode. This should live in `config/reddit-lead-monitor.json` so tuning does not require code edits.

Proposed config shape:

```json
{
  "archetypePacks": [
    {
      "id": "service-project-profitability",
      "label": "Service project profitability",
      "vertical": "local_service_ops",
      "failureMode": "job_costing_visibility",
      "defaultOutreachPosture": "comment_first",
      "channels": [
        { "id": "smallbusiness", "label": "Small business", "subreddit": "smallbusiness" },
        { "id": "sweatystartup", "label": "Sweaty Startup", "subreddit": "sweatystartup" }
      ],
      "searchQueries": [
        "title:(\"keep track\" OR \"tracking\") selftext:(profitability OR budget OR progress)",
        "\"outgrown spreadsheets\" OR \"outgrowing spreadsheets\"",
        "\"project profitability\" \"spreadsheet\"",
        "\"budgets\" \"progress\" \"who's working on what\""
      ],
      "positiveSignals": ["spreadsheet", "budget", "progress", "profitability", "client projects"],
      "painSignals": ["outgrown", "harder to get a quick view", "can't keep track"],
      "rejectSignals": ["template", "course", "market research"]
    }
  ]
}
```

### Initial Archetype Packs

Implement these as the first end-to-end set.

| Archetype ID | Vertical | Failure Mode | Default Posture | Why It Matters |
| --- | --- | --- | --- | --- |
| `service-project-profitability` | local services/agencies | job costing and live project visibility | `comment_first` | Strong consulting fit when owners have clients, budgets, progress, and staffing visibility problems. |
| `daily-team-tasking` | local services/operators | recurring team tasks and department checklists | `comment_first` | AI/internal tooling can turn whiteboards, photos, and memory-based tasks into operating dashboards. |
| `sop-client-onboarding` | agencies/consultants/property services | repeated onboarding and knowledge capture | `comment_first` | Good trust-building lead; often precedes first hire or delegation. |
| `recruiting-handoff-drift` | recruiting/staffing | intake-call to outreach, screening, scorecards, ATS handoff | `dm_if_engaged` | Clear time loss and process breakdown; stronger than generic candidate sourcing threads. |
| `tax-document-intake` | tax/accounting/bookkeeping | client documents, PDF splitting, OCR, K-1/PBC timing | `comment_first` | High-value seasonal workflows where AI can classify, summarize, route, and reconcile documents. |
| `invoice-payment-reconciliation` | small business/bookkeeping | invoice/payment matching and receipt reconciliation | `comment_first` | Direct ROI and easy before/after demo path. |
| `crm-source-of-truth` | small business/nonprofits/agencies | CRM migration, adoption, SMS/email follow-up, donor or client source of truth | `comment_first` | High fit when poster gives current stack, volume, or process breakdown. |
| `local-service-revenue-leak` | trades/local services | missed calls, slow quote follow-up, scheduling, dispatch, customer messages | `comment_first` | Captures revenue leakage without requiring the word automation. |

### Primary And Secondary Archetype Matches

A post can match more than one archetype. The implementation should keep all matches internally, but emit one primary `leadType` for parser and portal compatibility.

Primary selection order:

1. Explicit paid/project archetype match, if any.
2. Highest evidence count from that archetype's `positiveSignals` plus `painSignals`.
3. Scan-mode archetype order as a deterministic tie breaker.

Optional extra fields:

- `matchedLeadTypes`: comma-separated archetype IDs for diagnostics.
- `matchEvidence`: short phrase list used for debugging and tuning.

### Scan Mode Relationship

Keep the four existing scan modes for operator familiarity, but let each mode reference archetype packs.

Proposed scan mode shape:

```json
{
  "id": "local-service-ops",
  "label": "Local service ops",
  "description": "Local operators with scheduling, intake, follow-up, quoting, project visibility, and daily tasking pain.",
  "archetypePackIds": [
    "service-project-profitability",
    "daily-team-tasking",
    "sop-client-onboarding",
    "local-service-revenue-leak",
    "invoice-payment-reconciliation"
  ]
}
```

Implementation should support both:

- existing `channels` and `searchQueries` directly on a scan mode,
- new `archetypePackIds` that expand to channels, search queries, signals, and metadata.

This makes the change backward-compatible.

## Search Query Strategy

Reddit search supports manual filters like `title:`, `selftext:`, `subreddit:`, quoted phrases, and boolean `AND`, `OR`, `NOT`, with grouping. The scanner should treat search queries as raw Reddit search strings and preserve that syntax when calling `/search`.

Reference: https://support.reddithelp.com/hc/en-us/articles/19696541895316-Available-search-features

### Query Compatibility

The official syntax supports field filters and boolean grouping, but grouped field expressions such as `title:("keep track" OR "tracking")` should be treated as candidates that require live smoke validation. Each archetype should also include conservative fallback queries that use simple quoted phrases and ungrouped field filters, because Reddit search behavior can be uneven across UI, API, and query shapes.

Implementation requirements:

- Preserve each configured query string exactly when sending `q` to `/search`.
- Record per-query fetched count and error state in the digest or status diagnostics.
- Keep at least one simple fallback query per archetype.
- During rollout, run a query smoke for every new fielded query family and replace any query that returns clearly irrelevant results.

### Query Families

#### Service Project Profitability

- `"outgrown spreadsheets" OR "outgrowing spreadsheets"`
- `title:("keep track" OR "tracking") selftext:(profitability OR budget OR progress)`
- `"project profitability" spreadsheet`
- `"budgets" "progress" "who's working on what"`

#### Daily Team Tasking

- `"whiteboard" "tasks" "employees"`
- `"daily recurring tasks" employees`
- `"who is doing what" tasks`
- `"task list" "photo" "end of the day"`
- `"3 departments" tasks`

#### SOP And Onboarding

- `"reinventing the wheel" "client onboarding"`
- `"SOP" "client onboarding"`
- `"first hire" onboarding SOP`
- `"write down how I do it"`
- `"systematize" "client onboarding"`

#### Recruiting Workflow

- `subreddit:recruiting ("intake call" OR "brief drift" OR "handoff")`
- `"10 hours" "intake" "outreach"`
- `"screening applicants" "takes forever"`
- `"hundreds of applications" screening`
- `"ATS" "manual" scorecard`
- `"candidate follow up" manual`

#### Tax And Bookkeeping Document Intake

- `subreddit:taxpros ("client documents" OR "split" OR "rename" OR "OCR")`
- `subreddit:taxpros ("K-1" OR "PBC" OR "fund admin" OR "client docs")`
- `subreddit:Bookkeeping ("receipts" OR "scan" OR "Excel" OR "manual")`
- `"single pdf" "split" "rename" "client documents"`
- `"loose box" receipts spreadsheet`

#### Invoice And Payment Reconciliation

- `"manually matching" invoices bank payments`
- `"invoice tracking" "spreadsheet" "payments"`
- `"bank transactions" invoices receipts`
- `"customer pays" "multiple payments" invoice`

#### CRM Source Of Truth

- `subreddit:CRM ("consultancy" OR "donor" OR "SMS" OR "Xero" OR "small team")`
- `"CRM" "follow up" "spreadsheet"`
- `"client source of truth" CRM`
- `"moving from spreadsheet" CRM`

#### Local Service Revenue Leakage

- `"missed calls" leads business`
- `"quote requests" "follow up" manual`
- `"too many customer messages"`
- `"dispatch" spreadsheet`
- `"scheduling appointments" mess`

## Filtering And Scoring Changes

### Add Strong Advice-Pain Detection

Replace the blunt advice cap with two distinct concepts:

- `isGenericAdviceOnlyPost(post)`: generic tool or recommendation thread with no concrete business pain.
- `isAdviceShapedOperationalPain(post)`: asks for advice but includes business context, current broken process, volume/frequency, and consequence.

`isAdviceShapedOperationalPain(post)` should require at least three of:

- business context: business, company, agency, clients, customers, team, employees, department, contractor, practice, firm,
- current system: spreadsheet, email, whiteboard, texts, manual, photos, CRM, accounting software, ATS, PDF, portal,
- volume or recurrence: daily, weekly, monthly, every project, many clients, hundreds, busy season, multiple departments,
- operational consequence: missed follow-up, late K-1s, amended returns, slow quotes, lost leads, hard to see progress, takes forever, buried, not scalable,
- request form: how do you handle, what system, when did you outgrow, is there a better way, what did you use.

Scoring rule:

- Generic advice without specific pain remains max 3.
- Advice-shaped operational pain can score 4, but default posture should be `comment_first`.
- Advice-shaped operational pain should not produce `dm_now` unless OP explicitly invites paid help.
- `normalizeLlmScore()` must not re-cap advice-shaped operational pain back to 3 through the existing `!hasConsultingBuyerIntent()` or advice-only checks.

### Candidate Portfolio Selection

The current script sorts all candidates by one priority score before slicing to `maxLlmCandidates`. If that remains unchanged, explicit tool posts and marketplace-like posts can still crowd out softer but better Reddit consulting opportunities.

Before LLM scoring, replace the single global slice with a small portfolio builder:

- reserve slots for each selected archetype pack that has matches,
- cap any one subreddit/source at a configurable share of the scoring pool,
- cap explicit tool-specific posts when running non-tool scan modes,
- guarantee room for `comment_first` candidates that pass advice-shaped operational-pain rules,
- preserve score-priority ordering inside each bucket.

Recommended defaults:

- `maxLlmCandidates`: 60
- `maxCandidatesPerSource`: 12
- `maxCandidatesPerLeadType`: 10
- `minCommentFirstCandidates`: 15 when enough qualified candidates exist
- `maxToolSpecificCandidatesOutsideToolMode`: 12

### Expand Category Handling Without Breaking Parser

Keep the existing `category` enum for compatibility:

- `crm_lead_followup`
- `reporting_automation`
- `document_pdf_automation`
- `spreadsheet_internal_tools`
- `staffing_recruiting`
- `operations_intake`
- `other`

Add new fields:

- `leadType`: archetype ID, such as `tax-document-intake`.
- `vertical`: normalized vertical, such as `tax_accounting`.
- `failureMode`: normalized failure mode, such as `document_intake`.
- `outreachPosture`: normalized posture, such as `comment_first`.

Add corresponding normalizers:

- `allowedOutreachPostures`
- `allowedVerticals`
- `allowedFailureModes`
- `allowedLeadTypes` derived from configured archetype IDs

The LLM JSON schema should require the new fields when LLM scoring is enabled, but `normalizeLlmScore()` must safely default invalid or missing values from deterministic archetype matches so a bad model response cannot break the digest.

In markdown, use parser-friendly bullet lines:

```md
- Category: document_pdf_automation
- Lead type: tax-document-intake
- Vertical: tax_accounting
- Failure mode: document_intake
- Outreach posture: comment_first
- Recommended action: comment
- Free-to-pursue path: Public helpful comment first; DM only if OP replies or explicitly asks for help.
```

### Add Quality Gates

A post can be score 4 only if it passes all of these:

- has business context,
- has specific recurring workflow pain or explicit paid project language,
- is not seller/market research/job seeker/employment-only,
- has a manual, broken, delayed, or high-friction process that an AI consultant can plausibly improve,
- has a safe manual outreach path.

A post can be score 5 only if:

- it asks to hire, pay, scope, build, implement, fix, or find someone,
- the work is consulting/project-shaped rather than a low-wage role,
- the current process and business stakes are clear.

### Comment Safety

Generated public comments must:

- avoid links,
- avoid "I can help" unless OP clearly asks for paid help,
- not repeat already visible comments when comment context is available,
- give one practical diagnostic question or next step,
- avoid overclaiming subreddit-specific expertise.

Generated DMs must:

- be blank for `comment_first` unless OP has explicitly invited private help,
- be conditional for `dm_if_engaged`, with wording that makes it clear it is not the first action,
- include booking/profile links only for `dm_now` or after engagement.

## Comment Context Enrichment

Add a bounded optional enrichment pass for high-priority candidates.

### When To Fetch Comments

Only fetch comments for posts that pass pre-LLM filtering and have candidate priority above the scoring cutoff. Limit to the top `REDDIT_COMMENT_CONTEXT_LIMIT` candidates per run.

Recommended defaults:

- `commentContextEnabled`: true
- `commentContextCandidateLimit`: 15
- `commentLimitPerPost`: 20
- `commentSort`: `top`

### Reddit API Endpoint

Use OAuth API:

```text
GET https://oauth.reddit.com/comments/{articleId}?limit=20&sort=top&raw_json=1
```

Implementation detail:

- Add `redditId` from `post.id` in `parseRedditListing()`.
- Only fetch comments for posts with a `redditId`.
- RSS fallback posts without `redditId` should skip comment enrichment rather than guessing.
- Do not store full raw comment trees in the digest; store a bounded summary only.

Capture:

- OP replies,
- common advice already given,
- whether OP clarified budget, tools, location, stack, or constraints,
- whether the thread rules or mod bot warnings indicate self-promotion risk.

### Output Field

Add a short field to the LLM input:

```json
{
  "commentContext": {
    "opReplies": ["..."],
    "topAdviceThemes": ["ClickUp/Monday already suggested", "paper checklist suggested"],
    "selfPromotionRisk": "high",
    "unansweredAngle": "how to design the process before choosing a tool"
  }
}
```

The LLM should use this to produce a non-duplicative suggested comment.

## Digest Format

Update `buildDigest()` to group by action posture instead of only `Best Leads` and `Maybe / Watch`.

Required sections:

```md
## DM Now

## Comment First

## Watch

## Rejected

## Feed Errors
```

Backward compatibility:

- Keep `## Best Leads` during the first rollout if parser changes are not shipped at the same time.
- If keeping `Best Leads`, include score 4 and 5 from both `dm_now` and `comment_first`.
- Portal parsing currently reads both Best Leads and Maybe/Watch for Reddit. If the section names change, update `leadBlocks()` in `src/lib/portal/admin/leads.ts` in the same PR.

Recommended first implementation:

- Keep `## Best Leads`.
- Add `Outreach posture` and `Lead type` fields.
- Add a visible subsection label in the heading or reason, not a parser-breaking section change.
- Move section restructuring to a second PR unless parser changes are included.

## Portal Changes

### List View

Add columns or compact badges for:

- `Lead type`
- `Outreach posture`
- `Posted`
- `Recommended`

Existing queue mapping can remain:

- `recommendedAction === "comment"` -> `community_reply`
- `recommendedAction === "watch"` -> `review`
- score 4+ without explicit action -> `actionable`

Adjust `queueForLead()` so:

- `dm` -> `actionable`
- `dm_if_engaged` -> `actionable`
- `comment` -> `community_reply`
- `watch` -> `review`
- `ignore` -> `dismissed` if ignored rows are ever surfaced

### Detail View

Show:

- vertical,
- failure mode,
- outreach posture,
- free-to-pursue path,
- comment context summary when present.

The operator should be able to tell whether this is a direct sales lead or a Reddit-karma/community-trust lead without opening the source.

## Implementation Plan

### Phase 1 - Config And Pure Scoring

1. Add `archetypePacks` to `config/reddit-lead-monitor.json`.
2. Add `archetypePackIds` to scan modes.
3. Update `selectedScanConfig()` to expand archetype packs into:
   - channels,
   - search queries,
   - positive signals,
   - pain signals,
   - archetype metadata.
4. Dedupe expanded channels and search queries.
5. Add `matchArchetypes(post, scanConfig)` and attach:
   - `archetypeMatches`,
   - `verticalMatches`,
   - `failureModeMatches`.
6. Add primary lead-type selection and deterministic match evidence.
7. Replace `isAdviceOnlyPost()` logic with:
   - `isGenericAdviceOnlyPost()`,
   - `isAdviceShapedOperationalPain()`.
8. Replace the single candidate slice with portfolio selection before LLM scoring.
9. Update deterministic scoring to produce `leadType`, `vertical`, `failureMode`, and `outreachPosture`.
10. Update LLM schema and `normalizeLlmScore()` to preserve those fields.
11. Update `formatLead()` to write new parser-friendly bullet fields.

### Phase 2 - Prompt And Output Calibration

1. Rewrite the LLM system prompt around the three-lane model:
   - direct paid/project lead,
   - comment-first operational pain,
   - watch/ignore.
2. Tell the model that advice-shaped operational pain can score 4 only when it includes business context and current process breakdown.
3. Add explicit instruction that public comments must be useful, brief, no-link, and non-repetitive.
4. Keep `score 5` restricted to explicit paid/project/hiring language.
5. Add digest source-mix summary:
   - count by archetype,
   - count by outreach posture,
   - count by subreddit/source,
   - rejected reason summary.

### Phase 3 - Comment Context

1. Add optional Reddit comment fetch for top candidates.
2. Add `redditId` to OAuth listing posts and skip comment context for posts without an ID.
3. Parse only bounded comment context:
   - OP replies,
   - top advice themes,
   - self-promotion warnings,
   - unanswered angle.
4. Pass comment context to the LLM.
5. Add `Comment context` or `Existing advice` bullet to digest only when useful.
6. Confirm rate limits remain acceptable with existing `requestDelayMs`.

### Phase 4 - Portal Surfacing

1. Extend `RedditLead` in `src/lib/portal/admin/leads.ts` with:
   - `vertical`,
   - `failureMode`,
   - `outreachPosture`,
   - `commentContext`.
2. Parse the new markdown bullet fields.
3. Add badges in `src/app/portal/admin/leads/LeadsDashboard.tsx`.
4. Update CSV export with:
   - `vertical`,
   - `failure_mode`,
   - `outreach_posture`.
5. Keep existing stored lead-state keys stable.

### Phase 5 - Calibration And Rollout

1. Add fixture-based tests before live tuning.
2. Run a low-limit live scan for each scan mode.
3. Compare output against the current baseline:
   - fewer generic advice posts,
   - more comment-first operational pain posts,
   - no increase in sellers/job seekers,
   - no date regressions.
4. Publish only after local parser checks confirm portal row counts match digest headings.

## Fixture Test Set

Create a local fixture file under `scripts/fixtures/reddit-lead-scanner-quality.json`.

Minimum fixtures:

| Fixture | Expected Score | Expected Posture | Expected Lead Type |
| --- | --- | --- | --- |
| Service business tracking project profitability in spreadsheets/email | 4 | `comment_first` | `service-project-profitability` |
| 20 employees, 3 departments, daily whiteboard/photo task process | 4 | `comment_first` | `daily-team-tasking` |
| Solo operator reinventing client onboarding and asking about SOPs | 3 or 4 | `comment_first` | `sop-client-onboarding` |
| Recruiter losing 10 hours/week from intake-call-to-outreach handoff | 4 | `dm_if_engaged` | `recruiting-handoff-drift` |
| Tax pro asking for AI document split/rename/classify workflow | 4 or 5 | `comment_first` or `dm_if_engaged` | `tax-document-intake` |
| Small business manually matching invoices to bank payments | 4 | `comment_first` | `invoice-payment-reconciliation` |
| Generic "best CRM?" with no business context | 3 max | `watch` | `crm-source-of-truth` or blank |
| Seller promoting an automation agency | 2 max | `ignore` | blank |
| Job seeker or resume post | 2 max | `ignore` | blank |
| Explicit paid Make/Airtable implementation request | 5 | `dm_now` | relevant archetype |

Test command options:

- If functions remain internal only, add a small CLI mode:

```bash
REDDIT_SCANNER_FIXTURE_PATH=scripts/fixtures/reddit-lead-scanner-quality.json \
node scripts/reddit-lead-monitor.mjs --score-fixtures
```

- If test exports are acceptable, extract scoring helpers into `scripts/lib/reddit-lead-scoring.mjs` and add a Node test.

## Verification

Required local checks:

```bash
node -e "JSON.parse(require('fs').readFileSync('config/reddit-lead-monitor.json', 'utf8')); console.log('config ok')"
node --check scripts/reddit-lead-monitor.mjs
npx tsc --noEmit
npm run lint
git diff --check
```

Required fixture proof:

```bash
node scripts/reddit-lead-monitor.mjs --score-fixtures
```

Required parser proof:

```bash
OUTPUT_DIR="${REDDIT_LEAD_OUTPUT_DIR:-outputs/reddit-leads}"
python3 -m json.tool "$OUTPUT_DIR/latest-status.json"
OUTPUT_PATH="$(node -e 'const s=JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); if (!s.outputPath) process.exit(1); console.log(s.outputPath)' "$OUTPUT_DIR/latest-status.json")"
rg -n '^### ' "$OUTPUT_PATH"
```

Optional live Reddit smoke when credentials are available:

```bash
REDDIT_SCAN_MODE=local-service-ops \
REDDIT_FEED_LIMIT=1 \
REDDIT_SEARCH_LIMIT=3 \
REDDIT_LEAD_OUTPUT_DIR=/tmp/reddit-leads-quality-test \
node scripts/reddit-lead-monitor.mjs
```

The live smoke passes only if:

- `latest-status.json` is valid JSON,
- `scanMode` is present,
- per-query fetch diagnostics are present,
- `postedDate` remains source-derived,
- at least one search feed succeeds,
- digest output preserves parser fields,
- no generated public comment includes a URL.

Portal verification:

```bash
npm run build
```

Production trace verification if the run button remains available in production:

- inspect `.next/server/app/api/portal/admin/leads/run/route.js.nft.json`,
- confirm it includes `scripts/reddit-lead-monitor.mjs`,
- confirm it includes any extracted scanner helper files,
- confirm it includes `config/reddit-lead-monitor.json`.

If a local server is already running:

```bash
curl -I http://localhost:3000/portal/admin/leads
```

Production verification after merge/deploy:

- `/portal/admin/leads` loads for admin.
- The Reddit source shows the latest published digest from Blob/Supabase.
- Rows display lead type and outreach posture.
- Comment-first rows land in the community reply queue.
- DM-now rows land in the actionable queue.

## Acceptance Criteria

The enhancement is complete when all of these are true:

1. The scanner can find and score archetype-based operational pain posts without requiring automation/tool keywords.
2. Generic advice remains capped at score 3.
3. Advice-shaped operational pain can score 4 only when it has concrete business context and process breakdown.
4. Score 5 remains limited to explicit paid/project/hiring intent.
5. The digest distinguishes `dm_now`, `dm_if_engaged`, `comment_first`, `watch`, and `ignore` through parser-friendly fields.
6. The portal surfaces lead type and outreach posture.
7. The scanner preserves posted date separately from discovery date.
8. Fixture tests cover at least the ten cases listed above.
9. Live smoke writes valid status and digest artifacts without automatic outreach.
10. Candidate portfolio selection prevents marketplace and tool-community leads from crowding out Reddit/community trust-building leads in the scoring pool or operator view.
11. New fielded Reddit queries have live smoke evidence or conservative fallback queries.
12. Production build tracing includes any script, helper, and config files required by the admin run route.

## Risks And Guardrails

### Risk: More Comment-First Noise

Mitigation:

- Require business context plus current-system evidence plus operational consequence.
- Keep generic advice capped.
- Add per-archetype rejected-reason summaries.

### Risk: Spammy Suggested Replies

Mitigation:

- No links in public comments.
- No "I can help" unless explicit paid help is requested.
- Use comment context to avoid repeating existing advice.
- Prefer diagnostic comments and specific next steps.

### Risk: Parser Breakage

Mitigation:

- Add fields as bullet lines before changing section headings.
- Keep `Best Leads` and `Maybe / Watch` until portal parser changes are included.
- Add parser proof with heading counts and row counts.

### Risk: Production Run Route Missing Script Helpers

Mitigation:

- Keep production publishing in bundled app code.
- If the scanner is split into helper files, verify Next file tracing includes those helpers.
- Treat `.nft.json` route-trace inspection as a shipping gate when production scanning remains enabled.

### Risk: Rate Limits From Comment Fetching

Mitigation:

- Fetch comments only for top candidates.
- Keep hard caps and request delays.
- Make comment context optional and configurable.

### Risk: Regressing Freshness

Mitigation:

- Continue using source `publishedAt` for posted date.
- Do not infer freshness from discovery date, digest file date, or search result snippets.

## Suggested First PR Scope

Keep the first implementation bounded:

1. Add archetype packs and expanded search queries.
2. Add `leadType`, `vertical`, `failureMode`, and `outreachPosture`.
3. Replace the blunt advice-only cap with generic-advice vs operational-pain logic.
4. Update prompt/schema/digest output.
5. Add fixture tests.
6. Leave comment-context enrichment for the second PR if the first PR is already large.

This first PR should be enough to materially improve lead quality while keeping the portal and publishing path stable.
