# Google Ads AI Consulting Launch Spec

Date: 2026-06-22
Status: launched
Primary Google Ads customer: `1099427521`
Current campaign: `23969798803` / `Search | AI Consulting | Exact/Phrase`

## Executive Decision

Revamp the existing Google Ads customer `1099427521` for Duncan Anderson's AI consulting business instead of creating a new customer.

Reason:

- The CA$600 Google Ads credit is already visible in that account.
- Google promotional credits are account-applied ad credits, not cash or refunds.
- Google only supports unused credit transfers in narrow payment-account cases tied to specific Google legal entities, and Canada is not listed in the public transfer eligibility page.
- The old LINEUP campaigns are paused and should remain paused because the product is gambling-adjacent and already hit policy friction.

Operating rule:

- Keep all LINEUP campaigns paused.
- Do not reuse LINEUP ad copy, keywords, or landing pages.
- Rename the account in the UI to something like `Duncan Anderson AI Consulting` after confirming the promo remains attached.
- Use the existing customer only as the billing/promo container and create clean AI consulting campaigns inside it.

## Goal

Use the CA$600 credit as a controlled lead-generation test, not an awareness campaign.

Primary outcome:

- Qualified contact-form submissions or booked calls from operators with a specific workflow, automation, reporting, customer support, sales, or AI implementation problem.

Secondary outcome:

- Learn which search intents produce real consulting opportunities before spending beyond the promo test.

Definition of a qualified lead:

- Has a real business, website, or company identity.
- Names a concrete workflow or operational problem.
- Has budget or urgency signals.
- Is in Canada or the United States.
- Is not a job seeker, student, vendor, course seeker, prompt seeker, or free-help request.

## Current Account State

Google Ads API and MCP checks established:

- `1099427521` is the practical campaign customer.
- `2496704694` is a manager account named `The Lineup`; API child-account creation failed with `CREATION_DENIED_INELIGIBLE_MCC`, so it should not block the launch.
- Currency is CAD.
- Time zone is America/Toronto.
- Auto-tagging is enabled.
- Old LINEUP campaigns are paused.
- New AI consulting campaign is enabled.

Created campaign:

- Campaign name: `Search | AI Consulting | Exact/Phrase`
- Campaign id: `23969798803`
- Status: `ENABLED`
- Daily budget: CA$20
- Max CPC: CA$3
- Locations: Canada and United States
- Language: English
- Network: Google Search only
- Search Network: off
- Search Partners: off
- Display/content network: off
- Current final URL: `https://duncananderson.ca/ai-workflow-audit`

Launch gate evidence:

- Production page: `https://duncananderson.ca/ai-workflow-audit`
- Production deploy alias: `https://www.duncananderson.ca`
- Conversion action: `customers/1099427521/conversionActions/7658073839`
- Conversion status: `ENABLED`
- Conversion send_to: `AW-729730926/qxH6CO_d08McEO6e-9sC`
- Production form validation returned `{"success":true}` for an AI workflow audit payload.
- Post-launch Google Ads readback confirmed campaign `23969798803` is `ENABLED` and every old LINEUP campaign remains `PAUSED`.

## Research Findings

### Market Demand

The market has demand, but the buyer is confused and skeptical.

Evidence:

- McKinsey's 2025 AI survey reports 88% of surveyed organizations regularly use AI in at least one business function, but most remain in experimentation or pilot stages. That creates demand for practical implementation help, not vague strategy.
- McKinsey also identifies workflow redesign as a major differentiator for AI high performers, which supports positioning around operations and workflows instead of generic "AI transformation."
- Stanford's 2026 AI Index reports organizational AI adoption at 88%, and Lightcast's AI Index contribution shows hiring demand shifting toward agentic AI, AI agents, and systems-at-scale skills. That supports selling implementation and automation systems, not generic ChatGPT advice.

Implication:

- The offer should not be "AI consulting" alone. It should be "find and implement the first useful AI workflow" for a business function.

### Paid Search Strategy

Google's own docs say Search reaches people actively looking for products or services, and keyword match types trade control for reach.

Implication:

- Start with exact and phrase match because the promo budget is limited and the category has many bad intents.
- Avoid broad match until conversion tracking is clean and enough qualified-lead data exists.
- Avoid Performance Max at launch because it broadens inventory before the account has reliable lead-quality feedback.

### Landing Page Strategy

