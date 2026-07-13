# Mina job board — reliable breadth specification

**Status:** Implemented and live-verified

**Date:** July 13, 2026

## Outcome

Mina gets one reliable list of currently open jobs matching her actual criteria. She can run the scan from her portal.

The scanner should search the market broadly, but a job appears only after the employer's own page confirms it. This is a personal job board, not a general job-search platform.

## Mina's criteria

### Roles

- HR Business Partner / People Partner
- HR Manager / Human Resources Manager
- Employee relations / labour relations leadership
- People Operations / People & Culture leadership
- Talent Acquisition / Recruiting / Recruitment leadership
- Global Talent Acquisition leadership
- International Recruitment and HR leadership
- equivalent French titles

Accept Manager, Senior Manager, Lead, Director, and Head variants where they describe the same work. Include common word-order variants such as `Manager, Talent Acquisition` and `Senior Director, People Business Partner`.

Exclude coordinators, assistants, interns, individual-contributor recruiters, unrelated specialists, VP People, and CHRO roles.

### Location

- anywhere on the Island of Montréal;
- remote roles explicitly open to candidates in Canada; and
- Canada-based global roles, including roles requiring travel.

Remote, hybrid, and on-site are all acceptable. `Remote` alone is not proof that Canada is eligible.

### Compensation and preferences

- CAD 110,000+ is preferred.
- CAD 107,000 is acceptable.
- Unknown salary remains eligible.
- A known maximum below CAD 107,000 stays off the board.
- Hourly ranges are annualized at 2,080 hours and clearly marked as estimates.
- Fashion, beauty, cosmetics, athletic wear, consumer brands, and Canadian businesses receive a modest ranking boost only.

Salary and preferred sector must never remove a job during discovery.

## Why the old result was misleading

The 653-listing scan was mostly every department's jobs from 13 selected employers. The configured market-search queries did not run, and the portal still called the result complete. A strict title expression also missed valid word-order variants, while the 14-day cutoff hid employer-confirmed open roles.

The fix is better market coverage and matching, not more UI or more workflow states.

## Minimal design

### 1. Canadian market search — required

Search the Government of Canada Job Bank on every scan. Use the two relevant occupational groups—HR managers and HR professionals—across Québec and Canada-remote work. Filter the returned titles and locations through Mina's profile rather than treating every result as relevant.

Job Bank is the one trusted public-board exception to employer-page-only verification. A result is eligible only while it appears in the current official search. This gives the portal a useful no-key market lane without scraping LinkedIn or Indeed.

Each of the four searches records an attempt even when it returns zero results. One failed search should not discard the successful searches in the same run, and an incomplete run must not archive jobs from the failed search.

### 2. Direct employer boards — required

Keep the existing Greenhouse, Lever, and Ashby employer-board integrations. These are authoritative for known employers but are not treated as a whole-market search.

### 3. Broad web search — supplemental

When Brave Search or the existing SerpApi fallback is configured, run the full 20-query English/French pack for extra discovery. Do not rotate through only two queries and describe that as market coverage. Every result must still resolve to an employer or public ATS posting.

### 4. Other feeds — supplemental

Remotive, Himalayas, Adzuna, Jooble, and Reddit can contribute candidates when available. Their failure does not make the required two lanes fail.

Their result is never enough by itself. It must resolve to an employer or public ATS page. Adzuna searches Montréal plus Canada-remote/global roles and does not use a source-side salary minimum.

Do not add LinkedIn/Indeed scraping, browser automation, proxies, CAPTCHAs, or new ATS-specific adapters.

## Matching and verification

Use a small, testable role taxonomy rather than one giant regular expression.

For each result:

1. normalize accents, punctuation, ampersands, and title word order;
2. require one accepted role family;
3. require Montréal Island, explicit Canada-remote, or Canada-based global evidence;
4. follow ordinary redirects to the employer/ATS posting;
5. confirm the title, employer when known, location, and open status from `JobPosting` data, employer page text, or the current official Job Bank result; and
6. deduplicate by ATS identifier, canonical URL, then normalized employer/title/location.

