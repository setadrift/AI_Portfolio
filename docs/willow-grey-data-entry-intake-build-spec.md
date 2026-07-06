# Willow Grey Data Entry Intake Build Spec

## Goal

Rebuild the WillowOps prototype around the safest pain point Lucy surfaced:
manual data entry that already takes paid weekly hours.

The prototype should not assume Willow Grey's enquiry process, procurement
workflow, database architecture, or exact system of record. It should show a
small first project: turn messy, repetitive source material into structured,
review-ready records before anything is written into Monday.com, a spreadsheet,
Studio Designer, Xero, or a future database.

## Positioning

This is not a database rebuild, not a full integration layer, and not a claim
that we know their internal process.

The message:

> You mentioned manual data entry is already taking weekly hours. I mocked up
> the first slice I would test: take one messy source, extract the fields, flag
> what is missing, and let the team approve the record before it goes anywhere.

The buyer should understand in under 30 seconds:

- this attacks a pain they named
- it is boring and repeatable
- it keeps humans in control
- it can later feed whatever system they decide is the source of truth

## Revised Prototype Scenario

**Data Entry Intake Assistant**

Input examples can be deliberately generic:

- copied email text
- spreadsheet row
- quote or invoice text
- supplier update
- project note
- PDF-extracted text

The demo should show one messy source being converted into:

- structured fields
- missing information
- confidence flags
- review status
- destination preview

The prototype should avoid claiming to know the real destination system. Instead
it should show a neutral destination choice:

- Monday board item
- spreadsheet row
- database record
- system-specific export later

## First Screen

Headline:

> Turn repetitive data entry into review-ready records.

Supporting copy:

> A small first project for Willow Grey: take one messy source, extract the
> important fields, flag what needs checking, and let the team approve the
> record before it goes into the system of record.

Disclaimer:

> This is a discussion prototype using simulated data. It is not connected to
> Willow Grey's live inbox, spreadsheets, Monday.com, Studio Designer, Xero, or
> any database.

## Page Structure

### 1. Hero

Purpose: make the data-entry pain obvious.

Visible content:

- eyebrow: `Willow Grey data-entry prototype`
- headline above
- supporting paragraph above
- simulated-data disclaimer

Avoid:

- references to supplier delays as the central story
- claims about live integrations
- broad "AI transformation" language

### 2. Before / After Demo

Purpose: show the practical lift.

Left side or first block: messy source.

Example:

```text
Heritage Lighting emailed: Shah House pendant confirmed, delivery now July 18,
PO acknowledged, invoice sent. Entrance hall. Please chase if no update next
week.
```

Right side or second block: extracted record.

Fields:

- Project: Shah House
- Area: Entrance hall
- Supplier: Heritage Lighting
- Item: Statement pendant and wall lights
- Status: Delayed / revised delivery
- Expected delivery: 2026-07-18
- PO status: Acknowledged
- Invoice status: Invoiced
- Suggested next action: Chase supplier next week if no further update
- Missing / needs review: Who owns the follow-up?

Important: this is an example of the data-entry pattern, not a claim that the
supplier-delay workflow is the final use case.

### 3. Review Queue

Purpose: make human control explicit.

Show a review-ready record with statuses:

- Extracted
- Needs review
- Missing owner
- Ready after approval

Controls can be visual only:

- Approve
- Edit fields
- Reject

Do not imply a real write happens in this prototype.

### 4. Destination Preview

Purpose: avoid overcommitting to database architecture.

Show three destination previews:

- Spreadsheet row
- Monday board item
- Future central record

Copy:

> The first decision is not "which database should run the business?" The first
> decision is "which repeated data-entry task should stop being manual?" Once
> the fields are trusted, the approved record can feed the right destination.

This section should make Monday.com feel possible but not mandatory. Monday can
be described as an operational board or lightweight structured database, not a
true relational source of truth.

### 5. Technical Proof

Purpose: keep credibility without making the page technical.

Collapsed by default.

Options:

- Use a local mock extraction function in the UI only
- Or call a simple local endpoint if one is added later

For the next build, do not force reuse of supplier-specific endpoints if that
keeps the wrong story alive. A static mocked extraction is acceptable for the
prototype if it better communicates the scope.

Raw JSON, endpoint paths, and implementation details stay behind `Developer
response`.

### 6. Closing

Copy:

> If this direction is useful, the paid first step is to pick one real data-entry
> task, define the target fields, and run a review-first pilot before connecting
> it to any live system.

## Data Model For Prototype

Keep it generic and local to the page unless a shared helper is genuinely useful.

Suggested types:

```ts
type ExtractedRecord = {
  project: string;
  area?: string;
  supplier?: string;
  item?: string;
  status?: string;
  expectedDate?: string;
  poStatus?: string;
  invoiceStatus?: string;
  suggestedNextAction: string;
  missingFields: string[];
  confidence: "High" | "Medium" | "Low";
};
```

The prototype can hardcode one messy input and one extracted result. The value
is the workflow shape, not dynamic AI extraction yet.

## Interaction Scope

Default experience should be understandable without clicking.

Optional interaction:

- button: `Extract fields`
- result: reveal or refresh the structured record
- button: `Mark reviewed`
- result: change state to `Ready to send to destination`

No live writes.

No external API calls required.

## Source Of Truth Framing

Use this language:

> Monday.com can be a useful operational board for reviewed records, but the
> first project should not assume the final database architecture. The pilot
> should clarify which fields matter, who approves them, and where the approved
> record should live.

Avoid:

- "We will build a central database first"
- "Monday is the database"
- "This replaces Studio Designer / Xero / spreadsheets"

Better:

> Start with one repeated data-entry task, prove the extraction and review loop,
> then choose whether the approved record belongs in Monday, a spreadsheet, an
> existing system, or a lightweight central database.

## What To Remove From Current Prototype

Remove or replace:

- supplier-delay-specific headline
- delayed lighting order as the core story
- procurement chaser as the main outcome
- route proof that depends on supplier/procurement-specific endpoints
- any implication that supplier updates are the chosen first workflow

Keep conceptually:

- single-column calm layout
- simulated-data disclaimer
- review-first language
- collapsed technical proof
- no live integration claims

## Acceptance Criteria

- The prototype is clearly about manual data entry, not supplier delays or
  enquiry discovery.
- The first viewport names the pain: repetitive data entry.
- The demo shows messy input becoming a structured review-ready record.
- The page explicitly says the destination system is undecided.
- The page explains that Monday.com may be an operational destination but not
  necessarily the canonical database.
- The page includes missing-field and confidence checks.
- The page includes human approval before any write.
- The page does not claim live integrations.
- The page does not require knowledge of Willow Grey's exact domain process.
- The page gives a clear paid first step: pick one real data-entry task and run
  a review-first pilot.

## Build Scope

Recommended next build:

- Replace `src/app/willowops-prototype/page.tsx`
- Replace `src/app/willowops-prototype/ScenarioRunner.tsx`
- Avoid API-route changes unless a small mock route is clearly useful
- Avoid data-file changes unless shared data becomes necessary

Code-level verification:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

Frontend/browser review should be left to the user unless explicitly requested.
