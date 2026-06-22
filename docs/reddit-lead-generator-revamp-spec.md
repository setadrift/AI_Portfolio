# Reddit Lead Generator Revamp Spec

## Goal

Rebuild the current Reddit lead scanner from a digest-based script into an internal lead surfacing product for AI consulting opportunities.

The system should find more leads like the Alex Parker opportunity: operators or small business owners with a concrete workflow problem, an existing messy system, a clear reason to pay, and a path to a practical implementation.

The tool is for lead discovery and review. It must not automatically comment, DM, or impersonate the user on Reddit.

## Current Problems

The existing implementation is useful but too limited:

- It depends on unauthenticated Reddit RSS feeds, which are unreliable and frequently rate-limited.
- It writes Markdown digests instead of storing persistent lead records.
- It has no product profile, keyword management, subreddit performance, feedback loop, or teaching workflow.
- It cannot easily distinguish Alex-like owner/operator opportunities from generic automation chatter, job posts, or marketplace noise.
- It has no durable lead statuses such as new, contacted, replied, archived, or not a fit.
- It gives no visibility into which keywords or subreddits are producing useful leads.
- It requires code/config edits to tune the scanner.

## Target Shape

Create a LeadsRover-style internal app with:

- Product profile
- Lead inbox
- Keyword management
- Subreddit management
- Matching rules
- Teaching/feedback loop
- Scan history
- Reddit API-based collection
- LLM scoring and reply drafting
- Manual outreach workflow

The app should be source-aware, not Reddit-hardcoded everywhere. Reddit is the first source, but Airtable Community, Make Community, Upwork-style job feeds, and manually pasted URLs should be able to reuse the same lead schema later.

## Non-Goals

- No automated Reddit comments.
- No automated Reddit DMs.
- No proxy scraping or identity rotation.
- No browser scraping as the default collection method.
- No paid SaaS clone beyond what is needed internally.
- No full CRM replacement.
- No promise of complete Reddit coverage. Reddit search and subreddit polling are signals, not exhaustive market surveillance.

## Primary User

Duncan, reviewing AI consulting leads for manual outreach.

The system should help answer:

- Is this lead worth contacting?
- Why did the system think this was a lead?
- Which subreddit/keyword produced it?
- Has it already been contacted?
- What should I say if I reply?
- Are our keywords and subreddits improving over time?

## Lead Quality Definition

### Strong Lead

A strong lead has most of:

- A real business or operator context.
- A specific workflow pain.
- Existing manual process, messy system, or brittle tool setup.
- Clear implementation need.
- Likely ability to pay.
- Natural reason to start a conversation.
- Relevant to AI automation, Airtable, internal tools, reporting, CRM, document workflows, operations, or field workflows.

### Alex-Like Lead

Overweight leads involving:

- Airtable or spreadsheet-based operating systems.
- Property management, inventory, field operations, repair workflows, dispatch, client reporting, or contractor coordination.
- Mobile workflow pain.
- Bad UI or poor field usability.
- Existing base/system already built but messy.
- Frustration with generic freelancers, Fiverr, or low-quality vendors.
- Phrases like "looking to hire", "consultant", "paid", "need someone", "workflow breaking", "base cleanup", "operations system", "manual process", "too much admin".

### Weak Lead

Downweight or exclude:

- Generic "what is the best AI tool" questions.
- AI agency builders asking how to get clients.
- Vendors promoting tools.
- Full-time job posts unless highly aligned and worth consulting outreach.
- Low-budget/free audit requests.
- Posts with no owned workflow pain.
- Posts where the user wants to build it themselves and is not looking to hire.
- Posts outside practical serviceable geographies unless remote intent is explicit.

## Data Model

Use the existing app database layer if one exists by implementation time. If not, start with Vercel Postgres/Supabase/Postgres. Avoid storing only JSON files for the revamped version.

Prefer source-agnostic lead tables with Reddit-specific fields stored in a source metadata table or JSON column. This avoids rewriting the lead inbox when adding Airtable Community, Make Community, or manual sources later.

### `lead_products`

Stores one or more lead-search products.

Fields:

- `id`
- `name`
- `site_url`
- `problem`
- `solution`
- `target_users`
- `geography`
- `budget_fit`
- `matching_mode` enum: `direct_requests`, `broad_match`
- `active`
- `scan_frequency` enum: `manual`, `daily`, `hourly`
- `created_at`
- `updated_at`

Initial product:

- Name: `AI workflow automation consultant for small businesses`
- Problem: small business owners and lean teams stuck doing repetitive admin work in spreadsheets, inboxes, CRMs, PDFs, forms, and disconnected tools.
- Solution: practical AI-assisted workflow automations, internal tools, and data pipelines.
- Target users: small business owners, founders, operators, agency owners, consultants, service businesses.
- Geography: United States, Canada, United Kingdom, Australia.
- Budget fit: must be able to pay for custom consulting or implementation.

### `lead_keywords`

Fields:

- `id`
- `product_id`
- `phrase`
- `status` enum: `active`, `testing`, `paused`, `banned`
- `intent_type` enum: `pain`, `tool`, `buying_intent`, `domain`, `negative`
- `created_by` enum: `manual`, `ai`, `feedback`
- `leads_found`
- `qualified_leads`
- `rejected_leads`
- `last_seen_at`
- `created_at`
- `updated_at`

Initial high-value keywords:

- `Airtable consultant`
- `Airtable workflow breaking`
- `Airtable base cleanup`
- `Airtable operations system`
- `spreadsheet manual process`
- `manual invoice processing`
- `messy CRM`
- `CRM cleanup`
- `workflow automation consultant`
- `internal tool`
- `operations dashboard`
- `Google Sheets inventory tracking`
- `PDF report automation`
- `manual lead follow up`
- `Zapier Airtable`
- `Make.com Airtable`
- `need someone to automate`
- `looking to hire automation`
- `paid help Airtable`

Initial negative keywords:

- `hire me`
- `for hire`
- `AI agency`
- `cold email`
- `course`
- `newsletter`
- `affiliate`
- `template`
- `white label`
- `lead gen agency`
- `SEO agency`
- `free audit`

### `lead_subreddits`

Fields:

- `id`
- `product_id`
- `subreddit`
- `status` enum: `active`, `testing`, `paused`, `blocked`
- `notes`
- `scans`
- `posts_seen`
- `leads_found`
- `qualified_leads`
- `rejected_leads`
- `last_scanned_at`
- `created_at`
- `updated_at`

Initial subreddits:

- `smallbusiness`
- `Entrepreneur`
- `automation`
- `Airtable`
- `Zapier`
- `googlesheets`
- `developers_hire`
- `WholesaleRealestate`
- `bookkeeping`
- `Accounting`
- `propertymanagement`
- `realestateinvesting`
- `sweatystartup`
- `consulting`
- `businessowners`

Add non-Reddit sources later only if they follow the same lead schema.

### `lead_sources`

Stores every monitored source, including subreddits and future external communities.

Fields:

- `id`
- `product_id`
- `source_type` enum: `reddit_subreddit`, `reddit_search`, `manual_url`, `external_forum`, `job_board`
- `name`
- `url`
- `status` enum: `active`, `testing`, `paused`, `blocked`
- `scan_frequency` enum: `manual`, `daily`, `hourly`
- `yield_score`
- `notes`
- `last_scanned_at`
- `created_at`
- `updated_at`

`lead_subreddits` can either become a Reddit-specific view over this table or remain as a convenience table in v1. The important implementation rule is that the lead inbox should not assume every lead came from a subreddit.

### `reddit_posts`

Fields:

- `id`
- `reddit_fullname`
- `subreddit`
- `title`
- `body`
- `author`
- `permalink`
- `url`
- `score`
- `num_comments`
- `created_utc`
- `collected_at`
- `raw_json`

Unique:

- `reddit_fullname`

### `source_items`

Canonical source item table used by the lead inbox. `reddit_posts` can populate this table or be replaced by it if implementation starts source-agnostic.

Fields:

- `id`
- `source_id`
- `external_id`
- `source_type`
- `source_name`
- `title`
- `body`
- `author`
- `permalink`
- `published_at`
- `collected_at`
- `engagement_score`
- `raw_json`