Current PPC landing-page guidance is consistent: match the page to the keyword and ad promise, write for the target persona, make the headline direct, and keep the page conversion-focused.

Implication:

- Do not send paid traffic to the generic home page.
- Use dedicated landing pages that match the searcher's problem:
  - AI workflow audit
  - AI automation consulting
  - ChatGPT / custom GPT implementation
  - Airtable / Make / n8n / Zapier automation
  - Reporting and spreadsheet automation
  - Customer support automation

### Tracking Strategy

Google's conversion docs require website conversion measurement for campaign performance. Enhanced conversions can improve measurement by hashing first-party lead data. Google lead form assets can work, but Google recommends fast lead management, webhook/CRM routing, and strong data hygiene.

Implication:

- Track only meaningful lead submits as primary conversions at launch.
- Preserve `gclid`, `gbraid`, `wbraid`, UTM fields, landing page, and referrer.
- Add manual qualified-lead labels before switching to conversion-based automated bidding.
- Consider lead form assets only after the website form and privacy policy are ready.

## Positioning

Primary positioning:

> Practical AI automation for small businesses with real operational bottlenecks.

Avoid:

- "AI transformation" as a broad promise.
- "Get rich with AI" language.
- Unverifiable ROI claims.
- Sports betting, gambling, wagering, odds, picks, or betting analytics language in ads.
- Leading with THE LINEUP in paid-search ads or above the fold.

Use:

- Workflow audit.
- Automation prototype.
- Production implementation.
- Data/reporting automation.
- CRM, inbox, spreadsheet, Airtable, Make, n8n, Zapier, and internal tool integrations.
- Human-reviewed AI systems.
- Measured time savings and operational reliability.

Best-fit buyers:

- Founder-led SMBs.
- Operators and operations managers.
- Agencies with manual fulfillment or reporting work.
- Professional service firms.
- Local service businesses with admin bottlenecks.
- Ecommerce or marketplace teams with repetitive support, reporting, or catalog workflows.
- Teams already using Airtable, spreadsheets, Make, Zapier, n8n, Notion, HubSpot, or internal dashboards.

Poor-fit traffic:

- Students.
- Job seekers.
- People looking for free prompts.
- People looking for courses or certifications.
- AI news/research readers.
- Vendors pitching tools.
- Enterprise buyers expecting a large consultancy.

## Offer Architecture

### Primary Offer

Route:

- `/ai-workflow-audit`

Offer:

> Request an AI workflow audit.

Promise:

- Review one operational workflow.
- Identify automation opportunities.
- Estimate complexity and likely time savings.
- Recommend one practical first project.
- No obligation to build.

Why this offer:

- It converts broad AI curiosity into a concrete business conversation.
- It creates a reason to describe the workflow in the form.
- It allows disqualification before a call.
- It matches the actual consulting service: practical engineering, not slideware.

### Secondary Offers

Create only after the primary page is live and tracked.

1. `/ai-automation-consulting`
   - Search intent: "AI automation consultant", "business automation consultant", "workflow automation consultant".
   - Promise: automate repetitive business workflows with reliable AI and software.

2. `/chatgpt-business-consulting`
   - Search intent: "ChatGPT consultant", "custom GPT consultant", "ChatGPT for business consultant".
   - Promise: turn ChatGPT usage into structured business workflows, internal assistants, and repeatable processes.

3. `/airtable-make-n8n-automation-consultant`
   - Search intent: "Airtable consultant", "Make.com consultant", "n8n consultant", "Zapier consultant".
   - Promise: connect the tools the business already uses and remove manual glue work.

4. `/ai-reporting-automation`
   - Search intent: "report automation consultant", "Google Sheets automation consultant", "dashboard automation consultant".
   - Promise: replace recurring spreadsheet/reporting work with automated data flows and reviewable summaries.

5. `/ai-customer-support-automation`
   - Search intent: "AI customer support automation", "AI chatbot consultant".
   - Promise: triage, draft, summarize, and route support work with human approval.

## Primary Landing Page Spec

Route:

- `/[locale]/ai-workflow-audit`
- Canonical visible URL should resolve as `/ai-workflow-audit` for English traffic if middleware supports locale routing.

Page goal:

- Convert paid-search visitors into qualified audit requests.

Above the fold:

