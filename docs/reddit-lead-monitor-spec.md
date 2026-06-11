# Reddit Lead Monitor Spec

## Goal

Build a small internal script that finds better Reddit leads for AI automation consulting.

It should do one thing well:

1. Read a short list of Reddit RSS feeds.
2. Find posts with real workflow pain.
3. Use an LLM to score the promising ones.
4. Write a simple Markdown digest for manual review.

Human review stays mandatory. The tool should never comment, DM, or automate Reddit outreach.

## Non-Goals

- No Reddit API app.
- No OAuth.
- No automated comments.
- No automated DMs.
- No dashboard.
- No database.
- No browser scraping.
- No proxy/identity rotation.
- No Pushshift dependency.
- No scheduled automation for v1.

## MVP Shape

Use a plain Node script:

```text
scripts/reddit-lead-monitor.mjs
```

Add one package command:

```json
{
  "scripts": {
    "leads:reddit": "node scripts/reddit-lead-monitor.mjs"
  }
}
```

Use a committed config file:

```text
config/reddit-lead-monitor.json
```

Write output to an ignored folder:

```text
outputs/reddit-leads/YYYY-MM-DD.md
```

Before implementation, add this to `.gitignore`:

```text
/outputs/reddit-leads/
```

The existing lead tracker remains local and ignored:

```text
docs/lead-tracker.md
```

## Feed List

Start with a small list. Do not monitor every possible subreddit at first.

Recommended v1 feeds:

```text
https://www.reddit.com/r/smallbusiness/new.rss
https://www.reddit.com/r/Entrepreneur/new.rss
https://www.reddit.com/r/developers_hire/new.rss
https://www.reddit.com/r/Zapier/new.rss
https://www.reddit.com/r/Airtable/new.rss
https://www.reddit.com/r/Excel/new.rss
https://www.reddit.com/r/googlesheets/new.rss
https://www.reddit.com/r/WholesaleRealestate/new.rss
https://www.reddit.com/r/bookkeeping/new.rss
https://www.reddit.com/r/Accounting/new.rss
```

Add more only after the digest is consistently useful.

## Config

Keep config small:

```json
{
  "feeds": [
    "https://www.reddit.com/r/smallbusiness/new.rss",
    "https://www.reddit.com/r/WholesaleRealestate/new.rss"
  ],
  "maxAgeHours": 48,
  "minScore": 4,
  "useLlm": true,
  "llmModel": "gpt-4.1-mini",
  "maxLlmCandidates": 15,
  "requestDelayMs": 1500
}
```

No private keys go in this config. `OPENAI_API_KEY` comes from `.env.local`.

## Simple Flow

1. Fetch each RSS feed sequentially.
2. Parse title, summary, author, subreddit, permalink, and published date.
3. Skip posts older than `maxAgeHours`.
4. Run keyword filters.
5. Send only matching posts to the LLM.
6. Write a Markdown digest sorted by score.

Do not maintain complicated state in v1. A little duplication across runs is acceptable. If duplication becomes annoying, add a tiny ignored `seen.json` later.

Keep a small delay between feed requests. If Reddit returns `429`, do not retry aggressively; record it in the digest and try again later.

## Filters

Positive terms:

```text
automate
automation
manual
spreadsheet
Excel
Google Sheets
CRM
Zapier
Make
n8n
Airtable
PDF
report
reporting
dashboard
invoice
receipt
OCR
lead follow-up
drip campaign
email sequence
SMS
workflow
data entry
onboarding
internal tool
```

Buying-intent terms:

```text
hire
paid help
open to paid help
need to hire
consultant
freelancer
developer
build this
build this for me
need someone
need to automate
where do I start
help setting up
looking for help
too slow
takes forever
mess
```

Negative terms:

```text
selling
course
newsletter
affiliate
template
looking for clients
how do I start an AI agency
hire me
white label
partner program
cold email
SEO agency
lead gen agency
```

