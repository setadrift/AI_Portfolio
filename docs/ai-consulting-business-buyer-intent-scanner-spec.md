# AI Consulting Business-Buyer Intent Scanner Spec

Date: 2026-07-08

## Purpose

Enhance the current Reddit lead scanner into a broader AI consulting lead system that finds people who likely already have a business and want to hire an expert who is good with AI.

The current implementation has become too tool-led. It looks for automation-adjacent language, then tries to infer whether the post is a lead. That creates false positives because the internet is full of people discussing AI, automation, CRM, Zapier, Make, n8n, Airtable, spreadsheets, and workflows without any intention to hire outside help.

The next version should reverse the model:

> First identify business buyers with real operational, growth, or customer problems. Then decide whether AI, automation, data, systems design, or workflow implementation is a credible way Duncan can help.

Tools are supporting evidence. They are not the lead definition.

## Fresh-Eyes Product Definition

The scanner should answer:

> Is this a reachable business operator, founder, manager, or team lead with an existing business problem where hiring an AI-capable expert is plausible?

It should not answer:

> Did this post mention n8n, Zapier, Make, Airtable, CRM, AI agents, or automation?

Those tool terms can improve fit once a buyer is established, but they should not be the primary admission gate.

## Existing Context

This spec builds on the existing Reddit scanner specs:

- `docs/reddit-lead-scanner-search-first-architecture-spec.md`
- `docs/reddit-lead-scanner-quality-enhancement-spec.md`
- `docs/reddit-lead-scanner-actionability-improvement-spec.md`

Those specs remain useful for scoring, hard rejects, scan diagnostics, and admin-board behavior. This spec changes the strategic center of gravity:

- from Reddit-only to public-source buyer-intent discovery,
- from tool keywords to buyer situations,
- from "automation-adjacent post" to "business likely to hire AI expertise",
- from one lead queue to separate queues for buyers, warm replies, market intelligence, and rejects.

It also needs to respect the current implementation shape:

- `scripts/reddit-lead-monitor.mjs` is still the Reddit-specific scanner.
- `outputs/reddit-leads/YYYY-MM-DD.md` plus `outputs/reddit-leads/latest-status.json` remain the legacy Reddit monitor contract.
- `outputs/ai-consulting-leads/YYYY-MM-DD.md` plus `outputs/ai-consulting-leads/latest-status.json` are the broader public-source automation digest contract.
- `src/lib/portal/admin/leads.ts` parses markdown fields into portal rows.
- `src/lib/portal/admin/lead-db.ts` persists rows into `admin_leads` and `admin_lead_states`.
- Current source IDs are `reddit` and `automation`; new source families should not require new top-level `source_id` values until the database/UI migration is explicit.
- Current admin queues are `actionable`, `review`, `community_reply`, `commented`, `dm_sent`, and `dismissed`; the new conceptual queues need a compatibility map before implementation.

This spec should therefore be implemented as an evolution of the existing lead board, not as a parallel system that silently breaks the parser, publisher, or review UI.

## Research Basis

Recent public-source checks support a broader, buyer-intent-first strategy.

### Public Communities Show Explicit Hiring Demand

The n8n Jobs board regularly shows explicit hiring and paid implementation language: remote n8n experts, AI workflow builders, paid debugging sessions, ongoing project-based work, long-term specialists, Vapi/Twilio integrations, CRM/database automation, and e-commerce or Shopify automation work.

Reference:

- https://community.n8n.io/c/jobs/13

This proves there is real demand for AI/workflow implementation help, but it also shows why tool-specific sources should be treated as source families, not the whole market.

### Platform Use Cases Point To Business Functions, Not Tools

Make's public lead-processing use cases emphasize business outcomes such as lead enrichment, geographic routing, lead capture into CRM, lead qualification, and conversion tracking.

Reference:

- https://www.make.com/en/automate/lead-generation-processing

n8n case studies emphasize business outcomes such as reduced support tickets, faster customer integrations, faster proposal generation, compliance workflow automation, AI data-entry reduction, personalized campaigns, and operational scale.

Reference:

- https://n8n.io/case-studies/

These are function-level problems: sales, support, operations, finance, customer experience, reporting, documents, proposals, and integrations. The scanner should look for those pains even when the buyer does not know which tool to use.

### Social Listening Advice Supports Intent Over Keywords

Public lead-generation guidance repeatedly warns that broad keyword monitoring creates noise. A better pattern is to monitor high-intent problem language and buyer situations.

References:

- https://www.indiehackers.com/post/my-playbook-for-using-a-reddit-lead-generation-tool-to-find-high-intent-buyers-43b42994cc
- https://intentsify.io/blog/lead-generation-reddit/

### AI Automation Work Has A Deterministic/Fuzzy Split

Recent automation commentary frames modern AI work as a combination of deterministic workflows and judgment-heavy agentic work. Deterministic systems are strong for known, repeatable processes such as CRM updates, data sync, routing, and high-volume workflows. AI agents are stronger for fuzzy, judgment-heavy work such as interpreting multiple sources, summarizing context, triage, and recommendations.

Reference:

- https://www.techradar.com/pro/n8n-vs-openclaw-what-are-the-differences-and-where-should-you-use-either-of-them

This maps well to Duncan's consulting fit: diagnose the business process, then choose whether the answer is deterministic automation, AI-assisted workflow, reporting/data cleanup, agentic support, or a hybrid.

## Target ICP

The scanner should prioritize people and companies that match this shape:

- They already operate a business, team, practice, agency, store, firm, community, service, product, or revenue-generating workflow.
- They have customers, clients, members, users, applicants, patients, donors, suppliers, orders, invoices, projects, leads, support tickets, or internal teams.
- They describe a painful current state, not just curiosity.
- The pain affects time, money, quality, customer experience, throughput, visibility, growth, or responsiveness.
- They appear willing or likely to hire expert help.
- They are reachable through a public, ethical, free-to-pursue path.

The buyer does not need to say "AI". Many strong buyers will not know what they need yet.

## Core Lead Types

### 1. Explicit Expert-Hiring Request

The buyer directly asks to hire, pay, contract, consult, implement, fix, build, audit, or advise.

Examples:

- "Looking for someone to help us use AI in our business."
- "Need an expert to automate this process."
- "Hiring a consultant for AI operations."
- "Paid project to improve our workflow."
- "Need someone technical who understands AI and operations."

This should be the highest-priority lead type.

### 2. AI Adoption / Strategy Buyer

The buyer runs a business and wants to use AI but does not know where to start.

Examples:

- "How should our firm use AI?"
- "What AI tools are actually useful for a small team?"
- "I want to train my team on AI."
- "We need an AI strategy but don't want random experiments."
- "How are other agencies/clinics/firms using AI?"

These can be strong discovery-sprint leads when the business context is real.

### 3. Operational Bottleneck Buyer

The buyer describes a real process that is slow, manual, inconsistent, or hard to manage.

Examples:

- "Our admin is drowning in follow-ups."
- "We are missing enquiries."
- "Reporting takes hours every week."
- "Our team keeps duplicating information."
- "We cannot see project status clearly."
- "We are manually reconciling invoices or documents."

AI may not be the whole answer, but an AI-capable systems expert can diagnose and implement.

### 4. Growth / Sales Leakage Buyer

The buyer has an existing business and is losing leads, response speed, qualification quality, or conversion visibility.

Examples:

- missed calls,
- slow quote follow-up,
- lead routing gaps,
- poor CRM hygiene,
- manual lead qualification,
- unclear attribution,
- sales team handoff problems,
- repeat outreach or proposal work.

This maps well to AI-assisted lead triage, CRM workflows, reporting, and follow-up systems.

### 5. Knowledge / Content / Customer Experience Buyer

The buyer needs to turn messy knowledge into usable output.

Examples:

- customer support triage,
- proposal drafting,
- document summarization,
- SOP creation,
- onboarding flows,
- internal knowledge search,
- training material,
- client communication drafts.

This is a strong AI consulting fit when tied to business volume or team pain.

### 6. Hiring Signal / Role Proxy