Unique:

- `source_type`, `external_id`

Use this for dedupe across repeated scans. Add a secondary fingerprint to catch reposts or crossposts:

- normalized title
- normalized URL
- source name
- author
- publish date bucket

### `lead_matches`

Fields:

- `id`
- `product_id`
- `source_item_id`
- `status` enum: `new`, `contacted`, `replied`, `follow_up`, `archived`, `not_a_fit`
- `quality_score` integer 0-100
- `confidence` enum: `low`, `medium`, `high`
- `category`
- `is_alex_like`
- `matched_keywords` text array
- `matched_rules` text array
- `reason`
- `recommended_action` enum: `ignore`, `watch`, `comment`, `dm_if_engaged`, `dm`
- `suggested_comment`
- `suggested_dm`
- `fit_summary`
- `risk_notes`
- `prompt_version`
- `model`
- `scored_at`
- `contacted_at`
- `archived_at`
- `created_at`
- `updated_at`

Preserve scoring traceability. When the prompt changes, old leads should keep the prompt/model version that produced their score.

### `lead_feedback`

Fields:

- `id`
- `lead_match_id`
- `feedback_type` enum:
  - `good_lead`
  - `not_a_lead`
  - `contacted`
  - `replied`
  - `wrong_keyword`
  - `wrong_subreddit`
  - `too_generic`
  - `not_buyer`
  - `job_post`
  - `low_budget`
  - `alex_like`
- `note`
- `created_at`

### `lead_training_examples`

Stores examples used by the Teaching page and scoring prompt.

Fields:

- `id`
- `product_id`
- `source_item_id`
- `label` enum: `good_lead`, `alex_like`, `not_a_lead`
- `reason`
- `created_from` enum: `manual`, `feedback`, `import`
- `created_at`

Seed with:

- Alex Parker as a positive `alex_like` example.
- Known generic AI/tool chatter as negative examples.
- Known job-board-only posts as lower-priority examples.

### `lead_rules`

Stores generated and manual rules.

Fields:

- `id`
- `product_id`
- `rule_type` enum: `positive_pattern`, `negative_pattern`, `blocked_phrase`, `alex_like_pattern`, `not_a_lead_persona`
- `text`
- `status` enum: `active`, `testing`, `paused`
- `created_by` enum: `manual`, `ai`, `feedback`
- `created_at`
- `updated_at`

### `lead_scan_runs`

Fields:

- `id`
- `product_id`
- `source` enum: `reddit_api`, `reddit_rss_fallback`, `manual_url`
- `status` enum: `running`, `success`, `partial`, `failed`
- `started_at`
- `finished_at`
- `subreddits_scanned`
- `queries_scanned`
- `posts_seen`
- `candidates_scored`
- `leads_created`
- `rate_limit_remaining`
- `prompt_version`
- `error`
- `metadata`

## Collection Layer

### Primary Source: Reddit API

Use authenticated Reddit API access instead of unauthenticated RSS.

Requirements:

- Use OAuth credentials stored in environment variables.
- Use a clear User-Agent.
- Respect Reddit rate-limit headers.
- Persist seen post IDs.
- Poll incrementally.
- Back off on rate limits.
- Never automate posting or DMs.

Environment variables:

- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`
- `REDDIT_USERNAME` optional if using script auth
- `REDDIT_PASSWORD` optional if using script auth
- `REDDIT_USER_AGENT`

Recommended initial collection methods:

1. `subreddit.new` for each active subreddit.
2. Reddit search queries for high-intent keyword phrases.
3. Recent comments from selected high-signal subreddits where people describe pain in replies rather than posts.
4. Selected thread comment fetches for promising posts.

Reddit search and API endpoints will not catch everything. The collector should combine subreddit polling, keyword search, and targeted comment fetches rather than relying on a single endpoint.

### Scan Execution Constraints

Manual scans from the admin UI should not depend on a long synchronous request once the system grows.

Implementation options:

- Phase 1 can run synchronously for small scans.
- Phase 4 should create a `lead_scan_runs` row and run the scan in a background worker, cron job, or queue-style workflow.
- The UI should poll scan status instead of waiting for the full scan response.
- Vercel function timeouts must be treated as a design constraint.
- Partial scans should save progress and remain inspectable.

### RSS Fallback

RSS can remain as a fallback only.

Rules:

- Use only when API credentials are missing.
- Fetch slowly.
- Treat 429 as normal and do not retry aggressively.
- Mark scan source as `reddit_rss_fallback`.

## Matching Pipeline

### Step 1: Collect

Fetch recent posts from active subreddits and keyword searches.

Store all posts before scoring.

For Reddit, collect both submissions and high-signal comments where feasible. Many good leads are comments inside broader threads, not original posts.

### Step 2: Cheap Filter

Keep posts that hit at least one of:

- Positive workflow keyword.
- Buying-intent keyword.
- Active product keyword.
- Known Alex-like pattern.

Drop posts that hit hard negatives unless there is strong explicit buyer intent.

### Step 3: LLM Scoring

Score only filtered candidates.

Model input should include:

- Product profile.
- Matching mode.
- Positive keywords.
- Negative keywords.
- Not-a-lead personas.
- Good-lead examples.
- Bad-lead examples.
- Post title/body/subreddit/author/date.

Expected structured output:

```json
{
  "quality_score": 85,
  "confidence": "high",
  "category": "airtable_internal_tools",
  "is_alex_like": true,
  "reason": "Business owner has an existing Airtable/property workflow and is asking to hire help.",
  "recommended_action": "dm",
  "suggested_comment": "...",
  "suggested_dm": "...",
  "risk_notes": "Prefers local help; mention remote fit carefully.",
  "matched_patterns": ["paid consultant ask", "existing system cleanup", "field workflow"]
}
```

### Step 4: Save Lead

Create or update `lead_matches`.

Rules:

- Do not duplicate the same source item.
- Do not duplicate obvious reposts/crossposts with the same title/URL.
- If the score improves, update the lead.
- Preserve manual status changes.
- Keep rejected candidates available in scan history for diagnosis.

## LLM Prompt Requirements

The scoring prompt must strongly prefer concrete buyer intent over broad topical relevance.

The model should ask:

- Is this person asking for help or just discussing tools?
- Do they own the workflow problem?
- Is there a business process behind it?
- Is there a likely budget?
- Is there a natural reason Duncan can reply?
- Is this closer to Alex Parker or closer to generic AI chatter?

The model should penalize:

- Generic best-tool questions.
- Pure curiosity.
- Self-promotion.
- Job posts that are not practical consulting opportunities.
- Posts where the user wants to DIY.
- Posts where the relevant need is too far outside Duncan's offer.

Prompt versions must be named and stored. When a feedback change updates the prompt or rules, use a new `prompt_version` so changes can be evaluated against historical results.

## Evaluation Loop

Create a small labeled evaluation set before tuning aggressively.

Seed examples:

- Alex Parker opportunity: positive, Alex-like.
- Current warm leads from the tracker: positive.
- Generic best-tool questions: negative or low score.
- Full-time job posts: medium/low unless consulting fit is clear.
- Vendor/self-promo posts: negative.

Each scoring change should be tested against this set.

Minimum evaluation report:

- Number of known positives scored above 70.
- Number of known negatives hidden below 50.
- Whether Alex-like examples rank above generic automation posts.
- Notes on false positives and false negatives.

## UI Specification

### Leads Page

Primary daily operating surface.

Features:

- New/contacted/replied/archive tabs.
- Sort by quality, recency, subreddit, Alex-like score.
- Lead list with:
  - title
  - subreddit
  - author
  - age
  - score
  - matched category
  - status
- Lead detail with:
  - original post content
  - source link
  - why it matched
  - matched keywords/rules
  - suggested comment
  - suggested DM
  - feedback buttons
  - status buttons

Feedback buttons:

- Good lead
- Alex-like
- Not a lead
- Too generic
- Not buyer
- Job post
- Wrong keyword
- Wrong subreddit
- Low budget

Actions:

- Open Reddit
- Mark contacted
- Mark replied
- Add follow-up date
- Archive
- Copy suggested comment
- Copy suggested DM
- Regenerate reply

### Product Page

Editable product profile:

- Name
- Site URL
- Problem
- Solution
- Target users
- Geography
- Budget fit
- Matching mode
- Active toggle

### Keywords Page

Features:

- Add keyword
- Pause keyword
- Ban keyword
- Show status: active/testing/paused/banned
- Show yield
- Show leads found
- Show feedback count
- Fill remaining with AI
- Promote/demote based on feedback

Keyword health:

- Finding leads
- Testing
- Underperforming
- Banned

### Subreddits Page

Features:

- Add subreddit
- Pause subreddit
- Show scans
- Show posts seen
- Show leads
- Show yield
- Show feedback
- Last scanned

This page should make it obvious which communities are worth scanning.

### Rules Page

Initially read-only generated rules.

Sections:

- Patterns watched
- Blocked phrases
- Alex-like patterns
- Not-a-lead personas

Future:

- Make rules editable from UI.

### Teaching Page

Features:

- Paste Reddit post URL.
- Fetch post.
- Mark as good lead or not a lead.
- Choose reason.
- Add note.
- Store as training example.
- Update generated rules/keywords.
- Re-score against evaluation set before promoting rule changes.

This is how we make the system learn from Alex and other good/bad examples.

### Scan History Page

Features:

- List scan runs.
- Status: success/partial/failed.
- Source: API/RSS/manual.
- Subreddits scanned.
- Posts seen.
- Candidates scored.
- Leads created.
- Rate-limit info.
- Prompt/model version.
- Error details.

### Settings Page

Features:

- Matching strictness: direct requests / broad match.
- Scan frequency: manual / daily / hourly.
- Min score.
- Max posts per subreddit.
- Email notifications later.
- Danger zone: delete product data.

### Follow-Up Workflow

Keep this lightweight, but include enough to prevent good leads from going stale.

Features:

- Set next follow-up date.
- Filter leads needing follow-up.
- Store last touch note.
- Archive after final follow-up.

## API Routes

Suggested routes:

- `GET /api/portal/admin/leads`
- `POST /api/portal/admin/leads/scan`
- `PATCH /api/portal/admin/leads/:id`
- `POST /api/portal/admin/leads/:id/feedback`
- `POST /api/portal/admin/leads/:id/reply`
- `GET /api/portal/admin/lead-products`
- `PATCH /api/portal/admin/lead-products/:id`
- `GET /api/portal/admin/lead-keywords`
- `POST /api/portal/admin/lead-keywords`
- `PATCH /api/portal/admin/lead-keywords/:id`
- `GET /api/portal/admin/lead-subreddits`
- `POST /api/portal/admin/lead-subreddits`
- `PATCH /api/portal/admin/lead-subreddits/:id`
- `POST /api/portal/admin/lead-teaching/fetch`
- `POST /api/portal/admin/lead-teaching`
- `GET /api/portal/admin/lead-scan-runs`

## Worker Design

Create a reusable server-side worker:

```text
src/lib/portal/admin/leads/scanner/
```

Suggested modules:

- `redditClient.ts`
- `collectPosts.ts`
- `filterCandidates.ts`
- `scoreCandidates.ts`
- `saveLeadMatches.ts`
- `evaluateScoring.ts`
- `runLeadScan.ts`
- `replyDrafts.ts`

The admin route should call `runLeadScan`.

The worker should also be callable from:

- Manual admin button.
- Future Vercel Cron.
- Local CLI command.

## Scheduling

Start with manual scans.

Then add:

- Daily scan via Vercel Cron.
- Hourly scan only if API limits and lead quality justify it.

Avoid scanning every subreddit every hour at first. Use source performance:

- High-yield subreddits: scan more often.
- Low-yield subreddits: scan daily or pause.
- Testing subreddits: scan temporarily, then evaluate.

## Ranking

Default lead ranking:

1. Alex-like leads.
2. High quality score.
3. Explicit paid/consultant/hire intent.
4. Freshness.
5. Subreddit yield.
6. Keyword confidence.

Quality bands:

- 85-100: high priority
- 70-84: review
- 50-69: maybe/watch
- below 50: hidden by default

## Implementation Phases

### Phase 1: Persistent Leads Foundation

Deliver:

- Database schema.
- Migration.
- Lead products seed.
- Keyword seed.
- Subreddit seed.
- Save scanned posts/leads.
- Store prompt/model version on scored leads.
- Replace Markdown digest dependency in admin UI.

Acceptance criteria:

- Running a scan persists leads in the database.
- Reloading the page preserves statuses.
- Duplicate posts do not create duplicate leads.
- Manual lead statuses survive re-scans.

### Phase 2: Leads Inbox

Deliver:

- Leads list/detail UI.
- Status tabs.
- Feedback buttons.
- Copy/open actions.
- Suggested reply display.

Acceptance criteria:

- Duncan can review, contact, archive, and label leads from one page.
- Feedback is stored and visible.

### Phase 3: Product, Keywords, Subreddits

Deliver:

- Editable product profile.
- Keyword management.
- Subreddit management.
- Yield/lead/feedback stats.

Acceptance criteria:

- Duncan can tune the scanner without editing config files.
- The app shows which keywords/subreddits are working.

### Phase 4: Authenticated Reddit API

Deliver:

- Reddit API client.
- OAuth env setup.
- API-based collection.
- Submission and selected comment collection.
- Rate-limit handling.
- Background or pollable scan execution for longer scans.
- RSS fallback.
- Scan history.

Acceptance criteria:

- Scans do not depend on Reddit RSS.
- Rate limits are captured and displayed.
- Failed/partial scans do not overwrite useful previous data.
- Long scans do not require a single admin HTTP request to stay open.

### Phase 5: Teaching Loop

Deliver:

- Paste Reddit URL.
- Fetch post.
- Mark good/bad.
- Add training note.
- Generate/update rules.
- Evaluation set and scoring report.

Acceptance criteria:

- Alex Parker can be added as a positive example.
- Bad examples can be added as negative examples.
- Future scoring uses these examples.
- Prompt/rule changes can be compared against known good/bad examples.

### Phase 6: Scheduling And Notifications

Deliver:

- Vercel Cron scan.
- Scan frequency settings.
- Optional email summary.

Acceptance criteria:

- A daily scan runs without manual action.
- The dashboard shows last scan and next scan.

## Migration From Current System

Keep temporarily:

- Existing `scripts/reddit-lead-monitor.mjs`
- Existing Markdown outputs
- Existing admin route

During Phase 1:

- Add a one-time importer for existing `outputs/reddit-leads/*.md`.
- Import current lead tracker rows where useful.
- Mark imported leads as `archived`, `contacted`, or `new` based on tracker state.
- Import the best known leads as training examples, not just inbox records.

After the database-backed UI is stable:

- Remove Markdown digest as the primary source.
- Keep script only as fallback or delete it.

## Compliance And Safety

The app must:

- Use Reddit API in a rate-limit-aware way.
- Avoid automated outreach.
- Keep human review mandatory.
- Store only necessary public Reddit content and workflow notes.
- Make deletion/archive easy.
- Avoid spammy outreach language.

## Success Metrics

Operational metrics:

- Leads found per scan.
- High-quality leads per scan.
- Contacted leads.
- Replies.
- Archived/not-fit rate.
- Keyword yield.
- Subreddit yield.
- False positive rate from feedback.
- Positive-example recall from evaluation set.

Business metric:

- Number of Alex-like opportunities found per week.

Initial target:

- 3-5 review-worthy leads per day.
- 1-2 Alex-like leads per week.
- Less than 15 minutes/day to review.

## Open Questions

- Which database should this use in production: Vercel Postgres, Supabase, or another existing project DB?
- Should the scanner cover only Reddit at first, or should Airtable Community/Make Community be first-class sources too?
- Should Upwork/OnlineJobs-style posts be included or treated as a separate lower-priority source?
- Should email notifications be added immediately or after the dashboard is useful?
- Should reply generation imitate Duncan's style from prior outreach messages?
- Should scan jobs be handled with Vercel Cron/functions only, or should a queue/background runner be introduced if scans become slow?
- Should source-agnostic tables replace `reddit_posts` immediately, or should Reddit-specific tables ship first and be abstracted later?
