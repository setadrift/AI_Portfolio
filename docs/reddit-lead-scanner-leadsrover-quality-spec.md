# Reddit Lead Scanner LeadsRover-Style Quality Spec

## Purpose

Upgrade the Reddit lead scanner so it behaves less like a broad "automation topic" monitor and more like a direct-request lead finder. The target outcome is a Reddit-only queue where most surfaced posts are worth a human review for a public reply or DM.

This spec intentionally excludes the separate Codex Automation lead routine. That scheduled routine searches broader public sources, vendor communities, job boards, and marketplaces. The work here is only for the Reddit scanner backed by `scripts/reddit-lead-monitor.mjs`, `config/reddit-lead-monitor.json`, `outputs/reddit-leads/`, and the admin lead board.

## Current Problem

Recent Reddit lead review shows that many surfaced posts are not actually useful leads. They read like:

- generic AI or automation discussion,
- people promoting their own tools or agencies,
- tool-shopping without a real business problem,
- irrelevant community chatter,
- low-budget or DIY requests that are not a fit for paid consulting.

The post that did look worth responding to had a different shape:

- the poster described a specific workflow,
- they had already tried to solve it,
- they were not technical enough to finish it themselves,
- they explicitly said they were willing to pay,
- the ask was small but concrete enough to answer or quote.

That is the pattern the scanner should optimize for.

## Product Target

The scanner should answer this question:

> Is this Reddit post worth a practical, human response from Duncan because the poster is asking for help with a real workflow problem and could plausibly pay for implementation?

It should not answer:

> Does this post mention AI, automation, Zapier, Make, n8n, Airtable, CRM, spreadsheets, or operations?

Topic relevance is only an input. Replyability and buyer/request intent are the output.

## LeadsRover Behaviors To Copy

From the LeadsRover setup screenshots, the useful behaviors are:

1. **Direct request matching first**
   - The selected mode is "Direct requests."
   - It targets people already asking for help, tools, alternatives, recommendations, advice, or paid support.
   - Broad match exists, but direct request is cleaner and should be the default for this workflow.

2. **Two-clue pattern matching**
   - LeadsRover does not appear to rely on one keyword.
   - It groups patterns such as "Shopper," "Latent Problem," and "Latent Domain."
   - Each pattern uses at least two clue sets, for example:
     - service/domain terms plus hiring/request terms,
     - domain/workflow terms plus pain terms,
     - buyer phrasing plus concrete implementation domain.

3. **Keyword and subreddit yield tracking**
   - Keywords show lead counts, yield, and feedback.
   - Subreddits show lead counts, scans, yield, and feedback.
   - This lets the system demote sources that mostly create noise.

4. **Teaching and rejection memory**
   - LeadsRover records not-a-lead personas.
   - Examples include DIY builders, seller/promoters, generic best-tool questions, abstract AI discussions, named-vendor searches, local in-person consultant searches outside target geography, and low-budget tasks.
   - This is the missing durable feedback loop in the current scanner.

5. **Product model before search**
   - The product definition is specific: small businesses and lean teams stuck with repetitive admin work in spreadsheets, inboxes, CRMs, PDFs, forms, and disconnected tools.
   - It includes target users, geography, and budget fit.
   - Matching is grounded in this model instead of treating every automation-adjacent post as a lead.

## Non-Goals

- Do not add marketplaces, Upwork, job boards, or non-Reddit sources.
- Do not send comments, DMs, or automated outreach.
- Do not scrape behind login, use cookies, or bypass Reddit API limits.
- Do not optimize for filling a daily quota.
- Do not keep weak posts in the main queue just because the scanner had a quiet day.
- Do not treat generic tool recommendation threads as leads unless the post includes concrete business pain or paid implementation intent.

## Required Model Changes

### 1. Split Lead Fit From Replyability

The scanner needs two separate decisions.

`fitScore`:

- `5`: explicit paid implementation request with a clear workflow and reachable OP.
- `4`: strong business workflow pain with concrete process, stakes, and a natural public reply path.
- `3`: relevant but weak, generic, exploratory, or mostly a watch item.
- `1-2`: reject.

`replyabilityScore`:

- `5`: OP is directly asking for help and a response can naturally offer paid implementation or a concrete next step.
- `4`: OP is asking for advice about a real workflow; public reply first, DM only if engaged.
- `3`: useful discussion but not a lead yet.
- `1-2`: not worth responding to.

A post should enter the primary queue only when:

