# Reddit Lead Scanner Search-First Architecture Spec

## Purpose

Re-architect the Reddit lead scanner so it finds reply-worthy consulting leads by intent pattern, not by overfitting to a fixed list of subreddits or one successful example.

The Cary property-management post is useful as a calibration example, not as the product definition. It proves that high-quality leads can appear in arbitrary local or niche subreddits when the post contains the right intent structure:

- a real operator,
- a concrete business workflow,
- current tooling or process,
- implementation friction,
- paid or help-seeking language,
- a manual path for Duncan to respond.

The scanner should generalize that structure across industries.

## Design Principle

The scanner should answer:

> Is this Reddit post from a real person or business describing a workflow problem where a practical AI automation consultant can respond usefully?

It should not answer:

> Does this post belong to one of our favorite subreddits?

It also should not answer:

> Does this post mention AI, Airtable, Zapier, Make, CRM, spreadsheets, or property management?

Those are evidence clues, not lead definitions.

## Existing Context

This spec builds on:

- `docs/reddit-lead-scanner-cleanup-spec.md`
- `docs/reddit-lead-scanner-leadsrover-quality-spec.md`
- `docs/reddit-lead-scanner-quality-enhancement-spec.md`

Those specs already define scan modes, global Reddit search, structured evidence, archetype packs, scoring separation, and portal fields. This spec makes the higher-level architecture explicit so implementation does not become a narrow keyword patch.

## Non-Goals

- Do not build a scanner around the Cary/property-management example alone.
- Do not add non-Reddit marketplaces or job boards to this Reddit scanner.
- Do not automate comments, DMs, inbox reads, or outreach.
- Do not scrape behind login, use cookies, or bypass Reddit API limits.
- Do not optimize for filling a quota.
- Do not classify job listings, low-wage roles, cofounder searches, seller posts, or generic AI chatter as Reply Today leads.

## Target Model

### Discovery Should Be Search-First

The default scanner mode should use Reddit global search as the primary discovery surface:

- `restrict_sr=false`
- `sort=new`
- `type=link`
- query strings preserved as configured

Subreddit feeds should become supplemental:

- used for known high-yield communities,
- used for monitoring source health,
- capped so they cannot dominate,
- evaluated by historical accepted/rejected yield.

This mirrors the useful LeadRover behavior: keywords and patterns are first-class, while subreddits are tracked as sources with performance.

### Intent Pattern Beats Industry

A candidate must match at least one intent pattern. Industry is metadata.

Required top-level pattern families:

1. **Direct Implementation Request**
   - OP asks for someone to build, finish, fix, review, automate, migrate, connect, or take over a workflow.
   - Requires request evidence plus workflow evidence.
   - Usually `dm_now` when paid language or clear project language exists.

2. **Stuck Builder / Ceiling Hit**
   - OP has already tried building the workflow and hit a capability or time ceiling.
   - Requires current-system evidence plus pain evidence plus request/help language.
   - This is the general form of the Cary example, but it applies to any domain.

3. **Operational Pain Advice**
   - OP asks for advice about a real recurring business process.
   - Requires business context plus current system plus consequence.
   - Usually `comment_first`, not DM.

4. **Tool Shopping With Implementation Pain**
   - OP asks for a tool or alternative, but also describes current process, volume, failure, or inability to implement.
   - Generic "best CRM?" stays watch/reject.

5. **Vendor/Platform Specialist With Broad Scope**
   - OP names a tool or platform, but the real ask is implementation of a business workflow.
   - Narrow "find me a GoHighLevel expert" without process detail stays watch/reject.

6. **Partner / Overflow Implementation Demand**
   - Valid only when another consultant, agency, or operator asks for delivery help on a concrete project with a free-to-pursue path.
   - Must not include paid marketplace gates.

## Evidence Model

Every candidate should carry structured evidence before LLM scoring.

### Required Evidence Buckets

- `requestEvidence`: hire, paid, looking for someone, need help, can someone build, help me finish, review what I built.
- `workflowEvidence`: spreadsheet, CRM, Airtable, PDF, invoice, forms, reporting, dashboard, email, calendar, data pipeline, custom system, internal tool.
- `currentSystemEvidence`: currently using, built with, using spreadsheets, using email, manual process, one place, existing tool stack.
- `painEvidence`: stuck, hit a ceiling, takes forever, too many, manual, messy, not scalable, outgrown, missed, buried, spending too much time.
- `businessEvidence`: business, company, clients, customers, team, employees, agency, clinic, practice, property, recruiting, bookkeeping, operations.
- `budgetEvidence`: paid, budget, quote, fee, willing to pay, paid opportunity, contractor, consultant.
- `negativeEvidence`: seller, job seeker, market research, cofounder, low budget, generic AI discussion, product promotion, job listing.