- H1: `AI workflow audits for small businesses`
- Subhead: `Find the repetitive work AI can actually remove, then turn the best opportunity into a reliable automation.`
- Primary CTA: `Request an audit`
- Secondary CTA: `See examples`
- Trust line: `Built by Duncan Anderson, an AI engineer and data scientist who ships working systems for small teams.`

Problem section:

- Manual admin work is eating hours every week.
- Data is scattered across spreadsheets, inboxes, CRMs, and niche tools.
- AI seems useful, but the first safe project is unclear.
- Teams have tried tools or prompts, but nothing has become a dependable workflow.

Service section:

- Workflow audit: map the workflow, inputs, decisions, tools, and handoffs.
- Automation prototype: prove the workflow with a small working version.
- Production implementation: deploy the workflow with monitoring, handoffs, and human review.
- Measurement: track time saved, errors avoided, and manual steps removed.

Proof section:

- Dispute Defender: evidence collection and chargeback-response automation.
- Deal Engine: deal scoring, surfacing, and recommendation workflows.
- THE LINEUP: full-stack data and AI platform with paid users.

Policy note:

- Keep THE LINEUP below the first conversion CTA and frame it as a data platform / subscription product engineering case study. Do not use gambling, betting, odds, picks, wager, sportsbook, or similar terms in paid ad text or above-fold landing copy.

Form fields:

- Name
- Work email
- Company
- Website
- Country
- Team size
- Monthly budget range
- What workflow are you trying to improve?
- What tools are involved?
- How soon do you want to fix this?
- Hidden fields:
  - `utm_source`
  - `utm_medium`
  - `utm_campaign`
  - `utm_term`
  - `utm_content`
  - `gclid`
  - `gbraid`
  - `wbraid`
  - `landing_path`
  - `landing_url`
  - `referrer`
  - `first_touch_at`
  - `current_touch_at`

Qualification copy near form:

> Best fit: a real business workflow, a clear owner, and enough volume that saving a few hours every week matters.

Thank-you state:

- Confirm the request was received.
- Tell the lead Duncan will review the workflow and reply directly.
- Do not fire conversion until the server accepts the form.

## Tracking And Attribution Requirements

### Required Before Launch

1. Install Google tag or GTM across the site.
2. Create one Google Ads conversion action:
   - Name: `AI Consulting Lead Submit`
   - Category: submit lead form
   - Count: one
   - Value: no value initially, or fixed nominal value only if needed for reporting
3. Fire the conversion event only after `/api/contact` returns success.
4. Persist first-touch attribution in browser storage.
5. Capture current-touch attribution from the landing URL.
6. Include attribution fields in the Resend notification email.
7. Add a simple lead-quality label in the email subject or body:
   - `unreviewed`
   - `qualified`
   - `maybe`
   - `bad-fit`
8. Add a no-index/internal-only log later if email alone becomes hard to manage.

### Recommended Shortly After Launch

1. Enable enhanced conversions for leads after confirming privacy policy coverage.
2. Add offline conversion import or MCP/script support for qualified-lead updates.
3. Use unique lead IDs to tie form submits to manual lead-quality outcomes.
4. Move from "lead submit" optimization to "qualified lead" once enough qualified data exists.

### UTM Convention

Account/campaign final URL suffix:

```text
utm_source=google&utm_medium=cpc&utm_campaign=ai_workflow_audit_search&utm_term={keyword}&utm_content={creative}
```

Use consistent campaign names:

- `ai_workflow_audit_search`
- `ai_automation_consulting_search`
- `chatgpt_business_consulting_search`
- `automation_tools_search`
- `ai_reporting_automation_search`
- `ai_support_automation_search`

## Campaign Structure

The current created campaign can launch as the Phase 1 container after landing/tracking gates pass.

Recommended Phase 1 setup:

- One Search campaign.
- Exact and phrase match only.
- Separate tightly themed ad groups.
- One landing page initially: `/ai-workflow-audit`.
- Add secondary landing pages only when the primary page converts or query volume proves a theme deserves its own page.

### Ad Group 1: Core AI Consulting

Intent:

- Buyer knows they need AI help but has not named a tool or workflow.

Keywords:

```text
[ai consultant]
"ai consultant"
[ai consulting]
"ai consulting"
[ai consulting services]
"ai consulting services"
[ai consultant for small business]
"ai consultant for small business"
"small business ai consultant"
[ai implementation consultant]
"ai implementation consultant"
```

Landing page:

- `/ai-workflow-audit`