The company posts a role that implies an urgent AI/systems need, even if they are seeking an employee.

Examples:

- AI operations specialist,
- automation engineer,
- RevOps automation,
- AI enablement,
- workflow automation consultant,
- internal tools / systems role,
- AI trainer for a business team.

These should be treated as business-development leads, not job applications by default. The outreach angle is:

> You may be hiring full-time, but I can help scope, audit, or deliver the first phase quickly while you search.

## Sources

### Primary Sources

Use sources where business buyers explicitly ask for help:

- public job and contract boards,
- platform community job boards,
- founder and operator communities,
- local business communities,
- industry-specific forums,
- professional service communities,
- public social posts from founders/operators,
- public RFP or vendor-request pages,
- public "looking for consultant" posts,
- business owner subreddits and forums.

### Secondary Sources

Use Reddit and similar discussion communities for:

- direct requests,
- warm advisory replies,
- market language,
- discovering vertical-specific pain,
- spotting businesses that may need a low-friction first offer.

Reddit should not be the dominant source unless current evidence shows it is producing accepted or converted leads.

### Source Families To Test

The system should classify each source into a family:

- `business_owner_community`
- `industry_forum`
- `platform_community`
- `public_job_board`
- `founder_community`
- `local_business_group`
- `professional_services_forum`
- `social_post`
- `public_rfp_vendor_request`
- `reddit`
- `other`

Source-family performance should drive future scan allocation.

## Source Access Policy

The scanner must stay inside public, ethical, free-to-pursue sources.

Allowed:

- public webpages,
- public community posts,
- public job or contract listings,
- public company hiring pages,
- public source metadata such as posted date, title, company, author handle, and URL,
- search-result snippets when the destination can be opened and verified.

Not allowed:

- private inboxes,
- cookies or logged-in browsing,
- scraping bypasses,
- paid marketplace credits or bid unlocks,
- hidden contact extraction,
- automated comments,
- automated DMs,
- mass outreach,
- contact enrichment that exposes private personal data.

If a source cannot be verified without login, payment, or private access, route it to `reject` or `market_intelligence` with `missingEvidence: source not publicly verifiable`.

## Commercial Fit Signals

Because Duncan is selling expert consulting, not small one-off task help, the scanner should estimate commercial fit before promoting an active lead.

Positive commercial signals:

- existing team or multiple users,
- recurring process,
- client/customer impact,
- revenue, sales, or lead-flow impact,
- operational scale or volume,
- public hiring activity,
- named business systems,
- multi-step workflow,
- owner/founder/operator language,
- explicit budget, paid project, contract, consultant, or implementation language,
- costly delay, error, missed opportunity, or customer experience issue.

Weak commercial signals:

- one-time personal task,
- hobby project,
- student work,
- low-budget phrasing,
- "quick favor",
- "cheap",
- purely technical curiosity,
- no business consequence,
- no reachable business identity.

Add `commercialFitScore` or fold these signals into `hiringLikelihoodScore` and `duncanFitScore`. A candidate should not enter `active_lead` when the work looks too small to justify a paid consulting engagement.

## Scoring Model

Replace the current tool-led score with a buyer-intent score.

### Required Score Components

Each candidate should receive:

- `businessMaturityScore`: Does the person likely already have a business, team, clients, customers, or revenue process?
- `painSeverityScore`: Is the problem costly, recurring, urgent, or operationally meaningful?
- `hiringLikelihoodScore`: Is there evidence they would hire outside help?
- `aiLeverageScore`: Could AI materially improve the process, decision, output, or workflow?
- `duncanFitScore`: Can Duncan plausibly help from diagnosis through implementation?
- `reachabilityScore`: Is there a public ethical path to respond?
- `freshnessScore`: Is the post recent enough or still clearly active?
- `commercialFitScore`: Is the problem likely valuable enough to justify paid expert help?
- `confidenceScore`: How strong is the evidence, and how much is inference?

### Overall Fit

Use a conservative rollup:

- `5`: explicit hiring or paid expert-help request from a real business, with strong AI/systems fit and reachable path.
- `4`: real business with severe pain and strong AI/systems fit, but hiring intent is implied rather than explicit.
- `3`: useful warm reply, market-intelligence item, or possible future buyer.
- `1-2`: discussion, seller, tool chatter, career post, consumer issue, irrelevant, stale, or not reachable.

No candidate should be `4+` unless `businessMaturityScore`, `painSeverityScore`, `aiLeverageScore`, `duncanFitScore`, `commercialFitScore`, and `reachabilityScore` are all above minimum thresholds.

If the evidence is mostly inferred rather than explicit, cap the score at `3` unless a human reviewer manually promotes it.

## Evidence Requirements

### Evidence Provenance

Every promoted candidate should distinguish:

- `explicitEvidence`: directly stated by the source,
- `inferredEvidence`: reasoned from context,
- `missingEvidence`: important gaps,
- `sourceQuoteOrSnippet`: short source excerpt or summarized source fact,
- `evidenceUrl`: canonical URL used to verify the claim.

The scanner should not present inferred facts as confirmed facts. For example, "likely has a team" is different from "says they have 12 employees."

### Score 5 Requirements

A `5/5` lead must have:

- clear existing business context,
- explicit desire to hire, pay, contract, consult, build, fix, implement, train, audit, or get expert help,
- concrete workflow, operational problem, growth problem, team problem, customer problem, or AI adoption problem,
- plausible budget or business value,
- reachable public path,
- fresh or still-active source evidence,
- high confidence that this is not a job seeker, seller, or content post,
- no hard negative.

### Score 4 Requirements

A `4/5` lead must have:

- clear existing business context,
- specific current pain,
- credible AI or systems leverage,
- plausible reason Duncan could help,
- reachable public path,
- no hard negative.

It can lack explicit budget or hiring language, but it must not be generic discussion.

### Score 3 Requirements

A `3/5` item can be:

- useful public comment opportunity,
- market language,
- broad AI adoption curiosity from a real operator,
- weak but plausible future buyer,
- company hiring signal without a clear consulting angle.

It should not enter the active lead queue.

## Hard Rejects

Reject or research-only route:

- tool comparison without business context,
- "what AI tools do you use?" with no specific business problem,
- seller or agency promoting their services,
- founder validating an AI product idea,
- job seeker or freelancer looking for work,
- developer discussing architecture with no buyer context,
- product announcement,
- tutorial, guide, case study, or thought-leadership article,
- consumer or personal support question,
- low-budget task with no strategic value,
- stale post without active signal,
- source requiring login, paid credits, cookies, inbox access, or scraping bypass.

## Queue Design

### `active_lead`

Score 4-5, likely business buyer, useful to act on now.

Allowed actions:

- direct reply,
- email/contact if public and appropriate,
- proposal/discovery sprint,
- quick audit offer,
- track for follow-up.

Compatibility mapping:

- Persist as current queue `actionable`.
- Recommended action should stay within current UI routing values: `comment`, `dm`, `dm_if_engaged`, `watch`, or `ignore`.
- Public application, email, or research-contact paths should be represented in separate fields such as `Response path`, `Next step`, or `Free-to-pursue path`, not overloaded into `Recommended action`.
- Do not create a new persistent queue enum until the admin UI and database types are migrated.

### `warm_reply`

Real business person, useful public response, but not enough buying intent.

Allowed actions:

- helpful public comment,
- no hard sell,
- no DM unless they engage.

Compatibility mapping:

- Persist as current queue `community_reply`.
- Recommended action should be `comment`.

### `company_signal`

Company appears to need AI/systems help based on hiring, public post, growth, funding, or role signal.

Allowed actions:

- research company,
- identify public contact path,
- draft soft consulting angle,
- possibly add to outbound list.

Compatibility mapping:

- Persist as current queue `review`.
- Recommended action should usually be `watch`.
- The specific next step can be `research public contact`, `review role`, or `draft soft consulting angle`, stored in `Next step` or `Free-to-pursue path`.

### `market_intelligence`

Not a lead, but useful pain language, vertical insight, objection, or repeated problem.