### Two-Clue Minimum

No single keyword should admit a lead.

Examples:

- `Airtable` alone is not enough.
- `paid` alone is not enough.
- `property management` alone is not enough.
- `Claude` alone is not enough.
- `looking for someone` alone is not enough.

At least one pattern must satisfy its clue requirements. For example:

- request + workflow,
- current system + pain + business,
- tool shopping + workflow + consequence,
- paid language + implementation scope.

## Industry Architecture

### Do Not Hard-Code One Industry

Industries should be represented as optional context packs, not scanner identity.

The scanner should have a small ontology:

- `vertical`: where the workflow lives.
- `failureMode`: what is broken.
- `intentPattern`: why this is actionable now.
- `outreachPosture`: how Duncan should respond.

The primary scoring gate should be `intentPattern`, not `vertical`.

### Cross-Industry Failure Modes

Start with failure modes that repeat across many industries:

| Failure Mode | Examples | Why It Generalizes |
| --- | --- | --- |
| `source_of_truth_sprawl` | CRM mess, Airtable base, spreadsheet tracker, disconnected tools | Most operators eventually need one reliable operating system. |
| `manual_document_intake` | PDFs, invoices, contracts, tax docs, forms, receipts | Common high-friction AI automation fit. |
| `followup_and_scheduling_leakage` | missed leads, appointment gaps, quote follow-up, candidate follow-up | Direct revenue or throughput consequence. |
| `reporting_visibility_gap` | dashboards, KPI reporting, client reports, project profitability | Easy to diagnose and demo. |
| `workflow_build_ceiling` | OP tried Claude, Airtable, Zapier, scripts, or spreadsheets and hit a ceiling | Strong paid-help signal independent of industry. |
| `data_cleanup_and_migration` | messy CRM, spreadsheet cleanup, pipeline migration, duplicate records | Clear bounded project shape. |
| `team_tasking_and_handoff` | SOPs, onboarding, checklists, intake handoff, screening | Good comment-first fit with upsell potential. |

### Optional Vertical Packs

Vertical packs can improve precision, but they must plug into the generic failure-mode model.

Initial vertical packs can include:

- local service operations,
- agencies and consultants,
- property and real estate operations,
- recruiting and staffing,
- tax, accounting, and bookkeeping,
- ecommerce and retail ops,
- healthcare or clinic administration,
- nonprofit and donor operations,
- data and analytics teams.

Each vertical pack should define:

- vertical-specific nouns,
- common current systems,
- common workflow pains,
- likely false positives,
- example search queries,
- expected outreach posture.

Each pack must avoid becoming a standalone scanner unless evidence shows it consistently outperforms the general mode.

## Scan Mode Architecture

### Default Mode: `direct-requests-search-first`

Purpose:

- find direct help requests across all Reddit,
- prioritize search queries over subreddit feeds,
- include multiple industries without assuming the industry first.

Behavior:

- global search families first,
- small supplemental subreddit list,
- query/source performance diagnostics,
- strict Reply Today inclusion.

This should be the normal scheduled/manual mode.

### Broad Mode: `latent-operations-pain`

Purpose:

- find advice-shaped operational pain where OP does not know they need automation yet.

Behavior:

- more permissive discovery,
- stricter final scoring,
- default `comment_first`,
- lower volume cap in Reply Today.

This is useful for building community trust and surfacing softer leads, but should not mix unchecked with direct paid requests.

### Vertical Modes

Vertical modes are useful when Duncan wants focused research:

- `local-service-ops`
- `property-real-estate-ops`
- `recruiting-staffing-ops`
- `accounting-document-ops`
- `ecommerce-retail-ops`
- `data-reporting-ops`

These modes should:

- reuse the same intent patterns,
- select a subset of vertical packs,
- keep global search enabled,
- optionally include more vertical subreddits,
- report their yield separately.

They should not replace the default mode unless a vertical proves durable performance.

### Tool-Specific Mode

Keep a specialist mode for:

- Airtable,
- Zapier,
- Make,
- n8n,
- Google Sheets,
- CRM,
- Notion,
- Shopify.

This mode should be treated as crowded and lower-differentiation. It is useful, but it should not dominate the general scanner.

## Query Strategy

Queries should be generated from pattern templates, not handcrafted one-off examples.

### Query Template Types

1. **Paid implementation**
   - `"paid help" (workflow OR spreadsheet OR CRM OR Airtable OR automation)`
   - `"looking for someone" (build OR automate OR fix OR migrate OR connect)`
   - `"need someone to" (build OR automate OR fix OR finish)`

2. **Stuck builder**
   - `"hit a ceiling" (workflow OR Airtable OR spreadsheet OR automation OR script)`
   - `"help me finish" (workflow OR Airtable OR spreadsheet OR CRM)`
   - `"review what I've built" (workflow OR automation OR Airtable OR script)`
   - `"can't get it to work" (Zapier OR Airtable OR Automator OR spreadsheet OR script)`

3. **Operational pain**
   - `"can't keep track" (clients OR leads OR projects OR invoices OR applicants)`
   - `"buried in emails" (clients OR customers OR leads OR operations)`
   - `"manual process" (business OR clients OR customers OR team)`
   - `"too many messages" (customers OR clients OR applicants)`

4. **Source-of-truth migration**
   - `"moving from spreadsheet" (CRM OR Airtable OR system)`
   - `"messy CRM" "data migration"`
   - `"spreadsheet sales pipeline" "mess"`

5. **Document/data workflows**
   - `"manual invoice processing" spreadsheet`
   - `"split" "rename" "PDF" "client documents"`
   - `"extracting structured data" "PDFs"`

6. **Vertical pack expansion**
   - Add vertical nouns only as modifiers, not as primary lead definitions.
   - Example: property pack can add `tenant`, `maintenance`, `turnover`, but the query still needs paid/help/pain/workflow structure.

### Query Governance

Every query should have metadata:

```json
{
  "id": "stuck-builder-airtable",
  "patternFamily": "stuck_builder_ceiling",
  "vertical": "any",
  "query": "\"hit a ceiling\" (Airtable OR workflow OR automation)",
  "expectedSignal": "OP tried to build something and needs help",
  "fallbackQuery": "\"hit a ceiling\" \"Airtable\""
}
```

The scanner should record:

- fetched posts,
- candidates admitted,
- Reply Today leads,
- Watch leads,
- rejected count,
- accepted/rejected feedback over time.

Underperforming queries should be demoted automatically or shown as underperforming.

## Scoring Rules

### Reply Today

A post can enter Reply Today only when:

- `fitScore >= 4`,
- `replyabilityScore >= 4`,
- no hard negative persona,
- not employment-only,
- not seller/promotion,
- not market research,
- not generic AI/tool discussion,
- not generic tool shopping without implementation pain,
- has a clear manual response path.

### Score 5

Requires:

- explicit paid, hiring, project, build, fix, finish, consultant, or contractor language,
- concrete workflow or system,
- real business/operator context,
- reasonable implementation scope.

### Score 4

Requires:

- business workflow pain,
- current process/system detail,
- consequence or recurrence,
- a natural helpful public reply.

### Score 3

Use for:

- watch items,
- weak but relevant tool shopping,
- broad advice with some business context,
- potentially good posts missing budget/request/action path.

### Score 1-2

Use for:

- sellers,
- job seekers,
- employment posts,
- cofounder/collaborator searches,
- market research,
- generic AI discussion,
- low-budget tiny tasks,
- personal/non-business content.

## Portfolio Selection

The scoring pool should be balanced before LLM scoring.

Recommended caps:

- `maxLlmCandidates`: 60
- `maxCandidatesPerSource`: 12
- `maxCandidatesPerPatternFamily`: 15
- `maxCandidatesPerVertical`: 12 in default mode
- `minDirectRequestCandidates`: 20 when available
- `minCommentFirstCandidates`: 10 when available
- `maxToolSpecificCandidatesOutsideToolMode`: 12
- `maxEmploymentOrPartnerCandidates`: 0 for Reddit Reply Today; separate queue only if later desired

The default mode should avoid one subreddit, one query, one vertical, or one tool family taking over the candidate pool.

## Feedback Loop

The system needs durable teaching, not just one-off prompt edits.

### Feedback Types

