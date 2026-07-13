---
name: reddit-api
description: Use when working on Reddit API access, Reddit lead scanner capabilities, Reddit OAuth, Reddit search/comment behavior, Reddit MCP evaluation, or the repo's Reddit lead monitor.
---

# Reddit API

Use this skill before changing or auditing the Reddit lead scanner, Reddit API credentials, Reddit MCP tooling, or Reddit lead portal scan behavior.

## Scope

- Repo: `/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1`
- Production scanner: `scripts/reddit-lead-scanner.mjs`
- Production config: `config/reddit-scanner-v2.json`
- Fixture tests: `scripts/fixtures/reddit-scanner-v2.json`
- Legacy scanner (historical debugging only): `scripts/reddit-lead-monitor.mjs`
- Output directory: `outputs/reddit-leads`
- Portal run route: `src/app/api/portal/admin/leads/run/route.ts`
- Portal parser/storage: `src/lib/portal/admin/leads.ts`

## Hard Rules

1. Use Reddit public API data only.
2. Do not use cookies, private inboxes, login-only pages, scraping bypasses, or browser session data.
3. Do not send Reddit comments, DMs, posts, proposals, or automated outreach.
4. Treat human review as mandatory before any outreach.
5. Do not expose Reddit credentials in responses, logs, docs, fixtures, or commits.
6. Prefer temp output directories for live smoke tests unless the user explicitly wants production/admin output updated.

## Current Auth Model

The scanner loads `.env.local` and then `process.env`.

Expected env vars:

- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`
- `REDDIT_USER_AGENT`
- Optional: `REDDIT_REFRESH_TOKEN`

Auth behavior in `scripts/reddit-lead-scanner.mjs`:

- Uses `https://www.reddit.com/api/v1/access_token`.
- Uses `refresh_token` grant when `REDDIT_REFRESH_TOKEN` exists.
- Otherwise uses `client_credentials` grant.
- Config default is OAuth ingestion; missing required OAuth credentials should write a failed `latest-status.json`, not invent scan results.

If local env is missing, do not assume production is missing. Check the real environment source only when the task requires live proof.

## Current Reddit API Capabilities

The repo scanner supports:

- Subreddit new feed via OAuth:
  - `GET https://oauth.reddit.com/r/{subreddit}/new?limit=N&raw_json=1`
- Global Reddit search via OAuth:
  - `GET https://oauth.reddit.com/search`
  - Query params: `q`, `sort=new`, `t=month`, `limit`, `type=link`, `restrict_sr=false`, `raw_json=1`
- Comment context for fetched candidates:
  - `GET https://oauth.reddit.com/comments/{articleId}?limit=N&sort=top&raw_json=1`
- Quote-grounded OpenAI classification after deterministic prefiltering.

Important limitation:

- The scanner is query-driven. It does not exhaustively crawl all Reddit.

## Reddit Search Notes

Use Reddit search as the primary discovery surface for search-first scanner work.

Configured query strings should be sent exactly as configured. Do not pre-parse or rewrite boolean/grouping syntax unless a live smoke proves Reddit rejects it.

Relevant search concepts:

- `restrict_sr=false` means global Reddit search, not one subreddit.
- `subreddit:foo` inside `q` can intentionally constrain a query.
- `sort=new` is preferred for lead freshness.
- Keep query diagnostics: fetched count, scored count, replyable count, rejected count.

When testing new query syntax, use low limits and a temp output directory.

## Optional Reddit MCP Boundary

The `enisze/reddit-mcp` server can be useful for ad hoc manual investigation, but do not treat it as the scanner engine without proof.

Known limitation from its public docs:

- Its documented `search_posts` tool requires a `subreddit` parameter, so it appears to search within a subreddit rather than global all-Reddit search.

Useful MCP cases:

- Check whether a known subreddit has relevant posts.
- Quickly inspect query behavior in a specific community.
- Compare a subreddit against scanner source performance.

Not sufficient by itself for:

- Search-first all-Reddit discovery.
- Replacing `scripts/reddit-lead-scanner.mjs`.
- Per-query global yield tracking.
- Comment-context enrichment unless the MCP exposes comments.

If a Reddit MCP is installed later, verify its actual callable tools before relying on it.

## Standard Commands

Fixture scoring:

```bash
npm run leads:reddit:v2:fixtures
```

Low-limit live smoke with temp output:

```bash
REDDIT_CHANNEL_LIMIT=1 \
REDDIT_SEARCH_LIMIT=1 \
REDDIT_CANDIDATE_LIMIT=1 \
REDDIT_LEAD_OUTPUT_DIR=/tmp/reddit-leads-test \
node scripts/reddit-lead-scanner.mjs
```

Validate status:

```bash
python3 -m json.tool /tmp/reddit-leads-test/latest-status.json
```

Check digest headings:

```bash
rg -n '^### ' /tmp/reddit-leads-test/*.md
```

Static checks after code edits:

```bash
node --check scripts/reddit-lead-scanner.mjs
npm run lint
```

Use `npx tsc --noEmit` when TypeScript or parser/portal types changed.

## Portal Run Path

Admin portal scan route:

- `POST /api/portal/admin/leads/run`
- Runs `scripts/reddit-lead-scanner.mjs`.
- Local output: `outputs/reddit-leads`
- Vercel output: `/tmp/reddit-leads`
- Publishes through bundled app code when Blob publishing is available.

Do not update portal parsing fields unless the digest contract is updated in the same change.

## Output Contracts

Scanner output:

- Dated digest: `outputs/reddit-leads/YYYY-MM-DD.md`
- Status: `outputs/reddit-leads/latest-status.json`
- Structured review payload: `outputs/reddit-leads/latest-structured.json`

Status should include:

- `ok`
- `generatedAt`
- `successfulFeeds`
- `totalFeeds`
- `ingestionMode`
- `scanMode`
- `fetchedPosts`
- `candidatesScored`
- `leadsIncluded`
- `outputPath`
- `feedErrors`

Preserve posted date separately from discovered/generated date.

## Scanner Work Procedure

1. Read `config/reddit-scanner-v2.json` and `scripts/reddit-lead-scanner.mjs` before proposing API-dependent behavior.
2. Determine whether the task concerns discovery, scoring, comment context, portal parsing, publishing, or live credentials.
3. For strategy or contract changes, keep `docs/reddit-lead-scanner-v2-implementation.md` aligned.
4. For code changes, add/update fixtures before live scans when practical.
5. Run fixture scoring before broad live scans.
6. Use temp output for smoke tests unless publishing/admin output is explicitly requested.
7. Report whether evidence is from fixtures, local temp smoke, production portal, or inferred repo behavior.

## Capability Check Questions

Before designing a Reddit scanner feature, answer:

- Does the current Reddit API path support this directly?
- Is it global search or subreddit-only?
- Does it require OAuth credentials?
- Does it need user-level auth or only app/client credentials?
- Does it require comments, post bodies, subreddit metadata, or user history?
- Does it risk automated outreach or private data access?
- What command proves the capability without touching production output?

If the answer is uncertain, do a bounded live smoke or mark it as an open implementation question.
