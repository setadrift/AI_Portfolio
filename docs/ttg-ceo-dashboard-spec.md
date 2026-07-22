# TTG CEO Dashboard — Product and Technical Specification

## Purpose

Create a calm, decision-ready CEO dashboard inside TTG's existing private client portal. The dashboard replaces the Looker Studio presentation layer while preserving the verified Google Sheet as the reporting source of truth.

The dashboard is for Gabby as practice owner. In under a minute, it should answer:

1. Is the practice growing profitably and generating cash?
2. Where is clinical capacity being used or left open?
3. Can the underlying collections, payouts, and classifications be trusted?

This is an operating dashboard, not a general analytics explorer. It is designed around a controlled Monday workbook refresh and a daily-readable owner experience. It must never imply that a connected workbook is the same thing as live Jane or bank data. The default view emphasizes the latest complete month, makes MTD data available with explicit limitations, and turns source or operating exceptions into a short owner-review list.

## Prototype scope

### Included

- A new authenticated route at `/portal/ttg/dashboard`.
- A redesigned TTG portal navigation with Dashboard and Blog tools.
- Four dashboard views: Practice, Capacity, Controls, and Data index.
- June 2026 as the latest aligned complete month, with May comparisons.
- Clear treatment of July as partial through its recorded source cutoff wherever it appears.
- Monthly period selection, including a cautiously labelled MTD view.
- A dynamic owner-review list generated from source alignment, failed controls, classification gaps, and open capacity.
- Distinct Jane, bank, and workbook-refresh dates.
- Server-side Google Sheets integration designed around the existing workbook.
- A verified prototype fixture so layout and calculations can be reviewed before live credentials are connected.
- Responsive desktop and mobile layouts, accessible chart descriptions, loading/unavailable states, and visible source freshness.

### Excluded from the prototype

- Editing or writing back to Jane, bank systems, or Google Sheets.
- Client-level or appointment-level drill-downs.
- PHI or client names.
- Automated scheduled exports from Jane or the bank.
- Current bank balance, because transaction exports do not provide a reliable balance.
- Forecasting, targets, or alerts until Gabby confirms the operating targets.

## Information architecture

### Practice

The default view. It leads with a plain-language conclusion and three primary outcomes:

- Gross revenue
- Estimated operating profit and margin
- Net cash flow

The first operating section is a dynamic owner-review list: blocking controls first, then stale or misaligned sources, classification work, and the largest open-capacity opportunity. Supporting charts show monthly revenue/profit and cash flow. A compact operating pulse shows collection rate, marketing ratio, active therapists, and owner revenue concentration for the latest complete clinical period.

Practice supports selection among the monthly rows supplied by the workbook. Partial periods are presented as MTD and are never compared to a full prior month as if the periods were like-for-like.

### Capacity

Shows whether the practice is converting available clinical time into work:

- Weighted utilization
- Booked and available clinical hours
- Revenue per active therapist
- Booked appointments per therapist per week
- Therapist revenue contribution

Therapist names are permitted; client identities are not.

### Controls

Shows whether the monthly close is trustworthy:

- Collection rate and outstanding amount
- Practitioner payout reconciliation
- Total contractor commissions and commission share of gross revenue
- Uncategorized expenses
- Expense mix
- Data limitations and refresh status
- A four-step Monday refresh routine for the assigned administrator

### Data index

Shows the reporting contract without exposing raw rows or credentials:

- The source tab, fields, and calculation behind every visualization.
- Coverage of all 53 metrics in Gabby's original July 19 email.
- A clear distinction between metrics shown now, available in the workbook, partially supported, and blocked on another source.
- The current period-selection contract: monthly and MTD are supported; week and quarter require a more granular reporting table.

## Dynamic copy contract

- Titles that identify a section or chart may remain fixed.
- Narrative headlines, comparisons, warning counts, periods, dates, and values must be derived from the active reporting data.
- Narrative rules must have a neutral fallback and must not claim improvement when the underlying comparison declines.
- Partial-period notes must use the source `Data Through` field.
- Partial periods must not inherit complete-month therapist or expense context without a visible complete-month label.
- Source freshness must come from `Refresh Log`, `Sources`, and source-date checks—not the time the web page fetched the workbook.
- A `FAIL` control must remain a failure in the UI and block reliance on the close.
- Charts must not inject historical values that are absent from the reporting tables.

## Visual direction

The visual system should feel like a well-run clinical practice: quiet, credible, and warm rather than generic SaaS.

- Warm stone canvas with white analytical surfaces.
- Deep blue-green for primary data; moss for positive movement; muted coral for risks.
- Compact sans-serif type for data and navigation; restrained serif use for the practice identity only.
- Square-to-soft corners (6–10px), hairline borders, minimal shadow.
- Three hero metrics maximum in the first viewport; no wall of identical cards.
- Chart-led sections with written takeaways above or beside the visual.
- Full metric labels and contextual comparison text; no ambiguous abbreviations.

## Metric definitions