For every reviewed lead, store:

- accepted,
- rejected,
- contacted,
- got response,
- false positive reason,
- source query,
- subreddit,
- pattern family,
- vertical,
- failure mode.

### Rejection Reasons

Use stable labels:

- `seller_or_promoter`
- `job_seeker`
- `employment_post`
- `cofounder_or_collaborator`
- `market_research`
- `generic_ai_chatter`
- `generic_tool_shopping`
- `no_business_context`
- `no_workflow_pain`
- `no_reply_path`
- `too_low_budget`
- `not_duncan_fit`

### Performance Metrics

Track by query and subreddit:

- scans,
- fetched posts,
- candidates scored,
- Reply Today count,
- accepted count,
- rejected count,
- contacted count,
- response count,
- acceptance rate,
- response rate.

Demotion rule:

- If a query/source produces many rejects and no accepted leads after a meaningful sample, lower its priority or move it out of default mode.

Promotion rule:

- If a query/source produces accepted or responded leads repeatedly, reserve a small slot for it in future runs.

## Implementation Plan

### Phase 1 - Spec-Aligned Configuration

- Add pattern-family metadata to `config/reddit-lead-monitor.json`.
- Add query objects or a compatibility wrapper around existing query strings.
- Add `includeArchetypeChannels` or equivalent so default search-first mode does not automatically expand every vertical subreddit.
- Define default mode plus optional vertical modes.

### Phase 2 - Evidence Extraction

- Normalize structured evidence buckets before LLM scoring.
- Require two-clue pattern matches for candidate admission.
- Keep all candidate evidence in memory and include bounded fields in status/digest diagnostics.

### Phase 3 - Quality Gates

- Split `fitScore` and `replyabilityScore`.
- Add hard gates for employment-only, cofounder/collaborator, seller, market research, generic AI chatter, and generic tool shopping.
- Prevent `score >= 4` from entering Reply Today unless the post also passes final replyability and business-context gates.

### Phase 4 - Portfolio Builder

- Replace one global priority slice with a portfolio selector.
- Balance by source, query, pattern family, vertical, and outreach posture.
- Preserve priority ordering inside each bucket.

### Phase 5 - Feedback Persistence

- Persist per-query and per-subreddit feedback into `config/reddit-lead-feedback.json` or a new structured feedback file.
- Add feedback updates from admin lead review actions where safe.
- Display source/query yield in the digest and status output.

### Phase 6 - Fixtures And Live Smoke

- Add fixture examples for each pattern family.
- Include the Cary-style example only as one `stuck_builder_ceiling` fixture, not as a special case.
- Add negative fixtures for seller, employment, cofounder, market research, generic AI chatter, and generic tool shopping.
- Run low-limit live smokes for default mode and at least one vertical mode.

## Acceptance Criteria

- Default scanner runs broad Reddit search first and uses subreddit feeds only as supplemental sources.
- Default scanner can surface direct paid implementation requests from arbitrary subreddits.
- Cary-style post passes because it matches general `stuck_builder_ceiling` and `direct_implementation_request` patterns, not because the scanner has a property-management special case.
- Vertical modes exist for focused runs but reuse the same core pattern families.
- Generic AI chatter, job posts, cofounder searches, seller posts, and generic tool-shopping threads do not enter Reply Today.
- Digest/status output includes query diagnostics and source performance.
- Fixture suite covers positive and negative examples across pattern families.
- Implementation keeps all outreach manual.

## Open Decisions

1. Whether vertical packs should live directly in `config/reddit-lead-monitor.json` or a separate `config/reddit-lead-verticals.json`.
2. Whether feedback should remain file-based or move into Supabase/admin lead state.
3. Whether Reply Today should keep the current markdown sections for parser compatibility or move to posture-based sections in the same PR.
4. Whether the default scheduled run should include latent operational pain or reserve it for a separate manual mode.

## Recommended First PR

Ship the architecture in a narrow, reversible order:

1. Add pattern families and query metadata without changing portal UI.
2. Make default mode search-first with a small supplemental subreddit cap.
3. Add structured evidence and final Reply Today gates.
4. Add fixtures, including the Cary-style calibration fixture and multiple negatives.
5. Preserve the existing digest parser contract while adding new diagnostic fields.

Do not start by adding many industry-specific packs. Start with cross-industry pattern families, then add vertical packs only when they improve yield without weakening the general model.
