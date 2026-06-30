# Explicit Help Request Lead Strategy - 2026-06-30

## What the June 22 CSV actually was

`ai_consulting_small_business_trade_leads_email_complete_2026-06-22.csv` contains 100 public-email businesses scraped from OpenStreetMap. The list is complete enough for a cold campaign:

- 100 total businesses
- 100 public emails
- 97 websites
- 99 rows marked with a Gmail message/thread ID
- Source is entirely `OpenStreetMap / Overpass API public email business tags`

That means the list was fit-based, not intent-based. The businesses may be good eventual customers, but the file does not show that they were actively asking for automation, CRM, AI, recruiting, intake, scheduling, reporting, or workflow help.

## Diagnosis

Zero conversions from the 100-email send is consistent with the lead source, not necessarily the offer being wrong.

The old campaign had three structural problems:

1. No live buying trigger. The businesses did not publicly ask for help, complain about a workflow, post a job, or request a consultant.
2. Generic timing. A public email on a business profile does not tell us whether the owner is currently in pain or ready to pay.
3. Broad offer. AI consulting is abstract unless tied to a specific operational bottleneck already visible to the buyer.

## Replacement approach

Prioritize leads where the person has already described the problem in public:

- `A` priority: explicit paid role, hiring request, consultant request, or concrete implementation project.
- `B` priority: clear workflow help request with business stakes, but not yet a paid ask.
- `C` priority: stale or research-only examples that are useful for scanner query design, not immediate outreach.

Recommended operating rule:

- For `A` leads: public reply plus DM, with paid-project framing and links in the DM.
- For `B` leads: helpful public reply first. DM only if they engage or the post explicitly invites DMs.
- For `C` leads: do not outreach. Use the language to improve search queries.

## New sheet

Created:

`outputs/lead-lists/explicit_help_request_leads_2026-06-30.csv`

Columns:

- `priority`
- `intent_type`
- `source`
- `posted_age`
- `prospect`
- `title`
- `url`
- `business_context`
- `explicit_ask`
- `why_fit`
- `recommended_action`
- `first_angle`

## Scanner update implied by this review

The Reddit scanner should treat community posts as the primary source of demand, not business-directory records. The best searches are broad intent phrases, not only automation-tool subreddits:

- `"need someone to" business`
- `"looking for someone to" CRM`
- `"willing to pay" automation`
- `"job boards" "not working"`
- `"can't keep track" clients`
- `"scheduling mess"`
- `"manual process" business`
- `"lead follow up" spreadsheet`
- `"client onboarding" automate`

The current `config/reddit-lead-monitor.json` already points in this direction with `broad-buyer-intent`, `staffing-recruiting`, and `local-service-ops` scan modes. The missing piece in this local worktree is credentialed Reddit OAuth access, which is required by the configured `oauth` ingestion mode.
