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
7. Enforce source diversity. This is a broad public-internet and job-board pass, not a paid-marketplace scraper.
8. Check at least 5 source families when search access allows it: Reddit/local subreddits, automation/vendor communities, public/free job boards, founder/operator/small-business forums, industry forums, public company hiring pages, public RFP/vendor-request pages, local business groups, and general web search results.
9. Exclude Upwork, Freelancer, PeoplePerHour, Guru, and every source requiring paid credits, payment to apply, a subscription for contact details, or login-only details before qualification. Do not search them or surface them anywhere in the digest, tracker, status, or published admin data.
10. Include traditional job boards and company ATS boards when they have clean free-to-apply paths: Wellfound, We Work Remotely, RemoteOK, public LinkedIn/Indeed listings, Otta/Welcome to the Jungle public listings, Y Combinator Work at a Startup, company career pages, Greenhouse, Lever, Ashby, Craigslist/Kijiji gigs, and similar public boards.
11. If one platform dominates the digest, name the non-dominant source families checked and why they did not qualify.
12. Do not include broad fit-based business-directory leads unless the source also shows a current trigger such as a hiring post, help request, public complaint, explicit tool failure, recent operations change, or consultant request.
13. Treat partner/overflow opportunities as valid when they show paid implementation demand from an automation agency, freelancer, RevOps consultant, or tool specialist looking for builders, contractors, QA, documentation, or delivery support.
14. Prioritize leads Duncan can pursue without buying marketplace credits: public comments, platform DMs, partner messages, public job/community replies, direct applications, or direct contact from a public help request.
15. Admit candidates based on business-buyer evidence before tool evidence. Tool names can increase fit only after there is evidence of an existing business, team, client/customer workflow, hiring signal, or commercially meaningful process.
16. Do not promote generic AI/tool discussion, seller posts, job seekers, consumer support, low-budget one-off tasks, or unverifiable sources to `## Best Leads`.
17. After writing the digest and status, run the publisher and verify Supabase has active `automation` rows.
18. Treat `## Best Leads` as a short-term consulting queue. A job-board lead must explicitly be consulting, contract, freelance, fractional, temporary, or an RFP, and Duncan must be confirmed eligible from Canada/remote North America/worldwide. Permanent, full-time, employee-only, contractor-unknown, and location-ineligible roles are at most `3/5`.
19. Never infer engagement type or location eligibility. Record `unknown` and keep the candidate in `## Maybe / Watch` when the source does not say.

## Procedure

1. Use the provided date argument; otherwise use today's date.
2. Read `/Users/duncananderson/.codex/automations/ai-consulting-lead-research/automation.toml` for the current recurring prompt.
3. Search public sources for existing business buyers with operational, growth, customer, finance, reporting, document, team, or AI-adoption problems where hiring an AI-capable expert is plausible. Start from buyer situations before tool terms. Prioritize direct-client, public RFP, and partner/overflow opportunities. Use a deliberately mixed search set:
   - Reddit public pages and local/business subreddits.
   - Automation/vendor communities such as n8n Community, Airtable Community, Zapier Community, Make Community, Softr/Glide/Notion forums.
   - Public job boards, company ATS boards, and free-to-apply freelance/contract boards such as Contra, Wellfound, We Work Remotely, RemoteOK, public LinkedIn/Indeed listings, Otta/Welcome to the Jungle public listings, Y Combinator Work at a Startup, company career pages, Greenhouse, Lever, Ashby, Craigslist gigs, Kijiji/Craigslist local services, and relevant job boards. Search for consulting/contract/freelance/fractional/temporary/RFP work, not conventional employment. Exclude paid-credit/pay-to-unlock marketplaces.
   - Founder/operator/small-business forums such as Indie Hackers, Hacker News hiring/freelance threads, public Alignable-style posts, and industry forums.
   - Public company hiring pages, role posts, RFP/vendor-request pages, and general web/search result pages for exact buying-intent phrases.