Allowed actions:

- update positioning,
- update search queries,
- update negative examples,
- save for content/offer design.

Compatibility mapping:

- Do not publish to the default active lead board unless the UI adds a separate intelligence view.
- Store in diagnostics, a separate markdown section, or a future `lead_intelligence` table.

### `reject`

Not useful for action.

Allowed actions:

- update feedback loop,
- suppress source/query if repeated.

Compatibility mapping:

- Do not publish as active.
- If persisted for feedback, mark inactive or queue `dismissed` with a dismissal reason.

## Backward Compatibility Requirements

Implementation must preserve current parser and portal behavior while adding richer metadata.

Markdown output should keep existing parser-facing fields:

- `Posted date`
- `URL`
- `Author`
- `Category`
- `Lead type`
- `Recommended action`
- `Free-to-pursue path`
- `Why it matched`
- `Suggested comment`
- `Suggested DM`
- `Tracker row`

New fields can be added as bullets, but existing field names should not be renamed without updating `src/lib/portal/admin/leads.ts`, `src/lib/portal/admin/lead-db.ts`, the admin UI, and any publisher scripts.

Recommended new parser-facing fields:

- `Source family`
- `Buyer situation`
- `Queue`
- `Offer match`
- `Business maturity score`
- `Pain severity score`
- `Hiring likelihood score`
- `AI leverage score`
- `Commercial fit score`
- `Duncan fit score`
- `Reachability score`
- `Confidence score`
- `Evidence summary`
- `Missing evidence`
- `Dismissal reason`
- `Response path`
- `Next step`

If database schema changes are not made in the first implementation phase, store new fields inside the existing payload JSON rather than adding columns prematurely.

## Entity Resolution And Dedupe

The broader scanner will see the same company or post through multiple sources. It needs dedupe rules before broad discovery expands.

Candidate identity should consider:

- canonical URL,
- normalized title,
- company or author handle,
- source family,
- posted date,
- domain,
- role/listing ID when available.

If the same opportunity appears in multiple places:

- merge evidence,
- preserve all source URLs,
- keep the strongest public reachable path,
- avoid showing duplicate active leads,
- record `duplicateOf` or `relatedSources` in diagnostics.

If multiple different posts come from the same company, group them in the admin view or summary so Duncan can decide whether to approach the company once.

## Scanner Architecture

### Stage 1: Broad Public Discovery

Run public-source searches across configured source families.

Required candidate metadata:

- source family,
- source URL,
- title,
- post text or summary,
- author or company when public,
- posted date,
- discovered date,
- query or source channel,
- reachable path,
- raw source type.

Discovery should include source-level diagnostics:

- configured sources checked,
- sources skipped and why,
- source fetch status,
- candidate count by source family,
- rejected count by reason,
- active lead count by source family,
- freshness coverage,
- duplicates removed.

### Stage 2: Business-Buyer Gate

Before AI/tool scoring, require evidence that this is likely tied to a real business.

Business evidence can include:

- company,
- agency,
- clinic,
- firm,
- practice,
- store,
- clients,
- customers,
- team,
- staff,
- leads,
- sales,
- invoices,
- projects,
- users,
- support,
- revenue,
- operations,
- role title,
- hiring manager,
- public company page.

If there is no business evidence, route to reject or market intelligence.

### Stage 3: Situation Classification

Classify the buyer situation:

- `explicit_expert_hiring`
- `ai_adoption_strategy`
- `operational_bottleneck`
- `growth_sales_leakage`
- `knowledge_content_customer_experience`
- `document_finance_admin_workflow`
- `reporting_visibility`
- `team_training_change_management`
- `company_hiring_signal`
- `market_intelligence`
- `reject`

### Stage 4: AI Leverage Assessment

Assess whether AI can help through:

- classification,
- summarization,
- extraction,
- routing,
- drafting,
- enrichment,
- forecasting,
- reconciliation,
- research,
- decision support,
- workflow orchestration,
- management visibility,
- training or enablement.

If the problem is purely a conventional tool setup, it can still be a lead, but should score lower unless Duncan has a strong systems/implementation angle.