A blocked page, aggregator-only page, title mismatch, expired `validThrough`, or closed page stays off the board. Existing candidate and receipt tables are sufficient; no new table is needed.

## Freshness and ranking

- 0–7 days: strongest freshness signal.
- More than 7 days: lower freshness score, but still active if the employer confirms the role is open.
- Unknown date: `Watch`, but still active if the employer confirms the role is open.
- Closed or expired: archived.

An open role must not disappear only because it crossed 14 days.

## Portal scan result

The board remains one list with one scan button.

`Scan complete` is allowed only when:

- at least 90% of configured market searches succeeded; and
- at least 80% of enabled direct employer boards succeeded.

Otherwise say `Partial scan` and name the incomplete lane. Existing verified jobs remain available.

Report understandable funnel numbers rather than the raw size of employer boards:

> Scan complete: searched 20 market queries and 13 employer boards. Checked 18 possible matches; 7 verified open jobs are on your board.

The receipt stores query attempts, employer-board attempts, plausible candidates, canonical verifications, active jobs, and failure reasons. No new dashboard is required.

## Implementation surface

- `scripts/mina-jobs/profile.mjs`: bounded role and location matching
- `scripts/mina-jobs/sources.mjs`: Job Bank discovery, complete public-search execution, and per-query outcomes
- `scripts/mina-job-scan.mjs`: provider wiring, funnel receipts, ranking, and coverage health
- `scripts/mina-jobs/discovery.mjs`: open/expired and age handling
- `src/app/api/portal/mina/scan/route.ts`: honest complete/partial wording
- `.env.example` and existing scanner tests

No frontend redesign and no database migration are expected.

## Acceptance checks

- Known missed English/French title variants pass.
- Junior, specialist, individual-contributor, and executive near misses fail.
- Montréal Island, explicit Canada-remote, and Canada-based global fixtures pass.
- Toronto-only on-site and unspecified `Remote` fixtures fail.
- Unknown salary is eligible; known sub-CAD-107k compensation stays off the board.
- An employer-verified old posting remains active.
- Closed, expired, mismatched, blocked, and aggregator-only results remain off the board.
- Duplicate discoveries create one job.
- Every configured market search records an attempt.
- Missing required coverage produces `Partial scan`.
- Targeted tests, lint, and production build pass.
- A controlled live scan runs all configured market queries and is reviewed.

There is no promised minimum job count. Success means the market was actually searched and all surfaced jobs are useful enough for Mina to review.

Live verification on July 13, 2026 completed 4/4 Canadian market searches and 13/13 employer boards. Sixteen plausible matches were checked; six verified jobs met the visible-board rules.

## Deferred

- new tabs or application stages;
- alerts and email ingestion;
- auto-apply or document generation;
- ML/embedding ranking;
- automatic employer-source promotion;
- source-health dashboards; and
- protected job-board scraping.

## Research basis

- [Brave Search API](https://api-dashboard.search.brave.com/app/documentation/web-search/get-started) provides country, language, and freshness controls for broad public-web discovery.
- [Government of Canada Job Bank](https://www.jobbank.gc.ca/intro/findajob) is the national public employment service and provides the no-key Canadian market lane.
- [Greenhouse](https://developers.greenhouse.io/job-board.html), [Lever](https://github.com/lever/postings-api), and [Ashby](https://developers.ashbyhq.com/docs/public-job-posting-api) provide public postings for known employer boards.
- [Adzuna](https://developer.adzuna.com/docs/search) supports keyword and location search but remains supplemental here.
- [Remotive](https://github.com/remotive-io/remote-jobs-api) documents a delayed public feed, so it is not a freshness authority.
- [JobFunnel](https://pypi.org/project/jobfunnel/) demonstrates the useful core pattern: multiple configured sources, one deduplicated list, and human review.
