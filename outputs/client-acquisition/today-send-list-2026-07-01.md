# Today Send List - 2026-07-01

Purpose: one working sheet for the next manual send session. Do not send all at once if an account is new or low-trust. Send the highest-fit items first, then log each action in `outputs/client-acquisition/outreach-action-tracker-2026-07-01.csv`.

## Rule For Today

Send 5 serious attempts before doing any more research:

1. One direct paid Reddit/marketplace lead.
2. One Make/Airtable public reply.
3. Two n8n partner or contractor leads.
4. One email application.

Use public replies without links where possible. Use `https://www.duncananderson.ca/en/ai-workflow-audit` in DMs, email applications, and proposal boxes.

Latest live search audit: `outputs/client-acquisition/fresh-search-audit-2026-07-01.md`. It did not find a stronger replacement for the top five.

## Send Order

### 1. Reddit r/forhire - Universal Intent Engine

- Tracker row: `1`
- URL: `https://www.reddit.com/r/forhire/comments/1ufdkbq/hiring_lead_gen_ai_automation_engineer_to_build/`
- Channel: Reddit DM with subject `Universal Intent Engine`
- Copy source: `outputs/client-acquisition/send-now-proposal-pack-2026-07-01.md`, section `1. Reddit r/forhire - Universal Intent Engine`
- Why first: explicit same-day paid contractor post, no Upwork Connects, clean stack fit.
- After sending: set tracker status to `sent`, set `posted_or_sent_at` to `2026-07-01`, set `next_follow_up_at` to `2026-07-03`.

### 2. PeoplePerHour - WooCommerce & API Integration Developer

- Tracker row: `15`
- URL: `https://www.peopleperhour.com/freelance-jobs/technology-programming/e-commerce-cms-development/woocommerce-api-integration-developer-4506356`
- Channel: PeoplePerHour proposal/message
- Copy source: `outputs/client-acquisition/send-now-proposal-pack-2026-07-01.md`, section `2. PeoplePerHour - WooCommerce & API Integration Developer`
- Why second: fresh paid workflow rebuild with Stripe, WooCommerce, Zapier, PDF delivery, QuickBooks, retries, and follow-up automation.
- After sending: set tracker status to `sent`, set `posted_or_sent_at` to `2026-07-01`, set `next_follow_up_at` to `2026-07-03`.

### 3. Make Community - Retell AI Webhook Mapping

- Tracker row: `2`
- URL: `https://community.make.com/t/retell-ai-webhook-data-not-mapping-through-make-ai-toolkit-to-downstream-modules/111482`
- Channel: public reply first; DM only after engagement or if forum rules allow.
- Copy source: `outputs/client-acquisition/send-now-proposal-pack-2026-07-01.md`, section `3. Make Community - Retell AI Webhook Mapping`
- Why third: concrete troubleshooting request; a useful public answer can create trust without a cold pitch.
- After posting: set tracker status to `commented`, set `posted_or_sent_at` to `2026-07-01`, set `next_follow_up_at` to `2026-07-02`.

### 4. Synergy Effect - AI Automation Engineer / n8n & AI Agent Developer

- Tracker row: `23`
- URL: `https://community.n8n.io/t/hiring-ai-automation-engineer-n8n-ai-agent-developer/294904`
- Channel: email application to `info@s-e.lt`; optional short public note after emailing.
- Copy source: `outputs/client-acquisition/n8n-specific-replies-2026-07-01.md`, section `1. Synergy Effect`
- Why fourth: strongest no-Connect partner/contractor fit; the post explicitly asks applicants to answer eight questions by email.
- After sending: set tracker status to `sent`, set `posted_or_sent_at` to `2026-07-01`, set `next_follow_up_at` to `2026-07-04`.

### 5. TargetPatientsMD - Freelance AI Automation Engineer

- Tracker row: `19`
- URL: `https://community.n8n.io/t/hiring-freelance-ai-automation-engineer-remote/299853`
- Channel: email to `kat@targetpatientsmd.com`
- Subject: `Scale - Claude/n8n lead-gen workflow reliability`
- Copy source: `outputs/client-acquisition/n8n-specific-replies-2026-07-01.md`, section `4. TargetPatientsMD`
- Why fifth: direct email application path, no marketplace credits, project-based freelance language.
- After sending: set tracker status to `sent`, set `posted_or_sent_at` to `2026-07-01`, set `next_follow_up_at` to `2026-07-04`.

## If You Have Time For 3 More

### 6. JEnterprises - Long-Term n8n + Postgres Medical Consulting Platform

- Tracker row: `25`
- URL: `https://community.n8n.io/t/hiring-long-term-n8n-postgres-build-for-a-50-state-medical-consulting-practice-multi-tenant-self-hosted-runs-for-years/294834`
- Channel: public reply plus DM if allowed.
- Copy source: `outputs/client-acquisition/n8n-specific-replies-2026-07-01.md`, section `3. Long-Term n8n + Postgres Medical Consulting Platform`
- Caveat: do not overclaim six-month public n8n/Postgres proof. Lead with a paid Phase 0/1 slice.

### 7. Airtable Community - FallLine Process Automation

- Tracker row: `3`
- URL: `https://community.airtable.com/jobs-board-16/airtable-process-automation-and-agent-integration-e-g-make-api-48303`
- Channel: public Airtable reply plus DM/contact if allowed.
- Copy source: `outputs/client-acquisition/send-now-proposal-pack-2026-07-01.md`, section `5. Airtable Community - FallLine Process Automation`
- Why: explicit freelance Airtable/Make/API/AI intake support request.

### 8. Freelancer - Google AI Automation Setup

- Tracker row: `16`
- URL: `https://www.freelancer.com/projects/zapier/google-automation-setup`
- Channel: Freelancer proposal.
- Copy source: `outputs/client-acquisition/send-now-proposal-pack-2026-07-01.md`, section `4. Freelancer - Google AI Automation Setup`
- Caveat: high competition. Use only the narrow 3-5 hour audit/refactor angle.

## Logging Format

After each send, update only that tracker row:

```csv
status=sent | commented | dm_sent
posted_or_sent_at=2026-07-01
next_follow_up_at=2026-07-02 or 2026-07-03 or 2026-07-04
notes=sent exact pack name + any platform constraint
```

Do not mark anything as sent until the message is actually sent.

## Follow-Up Text

Use this when a follow-up is not already defined in the source pack:

```text
Following up once. I would keep the first paid step narrow: one workflow path, one expected output, and a short handoff note so you can judge the work before expanding.
```
