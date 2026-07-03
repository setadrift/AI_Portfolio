---
name: codex-automation-lead-scan
description: "Run the Codex automation lead research pass, write worktree outputs, publish to Blob/Supabase, and verify admin lead loading. Invoke as /codex-automation-lead-scan."
argument-hint: "[YYYY-MM-DD]"
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Grep
---

# /codex-automation-lead-scan

Run the AI consulting public-source lead research workflow and load the results into the admin lead board.

## Scope

- Repo/worktree: `/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1`
- Output directory: `/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/ai-consulting-leads`
- Dated digest: `outputs/ai-consulting-leads/YYYY-MM-DD.md`
- Status file: `outputs/ai-consulting-leads/latest-status.json`
- Publisher: `AUTOMATION_LEAD_OUTPUT_DIR=/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/ai-consulting-leads npm run leads:publish:automation`

## Rules

1. Use public web and accessible public pages only.
2. Do not use cookies, private inboxes, login-only pages, scraping bypasses, or outreach.
3. Do not send comments, DMs, emails, proposals, or messages.
4. Verify the actual posted/ad date from the source page or search result snippet before including a lead in `## Best Leads`.
5. Include only score 4/5 and 5/5 leads in `## Best Leads`; do not pad the digest.
6. Put uncertain, stale, or unverifiable-date candidates in `## Maybe / Watch` or reject them.
7. Enforce source diversity. This is a broad public-internet pass, not an Upwork scraper.
8. Check at least 5 source families when search access allows it: Reddit/local subreddits, automation/vendor communities, freelance/job marketplaces, founder/operator/small-business forums, and general web search results.
9. Exclude Upwork entirely. Do not search Upwork, include Upwork links, write Upwork watchlist items, or surface Upwork leads in `## Best Leads`, `## Maybe / Watch`, tracker rows, status summaries, or published admin data.
10. If one platform dominates the digest, name the non-dominant source families checked and why they did not qualify.
11. Do not include broad fit-based business-directory leads unless the source also shows a current trigger such as a hiring post, help request, public complaint, explicit tool failure, recent operations change, or consultant request.
12. Treat partner/overflow opportunities as valid when they show paid implementation demand from an automation agency, freelancer, RevOps consultant, or tool specialist looking for builders, contractors, QA, documentation, or delivery support.
13. Prioritize leads Duncan can pursue without buying marketplace credits: public comments, platform DMs, partner messages, public job/community replies, or direct contact from a public help request.
14. After writing the digest and status, run the publisher and verify Supabase has active `automation` rows.

## Procedure

1. Use the provided date argument; otherwise use today's date.
2. Read `/Users/duncananderson/.codex/automations/ai-consulting-lead-research/automation.toml` for the current recurring prompt.
3. Search public sources for explicit buying intent around AI automation, Airtable, Zapier, Make, n8n, reporting automation, CRM follow-up, spreadsheet cleanup, document/PDF automation, invoice automation, or custom internal tools. Include direct-client leads and partner/overflow opportunities. Use a deliberately mixed search set:
   - Reddit public pages and local/business subreddits.
   - Automation/vendor communities such as n8n Community, Airtable Community, Zapier Community, Make Community, Softr/Glide/Notion forums.
   - Public freelance/job marketplaces except Upwork, such as Freelancer, PeoplePerHour, Contra, Wellfound, We Work Remotely, RemoteOK, Craigslist gigs, Kijiji/Craigslist local services, and relevant job boards.
   - Founder/operator/small-business forums such as Indie Hackers, Hacker News hiring/freelance threads, public Alignable-style posts, and industry forums.
   - General web/search result pages for exact buying-intent phrases.
4. Apply this scoring model:
   - `5/5`: fresh explicit paid ask, hiring post, contractor request, active community help request with budget/contact path, or partner/overflow role with concrete implementation scope.
   - `4/5`: fresh business workflow pain with clear stakes and a plausible public-reply path, but no explicit budget yet.
   - `3/5 or lower`: broad tool-shopping, generic AI interest, seller promotion, stale posts, directory businesses, vague jobs, or leads requiring paid marketplace credits before basic qualification.
5. Write the Markdown digest using this shape:

```md
# Codex Automation Lead Digest - YYYY-MM-DD

Generated: ISO_TIMESTAMP
Feeds checked: NUMBER_OF_SEARCHES_OR_SOURCES
Candidates included: NUMBER_INCLUDED
Filtered/rejected before digest: NUMBER_REJECTED_OR_SKIPPED
Minimum score: 4
Partial coverage: no

## Best Leads

### SCORE/5 - SOURCE_SITE_OR_COMMUNITY - TITLE

- Posted date: YYYY-MM-DD
- URL: FULL_URL
- Author: USER_OR_UNKNOWN
- Category: crm_lead_followup, reporting_automation, document_pdf_automation, spreadsheet_internal_tools, or other
- Lead type: direct_client, partner_overflow, or watch
- Recommended action: comment, dm_if_engaged, dm, partner_note, or watch
- Why it matched: concise reason including freshness and buying intent
- Free-to-pursue path: how Duncan can act without buying marketplace credits, or "paid marketplace gate" if unavoidable

Suggested comment:

> short public reply, no website URL unless the post explicitly asks for contact info

Suggested DM:

> short DM when appropriate

Tracker row:

| POSTED_DATE | Web/Reddit: source | author | need | Not yet | | | New | notes |

## Maybe / Watch

Use this section for possibly good leads with weaker fit, older dates, or unverifiable dates. Also include promising non-Upwork source families checked when they did not produce main-digest leads. Do not include Upwork watchlist items.

## Rejected

Mention stale/unverified-date rejection count when relevant. If Best Leads are dominated by one platform, include a source-diversity note naming the other source families checked and why they were rejected.

## Feed Errors
```

6. Write `latest-status.json` with:

```json
{
  "ok": true,
  "generatedAt": "ISO_TIMESTAMP",
  "successfulFeeds": 0,
  "totalFeeds": 0,
  "fetchedPosts": 0,
  "candidatesScored": 0,
  "leadsIncluded": 0,
  "outputPath": "/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/ai-consulting-leads/YYYY-MM-DD.md",
  "message": "Codex automation lead scan completed.",
  "feedErrors": []
}
```

7. Publish:

```bash
AUTOMATION_LEAD_OUTPUT_DIR=/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/ai-consulting-leads npm run leads:publish:automation
```

8. Verify:
   - Publisher exits 0.
   - Publisher reports `supabase.ok: true`.
   - Supabase `admin_lead_sources.id = automation` has a fresh `generated_at`.
   - Supabase `admin_leads` has active rows for `source_id = automation` matching the published digest count.

## Final Response

Summarize included lead count, source mix by platform/family, top 3 titles with URLs and posted dates, output path, publish result, and Supabase active-row count. Mention any source visibility limits.
