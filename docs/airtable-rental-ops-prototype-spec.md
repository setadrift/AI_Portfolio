# Airtable Rental Ops Prototype Spec

## Goal

Create a small, realistic rental-property operations prototype so Duncan can understand the likely shape of Alex's Airtable system before the Monday call.

This is a learning and meeting-prep artifact, not a production build.

The prototype should help answer:

- How should properties, units, tenants, leases, maintenance, turns, vendors, and tasks relate?
- Where does Airtable work well as the operating database?
- Where do automations help?
- Where does Claude/AI help without making the system fragile?
- What questions should Duncan ask Alex during discovery?

## Recommendation

Use the Airtable Codex/MCP path as the primary prototype path, with local seed files as backup.

Build:

```text
outputs/airtable-rental-ops-prototype/
  README.md
  schema.md
  workflows.md
  mcp-setup.md
  demo-script.md
  import-order.md
  csv/
    properties.csv
    units.csv
    tenants.csv
    leases.csv
    maintenance_requests.csv
    vendors.csv
    turnovers.csv
    tasks.csv
    notes_documents.csv
```

Target end state:

- A throwaway Airtable base named `Rental Ops Prototype`.
- Tables, linked-record relationships, and seed records for a realistic rental-ops workflow.
- A Codex/MCP setup note showing how Codex can inspect or update Airtable.
- A short demo script Duncan can use if Alex asks how AI/Codex fits into Airtable work.
- CSV files as a fallback if MCP setup is slow or limited.

## Why Start With Airtable MCP/Codex?

Alex has already been building with Claude and Airtable. If Duncan can discuss or show a working Airtable/Codex prototype, it maps closely to the type of workflow Alex is likely trying to build.

This is useful even if Alex has not used MCP:

- It shows Duncan understands the practical bridge between AI agents and operational data.
- It creates a realistic way to inspect schema, records, and workflow design.
- It gives Duncan a stronger base for discussing what AI should automate versus what should remain human-reviewed.
- It can become a small demo: "I mocked up a rental ops base and used Codex to reason through schema and workflow improvements."

Airtable's docs say the Codex plugin bundles the Airtable MCP server and can be added with:

```text
codex plugin add airtable@openai-curated
```

The MCP path should be used against a disposable prototype base only. Do not connect it to Alex's production base during the first call unless he explicitly grants access and understands the permissions.

## Airtable Setup Path

### Primary Path: Codex + Airtable MCP

Use the Airtable plugin/MCP connection to create or modify a real prototype base.

Manual prerequisites:

1. Have an Airtable account and workspace available.
2. Install/enable the Airtable plugin in Codex:

```text
codex plugin add airtable@openai-curated
```

3. Complete Airtable OAuth or token authorization when prompted.
4. Confirm Codex can see Airtable tools/resources.
5. Create a disposable workspace/base target, not a production client base.

Minimum permission expectations:

- Ability to create a base in Duncan's workspace.
- Ability to create tables and fields.
- Ability to create records.
- Ability to read back schema and records for verification.

If the MCP/plugin exposes read/write record tools but not complete schema-management tools, create the base/tables manually in Airtable and use MCP for record seeding, inspection, and schema review.

Implementation flow:

1. Create a new Airtable base named `Rental Ops Prototype`.
2. Create the core tables from this spec.
3. Add fields with the closest supported Airtable types.
4. Add linked-record relationships between tables.
5. Seed each table with 3-6 realistic records.
6. Create views for maintenance triage, turn season, overdue tasks, and active portfolio.
7. Add a few example automation ideas manually in `workflows.md`; only build Airtable automations if time permits.
8. Use Codex to query the base and generate a short schema review.

### Minimum Viable Prototype For Monday

If time is tight, do not build the whole spec. Build only:

- `Properties`
- `Units`
- `Tenants`
- `Leases`
- `Maintenance Requests`
- `Vendors`
- `Turnovers`
- `Tasks`

Seed one coherent example:

- one property
- two units
- one active tenant/lease
- one tenant giving notice
- one maintenance request
- one vendor
- one turnover with 4-6 tasks