Ad angle:

- Practical AI consulting.
- Workflow audit.
- Implementation, not strategy decks.

### Ad Group 2: Workflow Automation

Intent:

- Buyer wants repetitive business work automated.

Keywords:

```text
[ai automation consultant]
"ai automation consultant"
[workflow automation consultant]
"workflow automation consultant"
[business automation consultant]
"business automation consultant"
"ai workflow automation"
"automate business processes with ai"
"business process automation consultant"
```

Landing page:

- `/ai-workflow-audit`
- Later: `/ai-automation-consulting`

Ad angle:

- Remove manual handoffs.
- Automate admin, reporting, support, and operations.
- Connect existing tools.

### Ad Group 3: ChatGPT For Business

Intent:

- Buyer has ChatGPT awareness and wants practical business usage.

Keywords:

```text
[chatgpt consultant]
"chatgpt consultant"
[chatgpt for business consultant]
"chatgpt for business consultant"
[custom gpt consultant]
"custom gpt consultant"
"chatgpt implementation consultant"
"chatgpt automation consultant"
```

Landing page:

- `/ai-workflow-audit`
- Later: `/chatgpt-business-consulting`

Ad angle:

- Turn ad hoc ChatGPT use into repeatable workflows.
- Build internal assistants with guardrails.
- Keep human review where it matters.

### Ad Group 4: Automation Tools

Intent:

- Buyer already knows the tool ecosystem and is closer to implementation.

Keywords:

```text
[airtable consultant]
"airtable consultant"
[airtable automation consultant]
"airtable automation consultant"
[make.com consultant]
"make.com consultant"
[make automation consultant]
"make automation consultant"
[n8n consultant]
"n8n consultant"
[n8n automation consultant]
"n8n automation consultant"
[zapier consultant]
"zapier consultant"
[zapier automation consultant]
"zapier automation consultant"
```

Landing page:

- `/ai-workflow-audit`
- Later: `/airtable-make-n8n-automation-consultant`

Ad angle:

- Fix brittle automations.
- Connect tools.
- Add AI where it actually improves a workflow.

### Ad Group 5: Reporting And Spreadsheets

Intent:

- Buyer is stuck in recurring reporting, spreadsheet cleanup, dashboard updates, or manual analysis.

Keywords:

```text
[report automation consultant]
"report automation consultant"
[spreadsheet automation consultant]
"spreadsheet automation consultant"
[google sheets automation consultant]
"google sheets automation consultant"
[dashboard automation consultant]
"dashboard automation consultant"
"automated business reporting"
"ai reporting automation"
```

Landing page:

- `/ai-workflow-audit`
- Later: `/ai-reporting-automation`

Ad angle:

- Replace recurring reporting work.
- Automate spreadsheet cleanup and summaries.
- Build reliable human-reviewed dashboards and reports.

### Ad Group 6: Support And Ops Automation

Intent:

- Buyer wants customer-support, inbox, or operations triage help.

Keywords:

```text
[ai customer support automation]
"ai customer support automation"
[ai chatbot consultant]
"ai chatbot consultant"
[customer support automation consultant]
"customer support automation consultant"
"ai email automation"
"ai inbox automation"
"operations automation consultant"
```

Landing page:

- `/ai-workflow-audit`
- Later: `/ai-customer-support-automation`

Ad angle:

- Triage and draft support responses.
- Summarize customer history.
- Route work with human approval.

## Negative Keyword List

Apply at account level if possible, and to the campaign at minimum.

### Jobs And Hiring

```text
job
jobs
career
careers
salary
resume
internship
intern
recruiter
recruiting
hiring
freelancer job
upwork
fiverr
```

### Education And Free Research

```text
course
courses
certification
certificate
degree
training
tutorial
class
classes
bootcamp
free
template
templates
example
examples
pdf
book
ebook
```

### Tool Vendor / DIY Only

```text
software
platform
app
download
open source
github
api docs
documentation
prompt
prompts
prompt engineering course
```

### Low-Fit AI Curiosity

```text
news
stock
stocks
definition
meaning
what is
history
future of ai
statistics
reddit
youtube
podcast
```

### LINEUP / Gambling Policy Separation

```text
betting
bets
bet
gambling
casino
odds
sportsbook
parlay
dfs
fantasy sports
prop picks
```

Review search terms daily for the first week and add negatives immediately.

## Responsive Search Ad Copy

