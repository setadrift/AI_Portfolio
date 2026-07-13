# Mina Jobs Portal — research and product plan

## Product decision

Build a private daily decision queue, not another general-purpose job board.

Mina should be able to open the portal, understand which roles are worth her time, and move the best ones forward in under ten minutes. The system should collect broadly in the background, but the first screen should be a short, ranked list with visible reasons for each recommendation.

Initial search profile:

- Compensation target: CAD 110,000 base or better. Roles down to CAD 107,000 are still worth considering; total compensation is shown separately.
- Core role families: HR Business Partner, Recruiting Manager, and HR Manager at a small or mid-sized company.
- Useful title variants: Senior HR Business Partner, People Partner, People Operations Manager, Talent Acquisition Manager, Recruitment Manager, People & Culture Manager, Global Talent Acquisition Manager, Global Recruiting Manager, and International Recruitment & HR Manager.
- Preferred employers and sectors: Canadian businesses plus consumer brands in fashion, cosmetics and beauty, athletic wear, and sportswear.
- Global scope and business travel are welcome when the role can be based on Montréal Island or genuinely remote from Canada.
- Geography: anywhere on the Island of Montréal, plus roles that are genuinely remote within Canada.
- Work model: remote, hybrid, and on-site are all acceptable.
- Market calibration: Job Bank reports a Montréal-region median wage of CAD 60.58/hour for HR managers, about CAD 126,000 at 2,080 hours/year. A CAD 110,000 target is realistic and below the regional median.

## What the research says

There is no single source that is both comprehensive, inexpensive, current, and safe to republish. The practical answer is a layered ingestion strategy.

| Source layer | What it contributes | Recommended integration | Caveat |
| --- | --- | --- | --- |
| Direct employer ATS feeds | Fresh, canonical jobs with fewer duplicates | Poll selected Greenhouse, Lever, and Ashby employer boards | Company-by-company coverage; maintain a target-employer list |
| Adzuna Canada | Broad normalized discovery and salary data | Use its API as a breadth layer and link back with required attribution | Default limits are 250 requests/day and 2,500/month; ongoing display must follow its terms |
| LinkedIn, Indeed, Job Bank | Broad market coverage and useful saved searches | Have Mina create official daily alerts and route their emails into an ingestion inbox | Do not scrape logged-in pages; ingest the alerts Mina has asked those services to send |
| HR-specific and sector boards | Roles missed by large aggregators | Add HRPA Hire Authority, CharityVillage, and selected recruiter/agency alerts | Some sources are member-only or lack a public API, so use alerts or manual save |
| Public-sector and institutional boards | Transparent salary bands and stable employers | Add Québec public-service alerts and target Montréal hospitals, universities, municipalities, and agencies | Often slower application processes and source-specific forms |
| Web discovery | Small-company career pages, PDF postings, Workday pages, and unusual titles | Run narrow Brave Search API queries with domain/title/location rules | Treat as discovery; verify the canonical employer posting before recommending |
| Manual capture | Jobs found through people, posts, recruiters, or browsing | Paste a URL or use a small bookmarklet/share action | Essential because valuable roles do not all appear in machine-friendly feeds |
| Fashion and beauty boards | Consumer-brand roles aligned with Mina's interests | Add FashionJobs Canada alerts and direct target-company career alerts | Verify every result on the employer's canonical page |

Primary-source findings:

- Greenhouse's public Job Board GET endpoints require no authentication and can return full posting content: <https://developer.greenhouse.io/job-board.html>
- Lever publishes a Postings API and public company job sites: <https://github.com/lever/postings-api>
- Ashby's public posting API can include compensation when the employer supplies it: <https://developers.ashbyhq.com/docs/public-job-posting-api>
- Adzuna permits personal research and publishing subject to attribution and usage terms: <https://developer.adzuna.com/docs/terms_of_service>
- LinkedIn supports up to 20 alerts, daily or weekly, including company-specific alerts: <https://www.linkedin.com/help/linkedin/answer/a511279/job-alerts-on-linkedin>
- Indeed and Job Bank both provide official email alerts: <https://support.indeed.com/hc/en-ca/articles/204488890-Starting-Stopping-and-Managing-Job-Alerts> and <https://www.jobbank.gc.ca/job_alert.do>
- CharityVillage specializes in Canada's nonprofit sector and reports serving more than 170,000 organizations: <https://charityvillage.com/about-us/>
- Québec public-service roles can be searched through the official government careers portal: <https://www.quebec.ca/gouvernement/travailler-gouvernement/travailler-fonction-publique>
- Brave provides a current web-search API with site filters and freshness controls. Its search tier is USD 5 per 1,000 requests with USD 5 monthly credit: <https://api-dashboard.search.brave.com/documentation/pricing>
- Google's Custom Search JSON API is closed to new customers and scheduled to end for existing customers on January 1, 2027; Bing Search APIs retired in 2025. Neither is a sound new dependency: <https://developers.google.com/custom-search/v1/overview> and <https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement>
- Montréal-region HR manager wages currently show a CAD 60.58/hour median: <https://www.on.jobbank.gc.ca/marketreport/wages-occupation/17400/geo25154>

