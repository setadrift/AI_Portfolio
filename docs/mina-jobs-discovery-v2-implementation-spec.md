# Mina job board — simplified implementation specification

**Status:** Approved for implementation

**Date:** July 13, 2026

**Revision:** 4 — reliable, single-list job board

## 1. Outcome

Give Mina one private board containing relevant jobs available on the public market.

The board should be dependable and easy to review. It does not need to be a complete job-search platform or an elaborate monitoring system.

Success means:

- jobs are gathered from several useful public sources rather than only a small employer watchlist;
- irrelevant titles and locations are filtered out;
- genuinely recent jobs are clearly separated from older discoveries;
- the same job found through multiple sources appears once;
- every job links to a public application page;
- Mina can start a fresh scan directly from her authenticated portal; and
- Mina remains in control of saving, rejecting, and applying.

## 2. Mina's search profile

### Compensation

- Preferred base salary: CAD 110,000 or more.
- CAD 107,000 is still worth considering.
- Unknown salary is allowed and labelled clearly.
- A posted maximum below CAD 107,000 is a warning and cannot become a top recommendation.

### Location and work model

- Anywhere on the Island of Montréal.
- Genuinely remote roles open to candidates in Canada.
- Canada-based global roles, including roles requiring travel.
- Remote, hybrid, and on-site work are all acceptable.

### Roles

- HR Business Partner and People Partner roles.
- HR Manager and People Operations/People & Culture leadership.
- Talent Acquisition Manager or Lead.
- Recruiting or Recruitment Manager or Lead.
- Global Talent Acquisition and international recruitment leadership.
- Equivalent bounded French titles.

Junior recruiter, coordinator, assistant, and unrelated HR-specialist roles are excluded.

### Preferences

Give a modest preference to:

- fashion and apparel;
- cosmetics and beauty;
- athletic wear and sportswear;
- consumer brands; and
- Canadian businesses.

These are preferences, not hard requirements.

Permanent roles are preferred. Contract roles may remain visible as `Watch` items. A required CRHA/CHRP designation is shown as a flag because Mina's status is not yet confirmed.

## 3. Sources

The board consolidates jobs from the practical public sources already implemented:

- public Greenhouse, Ashby, and Lever employer boards;
- public remote-job feeds such as Remotive and Himalayas when available;
- bounded Reddit searches for genuine hiring posts with an external job link;
- the scheduled Codex public-web research pass; and
- optional configured search APIs when credentials already exist.

English and French searches cover core HR leadership, global recruiting, preferred sectors, Canadian employers, Québec specialist boards, government/institutional employers, recruiter sites, and common public ATS pages.

A source failure must not delete otherwise valid jobs found previously. The scanner records the failure and continues with the other sources.

## 4. Admission rules

A job can enter the main board only when:

1. its title fits the bounded role list;
2. its location is Montréal Island, Canada-remote, or explicitly Canada-based global;
3. it has a valid public job or application URL; and
4. its canonical page is still open, or a direct public employer-board API confirms it is open.

Search snippets, Reddit text, and generated research are discovery hints only. They cannot bypass these rules.

## 5. Freshness

Use the employer's posting date, never the time our scanner first found the job.

| Label | Employer posting age | Board treatment |
| --- | ---: | --- |
| Hot | 24 hours or less | Top of current queue |
| Fresh | 1–3 days | Current queue |
| Recent | 3–7 days | Current queue |
| Aging | 8–14 days | Watch/archive |
| Archive | More than 14 days | Hidden unless saved or in progress |
| Unknown | No trustworthy date | Watch only; never called new |

An aggregator's update time and a Reddit post time are not substitutes for the employer's original posting date.

## 6. Ranking and display

Rank eligible jobs using:

- role and responsibility fit;
- evidence from Mina's CV;
- posting freshness;
- posted compensation;
- location eligibility;
- preferred sector or Canadian-company fit; and
- a reachable application link.

The board uses four simple tiers:

- `Priority`: an unusually strong, verified, recent match;
- `Strong`: a good, verified, recent match;
- `Watch`: plausible, but has an uncertainty such as salary, age, contract status, or designation;
- `Archive`: old, closed, or no longer useful in the active queue.

Each card shows the concrete reasons it matched and anything Mina should check. Job descriptions are displayed as readable text, not raw HTML.

### Interaction rules

- Use one continuous current-jobs list. Do not move jobs between separate Today, Find Jobs, or Applications views.
- Opening the public posting only opens the public posting. It never changes the job's status.
- `Save`, `Mark applied`, and `Not for me` are separate, explicit actions with one effect each.
- Saved and applied jobs remain in the current list with a clear status label. Only `Not for me` removes a job from the list.
- Keep only search and sort controls on the board. Role, location, work-model, salary, and freshness screening belong in the scanner.

## 7. Deduplication

The same role found through an employer board, public search, Reddit, or research output should appear once.

Match in this order:

1. same source and external job ID;
2. same canonical URL after removing tracking parameters;
3. same employer posting identifier when available; and
4. same normalized company, title, location, and posting week.

When a direct employer record and an indirect discovery describe the same job, the direct employer record wins for title, description, posting date, open/closed status, and application URL. Other sources remain attached as provenance.

## 8. Schedule and reliability

- Run the deterministic scanner every two hours at a non-zero cron minute.
- Run the Codex public-web research pass four times daily.
- Let Mina run the deterministic scan on demand from her private portal. Disable the control while it runs and reuse a scan completed within the last five minutes.
- A failed source is visible in the scan result and does not masquerade as a fully healthy run.
- Re-running the same input must not create duplicate jobs.
- Notifications remain disabled unless Duncan later supplies a recipient and explicitly enables them.

## 9. Required verification

Before this version is considered finished:

- title, location, salary, freshness, canonical-page, and description-cleaning tests pass;
- a duplicate discovery does not create a second job;
- a closed or mismatched canonical page cannot become `Priority` or `Strong`;
- lint and production build pass;
- one controlled live scan completes and its surfaced jobs are reviewed for obvious noise;
- the authenticated portal control completes a real scan, refreshes the board, and rejects unauthenticated requests; and
- all Mina work remains in one branch and one combined commit, without pushing until Duncan requests it.

## 10. Explicitly deferred

The following are unnecessary for the current use case and are not completion requirements:

- dedicated alert-email inbox ingestion;
- automated source-health email alerts;
- automatic promotion of newly discovered employers;
- custom Workday, iCIMS/Jibe, or SmartRecruiters adapters;
- paid-provider experiments or a formal 14-day provider comparison;
- exhaustive per-query and per-source analytics;
- morning summaries or other notification workflows;
- a separate application workspace or multi-stage pipeline;
- auto-applying; and
- strict real-time scheduling guarantees.

Add any of these only after Mina's actual usage demonstrates a clear need.

## 11. Manual inputs

No manual input is required to operate the board with notifications disabled.

Later, Duncan may optionally provide:

- an alert recipient if immediate email alerts are desired;
- Mina's CRHA/CHRP status; and
- feedback on which surfaced jobs are good or poor matches so the ranking can be calibrated.