- `fitScore >= 4`,
- `replyabilityScore >= 4`,
- and no hard negative persona matches.

This prevents generic relevant posts from entering the queue.

### 2. Add Match Reasons As Structured Evidence

Every candidate should carry structured evidence, not just an LLM score reason.

Suggested fields:

- `requestEvidence`: phrases like `willing to pay`, `need someone`, `looking for help`, `can anyone create`, `recommend someone`, `hire`.
- `workflowEvidence`: phrases like `merge files`, `create mp4`, `manual spreadsheet`, `CRM cleanup`, `invoice processing`, `PDF extraction`, `lead follow up`.
- `painEvidence`: phrases like `can't get it to work`, `one by one`, `takes forever`, `not tech-inclined`, `manual`, `stuck`, `mess`.
- `budgetEvidence`: explicit budget, paid language, business ownership, company context, or willingness to pay.
- `negativeEvidence`: seller, builder, market research, job seeker, affiliate, generic discussion, local-only mismatch.

The LLM can still score, but it should see these fields and must justify the decision against them.

### 3. Replace Single Keyword Matching With Pattern Families

Use LeadsRover-style pattern families. A post can match multiple families, but at least one family must satisfy both required clue sets.

#### Direct Paid Help

Use for posts like the Automator example.

Required:

- one request/budget clue,
- one concrete workflow clue.

Request/budget clues:

- `willing to pay`
- `paid help`
- `hire someone`
- `looking for someone`
- `can anyone create`
- `need someone to build`
- `need someone to fix`
- `freelancer`
- `consultant`
- `not tech-inclined`
- `can't get it to work`

Workflow clues:

- `automator`
- `shortcut`
- `script`
- `ffmpeg`
- `spreadsheet`
- `crm`
- `airtable`
- `zapier`
- `make`
- `n8n`
- `pdf`
- `mp4`
- `mov`
- `image`
- `audio`
- `invoice`
- `report`
- `dashboard`
- `forms`
- `email`
- `calendar`
- `follow up`

Default action: `reply_or_dm`.

#### Operational Pain Advice

Use for posts where OP is asking advice about a real process breakdown but has not asked to pay yet.

Required:

- one current-system clue,
- one pain/consequence clue,
- business context.

Current-system clues:

- `spreadsheet`
- `google sheets`
- `excel`
- `whiteboard`
- `email`
- `inbox`
- `crm`
- `pdf`
- `paper`
- `manual`
- `forms`
- `texts`
- `photos`

Pain/consequence clues:

- `takes forever`
- `can't keep track`
- `too many`
- `manual`
- `one by one`
- `missed`
- `stuck`
- `mess`
- `chaotic`
- `not scalable`
- `outgrown`
- `hard to see`
- `buried`

Business context:

- `business`
- `company`
- `clients`
- `customers`
- `team`
- `employees`
- `orders`
- `invoices`
- `leads`
- `appointments`
- `projects`
- `clinic`
- `agency`
- `store`
- `practice`

Default action: `comment_first`.

#### Tool Shopping With Implementation Pain

Use for posts asking for tool recommendations only when the OP describes an implementation problem.

Required:

- recommendation/tool-shopping phrasing,
- current workflow or data/process detail,
- consequence or inability to implement.

Reject if the post is only "best CRM?" or "what AI tool do you use?"

Default action: `comment_first` or `watch`.

#### Vendor Or Named-Tool Specialist Search

Use only if the OP wants someone to build/fix a workflow and Duncan can credibly help.

Reject when the ask is simply "find a GoHighLevel expert," "recommend an Alteryx consultant," or "which vendor should I use?" with no broader implementation fit.

Default action: `watch` unless paid implementation scope is clear.

## Negative Feedback Loop

### Storage

Add a Reddit-specific feedback file, separate from the broad automation workflow:

`config/reddit-lead-feedback.json`

Proposed shape:

```json
{
  "version": 1,
  "positiveExamples": [
    {
      "id": "automator-paid-workflow-task",
      "url": "https://www.reddit.com/...",
      "title": "Workflow tasks request",
      "whyGood": [
        "explicit willingness to pay",
        "specific manual workflow",
        "tried Automator and ffmpeg already",
        "not technical enough to finish",
        "natural paid implementation reply"
      ],
      "patterns": ["direct_paid_help"]
    }
  ],
  "negativePersonas": [
    {
      "id": "seller_shilling_own_tool",
      "label": "Seller or founder promoting their own thing",
      "description": "OP is promoting an app, agency, newsletter, course, template, or AI automation service rather than asking for help.",
      "hardReject": true,
      "phrases": ["I built", "my tool", "my app", "case study", "launching", "looking for feedback"]
    }
  ],
  "rejectedExamples": [
    {
      "url": "https://www.reddit.com/...",
      "title": "Example rejected post",
      "rejectedAt": "YYYY-MM-DD",
      "reason": "seller_shilling_own_tool",
      "notes": "Looks automation-related but OP is selling, not buying."
    }
  ],
  "sourcePerformance": {
    "subreddits": {},
    "queries": {}
  }
}
```