### Stage 5: Offer Matching

Match every active lead to one of Duncan's offers:

- `ai_opportunity_audit`
- `workflow_automation_sprint`
- `ai_team_enablement`
- `crm_lead_flow_repair`
- `document_intake_automation`
- `management_dashboard_visibility`
- `ai_customer_experience_workflow`
- `custom_system_prototype`
- `not_a_fit`

This keeps the output close to how Duncan actually sells.

Offer matching should include a first-step price/shape hint where possible:

- short paid audit,
- discovery sprint,
- one workflow prototype,
- dashboard/reporting sprint,
- team training session,
- implementation retainer,
- not worth pursuing.

Do not over-prescribe pricing in the scanner output, but do make the likely engagement shape visible.

### Stage 6: Human-Readable Rationale

Every active lead should explain:

- why this is likely a real business,
- why the problem matters,
- why AI or systems expertise is relevant,
- why Duncan is a fit,
- what the low-friction first step should be,
- what evidence is missing.

No active lead should publish with only keyword evidence.

## Search Strategy

### Buyer-Situation Query Families

Start with broad business situations rather than tool terms.

#### AI Adoption

- `"how should we use AI" business`
- `"AI consultant" "small business"`
- `"need help with AI" "business"`
- `"AI strategy" "small business"`
- `"train my team" "AI"`
- `"using AI" "our business"`
- `"AI implementation" "company"`

#### Operational Bottlenecks

- `"drowning in admin" business`
- `"too much manual work" company`
- `"we keep missing" "customers"`
- `"manual process" "team" "clients"`
- `"need a better system" "business"`
- `"operations are messy" business`
- `"outgrown spreadsheets" business`

#### Growth / Sales Leakage

- `"missing leads" business`
- `"slow to follow up" leads`
- `"lead response time" small business`
- `"quote follow up" business`
- `"CRM is a mess" business`
- `"sales process" "manual"`
- `"lead qualification" "manual"`

#### Reporting / Visibility

- `"can't see" "projects" "business"`
- `"weekly report" "manual" "team"`
- `"dashboard" "manual reporting" "business"`
- `"project profitability" "spreadsheet"`
- `"management dashboard" "small business"`
- `"hard to track" "clients" "team"`

#### Documents / Finance / Admin

- `"invoice processing" "manual" "business"`
- `"receipts" "manual" "bookkeeping"`
- `"client documents" "manual"`
- `"PDF" "manual data entry" "business"`
- `"reconcile" "invoices" "spreadsheet"`
- `"forms" "data entry" "clients"`

#### Hiring Signals

- `"AI operations specialist" hiring`
- `"automation consultant" contract`
- `"AI enablement" "small business"`
- `"workflow automation consultant"`
- `"AI trainer" "team"`
- `"RevOps automation" contract`
- `"internal tools" "AI" "hiring"`

Tool terms can be added as modifiers after these buyer situations prove useful.

### Vertical Creativity

Do not limit discovery to software or automation communities. Search should intentionally test business domains where the buyer may not know the implementation tool:

- interior design and project management,
- architecture and construction,
- real estate and property management,
- clinics and healthcare admin,
- law firms and professional services,
- accounting and bookkeeping,
- recruiting and staffing,
- agencies and creative studios,
- local services and trades,
- ecommerce and retail,
- nonprofits and member organizations,
- education or training businesses,
- hospitality and events.

Each vertical should be admitted only when it has business evidence and a repeatable workflow pain. The vertical list is for sourcing creativity, not for lowering quality gates.

### Query Rules

- Prefer phrases that imply a business process, not generic AI interest.
- Require business co-terms for broad AI queries.
- Preserve the query that found the candidate.
- Track acceptance/dismissal by query.
- Disable or demote queries with repeated dismissals.
- Keep a small number of high-intent queries per source family instead of a huge broad list.

## Admin Board Changes

Add or expose these fields for reviewed candidates:

- `sourceFamily`
- `buyerSituation`
- `businessMaturityScore`
- `painSeverityScore`
- `hiringLikelihoodScore`
- `aiLeverageScore`
- `duncanFitScore`
- `reachabilityScore`
- `offerMatch`
- `queue`
- `evidenceSummary`
- `missingEvidence`
- `dismissalReason`
- `commercialFitScore`
- `confidenceScore`
- `relatedSources`
- `lastVerifiedAt`

The admin board should let Duncan quickly answer:

1. Is this a real business?
2. What problem do they have?
3. Why would they hire AI expertise?
4. What should I offer first?
5. Why did this get scored highly?
6. What evidence is explicit versus inferred?
7. Is this a direct lead, warm reply, company signal, or only market intelligence?

## Feedback Loop

Every dismissal should capture one primary reason:

- `not_business`
- `no_hiring_intent`
- `tool_chatter`
- `generic_discussion`
- `seller_or_agency`
- `job_seeker`
- `consumer_support`
- `stale`
- `bad_source`
- `bad_query`
- `not_duncan_fit`
- `too_small`
- `unreachable`
- `duplicate`
- `missing_public_verification`
- `low_confidence_inference`

The feedback loop should update:

- query performance,
- source-family performance,
- subreddit/community performance,
- negative examples,
- score calibration fixtures,
- future source allocation.

Feedback should be source-aware:

- A bad Reddit query should not suppress a good non-Reddit source family.
- A bad source family should not suppress a strong exact query elsewhere.
- Accepted and converted leads should promote the source/query pair that first found them and the source/query pair that provided the best reachability path.

## Evaluation And Calibration

Before rollout, create an evaluation set from:

- recently dismissed Reddit leads,
- accepted or pursued leads,
- manually strong leads from broader public-source runs,
- job/contract postings that are good company signals but not direct consulting leads,
- market-intelligence examples that should not enter the active queue.

The evaluation set should assert:

- expected queue,
- expected score range,
- expected buyer situation,
- expected offer match,
- expected hard reject or dismissal reason,
- expected source family,
- whether the lead should appear in the active admin board.

Minimum rollout gates:

- At least 90% of known dismissed false positives route out of `active_lead`.
- No known seller, job seeker, consumer support, or generic tool-chatter fixture scores `4+`.
- Known high-quality paid implementation examples score `5`.
- Known warm business-pain examples score `3-4` but route to `warm_reply` unless hiring intent is present.
- Every active lead has non-empty business evidence, AI/systems leverage evidence, reachability evidence, and source URL.

Track operational metrics after rollout:

- active leads per run,
- active leads accepted by Duncan,
- active leads dismissed by reason,
- replies sent,
- conversations started,
- proposals requested,
- converted clients,
- source/query acceptance rate,
- time Duncan spends reviewing per accepted lead.

The practical success metric is not lead volume. It is accepted or converted leads per minute of Duncan review time.

## Migration Plan

### Current-State Mapping

The existing implementation has two source lanes:

- `reddit`: Reddit-specific scanner and source.
- `automation`: broader AI consulting lead digest.

The business-buyer scanner should likely evolve the `automation` lane first, while the Reddit scanner is tightened and demoted to one source family inside the broader model.

Recommended sequence:

1. Add new metadata fields to markdown output and payload JSON without changing table schema.
2. Map conceptual queues onto existing admin queues.
3. Update parser to preserve new fields in lead payloads.
4. Add UI display for buyer situation, offer match, evidence summary, missing evidence, and source family.
5. Add evaluation fixtures and a local scoring harness.
6. Add source-family diagnostics to `latest-status.json`.
7. Only then consider database columns or new source IDs.

### Rollback

The implementation should be reversible:

- old markdown fields remain parseable,
- existing `reddit` and `automation` sources remain valid,
- old admin queues remain valid,
- no destructive migration is required for initial rollout,
- new fields can be ignored by older UI code.

## Implementation Phases

### Phase 1: Spec-Aligned Reclassification

No new sources yet. Reclassify current Reddit candidates with the new model:

- add buyer situation,
- add business-buyer gate,
- split active leads from warm replies and market intelligence,
- lower score floors for tool/advice posts,
- require business evidence for `4+`.
- map conceptual queues to current admin queues.
- preserve existing markdown and database contracts.