4. Apply this scoring model:
   - `5/5`: fresh explicit paid ask, consultant/expert request, contractor request, RFP, implementation-help post, or partner/overflow role from a real business with concrete workflow scope, public reachability, AI/systems fit, and confirmed eligibility.
   - `4/5`: direct business buyer with real workflow pain, clear stakes, public reachability, commercial fit, and a plausible AI/systems intervention, but no explicit budget yet. Job-board rows cannot use this category.
   - `3/5`: warm public reply, company signal, conventional/unclear job, unknown engagement type, unknown location eligibility, or market-intelligence item. Do not put these in `## Best Leads`.
   - `1-2`: broad tool-shopping, generic AI interest, seller promotion, job seeker, consumer support, stale posts, directory businesses, vague jobs, low-budget tasks, or leads requiring paid marketplace credits before basic qualification.
   - A candidate cannot be `4+` without business evidence, AI/systems leverage, commercial fit, reachability, and a source URL.
   - A candidate cannot be `5/5` without explicit expert-hiring, paid implementation, contract, consultant, or strict implementation-help evidence.
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
- Lead type: direct_client, partner_overflow, job_board, or watch
- Engagement model: consulting, contract, freelance, fractional, temporary, RFP, permanent, full_time, or unknown
- Location eligibility: eligible, ineligible, or unknown
- Eligibility evidence: exact source fact supporting engagement and location eligibility
- Recommended action: comment, dm_if_engaged, dm, apply, partner_note, watch, or ignore
- Source family: business_owner_community, industry_forum, platform_community, public_job_board, founder_community, local_business_group, professional_services_forum, social_post, public_rfp_vendor_request, reddit, or other
- Buyer situation: explicit_expert_hiring, ai_adoption_strategy, operational_bottleneck, growth_sales_leakage, knowledge_content_customer_experience, document_finance_admin_workflow, reporting_visibility, team_training_change_management, company_hiring_signal, market_intelligence, or reject
- Queue: active_lead, warm_reply, company_signal, market_intelligence, or reject
- Offer match: ai_opportunity_audit, workflow_automation_sprint, ai_team_enablement, crm_lead_flow_repair, document_intake_automation, management_dashboard_visibility, ai_customer_experience_workflow, custom_system_prototype, or not_a_fit
- Business maturity score: 1-5
- Pain severity score: 1-5
- Hiring likelihood score: 1-5
- AI leverage score: 1-5
- Commercial fit score: 1-5
- Duncan fit score: 1-5
- Reachability score: 1-5
- Freshness score: 1-5
- Confidence score: 1-5
- Evidence summary: concise summary separating business evidence from AI/systems fit
- Explicit evidence: facts directly stated by the source
- Inferred evidence: contextual inference, clearly labeled
- Missing evidence: key gaps, or "none"
- Source quote or snippet: short source excerpt or summarized source fact
- Evidence URL: canonical URL used to verify the claim
- Response path: public/free-to-pursue path
- Next step: first offer/action Duncan should take
- Dismissal reason: none, or one of not_business, no_hiring_intent, tool_chatter, generic_discussion, seller_or_agency, job_seeker, consumer_support, stale, bad_source, bad_query, not_duncan_fit, too_small, unreachable, duplicate, missing_public_verification, low_confidence_inference
- Related sources: comma-separated related URLs/sources, or none
- Duplicate of: canonical lead key if duplicate, or none
- Last verified at: ISO_TIMESTAMP
- Why it matched: concise reason including freshness and buying intent
- Free-to-pursue path: how Duncan can act without buying marketplace credits, paying to unlock/apply, or using login-only marketplace data. Reject the lead instead of writing "paid marketplace gate" for sources that require paid access.

Suggested comment:

> short public reply, no website URL unless the post explicitly asks for contact info

Suggested DM:

> short DM when appropriate

Tracker row:

| POSTED_DATE | Web/Reddit: source | author | need | Not yet | | | New | notes |

## Maybe / Watch

Use this section for possibly good leads with weaker fit, older dates, unverifiable dates, conventional employment, or unknown engagement/location eligibility. State the failed Best Leads gate. Also include promising allowed source families checked when they did not produce main-digest leads. Do not include paid-gated marketplace items.

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
  "sourceFamilyDiagnostics": {
    "configuredSourcesChecked": {},
    "candidateCountBySourceFamily": {},
    "activeLeadCountBySourceFamily": {},
    "candidateCountByLeadType": {},
    "rejectedCountByGate": {},
    "duplicatesRemoved": {},
    "freshnessCoverage": {},
    "sourcePolicy": "public_free_to_pursue_only"
  },
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

Summarize included lead count, source/lead-type mix, top 3 titles with URLs and posted dates, output path, publish result, Supabase active-row count, rejection-gate summary, and visibility limits.