This is enough to discuss the operating model with Alex.

### Fallback Path: CSV Import

If MCP setup is not available quickly, use Airtable's normal CSV/spreadsheet import flow:

1. Create a new Airtable base named `Rental Ops Prototype`.
2. Create/import each CSV as its own table.
3. Convert relationship columns into linked-record fields manually after import.
4. Create a few useful views and interfaces.

This fallback is still valuable because Duncan can learn the table structure and workflow shape before the call.

### Optional Path: Direct Airtable Web API

Use the Airtable Web API only if MCP is unavailable but programmatic creation is still needed.

This requires a Personal Access Token or OAuth token and permission to create bases/tables. It is more setup than the plugin path, so do not use it unless needed.

### Optional Path: Website UI Mock

Only use the portfolio site if Duncan wants a visual rehearsal surface without touching Airtable.

Possible route:

```text
/portal/admin/rental-ops-prototype
```

This page would display the same fake data as a split-pane internal tool: properties/units/tasks on the left, selected record detail on the right.

This should stay optional. Airtable itself is the better learning tool for this meeting.

## Source Notes

- Airtable's CSV import extension can add records to an existing table or merge with records, with a 25,000-row limit.
- Airtable's Web API supports creating a new base with `POST /v0/meta/bases` using a PAT or OAuth token where the user has permission.
- Airtable's official MCP documentation says the Codex plugin bundles the Airtable MCP server and teaches Codex how Airtable data is structured.
- Airtable's scripting extension can modify field information, add records, and handle more complex criteria, but it is unnecessary for the first mock.

## Safety And Data Rules

- Use fake data only.
- Do not import real tenant names, phone numbers, emails, leases, addresses, bank/payment details, or vendor contracts.
- Do not connect Codex/MCP to Alex's real Airtable base during the first call unless he explicitly grants access and understands that the agent may have write permissions.
- If Alex shares screenshots or notes, use them for discussion only until there is a clear paid review agreement.
- Keep the prototype disposable. It should be safe to delete after the meeting.

## Field Type Mapping

Use these Airtable field types where possible:

| Spec Field Kind | Airtable Type |
| --- | --- |
| ID fields like `Property ID` | Single line text |
| Names/titles | Single line text |
| Notes/summaries | Long text |
| Status fields | Single select |
| Tags/trades/task types | Single select or multiple select |
| Relationship fields | Linked record |
| Dates | Date |
| Money fields | Currency |
| Counts | Number |
| Yes/no fields | Checkbox |
| Attachment URL | URL for v1; attachment field only if manually adding files |

Do not overbuild formulas, rollups, or lookups in v1. Add them only where they clarify the model, such as unit count, active maintenance count, or open task count.

## Prototype Data Model

### Properties

Purpose: Portfolio-level asset tracking.

Fields:

- `Property ID`
- `Name`
- `Address`
- `City`
- `State`
- `Owner Entity`
- `Property Manager`
- `Status`
- `Unit Count`
- `Notes`

Example statuses:

- Active
- Under Rehab
- Selling
- Archived

### Units

Purpose: Individual rentable units.

Fields:

- `Unit ID`
- `Property`
- `Unit Label`
- `Bedrooms`
- `Bathrooms`
- `Market Rent`
- `Current Status`
- `Current Tenant`
- `Active Lease`
- `Next Turnover`
- `Notes`

Example statuses:

- Occupied
- Vacant
- Notice Given
- Under Turn
- Ready to List
- Listed

### Tenants

Purpose: Tenant/contact tracking.

Fields:

- `Tenant ID`
- `Name`
- `Phone`
- `Email`
- `Current Unit`
- `Lease`
- `Move-In Date`
- `Move-Out Date`
- `Balance Status`
- `Notes`

Example balance statuses:

- Current
- Late
- Payment Plan
- Collections

### Leases

Purpose: Lease lifecycle tracking.

Fields:

- `Lease ID`
- `Tenant`
- `Unit`
- `Start Date`
- `End Date`
- `Monthly Rent`
- `Deposit`
- `Lease Status`
- `Renewal Decision`
- `Notice Date`
- `Notes`