Acceptance:

- Recent dismissed Reddit false positives should become `warm_reply`, `market_intelligence`, or `reject`, not `active_lead`.
- A post with only tool keywords cannot score `4+`.
- A post with no business evidence cannot score `4+`.
- Existing portal parsing and Supabase persistence still work.

### Phase 2: Broader Public Source Discovery

Add public-source search outside Reddit:

- platform community jobs/help boards,
- public contract/job boards,
- founder/operator communities,
- industry-specific communities,
- public company hiring pages or role posts,
- local business forums where available.
- company hiring pages and public role listings as `company_signal`.

Acceptance:

- Daily output reports source-family mix.
- Reddit cannot exceed a configurable share of active leads unless accepted-lead yield justifies it.
- Login-only, paid-gated, private-inbox, or scraping-bypass sources remain excluded.
- Duplicate opportunities across sources are merged rather than shown repeatedly.

### Phase 3: Offer-Matched Output

Every active lead should include:

- buyer situation,
- offer match,
- first-step recommendation,
- short response angle,
- evidence summary,
- missing evidence.

Acceptance:

- Duncan can look at a lead and know whether to offer an audit, sprint, team training, dashboard, CRM repair, document workflow, or pass.

### Phase 4: Learning Loop

Use manual actions to tune discovery:

- dismissed leads demote source/query combinations,
- accepted/replied/converted leads promote source/query combinations,
- repeated false-positive patterns become fixtures,
- performance appears in status diagnostics.

Acceptance:

- Source/query acceptance rates are visible.
- Repeatedly bad queries stop dominating the candidate pool.
- Fixtures include real examples from Duncan's dismissals and accepted leads.
- Review outcomes can be exported or queried for calibration.

## Acceptance Criteria

The enhanced setup is complete when:

1. The scanner admits candidates based on business-buyer evidence before tool evidence.
2. A candidate cannot become an active lead without real business context.
3. A candidate cannot become `5/5` without explicit expert-hiring or paid implementation evidence.
4. Generic AI/tool discussion routes to `market_intelligence` or `reject`.
5. Real business pain without hiring intent routes to `warm_reply`, not active lead.
6. The output separates `active_lead`, `warm_reply`, `company_signal`, `market_intelligence`, and `reject`.
7. Every active lead includes buyer situation, offer match, evidence summary, missing evidence, and recommended first step.
8. Source family and query performance are tracked.
9. Dismissal reasons feed future suppression and fixture updates.
10. Broader public-source discovery is supported without requiring login-only scraping, cookies, private messages, paid marketplace credits, or automated outreach.
11. Existing markdown parsing, publishing, and admin review flows remain compatible.
12. Conceptual queues are mapped to current persisted queues or explicitly migrated.
13. Duplicate opportunities are merged or marked as related.
14. Every active lead distinguishes explicit evidence from inference.
15. Commercial fit is considered before promotion to active lead.
16. Evaluation fixtures prove recent known false positives no longer reach the active queue.

## Open Decisions

- Which source families should be allowed in the first broader-source rollout?
- Should job postings be treated as `active_lead`, `company_signal`, or a separate queue by default?
- What is the minimum acceptable `hiringLikelihoodScore` for a score-4 lead?
- Should score-4 warm replies appear in the admin board or only in a separate research/comment queue?
- How aggressively should repeated dismissals suppress a query or source?
- Should broader discovery live under the existing `automation` source ID first, or should a new `business_buyer` source be added after schema/UI migration?
- Should market intelligence be stored in markdown diagnostics only, or persisted in a separate table later?
- What score threshold should require explicit human confirmation before a DM-style action is suggested?

## Recommended Default Policy

Be conservative.

The system should produce fewer leads and more useful context. Duncan's time is better spent on 3 strong business-buyer leads than 30 automation-adjacent discussions.

Default active lead rule:

> Real business + real pain + AI/systems leverage + reachable path + plausible hiring intent.

Everything else is useful only if routed to the right queue.
