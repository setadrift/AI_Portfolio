---
name: google-ads-ai-consulting-stats
description: Report and diagnose Duncan Anderson's AI consulting Google Ads performance. Use when the user asks for Google Ads stats, campaign performance, spend, clicks, CTR, CPC, conversions, lead quality signals, policy/review status, search terms, keywords, ad groups, or whether the AI consulting ads are serving.
allowed-tools:
  - Bash
  - Read
user-invocable: true
---

# Google Ads AI Consulting Stats

## Overview

Use this skill to produce a source-backed operating snapshot for the AI consulting Google Ads account. Default to read-only API queries and explain whether ads are actually serving, under review, disapproved, spending, and producing leads.

## Quick Start

Run the bundled report script from the repo root:

```bash
GOOGLE_ADS_CUSTOMER_ID=1099427521 \
scripts/google_ads_python.sh \
.agents/skills/google-ads-ai-consulting-stats/scripts/ai_consulting_ads_report.py --days 7
```

Use `--days 1`, `--days 7`, `--days 14`, or `--days 30` depending on the user's requested window. Use `--json` only when raw structured output is useful.

## Required Report Shape

Lead with the current operating status:

- Campaign status, primary status, serving status, and primary status reasons.
- Active ad approval/review status and any policy topics.
- Whether spend is possible right now.

Then summarize performance:

- Date range.
- Cost in CAD.
- Impressions, clicks, CTR, average CPC.
- Conversions and cost per conversion.
- Top ad groups by spend/clicks/conversions.
- Keywords and search terms that are spending or getting clicks.
- Any zero-data condition, such as no impressions because ads are still under review.

End with next actions:

- Policy/review action if ads are blocked or pending.
- Negative keyword action if search terms are low quality.
- Budget/bid action if impressions are low but policy is clear.
- Landing-page/form action if clicks occur without conversions.

## Interpretation Rules

- Do not say ads are "live" unless active ads are approved or serving and there are impressions or eligible active assets.
- If campaign is `ENABLED` but primary status is `PENDING`, `NOT_ELIGIBLE`, or reasons include review/disapproval, say the campaign is enabled but not fully serving.
- Treat `UNKNOWN` approval with `REVIEW_IN_PROGRESS` as pending review, not approved and not rejected.
- Treat campaign-level `HAS_ADS_DISAPPROVED` cautiously when removed ads still exist; inspect active non-removed ads before concluding current ads are rejected.
- For a new campaign with little data, emphasize status, review, and setup health over performance metrics.
- If conversions are zero, do not infer failure until there are meaningful clicks.

## Script Output

The script prints sections:

- `SUMMARY`
- `CAMPAIGN_STATUS`
- `AD_STATUS`
- `AD_GROUPS`
- `KEYWORDS`
- `SEARCH_TERMS`

Use these sections as the factual backbone. Do not invent metrics not present in the output.

## Safety

- The script is read-only.
- Never run mutation scripts from this skill.
- Do not print OAuth secrets, developer tokens, refresh tokens, or `.env.local` contents.
- If `GOOGLE_ADS_CUSTOMER_ID` is missing, set it to `1099427521` for this account.