Example statuses:

- Active
- Renewal Pending
- Notice Given
- Expired
- Terminated

### Maintenance Requests

Purpose: Maintenance intake and execution.

Fields:

- `Request ID`
- `Property`
- `Unit`
- `Tenant`
- `Issue Type`
- `Priority`
- `Status`
- `Vendor`
- `Opened Date`
- `Target Date`
- `Completed Date`
- `Estimated Cost`
- `Actual Cost`
- `AI Summary`
- `Next Action`

Example statuses:

- New
- Needs Triage
- Vendor Assigned
- Scheduled
- Waiting on Tenant
- Completed
- Closed

### Vendors

Purpose: Contractor/vendor directory.

Fields:

- `Vendor ID`
- `Name`
- `Trade`
- `Phone`
- `Email`
- `Service Area`
- `Preferred`
- `Insurance Expiration`
- `Average Response`
- `Notes`

Example trades:

- Plumbing
- HVAC
- Electrical
- Cleaning
- Landscaping
- General Contractor

### Turnovers

Purpose: Unit turn-season project tracking.

Fields:

- `Turn ID`
- `Property`
- `Unit`
- `Prior Tenant`
- `Target Ready Date`
- `Actual Ready Date`
- `Turn Status`
- `Scope Summary`
- `Estimated Turn Cost`
- `Actual Turn Cost`
- `Listing Status`
- `Tasks`
- `AI Turn Summary`

Example statuses:

- Upcoming
- Inspection Needed
- Scope Drafted
- Work In Progress
- Cleaning
- Ready to List
- Complete

### Tasks

Purpose: General action layer across maintenance, turns, leasing, and admin.

Fields:

- `Task ID`
- `Title`
- `Related Property`
- `Related Unit`
- `Related Maintenance Request`
- `Related Turnover`
- `Owner`
- `Due Date`
- `Priority`
- `Status`
- `Task Type`
- `Notes`

Example task types:

- Maintenance
- Turnover
- Leasing
- Vendor Follow-Up
- Tenant Follow-Up
- Admin

### Notes / Documents

Purpose: Flexible notes, photos, estimates, leases, inspection records, and AI summaries.

Fields:

- `Note ID`
- `Related Property`
- `Related Unit`
- `Related Tenant`
- `Related Maintenance Request`
- `Related Turnover`
- `Document Type`
- `Title`
- `Text Notes`
- `Attachment URL`
- `AI Extracted Summary`
- `Created Date`

## Relationship Map

```text
Properties
  -> Units
    -> Tenants
    -> Leases
    -> Maintenance Requests
    -> Turnovers
    -> Tasks

Vendors
  -> Maintenance Requests
  -> Turnover Tasks

Notes / Documents
  -> Properties / Units / Tenants / Maintenance / Turnovers
```

## Build Order For Linked Records

Linked records are easier to seed if parent tables exist first.

Recommended build order:

1. `Properties`
2. `Units`
3. `Vendors`
4. `Tenants`
5. `Leases`
6. `Maintenance Requests`
7. `Turnovers`
8. `Tasks`
9. `Notes / Documents`

Recommended linking order:

1. Link units to properties.
2. Link tenants to current units.
3. Link leases to tenants and units.
4. Link maintenance requests to properties, units, tenants, and vendors.
5. Link turnovers to properties, units, and prior tenants.
6. Link tasks to maintenance requests or turnovers.
7. Link notes/documents to the relevant records.

If MCP has trouble creating linked-record fields or linking records by name, create plain text relationship columns first, then manually convert them to linked-record fields in Airtable.

## Views To Create In Airtable

Properties:

- `Active Portfolio`
- `Needs Attention`

Units:

- `Occupied`
- `Vacant / Ready`
- `Turn Season`
- `Notice Given`

Maintenance Requests:

- `New / Needs Triage`
- `Vendor Assigned`
- `Overdue`
- `Completed This Month`

Turnovers:

- `Upcoming Turns`
- `In Progress`
- `Ready to List`

Tasks:

- `Today`
- `This Week`
- `Overdue`
- `By Owner`