## The useful version of the portal

### 1. Today

The home screen should answer one question: **what deserves attention today?**

- Show at most five new high-confidence roles, plus saved jobs with approaching deadlines.
- Each row shows title, company, location/work model, compensation, age, and application deadline.
- Explain the recommendation in plain language: for example, “salary floor clears target,” “direct HRBP experience match,” and “posted 18 hours ago.”
- Show uncertainty honestly: “salary not posted,” “Canada eligibility unclear,” or “company size estimated.”
- Primary actions: **Review and apply**, **Save**, and **Not for me**.
- A rejection asks for one quick reason so ranking improves: pay, title, location, seniority, industry, company, or duplicate.

### 2. Find jobs

This is the complete searchable feed, behind the daily queue.

Filters should include:

- role family and title;
- minimum base salary and whether salary is posted or estimated;
- remote, hybrid, or on-site;
- geography and Canada eligibility;
- company size and industry;
- posted age and application deadline;
- source and confidence;
- new, saved, applying, applied, interviewing, offer, rejected, or expired.

Default sorting should be **best opportunity**, not newest. A compact alternative sort can expose newest and compensation.

### 3. Application workspace

Opening a job should produce a focused application brief rather than a generic AI summary:

- exact requirements and responsibilities pulled from the posting;
- Mina's strongest matching evidence from her career profile;
- real gaps or uncertain requirements;
- salary, work model, deadline, and source evidence;
- the best resume variant and 3–5 suggested bullet edits;
- a concise cover-letter or recruiter-note draft when it is actually useful;
- likely interview themes and questions;
- application URL and a checklist with owner/date.

The system should never auto-submit applications. Mina should review every claim and send every application herself.

### 4. Pipeline

Use a restrained list or board with these states:

`Saved → Preparing → Applied → Recruiter screen → Interview → Offer`

Every active item needs a next action and date. The useful reminders are “application closes tomorrow,” “follow up after five business days,” and “interview prep due,” not generic notifications.

### 5. Target companies and people

This is the highest-leverage “outside the box” layer.

- Maintain a watchlist of roughly 50–100 organizations where Mina would genuinely work.
- Poll their canonical career boards directly, especially Greenhouse, Lever, and Ashby boards.
- Add company-specific LinkedIn alerts for the most desirable employers.
- Track warm contacts, HR-specialist recruiters, former colleagues, and referral possibilities beside the company.
- Surface organizational triggers that create HR demand: rapid hiring, a new Canadian office, acquisitions, restructuring, a new People leader, or a first dedicated HR hire.
- Create a weekly queue of five thoughtful networking actions separate from applications.

This matters because referrals, recruiter conversations, and newly created roles can appear before or outside a broad job-board search.

## Ranking model

Use transparent rules first and an LLM only for structured extraction and evidence-backed comparison.

Suggested score out of 100:

| Signal | Weight | Rule |
| --- | ---: | --- |
| Role and responsibility fit | 30 | Compare actual scope, not title alone |
| Compensation | 20 | Full credit when posted base minimum is at least CAD 110k; strong partial credit from CAD 107k and partial credit for overlapping ranges |
| Mina evidence match | 20 | Match each key requirement to a verified profile accomplishment |
| Location/work model | 10 | Use Mina's configured commute and remote preferences |
| Employer preference | 8 | Target company, industry, size, and values |
| Freshness/deadline | 7 | Favour recent postings and real closing dates |
| Reachability | 5 | Warm contact, named recruiter, or clear direct application path |

Hard flags should remain separate from the score: salary below target, contract role, unclear Canada eligibility, required bilingualism, designation requirement, and expired canonical page.

