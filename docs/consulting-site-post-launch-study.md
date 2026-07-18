# Consulting Site Post-Launch Study Contract

Launch date: 2026-07-18

Production commit: `77b8cabf1bcd50419f8444da5a92dd26c53b1801`

Observation checkpoints: 2026-08-01 (14 days) and 2026-08-17 (30 days)

## Decision this study supports

Determine whether the redesigned site helps a qualified owner or operations lead understand the offer and take an appropriate next step. The study must distinguish comprehension, site behavior, acquisition quality, and actual qualified inquiries instead of treating any single click as success.

## Frozen pre-launch acquisition baseline

Source: read-only Google Ads API report for campaign `23969798803`, queried on launch day for 2026-06-19 through 2026-07-18.

| Metric | Baseline |
| --- | ---: |
| Impressions | 2,323 |
| Clicks | 65 |
| Click-through rate | 2.80% |
| Spend | CA$378.41 |
| Average CPC | CA$5.82 |
| Recorded conversions | 0 |

The campaign was paused when the baseline was captured. Its active ads were approved and reviewed, but no paid post-launch traffic can accrue while the campaign remains paused. Do not interpret a quiet paid-acquisition window as a landing-page result.

The strongest historical ad groups by clicks were AI Consulting (18), Workflow Automation (13), Staffing Screening (12), Business Automation (7), AI Implementation (5), and Canada/US Local (5). Search-term quality was mixed, so paid traffic and organic/direct traffic must be evaluated separately.

## Measurement sources and boundaries

- Google tag: `consulting_cta_click`, `workflow_audit_submit`, `workflow_inquiry_submit`, and booking conversion events.
- Vercel Analytics: page and route behavior.
- Vercel Speed Insights: field performance signals where sufficient traffic exists.
- Google Ads: impressions, clicks, spend, search terms, and attributed conversions when the campaign is serving.
- Consulting pipeline and inbox: qualified inquiries, booked conversations, and commercial outcomes.

This site does not emit these consulting events to PostHog. Do not use THE LINEUP's PostHog project as evidence for the consulting site.

The launch-day Vercel behavior baseline is unavailable as an exported fixed snapshot. Compare the two post-launch windows directly and label low-volume results as directional. Do not infer causality from a before/after change without sufficient comparable traffic.

## Fixed quantitative readout

At each checkpoint, record:

1. Unique visitors and views for `/en`, `/fr`, `/en/ai-workflow-audit`, and relevant workflow landing pages.
2. Primary CTA clicks and CTA click-through rate: `consulting_cta_click / eligible landing-page views`.
3. Audit submissions and audit completion rate: `workflow_audit_submit / audit-page views`.
4. Homepage inquiries and inquiry rate: `workflow_inquiry_submit / homepage views`.
5. Booking clicks and, when available, completed booked calls.
6. Qualified inquiries, with source and buyer situation recorded in the consulting pipeline.
7. Paid acquisition metrics only for dates when the campaign actually served.
8. LCP, INP, and CLS at the 75th percentile only when the field sample is sufficient; otherwise record `Insufficient data`.

Report counts and denominators together. Never report a conversion rate without its underlying sample size.

## Five-session buyer comprehension protocol

### Participant criteria

Recruit five people who currently own or operate a service business, or directly manage recurring operational work across inboxes, spreadsheets, documents, forms, or follow-up. Do not use people who helped design or implement the site.

### Session method

- Run each session for 15–20 minutes.
- Begin on the homepage with no explanation of the business.
- Allow ten seconds for the first-viewport exercise, then hide or move away from the page before asking recall questions.
- Do not explain unfamiliar terms, defend the copy, or lead the participant toward the intended answer.
- Record notes without client-sensitive information. Ask permission before making any audio or video recording.

### Questions

1. Who do you think this service is for?
2. What problem do you think Duncan solves?
3. What outcome would you expect from working together?
4. What made the service feel credible or not credible?
5. What would you do next if the problem were relevant to you?
6. What information, risk, or uncertainty would stop you from taking that step?

Then ask the participant to find an appropriate first engagement and explain the difference between the fit call, workflow audit, and paid build.

### Coding rubric

Score each item independently as `Clear`, `Partial`, or `Missed`:

- Audience
- Operating problem
- Expected outcome
- Evidence or credibility
- Human-review and data-safety boundary
- Appropriate next step
- Difference among the three engagement options

Capture exact participant language for confusion points, but do not store personal or client-sensitive details in the repository.

## Decision rules

- **Keep:** at least four of five participants identify the intended audience, problem, outcome, and next step without prompting, and no repeated trust or safety misunderstanding appears.
- **Change:** two or more participants miss the same core concept, choose the wrong engagement path for the same reason, or report the same trust objection.
- **Investigate:** behavioral rates move but the sample is too small, acquisition mix changed materially, the Google Ads campaign remained paused, or qualitative and quantitative signals disagree.
- **Stop:** remove an element only when evidence shows it distracts, misleads, or creates friction; absence of clicks alone is insufficient at low volume.

At the 30-day checkpoint, record keep/change/stop decisions, the evidence behind each decision, and any follow-up tasks. The revamp is complete only after all five sessions and the final readout are documented.
