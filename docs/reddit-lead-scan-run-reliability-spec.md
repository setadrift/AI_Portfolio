# Reddit Lead Scan Run Reliability Mini Spec

## Problem

The admin Reddit scan can update the underlying digest/status while the UI still reports `Scan failed`.

The observed failing state was contradictory from the operator's point of view:

- The last-run metadata showed a successful OAuth scan with feeds fetched, posts collected, and candidates scored.
- The UI still appended `Scan failed`.

That means the bug is in the scan request lifecycle, not in Reddit discovery itself.

## Root Cause

The admin button runs the whole scan, LLM scoring, digest write, Blob publish, and optional database persistence inside one HTTP request to `/api/portal/admin/leads/run`.

After the PR #56 scanner expansion, a full `broad-buyer-intent` scan became slow enough that the request could become fragile. A route-level failure could be surfaced as `Scan failed` even if the scanner had already updated the digest.

There was also a secondary failure mode: when the scanner exits successfully but writes `latest-status.json` with `ok: false` and no digest path, the route attempted to publish a non-existent digest, replacing the useful scanner status with a generic publish failure.

## Goals

1. The run route must return `ok: true` only when a digest was written and publish completed, when publishing is enabled.
2. The route must stop before publishing when the scanner status says no publishable digest exists.
3. The scanner should complete full route runs comfortably within the route timeout by scoring LLM candidates with bounded concurrency.
4. Runtime environment variables supplied by Vercel/process env must not be overwritten by blank local `.env.local` values.
5. The verification gate must include an actual HTTP call to `/api/portal/admin/leads/run`; helper-level checks are not enough.

## Non-Goals

- No background job queue in this pass.
- No redesign of the admin leads UI.
- No change to scanner scoring criteria or search strategy.
- No automatic Reddit posting, messaging, or outreach.

## Implementation Plan

1. Add bounded LLM scoring concurrency to `scripts/reddit-lead-monitor.mjs`.
2. Add `llmConcurrency` to `config/reddit-lead-monitor.json`.
3. Preserve process/Vercel env precedence over `.env.local` in scanner and publish scripts.
4. In `/api/portal/admin/leads/run`, read `latest-status.json` after the scanner exits.
5. If the scanner status is not ok or has no `outputPath`, return that scanner failure directly instead of attempting Blob publish.
6. Set a route max duration appropriate for full admin scans.
7. Improve the client error fallback so non-JSON or timeout-like failures are visible as request failures, not only generic `Scan failed`.

## Verification

Required before shipping:

- Route-level smoke test: log in locally and POST to `/api/portal/admin/leads/run` with a tiny scan (`REDDIT_FEED_LIMIT=1`, `REDDIT_SEARCH_LIMIT=1`). It must return HTTP 200 and `{ "ok": true }`.
- Full route test: POST to the same endpoint with `broad-buyer-intent` and no feed/search limits. It must return HTTP 200 and `{ "ok": true }`.
- Published Blob check: `admin/leads/latest.json` must contain a Reddit source with `status.ok: true`, matching declared Best Leads and parsed Best Leads.
- `node scripts/reddit-lead-monitor.mjs --score-fixtures`
- `node --check` for changed scripts.
- JSON parse check for scanner config and fixtures.
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`