For jobs without a posted salary, estimate a range only as a labelled aid. Never present an estimate as employer-provided compensation, and do not automatically hide a strong role solely because the salary is absent.

## Data and automation shape

The existing app supports password-protected client routes, signed sessions, client-scoped middleware, and server-side Supabase access. Mina uses a dedicated `MINA_PORTAL_PASSWORD` variable (and optional `MINA_PORTAL_USERNAME`, defaulting to `mina`) so enabling her account never overwrites the existing encrypted `PORTAL_USERS` allow-list.

Recommended tables:

- `mina_jobs`: canonical posting, normalized fields, source evidence, extracted requirements, salary facts, timestamps, active/expired state, and score breakdown.
- `mina_job_states`: Mina's status, favourite/rejection reason, notes, next action, dates, and selected resume version.
- `mina_search_profiles`: desired roles, aliases, salary floor, locations, work models, industries, exclusions, and target employers.
- `mina_source_configs`: source type, board identifier or alert sender, enabled state, and last successful scan.
- `mina_source_runs`: freshness, fetched/created/updated counts, errors, and coverage so stale data is visible.
- `mina_profile_evidence`: approved career facts and accomplishments used to assess fit and draft materials.

Ingestion should run two or three times per day, canonicalize URLs, fingerprint title/company/location, merge duplicates, and re-check the employer page before a job reaches the daily shortlist. Expired jobs remain in application history but disappear from discovery.

The repository now includes a GitHub Actions scan scheduled for three Toronto-daytime runs. It can also be launched manually. The workflow requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as repository secrets; both were configured during implementation. Adzuna credentials are optional; extra ATS boards can be supplied through the `MINA_GREENHOUSE_BOARDS`, `MINA_ASHBY_BOARDS`, and `MINA_LEVER_SITES` repository variables without changing code.

Knix is included as a direct Canadian consumer-brand watch source. Its public Lever board currently has no matching HR leadership role, but keeping it in the recurring scan means a future match is detected directly from the employer rather than waiting for an aggregator.

## What not to build

- Do not scrape logged-in LinkedIn or Indeed pages.
- Do not make an LLM-generated fit percentage the primary evidence.
- Do not auto-apply or produce hundreds of low-quality tailored documents.
- Do not require Mina to re-enter fields that can be extracted from a URL or alert.
- Do not show a wall of cards, vanity statistics, source logs, or raw model output on the first screen.
- Do not treat volume as success. Ten plausible jobs are worse than three genuinely good ones if the ten consume more application time.

## Delivery plan

### Phase 1 — useful private tracker

- Mina login and private route.
- Search profile and career-evidence profile.
- Manual URL capture plus direct ATS ingestion for an initial target-employer list.
- Ranked Today queue, filters, save/reject feedback, job detail, and application pipeline.
- Salary normalization, duplicate detection, expiry checks, and source evidence.

This phase is useful even before every alert source is connected.

### Phase 2 — aggregation and application speed

- Dedicated alert inbox ingestion for LinkedIn, Indeed, Job Bank, HRPA, CharityVillage, and Québec public-service roles.
- Adzuna breadth feed and narrow Brave discovery searches.
- Resume variants, evidence-grounded tailoring suggestions, cover-letter/recruiter-note drafts, deadline and follow-up reminders.
- Source-health view for Duncan, not Mina's primary screen.

### Phase 3 — network advantage

- Target-company monitoring and organizational trigger signals.
- Recruiter/contact tracker and warm-introduction prompts.
- Weekly search review: applications, response rate, interviews, source quality, and preference changes.

## Definition of success

After two weeks, the portal should demonstrate:

- at least 80% of the first-screen jobs are ones Mina considers plausible;
- fewer than 10 minutes to review the daily queue;
- fewer than 30 minutes to turn a saved role into a reviewed, tailored application package;
- no duplicate or expired job recommended as current;
- every recommendation shows its source, compensation confidence, and concrete fit reasons;
- Mina can use the full workflow comfortably on a phone and laptop.

## Remaining calibration inputs

The CV, compensation, geography, and work-model preferences are now incorporated. The next useful refinements are:

1. Company sizes and contract terms she prefers or rejects.
2. Whether she holds a CRHA/CHRP designation; the current CV does not list one, so the portal flags rather than assumes it.
3. Any work-authorization or other non-negotiable requirements not represented on the CV.
4. Ten employers she likes and five she would avoid, even if the reasons are intuitive.