Filtering rule:

- Keep posts with at least one positive term.
- Prioritize posts with positive + buying-intent terms.
- Keep workflow-pain posts only when the pain is concrete, for example `manual`, `too slow`, `takes forever`, `bottleneck`, or `messy`.
- Drop posts with negative terms unless the buying intent is very strong.

## LLM Usage

The LLM is used only for posts that pass the simple filters.

The LLM should:

- classify the workflow category
- score lead quality from 1-5
- explain the score briefly
- recommend one action
- draft a short Reddit-native comment or DM when useful

The LLM must not:

- fetch Reddit data
- inspect Reddit profiles
- write directly to Reddit
- send DMs
- include the website URL in public comments
- overclaim platform-specific expertise

## LLM Input

Send only this:

```json
{
  "subreddit": "smallbusiness",
  "title": "how do you handle financial reporting for your board or investors?",
  "summary": "We're a small business and every quarter I spend...",
  "publishedAt": "2026-06-11T12:00:00.000Z",
  "url": "https://www.reddit.com/r/smallbusiness/comments/...",
  "matchedKeywords": ["manual", "reporting", "Excel"]
}
```

Do not send profile history, private notes, cookies, or Reddit account data.

## LLM Output

Require JSON:

```json
{
  "score": 4,
  "category": "reporting_automation",
  "recommendedAction": "comment",
  "scoreReason": "Recurring reporting workflow with manual accounting exports, Excel cleanup, and investor slides.",
  "suggestedComment": "I’d separate the financial review from the reporting workflow...",
  "suggestedDm": null
}
```

Allowed categories:

```text
crm_lead_followup
reporting_automation
document_pdf_automation
spreadsheet_internal_tools
other
```

Allowed actions:

```text
ignore
watch
comment
dm_if_engaged
dm
```

## Scoring

Use this simple rubric:

- `5`: explicit paid help + clear business workflow + strong fit
- `4`: strong workflow pain + likely business buyer, but no explicit hiring ask
- `3`: real pain, mostly asking for advice/tools
- `2`: vague automation curiosity
- `1`: seller, agency, course, spam, student, or no fit

Only include score `4+` in the main digest by default. Score `3` is usually just useful market research, not an outreach lead.

## Digest Format

Output one Markdown file per run:

```text
# Reddit Lead Digest - YYYY-MM-DD

## Best Leads

### 5/5 - r/example - Post title

- URL:
- Author:
- Category:
- Recommended action:
- Why it matched:

Suggested comment:

> ...

Suggested DM:

> ...

Tracker row:

| 2026-06-11 | Reddit: r/example | u/example | ... |

## Maybe / Watch

## Rejected

## Feed Errors
```

## Guardrails

- Human sends every comment and DM manually.
- Keep fetches sequential and conservative.
- Do not collect comments or user histories in v1.
- Do not try to bypass Reddit limits.
- Do not commit generated digests or lead tracker data.

## Acceptance Criteria

- `npm run leads:reddit` fetches configured RSS feeds.
- Script writes a Markdown digest under `outputs/reddit-leads/`.
- Digest folder is ignored by git.
- Script works with `OPENAI_API_KEY` from `.env.local`.
- Script does not require Reddit API credentials.
- Script does not automate Reddit outreach.
- Digest includes suggested comments/DMs for score `4+` leads.
- `npm run lint` and `npm run build` still pass.

## Manual Test

1. Run `npm run leads:reddit`.
2. Open the generated digest.
3. Manually inspect the top 5 Reddit links.
4. Confirm the lead scores make sense.
5. Copy any real lead into `docs/lead-tracker.md`.
6. Confirm `git status` does not show generated lead output or the tracker.

## Later, Only If Needed

Add these only after v1 is useful:

- `seen.json` dedupe
- email digest
- daily cron
- feedback labels like `good`, `bad`, `won`, `lost`
- more sources beyond Reddit