### Admin Review Actions

The admin lead board should support Reddit-specific review outcomes:

- `good_lead`: use as positive training example.
- `not_a_lead`: require a rejection reason.
- `wrong_source`: subreddit/query is producing irrelevant posts.
- `too_generic`: relevant topic but no concrete pain/request.
- `seller_promo`: OP is selling or promoting.
- `job_seeker`: OP wants work, not help.
- `tool_chatter`: generic tool discussion.
- `low_budget_or_tiny`: task is too small unless explicitly useful as a low-effort reply.
- `stale_or_unreachable`: post is too old, deleted, locked, or OP unreachable.

These review actions should update the feedback file or the existing persistent lead state, then influence future scans.

### How Feedback Changes Scanning

Feedback should affect three layers.

1. **Pre-filtering**
   - Hard negative personas reject before scoring.
   - Repeated rejected phrases become negative evidence.

2. **Candidate priority**
   - Queries and subreddits with poor accepted/rejected ratios are demoted.
   - Sources with strong accepted ratios are scanned first and allowed more candidate slots.

3. **LLM scoring**
   - Positive and negative examples are included in the scoring context as few-shot guidance.
   - The model must classify which negative persona, if any, the post resembles.

## Source And Query Performance

Track performance for every subreddit and search query.

Metrics:

- `scans`
- `postsFetched`
- `candidatesKept`
- `leadsAccepted`
- `leadsRejected`
- `replyableLeads`
- `yield`
- `lastGoodLeadAt`
- `lastRejectedAt`
- `topRejectReasons`

Use these rules:

- Always scan high-yield sources.
- Rotate medium-yield sources.
- Quarantine sources after repeated low-yield scans.
- Do not delete quarantined sources automatically; keep them visible for review.
- If a query returns mostly seller/promoter posts, rewrite or disable it.

## Output Contract

The Reddit digest should be brutally honest and should not look full when the queue is thin.

Recommended sections:

```md
# Reddit Lead Scanner Digest - YYYY-MM-DD

Generated: ISO_TIMESTAMP
Scan mode: direct-requests
Reddit-only: yes
Posts fetched: N
Candidates scored: N
Replyable leads: N
Watch items: N
Rejected: N

## Reply Today

### SCORE/5 replyability - r/SUBREDDIT - TITLE

- Posted date: YYYY-MM-DD
- URL: FULL_REDDIT_URL
- Author: USER
- Pattern: direct_paid_help, operational_pain_advice, tool_shopping_with_pain
- Recommended action: comment, dm_if_engaged, or dm
- Why replyable: concise explanation
- Evidence:
  - Request: ...
  - Workflow: ...
  - Pain: ...
  - Budget: ...

Suggested public reply:

> ...

Suggested DM:

> ...

## Watch

Posts with some fit but not worth responding to yet.

## Rejected Patterns

Counts by negative persona and examples.

## Source Performance

Top sources, weak sources, quarantined sources.

## Feed Errors
```

The admin UI may still ingest the existing markdown shape for compatibility, but the scanner should internally distinguish `Reply Today` from `Watch`.

## Ranking Rules

Sort primary queue by:

1. explicit paid help,
2. replyability score,
3. workflow specificity,
4. freshness,
5. subreddit/source yield,
6. low competition or low comment count,
7. business fit.

Do not rank by automation keyword density.

## Scoring Rubric

### 5/5 Reply Today

All or most are true:

- explicit paid help or hiring language,
- concrete task or workflow,
- OP tried and failed or lacks technical ability,
- natural paid implementation response,
- not a seller, job seeker, or generic discussion.

Example shape: "I need someone to create two Automator apps, I am willing to pay, here are the exact file workflows, I tried Automator/ffmpeg but failed."

### 4/5 Reply Today

All or most are true:

- concrete recurring business workflow pain,
- OP asks for advice or recommendations,
- current process is manual or broken,
- a public reply can add value without sounding like a sales pitch,
- paid path is plausible but not explicit.