Use direct, sober copy. Avoid unsupported guarantees.

### Core AI Consulting Headlines

```text
AI Consulting For SMBs
Request An AI Workflow Audit
Practical AI Automation Help
Turn Manual Work Into Systems
Build Useful AI Workflows
AI Implementation Consultant
Automate Admin And Reporting
Find Your First AI Project
Human-Reviewed AI Systems
AI Help Without The Hype
```

### Workflow Automation Headlines

```text
Workflow Automation Consultant
Automate Repetitive Work
Fix Manual Business Processes
Connect Spreadsheets And Tools
AI Automation For Operations
Build Reliable Automations
Save Hours On Admin Work
Audit Your Workflow
```

### Tool-Specific Headlines

```text
Airtable Automation Help
Make.com Automation Consultant
n8n Automation Consultant
Zapier Automation Consultant
Connect Your Business Tools
AI For Existing Workflows
```

### Descriptions

```text
Map one repetitive workflow and find the practical AI automation worth building first.
Get implementation help from an AI engineer who builds working systems for small teams.
Replace brittle manual handoffs with reliable automations across tools, data, and inboxes.
Request a workflow audit for reporting, admin, support, sales ops, or internal processes.
```

### Sitelinks

Add after the pages exist:

- `AI Workflow Audit` -> `/ai-workflow-audit`
- `Automation Consulting` -> `/ai-automation-consulting`
- `ChatGPT For Business` -> `/chatgpt-business-consulting`
- `Case Studies` -> `/#projects` or a future `/case-studies`

## Budget And Bidding Rules

Starting budget:

- CA$20/day for the first 30 days.

Why:

- The promo is CA$600. CA$20/day gets enough signal in roughly one month without creating an uncontrolled spend spike.
- If the promo requires a spend threshold within 60 days, CA$20/day leaves room to pause, fix tracking, and still complete the test if results are promising.

Bidding:

- Start with manual CPC / CPC cap behavior as currently scripted.
- Keep max CPC at CA$3 initially.
- Increase to CA$5 only if impressions are too low and search terms are clean.
- Do not switch to Maximize Conversions until conversions are firing correctly and lead quality is manually reviewed.

Stop-loss rules:

- Pause if CA$150 spend produces zero real business inquiries.
- Pause if more than 50% of spend goes to irrelevant search terms after negatives.
- Pause if conversion tracking is broken.
- Pause if the landing page is not live, mobile-friendly, and fast.
- Pause if old LINEUP/gambling terms somehow enter the search terms report.

Scale rules:

- Add budget only after at least two qualified leads or one serious sales conversation.
- Split a secondary landing page only after a search theme receives meaningful impressions/clicks.
- Add phrase variants before broad match.
- Add broad match only with strong conversion tracking and a qualified-lead optimization loop.

## Manual Google Ads Account Steps

Do these in Google Ads UI:

1. Open customer `1099427521`.
2. Confirm the CA$600 promo remains visible under Billing / Promotions.
3. Rename the account from LINEUP-oriented naming to `Duncan Anderson AI Consulting` or similar.
4. Confirm every old LINEUP campaign is paused.
5. Add a label to old campaigns if useful: `Archived - LINEUP policy hold`.
6. Confirm campaign `23969798803` remains paused.
7. Confirm the new campaign has:
   - Search only
   - Canada and United States
   - English
   - CA$20/day
   - Search Partners off
   - Display off
8. Add the negative keyword list.
9. Create conversion action `AI Consulting Lead Submit`.
10. Add Google tag/GTM details to the site implementation task.
11. Do not enable campaign until launch gates pass.

## Site Implementation Scope

### Files Likely To Change

- `src/app/[locale]/page.tsx`
- `src/app/[locale]/layout.tsx`
- `src/app/api/contact/route.ts`
- `src/components/sections/Contact.tsx`
- `src/lib/constants.ts`
- `messages/en.json`
- `messages/fr.json`
- New route/components for `/ai-workflow-audit`
- Optional utility for attribution persistence

### Implementation Tasks

1. Add `/ai-workflow-audit` page.
2. Add paid-search-focused form or adapt `Contact` to accept context.
3. Capture hidden attribution fields on submit.
4. Persist first-touch attribution in local storage.
5. Include all attribution fields in the Resend email.
6. Add Google tag/GTM environment variables:
   - `NEXT_PUBLIC_GTM_ID` or `NEXT_PUBLIC_GOOGLE_TAG_ID`
   - `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID`
   - `NEXT_PUBLIC_GOOGLE_ADS_LEAD_CONVERSION_LABEL`
