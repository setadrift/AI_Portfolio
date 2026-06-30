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
7. After writing the digest and status, run the publisher and verify Supabase has active `automation` rows.

## Procedure

1. Use the provided date argument; otherwise use today's date.
2. Read `/Users/duncananderson/.codex/automations/ai-consulting-lead-research/automation.toml` for the current recurring prompt.
3. Search public sources for explicit buying intent around AI automation, Airtable, Zapier, Make, n8n, reporting automation, CRM follow-up, spreadsheet cleanup, document/PDF automation, invoice automation, or custom internal tools.
4. Write the Markdown digest using this shape:

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
- Recommended action: comment, dm_if_engaged, or dm
- Why it matched: concise reason including freshness and buying intent

Suggested comment:

> short public reply, no website URL unless the post explicitly asks for contact info

Suggested DM:

> short DM when appropriate

Tracker row:

| POSTED_DATE | Web/Reddit: source | author | need | Not yet | | | New | notes |

## Maybe / Watch

## Rejected

## Feed Errors
```

5. Write `latest-status.json` with:

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

6. Publish:

```bash
AUTOMATION_LEAD_OUTPUT_DIR=/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/ai-consulting-leads npm run leads:publish:automation
```

7. Verify:
   - Publisher exits 0.
   - Publisher reports `supabase.ok: true`.
   - Supabase `admin_lead_sources.id = automation` has a fresh `generated_at`.
   - Supabase `admin_leads` has active rows for `source_id = automation` matching the published digest count.

## Final Response

Summarize included lead count, top 3 titles with URLs and posted dates, output path, publish result, and Supabase active-row count. Mention any source visibility limits.