### 3/5 Watch

Relevant but not ready:

- generic tool shopping,
- interesting operational discussion with weak buyer signal,
- unclear business context,
- useful source or pattern but not a direct lead.

### 1-2 Reject

Reject when:

- OP is selling or promoting,
- OP is looking for work,
- post is market research,
- post is broad AI chatter,
- post is a generic best-tool question with no workflow pain,
- post is stale/deleted/locked,
- post is a tiny low-budget task not worth paid pursuit,
- post asks for a different specialist outside Duncan's fit.

## Implementation Plan

### Phase 1: Product Model And Feedback Schema

- Add `config/reddit-lead-feedback.json`.
- Seed it with:
  - the Automator post as a positive example,
  - the current not-a-lead personas from LeadsRover screenshots,
  - rejected examples from the latest weak Reddit batch.
- Add types/helpers to load feedback alongside `config/reddit-lead-monitor.json`.
- Do not let missing feedback file fail the scanner; default to empty feedback.

### Phase 2: Matching Engine Rewrite

- Replace loose keyword-first matching with pattern-family matching.
- Require two-clue matches for primary candidates.
- Keep broad keyword matching only as a weak discovery signal.
- Add structured evidence fields.
- Add hard negative persona matching before LLM scoring.

### Phase 3: Replyability Scoring

- Add `replyabilityScore`.
- Update deterministic scoring.
- Update LLM schema and prompt to score both fit and replyability.
- Require the LLM to choose a pattern family and negative persona.
- Keep suggested public replies link-free and Reddit-native.

### Phase 4: Feedback-Aware Source Ranking

- Track source/query performance.
- Demote low-yield sources.
- Reserve candidate slots for high-yield sources.
- Add source quarantine status.
- Surface source performance in status/digest for review.

### Phase 5: Admin Review Loop

- Add review actions for rejected Reddit leads.
- Persist review reason.
- Feed review data back into future scans.
- Make the review action visible in the lead row so rejected examples are not silently lost.

### Phase 6: Verification And Tuning

- Build a fixture suite with:
  - positive Automator-style paid request,
  - operational pain advice,
  - generic best-tool request,
  - seller promotion,
  - AI agency shilling,
  - job seeker,
  - market research,
  - tiny low-budget request,
  - named-vendor specialist mismatch.
- Require every fixture to assert:
  - `fitScore`,
  - `replyabilityScore`,
  - `recommendedAction`,
  - `pattern`,
  - `negativePersona` when applicable.

## Acceptance Criteria

1. A scan can produce zero `Reply Today` leads without being considered failed.
2. Generic AI/automation discussion does not enter `Reply Today`.
3. Seller/promoter posts are hard rejected before LLM scoring.
4. Generic "best tool?" posts are capped at `Watch` unless they include concrete workflow pain.
5. Automator-style paid workflow requests score `5/5` and enter `Reply Today`.
6. Operational pain posts with concrete business context score at least `4/5` but default to `comment_first`.
7. Rejected leads persist with a reason and affect future scans.
8. Source/query yield is visible and changes candidate selection over time.
9. The scanner remains Reddit-only.
10. No automated outreach is added.

## Verification Commands

Before shipping implementation:

```bash
node --check scripts/reddit-lead-monitor.mjs
node scripts/reddit-lead-monitor.mjs --score-fixtures
npm run lint
npx tsc --noEmit
git diff --check
```

Optional live smoke when Reddit credentials are available:

```bash
REDDIT_SCAN_MODE=direct-requests \
REDDIT_FEED_LIMIT=3 \
REDDIT_SEARCH_LIMIT=5 \
REDDIT_LEAD_OUTPUT_DIR=/tmp/reddit-leads-quality-smoke \
node scripts/reddit-lead-monitor.mjs
```

The smoke is successful if it writes a digest and status, reports source/query diagnostics, and either surfaces high-quality `Reply Today` leads or honestly reports zero.

## Open Decisions

1. Should `config/reddit-lead-feedback.json` be committed source, or should reviewed feedback live in Supabase/admin state and export into scanner input?
2. Should rejected examples store full post text, or only title/URL/reason to minimize retained user content?
3. Should the admin board hide `Watch` items by default so the review queue stays clean?
4. Should a `low_budget_or_tiny` task be rejected or kept as a `Reply Today` lead when it is unusually easy and explicitly paid?
5. Should the scanner default mode be renamed from `broad-buyer-intent` to `direct-requests` to match the actual desired behavior?
