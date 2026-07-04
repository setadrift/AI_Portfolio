# Reddit Lead Scanner Actionability Improvement Spec

Date: 2026-07-04

## Purpose

Improve the Reddit lead scanner so the admin board surfaces fewer false-positive "Reply Today" leads and more posts that are actually worth a human comment or DM.

This spec focuses on precision after discovery. The existing scanner already finds many automation-adjacent Reddit posts. The failure mode is that generic discussions, content marketing, seller posts, referral spam, and stale active rows still reach the admin board as if they were buyer-intent leads.

## Research Basis

Successful adjacent products use broad monitoring, but keep the action inbox narrow:

- [Syften](https://syften.com/) monitors the public web, Reddit, Hacker News, forums, GitHub, YouTube, Slack communities, and other public communities. Its useful pattern for this scanner is broad source coverage plus AI filtering that suppresses spammy posts, repetitive posts, auto-promotions, duplicates, and weak matches before they hit the inbox.
- [F5Bot](https://f5bot.com/) monitors Reddit, Hacker News, and Lobsters, then lets users narrow alerts by subreddit, exclude unwanted terms, require co-occurring keywords, use semantic alert descriptions, and route results through email, RSS, JSON, API, or webhooks. Its useful pattern is cheap broad monitoring plus explicit negative and co-occurrence filters.
- [GummySearch](https://gummysearch.com/product/) separated Reddit findings into intent categories such as pain points, solution requests, money talk, hot discussions, and seeking alternatives. Its useful pattern is that not every Reddit match is treated as a lead; category and intent determine how the item should be used.
- [Common Room lead scoring](https://www.commonroom.io/product/lead-scoring/) emphasizes combining many buying signals, weighting those signals, and showing the exact behaviors and attributes behind a score. Its useful pattern is explainable scoring: reviewers should see why a lead was promoted and what message would fit.

The scanner should copy these patterns: collect broadly, classify tightly, explain every high score, and keep non-actionable research out of the reply queue.

## Example Patterns To Copy

### 1. Syften: Broad Listening, Narrow Inbox

Syften is successful because it does not rely on one source or one exact keyword. It watches many public communities and web sources, but uses filters to keep the user focused on actionable conversations.

Scanner improvement:

- Keep broad Reddit discovery.
- Add a second-stage actionability filter before publishing.
- Suppress spam, duplicates, auto-promotions, referral posts, repetitive content, and weak keyword matches before scoring.
- Route only actionable rows to the admin board; keep research-only rows out of the reply queue.

### 2. F5Bot: Keyword Alerts With Negative And Co-Occurrence Filters

F5Bot's advanced filtering model is directly applicable. A broad keyword such as "automation" is too noisy by itself. It becomes useful when paired with a co-occurring buyer or workflow clue and protected by unwanted-term filters.

Scanner improvement:

- Require two-clue matches for broad searches, such as workflow term plus help/request term.
- Add source-specific negative terms like `I built`, `my tool`, `referral`, `coupon`, `feedback`, `API guide`, `tutorial`, and `looking for users`.
- Track which query produced each candidate so noisy queries can be demoted.

### 3. GummySearch: Intent Buckets Before Outreach

GummySearch's category model is important because pain points, money talk, solution requests, hot discussions, and seeking alternatives are not equal. Only some are outreach-ready.

Scanner improvement:

- Classify posts into intent buckets before assigning `recommendedAction`.
- Treat pain points and hot discussions as `research_theme` unless the poster asks for help or describes a concrete active workflow.
- Promote solution requests, competitor replacement, and money-talk posts only when they include business context and a reachable public action path.

### 4. Common Room: Explainable Lead Scores

Common Room's useful lesson is that a score without context creates generic outreach. The scanner should show what caused a score, which negative signals were considered, and why the suggested comment or DM is appropriate.

Scanner improvement:

- Store structured evidence alongside every high-scoring row.
- Never publish a score 4-5 lead without request, workflow, business, freshness, reachability, and negative-signal evidence.
- Make scoring factors visible in the digest and optionally in the admin board.

## Current Failure Modes

### 1. Stale Active Rows Stay Visible

The publisher currently preserves active Reddit rows unless cleanup mode is enabled. That means old bad rows can remain visible in the admin board even after a later scan produces better results.

Impact: the portal looks worse than the latest digest, and human review time is spent on already-disqualified posts.

### 2. Discussion Posts Are Promoted As Leads

Posts asking broad questions such as "what is annoying about dashboards?" or "how do you handle this?" can pass the direct-request gate because the scanner treats generic advice language as replyable.

Impact: market research, open-ended discussion, and content prompts get scored like buyer requests.

### 3. Seller And Content Marketing Posts Evade Hard Rejects

Posts that say "I built this", explain an API/product, promote an app, share a dashboard, or push referral-style content can still receive score 4+ when they mention relevant topics.

Impact: the queue includes people selling or educating, not people buying.

### 4. Scoring Floors Inflate Weak Candidates

Some categories are normalized upward to fit and replyability scores of at least 4. That lets "operational pain advice" and "tool shopping" enter the main queue even when the post lacks a concrete buyer, task, budget, or implementation request.

Impact: category labels override actual buying intent.

### 5. Watch And Research Items Are Mixed With Leads

Maybe/Watch is useful, but it should not become a second lead queue for weak posts. Some posts are only useful as market research themes and should never produce a comment or DM suggestion.

Impact: the board encourages action on posts that should only inform future positioning or search terms.

## Product Rule

The scanner should answer one question before publishing a lead:

> Is this a fresh public Reddit post from a reachable person asking for help with a concrete business workflow that Duncan can plausibly improve with automation, data cleanup, reporting, CRM, PDF/document, or internal-tool work?

If the answer is not clearly yes, the post can be stored as research or rejected, but it should not appear as "Reply Today."

## Proposed Pipeline

### Stage 1: Broad Discovery

Keep broad Reddit search modes and subreddit scans. Discovery can remain inclusive because precision should be enforced downstream.

Required metadata:

- `scanMode`
- `sourceQuery` or `sourceChannel`
- `postedDate`
- `discoveredAt`
- `author`
- `subreddit`
- `permalink`

### Stage 2: Hard Rejects

Reject before scoring if any hard-negative pattern is present.

Hard reject categories:

- `seller_promo`: agency promotion, SaaS promotion, newsletter/course promotion, "I built", "I launched", "try my tool", referral codes.
- `content_marketing`: API explainers, product tutorials, thought-leadership posts, generic dashboards, "here is my framework".
- `market_research`: "what is your biggest pain?", "what do you hate about", "would you use", "looking for feedback".
- `job_seeker`: resume, portfolio, "looking for work", "hire me".
- `local_labor_mismatch`: bartender, in-person gig, non-automation local service labor.
- `generic_discussion`: no owner problem, no workflow, no request, no implementation path.
- `stale_or_unverified`: missing actual posted date, or posted date older than freshness rules.
- `paid_gate_or_marketplace`: requires credits, paid unlock, private bid wall, or login-only details before qualification.

Rejected posts should keep a short `rejectReason` for audit and feedback tuning.

### Stage 3: Intent Classification

Classify every non-rejected candidate into one primary intent:

- `explicit_paid_request`: asks to hire/pay someone or requests paid implementation help.
- `implementation_help_request`: asks for help building, fixing, connecting, automating, migrating, or cleaning a workflow.
- `tool_selection_with_workflow`: asks for tool recommendations and describes a real current workflow, data model, or operational constraint.
- `current_system_breakage`: existing system is failing, too manual, too expensive, or not tracking what the business needs.
- `competitor_replacement`: wants to replace a named tool because of cost, workflow limits, or data problems.
- `job_posting`: public job/contract role with a free application path.
- `research_only`: useful theme, but not actionable.
- `generic_discussion`: relevant topic without buyer action.
- `seller_or_content`: selling, teaching, or promoting.

Only the first six intent types can become main leads.

### Stage 4: Evidence-Gated Scoring

Do not allow category labels to force a score floor. Scores should come from evidence.

Required evidence fields:

- `requestEvidence`: wording that shows they want help, recommendations, a build, a fix, paid support, or a direct next step.
- `workflowEvidence`: the actual process, object, or data flow involved.
- `businessEvidence`: business, team, nonprofit, event, client, sales, operations, member, invoice, reporting, CRM, or other owner context.
- `freshnessEvidence`: actual posted date from source data or page text.
- `reachabilityEvidence`: public comment path, public DM path, or free application/contact path.
- `negativeEvidence`: any weak or disqualifying signals considered.

Main queue requirements:

- `fitScore >= 4`
- `replyabilityScore >= 4`
- no hard reject
- actual posted date verified
- at least one `requestEvidence`
- at least one `workflowEvidence`
- at least one `businessEvidence`
- a free-to-pursue public path

`Reply Today` should require all of the above. `Maybe / Watch` can relax one evidence field, but must explain the missing field.

### Stage 5: Queue Separation

Use four queues internally:

- `reply_today`: score 4-5, actionable now.
- `watch`: promising person or thread, but no direct action yet.
- `research_theme`: useful language or pain pattern, not a lead.
- `reject`: disqualified or stale.

Only `reply_today` should publish into the admin board as active Reddit leads by default.

### Stage 6: Publisher Freshness

The publisher should not keep stale Reddit rows active by default.

Recommended behavior:

- Each Reddit run publishes the latest parsed `reply_today` rows for that source or scan mode.
- Previously active Reddit rows that are not in the latest publish set should become inactive, unless the operator explicitly requests historical mode.
- The admin board can keep historical rows for reporting, but the default active queue should reflect the latest useful run.

Acceptance check: active `admin_leads` rows for `source_id=reddit` should match the latest published lead count for the current scan mode, not accumulate old false positives.

### Stage 7: Feedback Loop

Add lightweight review outcomes:

- `accepted`
- `replied`
- `converted`
- `false_positive_seller`
- `false_positive_generic_discussion`
- `false_positive_market_research`
- `false_positive_content_marketing`
- `false_positive_stale`
- `false_positive_bad_fit`

Use this feedback to update negative examples and source/query yield. A source or query that repeatedly produces false positives should be demoted or disabled.

## Certain Improvements To Implement First

These changes should improve quality immediately because they address observed failures directly.

1. Deactivate missing active Reddit rows on publish.

   This removes stale bad leads from the portal and makes the active queue match the latest digest.

2. Remove score floors from broad advice categories.

   `operational_pain_advice` and `tool_shopping_with_implementation_pain` should not automatically become score 4+ without request, workflow, business, and reachability evidence.

3. Tighten direct-request detection.

   Generic phrases such as "how do you", "what system", "recommendations", and "what is annoying" should not qualify alone. They need a concrete workflow plus an owner request or implementation constraint.

4. Add hard rejects for content and seller patterns.

   Reject titles and bodies shaped like "I built", "I launched", "built a dashboard", "API guide", "referral", "coupon", "my tool", "my agency", or "looking for feedback" unless the poster is clearly buying help.

5. Split research from watch.

   Useful content themes should become `research_theme`, not `watch`, and should not generate suggested comments or DMs.

6. Require structured evidence before publish.

   A lead with a high score but empty or vague evidence should be demoted automatically.

7. Add regression fixtures from real misses.

   The bad posts already seen in the admin board should become permanent false-positive tests. The good event CRM/attendee-history post and the workflow-task request should become positive tests.

## Regression Fixture Set

Negative fixtures should publish as `reject` or `research_theme`, not `reply_today`:

- "What is the most annoying part of building BI dashboards as a developer?"
- "Built a Marketing Performance Analytics Dashboard in Metabase..."
- "As an Austrian CEO... liable... money laundering loopholes..."
- referral-code or coupon posts
- local bartender or in-person labor gigs
- "Most AI agent explanations are trash"
- API guide or product explainer posts

Positive fixtures should publish as `reply_today` when fresh:

- event or membership operator needs separate attendee history across group purchases
- workflow-task request where the poster explicitly needs help setting up recurring automation
- small business asks for someone to automate invoice, CRM, spreadsheet, PDF, reporting, or follow-up work
- direct public job/contract post with a free application path and relevant automation scope

## Implementation Notes

Likely code areas:

- `scripts/reddit-lead-monitor.mjs`
  - direct-request detection
  - seller/content/market-research hard rejects
  - score normalization
  - digest queue assignment
  - structured evidence fields
- `config/reddit-lead-monitor.json`
  - source/query tuning
  - scan-mode demotion rules
- `config/reddit-lead-feedback.json`
  - negative examples and accepted positive examples
- `scripts/lib/supabase-admin-leads.mjs`
  - active-row replacement behavior for Reddit
- portal parser/admin display
  - optional evidence and reject reason visibility

## Acceptance Criteria

1. Running the scanner against the regression fixture set produces zero false-positive `reply_today` rows from the listed negative fixtures.
2. Positive fixtures still score 4-5 with clear request, workflow, business, freshness, and reachability evidence.
3. Active Reddit rows in Supabase match the latest publish set for the current scan mode unless historical mode is explicitly enabled.
4. Every `reply_today` row includes a non-empty explanation for request evidence, workflow evidence, business context, freshness, and free-to-pursue path.
5. `Maybe / Watch` contains only posts with a clear reason to monitor; pure market research and content themes are stored as `research_theme` or rejected.
6. A daily run can include fewer leads without padding from weak posts.
7. Human review precision for `reply_today` should target at least 70 percent accepted in the first iteration, with false-positive reasons tracked for tuning.

## Non-Goals

- No automated comments or DMs.
- No use of Reddit cookies, private inboxes, OAuth-only private data, or scraping bypasses.
- No paid marketplace sourcing.
- No attempt to maximize lead count at the expense of precision.
- No source-code refactor outside the scanner, publisher, parser, and config paths needed for this quality gate.
