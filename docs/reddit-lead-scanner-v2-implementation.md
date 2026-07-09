# Reddit Lead Scanner V2

The v2 scanner is the quote-grounded Reddit-only lead scanner for Duncan's AI/workflow consulting pipeline.

## Goal

Surface only Reddit posts where the original poster appears to operate, own, manage, or be responsible for a real business process and where a human reply from an AI/workflow implementation expert would be natural.

Zero Contact Today leads is a valid result.

## Architecture

- `scripts/reddit-lead-scanner.mjs` runs fetch, prefilter, LLM classification, quote verification, deterministic queue assignment, and digest/status writing.
- `config/reddit-scanner-v2.json` owns allowlists, denylists, first-pass queries, caps, and the daily classification cap.
- `scripts/fixtures/reddit-scanner-v2.json` owns regression coverage for false positives, positives, and quote-verification edge cases.
- The admin run route and default `npm run leads:reddit` command always use v2.
  `npm run leads:reddit:legacy` exists only for historical debugging and is not
  callable from the portal.

## Core Rules

- Numeric scores are compatibility display only. Queue assignment is deterministic.
- Keyword matches are discovery inputs only. They are not positive evidence.
- Verified quotes are the only positive evidence for surfaced leads.
- `contact_today` requires a verified ownership quote, verified ask quote, high confidence, and `consulting_fit=yes`.
- `comment_only` requires a verified ownership quote, own-problem advice/tool-shopping intent, and `consulting_fit=yes`.
- Open-search posts may qualify only when they satisfy the full quote-verified
  queue contract; provenance alone cannot promote or demote a post.
- Title-only posts can reach `comment_only`, but not `contact_today`.
- Classifier failures and unverified quotes can never promote a post.

## Output Contracts

The scanner writes:

- `outputs/reddit-leads/YYYY-MM-DD.md`
- `outputs/reddit-leads/latest-status.json`
- `outputs/reddit-leads/latest-structured.json`

The markdown digest contains only `contact_today` and `comment_only` rows so the
admin board cannot display watch items as prospects. Watch and reject diagnostics
remain in the structured JSON.

## Verification

Run:

```bash
node --check scripts/reddit-lead-scanner.mjs
node scripts/reddit-lead-scanner.mjs --fixtures
npm run lint
npx tsc --noEmit
```

Use temp output directories for live smoke tests unless intentionally updating local admin outputs.