| Metric | Definition | Primary source |
|---|---|---|
| Gross revenue | Jane invoiced revenue for the reporting month | Monthly Metrics |
| Collected revenue | Jane payments collected for the reporting month | Monthly Metrics |
| Collection rate | Collected revenue divided by gross revenue | Monthly Metrics |
| Estimated operating profit | Collected revenue less operating expenses | Monthly Metrics |
| Estimated margin | Estimated operating profit divided by collected revenue | Monthly Metrics |
| Net cash flow | Bank inflows less bank outflows during the period | Cash Flow |
| Weighted utilization | Booked clinical hours divided by the available-hours denominator in the verified workbook | Therapist Monthly |
| Revenue per therapist | Gross revenue divided by active revenue-generating therapists | Therapist Monthly |
| Marketing ratio | Marketing expense divided by gross revenue | Expense Categories / Monthly Metrics |
| Payout reconciliation | Matched practitioner payouts divided by payouts reviewed | Reconciliation |

The dashboard must render the precomputed values from the reporting workbook rather than quietly redefining business logic in the UI. Derived display-only values may be calculated only when the numerator and denominator are explicitly present and validated.

## Source contract

The Google workbook is private. Production access uses the Google Sheets API with a dedicated read-only service account. The workbook is shared to that service-account email as Viewer; no user's Google password or browser session is used. Vercel authenticates through Google Workload Identity Federation, using short-lived deployment credentials rather than a downloadable service-account key.

The canonical live workbook is `TTG CEO Dashboard — Canonical Reporting Workbook`, owned by `duncan@duncananderson.ca`. The earlier personal-account-owned prototype is not a production source.

Expected source tabs (the adapter accepts the current workbook names and documented aliases):

- `Monthly Metrics`
- `Therapist Monthly`
- `Expense Categories`
- `Checks` (`Data Quality` alias supported)

Optional operational tabs are read when present:

- `Refresh Log` supplies the actual workbook refresh timestamp, refresh owner, bank coverage, row count, status, and notes.
- `Sources` supplies supporting source lineage and fallback coverage metadata.

If the operational tabs are absent, the dashboard falls back to the latest recorded `Data Through` date and labels missing provenance rather than using the browser-fetch time as freshness.

The workbook may retain supporting tabs such as `Dashboard`, `Config`, `Category Map`, `Bank Clean`, `Jane Payouts`, `Reconciliation`, and `Chart Data`. The portal reads the four normalized reporting tables plus the optional aggregate `Refresh Log` and `Sources` metadata; it does not read the raw bank, reconciliation, or patient-level tabs.

Environment configuration:

- `TTG_DASHBOARD_SPREADSHEET_ID`
- `TTG_GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `TTG_GCP_PROJECT_NUMBER`
- `TTG_GOOGLE_WORKLOAD_IDENTITY_POOL_ID`
- `TTG_GOOGLE_WORKLOAD_IDENTITY_POOL_PROVIDER_ID`

The server requests only the required ranges. Responses are normalized into a typed dashboard model, validated, and cached for a short interval. Credentials and raw source rows never reach the browser.

## Prototype and failure behavior

- In development, if Sheets credentials are absent, render the last verified prototype fixture and label it `Prototype data · verified July 20, 2026`.
- In production, never silently substitute fixture data. Show a source-unavailable panel with configuration guidance instead.
- If a live workbook loads but required values are missing or malformed, fail closed and name the affected source tab.
- Always show source mode, reporting period, workbook refresh time, Jane cutoff, and bank cutoff.
- Preserve `PASS`, `WARNING`, and `FAIL` exactly. A failed control renders a blocking state.
- The payout card must show matched and expected payouts separately.

## Acceptance criteria

- Gabby can reach the dashboard from the TTG portal home and navigation.
- The first desktop viewport communicates the June result and the three primary outcome metrics without scrolling.
- Each chart has a written takeaway and an accessible text alternative.
- July is labeled partial wherever shown.
- No PHI, Google credentials, raw bank records, or client names are delivered to the browser.
- Prototype and live data cannot be confused.
- Reloading the page does not make stale source data appear newly refreshed.
- A failed quality check is visible as `Fail` and the close is described as unsafe to rely on.
- Gabby can identify the next owner action without interpreting the charts herself.
- Monthly and MTD selection works; MTD comparisons are explicitly directional.
- Layout remains legible at 390px, 768px, and wide desktop widths.
- `npm run lint`, relevant unit tests, and `npm run build` pass.

## Live handoff

To turn the approved prototype live:

1. Create a Google Cloud service account and a Vercel OIDC workload-identity provider.
2. Share the TTG reporting workbook with the service-account email as Viewer.
3. Add the five non-secret TTG dashboard identity values to the portal deployment.
4. Deploy, confirm the source badge changes from prototype to live, and reconcile the displayed June metrics against the workbook.
5. Follow `docs/ttg-dashboard-refresh-runbook.md` for the Monday Jane/bank export, close-check, and workbook refresh process.