## Workflows To Simulate

### Workflow 1: Maintenance Intake

Scenario:

A tenant reports a leak under the kitchen sink.

Flow:

1. New maintenance request is created.
2. AI summarizes the issue from messy tenant notes.
3. Priority is set to `High`.
4. Plumbing vendor is assigned.
5. Follow-up task is created.
6. Status moves from `New` to `Vendor Assigned` to `Scheduled`.

Automation ideas:

- When request status is `New`, create triage task.
- When vendor is assigned, create vendor follow-up task.
- When target date is missed, mark as overdue or notify owner.

AI ideas:

- Summarize messy tenant text.
- Suggest issue category and priority.
- Draft vendor message.

### Workflow 2: Lease Ending / Turnover

Scenario:

A tenant gives notice and the unit needs to be turned before relisting.

Flow:

1. Lease status changes to `Notice Given`.
2. Turnover record is created.
3. Standard turn tasks are created: inspection, repairs, cleaning, photos, listing.
4. Unit status changes to `Under Turn`.
5. Once tasks are complete, unit status changes to `Ready to List`.

Automation ideas:

- When lease status becomes `Notice Given`, create turnover.
- Create default turn checklist tasks.
- Calculate target ready date from move-out date.

AI ideas:

- Summarize inspection notes into repair scope.
- Turn notes/photos into vendor scope.
- Draft listing readiness checklist.

### Workflow 3: Portfolio Ops Dashboard

Scenario:

Alex wants one place to see what needs attention.

Flow:

1. Pull active maintenance, upcoming lease expirations, overdue tasks, vacant units.
2. Show weekly ops priorities.
3. Generate a short portfolio summary.

Automation ideas:

- Weekly digest email.
- Flag overdue tasks.
- Create follow-up tasks for stale requests.

AI ideas:

- Generate weekly portfolio summary.
- Identify stuck work based on status age.
- Draft plain-English next actions.

## AI Boundaries

AI should support judgment, not silently run the business.

Good AI use cases:

- Summarizing notes.
- Classifying maintenance issue type.
- Drafting vendor/tenant messages.
- Extracting key facts from documents.
- Turning inspection notes into a task list.
- Creating weekly summaries.

Avoid for v1:

- Automatically approving expenses.
- Automatically sending messages without review.
- Making legal/lease decisions.
- Updating money-critical fields without a human check.
- Complex agent chains before the base schema is stable.

## MCP Demo Framing

If Duncan mentions the prototype to Alex, keep it modest:

```text
I set up a small prototype Airtable base for rental operations so I could think through the data model before our call. I also tested the Airtable/Codex MCP path, which lets an AI agent inspect or update a base through authorized access. I would not point that at a live production base without guardrails, but it is useful for schema review, cleanup planning, and generating implementation steps.
```

Good demo beats:

1. Show the core structure: properties, units, tenants, leases, maintenance, turns, tasks.
2. Show linked records so the base feels relational, not like disconnected spreadsheets.
3. Show one maintenance request and ask Codex to summarize the issue or suggest next action.
4. Show one turnover record and ask Codex to identify missing tasks or stale statuses.
5. Explain that production automation should start with human-reviewed suggestions before autonomous updates.

Avoid saying:

- "I am an Airtable expert."
- "AI can run the whole system."
- "MCP should directly modify your real base right away."
- "This is exactly how your system should be built."

Better wording:

```text
This is a working mental model. The real answer depends on your current base, your workflows, and which parts are actually painful day to day.
```

## Codex/MCP Demo Prompts

Use prompts like these against the disposable prototype base:

```text
Review the Rental Ops Prototype Airtable base. Summarize the core tables, linked-record relationships, and any obvious schema problems.
```

```text
Look at open maintenance requests and tasks. Which items need attention first, and why?
```

```text
For the unit with a pending turnover, identify missing tasks or stale statuses before it can be listed.
```

```text
Draft a plain-English summary of this property's current operational state for the owner.
```

These prompts should produce advice or drafts, not automatically update important records.

## Cleanup Plan

After the meeting:

1. Keep the base if it helps with follow-up or proposal writing.
2. Otherwise delete or archive the `Rental Ops Prototype` base.
3. Keep local docs and CSVs under `outputs/airtable-rental-ops-prototype/`.
4. Do not retain any client-specific data Alex shares unless there is a paid engagement and a clear working folder/source-of-truth.

## Implementation Tasks

1. Install/enable the Airtable Codex plugin and authorize Airtable access.

2. Create output folder:

```text
outputs/airtable-rental-ops-prototype/
```

3. Add `mcp-setup.md` with:

- installed plugin/version or setup method
- auth method used
- workspace/base target
- what Codex can access
- any permissions or limitations noticed

4. Add CSV seed files with 3-6 realistic fake rows per table.

5. Create `schema.md` describing each table, fields, field types, and intended linked-record relationships.

6. Create a disposable Airtable base named `Rental Ops Prototype`.

7. Create the core tables in Airtable:

- `Properties`
- `Units`
- `Tenants`
- `Leases`
- `Maintenance Requests`
- `Vendors`
- `Turnovers`
- `Tasks`
- `Notes / Documents`

8. Add fields and linked-record relationships according to `schema.md`.

9. Seed realistic fake records through MCP where possible. Use CSV import only for records or field types that are awkward through MCP.

10. Read back the Airtable base through MCP and confirm the expected tables and at least one linked-record path exist.

11. Add `workflows.md` with the three workflows above and discovery questions for Alex.

12. Add `demo-script.md` with a 3-5 minute walkthrough:

- show base structure
- show property -> unit -> tenant/lease relationships
- show a maintenance request becoming tasks/vendor follow-up
- show a turnover checklist
- show where AI/Codex can summarize, classify, or recommend next actions

13. Add `import-order.md` explaining how to import into Airtable and which columns to convert to linked records if MCP setup fails.

14. Add a short `README.md` with:

- what the prototype is
- what it is not
- how MCP was used
- how to use it before the meeting
- what to ask Alex

15. Optional: add a local website mock only if Duncan wants a visual dashboard after reviewing the Airtable version.

## Acceptance Criteria

- Airtable MCP/Codex path is attempted first and documented.
- A disposable Airtable base exists if auth/setup succeeds.
- If MCP auth/setup fails, the fallback CSV path is ready and documented.
- Prototype can still be understood without Airtable access.
- CSV files are ready to import into Airtable.
- Fake data feels realistic for a mid-sized residential rental portfolio.
- The schema includes properties, units, tenants, leases, maintenance, vendors, turnovers, tasks, and notes/documents.
- Field types are documented.
- Linked-record relationships are either created in Airtable or clearly documented for manual conversion.
- The prototype includes at least one maintenance intake example and one turnover example.
- Codex can read back the prototype base through MCP, or the failure reason is documented in `mcp-setup.md`.
- Workflows clearly show where automations and AI fit.
- The spec avoids pretending Duncan is an Airtable expert.
- The output helps Duncan ask better discovery questions on the call.
- The demo script explains MCP/Codex without overclaiming what is production-ready.

## Meeting Prep Questions

Ask Alex:

1. "Can you walk me through the system from one property to one unit to one tenant?"
2. "What tables do you already have?"
3. "Where are you using linked records, and where is it getting messy?"
4. "What is still happening outside Airtable?"
5. "What are the top three workflows you want fixed first?"
6. "Who besides you needs to use this?"
7. "What decisions are you hoping Claude makes versus just drafts/summarizes?"
8. "What would make this useful in the next two weeks?"
9. "What would make it robust enough for the next six months?"

## Pricing Position For This Lead

Do not quote a full build before seeing his base.

Suggested next step:

```text
Paid Airtable/AI workflow review: $500-$750 fixed fee.
```

Includes:

- walkthrough of current Airtable base
- workflow map
- quick schema critique
- automation/AI opportunity list
- recommended first implementation phase
- build estimate

Implementation after the review can be hourly or phased:

```text
$125-$175/hr
```

or:

```text
Phase 1 fixed scope: $1,500-$3,000
```

Position this as business workflow and AI systems work, not pure Airtable expert work.