7. Fire conversion only after successful submit.
8. Update privacy policy or add a simple privacy section before enabling enhanced conversions or lead form assets.
9. Add case-study links and copy that avoid policy-problem terms above the fold.

## Launch Gates

Do not enable the campaign until every item is true:

- `/ai-workflow-audit` returns 200 in production.
- Page is responsive on mobile and desktop.
- Form submits successfully to Resend.
- Test email includes visible attribution fields.
- UTM fields are captured from a test URL.
- `gclid`, `gbraid`, and `wbraid` fields are captured when present.
- Google Ads conversion tag fires only after successful form submission.
- No conversion fires on validation errors.
- Old LINEUP campaigns remain paused.
- New AI campaign remains the only campaign considered for activation.
- Negative keyword list is applied.
- Final URL matches the live route.
- Privacy policy is adequate for form collection and tracking.

## First 14 Days Operating Loop

Daily for first week:

- Check spend.
- Check impressions, clicks, CTR, CPC.
- Check search terms.
- Add negatives.
- Review every lead manually.
- Label leads:
  - qualified
  - maybe
  - bad-fit
  - spam
- Note search term and ad group for any qualified lead.

Twice weekly after first week:

- Review budget pacing.
- Review conversion rate.
- Review qualified-lead rate.
- Review whether one ad group is carrying all signal.
- Pause low-fit ad groups.
- Write new ads only for themes with real search volume.

Weekly decision rules:

- If clicks but no form starts: landing page or intent mismatch.
- If forms but no qualified leads: add qualifying fields, negatives, and stronger fit copy.
- If impressions are low but terms are clean: add phrase variants or raise CPC cap.
- If CPC is high and no qualified leads: narrow keywords and strengthen proof.
- If qualified leads appear: create the matching landing page and expand that theme.

## MCP/API Capability In This Repo

Local scripts added:

- `scripts/google_ads_python.sh`
- `scripts/google_ads_smoke.py`
- `scripts/google_ads_create_ai_consulting_customer.py`
- `scripts/google_ads_build_ai_consulting_campaign.py`

NPM commands added:

```bash
npm run google-ads:smoke
npm run google-ads:create-customer
npm run google-ads:validate
npm run google-ads:apply-paused
```

Environment variables added to `.env.example`:

```text
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_MANAGER_CUSTOMER_ID=
GOOGLE_ADS_CUSTOMER_ID=
```

Safety:

- No customer ID default in code.
- Campaign creation is validate-only unless explicitly run with `--apply`.
- Campaign creation uses `PAUSED` status.
- The account decision is now to use existing customer `1099427521`, not to create a child customer.

## Future Improvements

After the primary campaign has conversion data:

1. Build the secondary landing pages that match proven search themes.
2. Add lead form assets only if privacy policy and lead routing are ready.
3. Add offline conversion import for qualified leads.
4. Add a daily Google Ads scorecard script similar to the old LINEUP control loop, but focused on spend, search terms, form leads, qualified leads, and sales conversations.
5. Consider LinkedIn or direct outbound only after Search produces a working message-market fit.

## Sources

- Google Ads Canada offer page: https://business.google.com/ca-en/google-ads/
- Google Ads promotional offers: https://support.google.com/google-ads/answer/6388096
- Google Ads unused credit transfers: https://support.google.com/google-ads/answer/12639567
- Google Ads keyword matching options: https://support.google.com/google-ads/answer/7478529
- Google Ads negative keywords: https://support.google.com/google-ads/answer/2453972
- Google Ads web conversions: https://support.google.com/google-ads/answer/16560108
- Google Ads enhanced conversions: https://support.google.com/google-ads/answer/9888656
- Google Ads lead form asset best practices: https://support.google.com/google-ads/answer/17051443
- McKinsey State of AI 2025: https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai
- Stanford AI Index 2026: https://hai.stanford.edu/ai-index/2026-ai-index-report
- Lightcast / Stanford AI Index 2026 labor demand notes: https://lightcast.io/resources/research/stanford-ai-index-2026
- Hallam PPC landing page best practices: https://hallam.agency/blog/15-best-practices-for-ppc-landing-pages/
