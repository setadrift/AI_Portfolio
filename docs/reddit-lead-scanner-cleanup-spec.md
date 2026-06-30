# Reddit Lead Scanner Cleanup Spec

## Problem

The admin lead board currently presents the Reddit monitor as a channel picker. That makes the scanner look like it only checks one selected subreddit, even though the script already has a separate Reddit OAuth global search path.

The best AI consulting leads often appear in ordinary community threads where the poster describes a real operating problem without using automation words. Examples include:

- A local agency that cannot find enough staff.
- A service business missing follow-ups or calls.
- A small team buried in email, spreadsheets, applicants, quotes, or scheduling.
- A business owner asking for paid help in a niche community.

Those leads can be missed or under-scored if the pre-LLM filter requires classic automation/tool keywords like Zapier, CRM, spreadsheet, Airtable, or Make.

## Goals

1. Make the portal control match the actual acquisition strategy: scan modes, not individual channels.
2. Use Reddit OAuth global search broadly across Reddit with `restrict_sr=false`, `sort=new`, and `type=link`.
3. Keep targeted subreddit scans as supporting context, not the primary discovery model.
4. Admit posts with community/business pain before LLM scoring, even when they do not mention automation tools.
5. Preserve strict scoring so broad discovery does not flood the board with generic advice threads, job seekers, sellers, market research, or low-intent discussion.
6. Keep all search strategy in `config/reddit-lead-monitor.json` so future tuning does not require React or API route edits.

## Non-Goals

- No scraping, browser automation, or bypassing Reddit API limits.
- No automatic Reddit posting or DMs.
- No storage schema change for lead state in this cleanup.
- No attempt to exhaustively crawl all Reddit posts. Discovery remains query-driven and API-compliant.

## Scanner Model

Each scan mode has:

- `id`: stable machine key used by `REDDIT_SCAN_MODE`.
- `label`: portal-facing display name.
- `description`: operator context.
- `channels`: targeted subreddits fetched through `/r/{subreddit}/new`.
- `searchQueries`: global Reddit searches sent to `/search`.

Default mode:

- `broad-buyer-intent`
- This should be the first portal option and should search across Reddit for paid help, manual operations pain, staffing/recruiting pain, follow-up breakdowns, intake chaos, scheduling problems, and business-owner distress.

Supporting modes:

- `staffing-recruiting`
- `local-service-ops`
- `tool-specific-automation`

The original tool/community scan is retained as `tool-specific-automation`.

## Filtering And Scoring

The pre-LLM gate should admit a post when it matches either:

- classic consulting/automation keywords, or
- community pain phrases such as `need help finding`, `job boards not working`, `can't keep track`, `buried in emails`, `missed follow up`, `scheduling mess`, `too many messages`, `intake is chaotic`, or `busy season`.

The hard rejects remain:

- sellers, course/newsletter promoters, agency lead-gen posts,
- role seekers or resume/portfolio posts,
- broad market research,
- feedback/showcase posts,
- generic advice-only questions without business pain or implementation intent.

High scores still require business context and either explicit paid/hiring language or a specific recurring workflow pain. Broad query matches alone are not enough.

## Portal Behavior

The Reddit monitor control should show scan modes, not channels.

When the operator runs a scan:

1. The dashboard sends `{ "mode": "<scan-mode-id>" }` to `/api/portal/admin/leads/run`.
2. The API validates the mode against `config/reddit-lead-monitor.json`.
3. The API runs `scripts/reddit-lead-monitor.mjs` with `REDDIT_SCAN_MODE=<scan-mode-id>`.
4. The scanner writes `scanMode` into `latest-status.json` and the markdown digest metadata.
5. The portal status line displays the scan mode and ingestion mode separately.

The API can still accept `channel` for backward compatibility, but the UI should not use channel selection as the normal path.

## Verification

Required checks before shipping:

- `node --check scripts/reddit-lead-monitor.mjs`
- `npx tsc --noEmit`
- `npm run lint`
- `git diff --check`

Optional live check when Reddit credentials are available:

```bash
REDDIT_SCAN_MODE=broad-buyer-intent \
REDDIT_FEED_LIMIT=1 \
REDDIT_SEARCH_LIMIT=1 \
REDDIT_LEAD_OUTPUT_DIR=/tmp/reddit-leads-test \
node scripts/reddit-lead-monitor.mjs
```

The optional run should prove the script fetches a targeted subreddit and a global search query, writes `latest-status.json`, and includes `scanMode` in status.
