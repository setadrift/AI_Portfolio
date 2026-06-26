# Alex Parker Turn Repair Capture Spec

Date: 2026-06-25
Meeting: 2026-06-26 at 10:00 AM
Branch: `feat/turn-repair-capture`

## Purpose

Alex sent detailed notes on his turn repair workflow after spending two days cataloging repairs in Airtable. This spec turns that feedback into a practical implementation plan, with a clear split between what can reasonably be prepared before tomorrow morning's call and what should remain Phase 2/live-scope discussion.

## Implementation Status

Implemented in this branch:

- private Alex portal command center at `/portal/alex/turn-repairs`;
- field capture with property/session/photo/notes fields;
- dedicated sandbox capture session and capture item staging;
- nightly review with edit, skip, and promote actions;
- phone work views for material shopping, contractor walkthroughs/calls, completion checklist, quick notes/sketch uploads, and maintenance closeout review;
- schedule / next-action risk view;
- contractor share preview with email draft, share log, signed read-only link, and print/save-PDF route;
- least-privilege helper upload links via optional helper tokens;
- Blob photo paths organized by property/date/session when Blob storage is configured.

Still intentionally not implemented:

- live-base write mode outside the sandbox/review-first flow;
- automatic Google Photos/Drive folder switching;
- unattended contractor email sending;
- accounting-grade receipt reconciliation;
- automated security deposit decisions.

## Evidence Reviewed

- Alex's latest email in the `Phase 1 sandbox package ready to test` Gmail thread.
- Attached/pasted `Turn Repair System - 6.25.26` notes.
- Existing Phase 1 handoff email, which explicitly said the package was sandbox/review-first and did not write to live Airtable.
- Existing repo docs:
  - `docs/alex-parker-turn-repairs-live-preview-spec.md`
  - `docs/alex-parker-demo-readiness-assessment.md`
- Airtable MCP read-only/current-state checks for:
  - live base `Rental Property Matrix` (`app2KyW4e15ghRQDZ`)
  - sandbox base `Rental Property Matrix - Phase 1 Sandbox - 2026-06-16` (`appRB4L3wVfpN9tIb`)
  - `Turn Repairs` table `tblRd922G2nOlmlmO`
  - existing sandbox interface `Property Overview / Property Hub - Turn Repairs`
- Current portal code under `src/app/portal/alex`.

## Current Scope Boundary

This is still Phase 1 closeout / pre-call preparation unless Alex explicitly approves more live work.

Already agreed / safe:

- Review-first sandbox workflows.
- Refreshed sandbox Turn Repairs preview using current repair records.
- Portal prototypes that demonstrate receipt extraction and Gmail sweep concepts.
- No live Airtable writes unless explicitly approved.
- No unattended Gmail automation.
- No accounting-grade receipt/expense automation.

Not yet agreed:

- Live Turn Repairs edit/write surfaces outside Airtable.
- Automated photo routing into property/date folders.
- Contractor email/export workflow.
- Automatic promotion from Turn Repairs to Maintenance History.
- Phone-based bulk material purchasing workflow.
- Helper/contractor upload portal.
- HVAC filter tracker and simplified receipt tracker, which Alex mentioned as separate small items for discussion.

## What Alex's Attachment Entails

Alex is describing a complete turn-season operating system for 38 move-outs and 39 move-ins across 13 houses before August 12, 2026.

The requested workflow has four major parts:

1. Capture initial repair information
   - Walk each house.
   - Take photos on his phone.
   - Enter repair rows in Airtable from a computer because the Airtable app was too slow and unreliable in the field.
   - Improve photo organization so photos can be recovered later by property and date.
   - Eventually support helpers uploading inspection photos.

2. Keep repair information updated
   - Use Airtable as the high-level living turn repair list.
   - Keep detailed day-to-day notes, pricing, sketches, and contractor conversations in his Tul paper organizer.
   - Reconcile only important notes back into Airtable nightly.
   - Support limited phone updates for materials, purchased material status, quick notes, and photos of drawings.

3. View and use the data from his phone
   - Use a material list while buying supplies.
   - Walk a contractor through repairs at a property.
   - Filter items by contractor during calls.
   - Use the list as a completion checklist at night.
   - Update completed status from the phone.
   - Improve the sandbox Turn Repairs interface with property, contractor, and area filters; better layout than a linear scroll; a better field order; no `Status` column in active results; and photo support in detail view.

4. Share the data with others
   - Email contractors a clean view-only list of the repairs they just reviewed.
   - Present the list professionally so Alex looks organized and reduces contractor pricing friction.
   - Contractors should not be able to edit the work list.

## Scope Assessment

The attachment is mostly in-scope as the next phase of the Airtable/property workflow, but not all of it is in-scope for the pre-call Phase 1 closeout.

In scope for tomorrow's call:

- Turn Repairs interface improvements.
- Field order and filter changes.
- Material list and purchased-material phone workflow.
- Contractor-specific views or filtered lists.
- Photo/detail-view expectations.
- Confirming whether the sandbox preview is useful enough to move toward a live interface.
- Deciding which parts should be built in Airtable versus the private portal.

Likely in scope for a paid Phase 2 implementation:

- Live Airtable interface/view rollout once Alex approves live changes.
- Mobile-friendly Turn Repairs command center.
- Contractor-specific read-only export/share flow.
- Material shopping view.
- Nightly review/cleanup workflow.
- End-of-turn promotion from Turn Repairs to Maintenance History with review gates.
- Simplified HVAC filter tracker and receipt tracker after clarifying requirements.

Out of current scope unless explicitly approved:

- Fully automated Google Photos/Drive folder routing from a phone "alert" state.
- Production helper upload portal.
- Contractor email automation that sends without Alex review.
- Accounting-grade receipt reconciliation.
- Security deposit withholding automation.
- Any live data mutation without a clear approval step.

## Pre-Call Implementation Recommendation

The highest-value work before the 10 AM call is not a broad automation build. It is a focused "Turn Repairs Operating Review" surface that makes Alex's feedback easier to inspect and discuss.

Build only if time allows before the call:

1. Add a private portal page at `/portal/alex/turn-repairs`.
2. Keep it review-first and non-mutating by default.
3. Show the current workflow design, not a fake live tool:
   - recommended active repair field order;
   - filter model: property, contractor, area, material status;
   - mobile use cases;
   - contractor share requirements;
   - out-of-scope items requiring approval.
4. Link it from the Alex portal home and nav.
5. Use it as call prep so Alex can react to the intended workflow before live Airtable changes are made.

This is safer than rushing a live write-capable tool because the Phase 1 promise was that nothing writes to live without approval, and the current Airtable interface-edit access is still the limiting factor for live interface changes.

## Proposed User Experience

### Portal Page: Turn Repairs

Page title: `Turn Repairs operating plan`

Primary sections:

- `Current pressure`: 38 move-outs, 39 move-ins, 13 houses, final scheduled move-in on 2026-08-12.
- `Working list`: the global Airtable repair list per property.
- `Capture workflow`: phone photos plus computer entry for accurate repair rows.
- `Phone workflow`: materials, purchased status, quick notes, photos of sketches, completion checks.
- `Contractor workflow`: filtered view-only list by property and contractor.
- `Implementation decisions for tomorrow`: specific questions to answer on the call.

The page should avoid pretending to be the final working interface. Its job is to make the call sharper.

### Product Direction: Turn Repair Command Center

The right product shape is not "make Airtable mobile better." Airtable remains the source of truth and desktop management layer, while the private portal becomes a mobile-first operating surface for the moments where Airtable mobile is failing Alex in the field.

The portal should support five modes that map directly to Alex's document:

1. `Capture`: walk a property, take/upload photos, add quick repair notes, and create staged Turn Repairs items.
2. `Update`: reconcile important field notes, purchased materials, contractor assignments, and completion status back into Airtable.
3. `Schedule`: keep track of who is doing the work, target dates, move-in deadlines, and next actions.
4. `Use`: open practical phone views for material shopping, contractor walkthroughs, contractor calls, and end-of-night completion checks.
5. `Share`: generate a clean contractor-facing view-only list after Alex walks a property with a contractor.

This mirrors the receipt tracker architecture already built in the portal:

- collect messy field input in a simple portal UI;
- normalize it into structured data;
- show an approval/review step;
- write only to the sandbox or approved Airtable destination;
- never mutate live operational records without explicit approval.

For the demo, describe it as:

> Airtable is still the database. The portal is the field tool. It gives you a reliable phone experience for capture, scheduling, updates, shopping, walkthroughs, and contractor sharing, then pushes structured data back into Airtable.

### Portal Page: Field Capture

Recommended route: `/portal/alex/turn-repairs/capture`

Primary job: create a reliable, low-friction phone workflow for walking a property when Airtable mobile is too slow or unreliable.

Workflow:

1. Alex opens the capture page on his phone.
2. He selects `Property` once.
3. He starts a `Capture Session`.
4. Optional session fields:
   - date/time, defaulting to now;
   - inspection type, e.g. initial turn inspection, contractor walkthrough, helper inspection, end-of-day review;
   - area/location, if he is working room by room;
   - contractor, if he is walking with a specific person.
5. He uploads or takes photos directly from the phone.
6. He can add lightweight context:
   - repair title, optional;
   - area/location;
   - quick notes;
   - materials needed;
   - material status;
   - priority/major item flag;
   - contractor;
   - whether the item should become a Turn Repairs row now or remain in review.
7. The portal creates a staged review item, not an irreversible live record by default.
8. From desktop later, Alex can review the staged items and approve promotion into the real Turn Repairs list.

Field-capture design rule:

- Choose shared context once per session.
- Avoid forcing a title for every photo while walking.
- Let Alex batch photos and clean up descriptions later.
- Make the "capture now, clean up later" path fast enough for poor service and stressful field work.

### Portal Page: Nightly Review

Recommended route: `/portal/alex/turn-repairs/review`

Primary job: turn messy capture sessions into a useful Airtable operating list at the end of the day.

Workflow:

1. Show staged capture sessions grouped by property/date.
2. Within each session, show photos, quick notes, proposed repair rows, and missing fields.
3. Allow Alex to edit:
   - repair description;
   - area/location;
   - contractor;
   - materials needed;
   - material status;
   - priority/major item;
   - notes;
   - whether multiple photos belong to one repair item or separate items.
4. Promote selected items into `Turn Repairs`.
5. Mark staged items as promoted, skipped, or needs more detail.
6. Preserve source capture metadata so photos/notes remain traceable back to property/date/session.

This is the key safety layer. It prevents a fast phone capture from polluting the main Turn Repairs list with partial or duplicate rows.

### Portal Page: Mobile Work Views

Recommended route: `/portal/alex/turn-repairs/work`

Primary job: give Alex fast phone views for the exact field moments listed in his document.

Required views:

1. `Material Shopping`
   - Filter: active repairs where `Material Status = Need to Buy`, or `Materials Needed` is not empty and not purchased.
   - Group by property, then area.
   - Allow quick update from `Need to Buy` to `Purchased`.
   - Keep the action one tap plus confirmation because this is the single most important phone update Alex called out.

2. `Contractor Walkthrough`
   - Filter by property and contractor.
   - Show repair, area, notes, materials, major item flag, and photos.
   - Keep the screen readable while walking a house.
   - Avoid horizontal table scrolling.

3. `Contractor Call`
   - Same data as walkthrough, but optimized for quickly answering "what work did we discuss?"
   - Default to contractor filter first, then property.

4. `Completion Checklist`
   - Filter by property.
   - Show active/open items only.
   - Allow marking `Done` from the phone.
   - Keep completion update review-friendly: either write to sandbox/approved live data if authorized, or stage a completion update for approval.

5. `Quick Note / Sketch Upload`
   - Attach a note or photo of Tul notes/sketches to an existing Turn Repairs item or a capture session.
   - Do not attempt automatic extraction from Tul notes in v1.
   - Store the image and optional note so Alex can find it later.

### Portal Page: Schedule / Next Actions

Recommended route: `/portal/alex/turn-repairs/schedule`

Primary job: cover the "who is doing it, when, and what has to happen before move-in" part of Alex's operating system.

Required views:

1. `Property Turn Timeline`
   - Show each property with move-out date, target repair window, and move-in date when available.
   - Highlight properties with the tightest deadline.
   - Show active repair count, major-item count, and material-needed count.

2. `Contractor Schedule`
   - Group active repairs by contractor.
   - Show property, area, repair, priority/major item, and target date.
   - Identify unassigned items that need a contractor decision.

3. `Next Action Queue`
   - Show items waiting on:
     - Alex decision;
     - contractor quote;
     - material purchase;
     - scheduled work;
     - completion check;
     - photo/documentation follow-up.

4. `Deadline Risk`
   - Flag repairs attached to properties with upcoming move-ins.
   - Flag major items with no contractor or target date.
   - Flag material-needed items not yet purchased.

V1 scheduling fields can live in Airtable as simple editable fields:

- `Target Date`
- `Scheduled Date`
- `Next Action`
- `Waiting On`
- `Move-In Deadline`
- `Major Item`

If those fields do not exist yet, treat them as proposed Phase 2 schema additions rather than forcing them into the current closeout pass.

### Portal Page: Contractor Share

Recommended route: `/portal/alex/turn-repairs/share`

Primary job: generate a professional read-only list of repair items after Alex walks a property with a contractor.

Workflow:

1. Alex selects property.
2. Alex selects contractor.
3. Portal previews the filtered list.
4. Alex can remove unrelated items before sharing.
5. Portal generates one of:
   - read-only web page;
   - PDF;
   - email draft;
   - Airtable shared view fallback.
6. Alex reviews before sending.
7. Contractor receives view-only access and cannot edit Airtable.

Contractor-facing fields:

- Property name/address.
- Area/location.
- Repair.
- Notes.
- Materials needed, if relevant.
- Photos, if approved for sharing.
- Optional priority/major item indicator.

Do not expose:

- security-deposit notes;
- internal pricing notes;
- owner/accounting notes;
- unrelated properties;
- edit controls;
- full Airtable base access.

### Photo Storage Model

Alex's Google Photos folder-switching idea should be treated as a desired outcome, not the first implementation path. Automatically changing Google Photos destinations based on a house "alert" is likely brittle and outside the fastest reliable build.

Recommended v1:

- Upload photos through the portal.
- Attach them to a capture session and/or staged Turn Repairs item.
- Store metadata:
  - property;
  - date;
  - session;
  - area/location;
  - uploaded by;
  - created at;
  - related Turn Repairs record, once promoted.
- Display photos from the capture session and final Turn Repairs item.

Storage options:

1. `Airtable attachments only`
   - Fastest to implement.
   - Simple for Alex because everything is in Airtable.
   - Risk: attachment handling and exports are less flexible long term.

2. `Blob/storage plus Airtable links`
   - Better long-term archive by property/date/session.
   - Portal uploads image to storage, then Airtable stores URL and metadata.
   - Better for helper uploads and contractor sharing.

Recommendation:

- Start with Airtable attachment or existing portal storage for v1.
- Design the schema so storage can later move to organized Blob/Drive folders without changing the user workflow.

### Helper Upload Extension

Helper uploads should be a later extension of the same capture system.

V1 helper rules:

- Helper-specific login or upload link.
- Helper can only select assigned property/session.
- Helper can upload photos and notes.
- Helper cannot see full Airtable data.
- Helper cannot mark items done unless explicitly allowed.
- Everything lands in review before affecting Turn Repairs.

This is safer than adding helpers directly to Airtable.

### Airtable Data Model

Keep `Turn Repairs` as the final operating table.

Existing relevant fields:

- `Repair`
- `Property`
- `Area / Location`
- `Priority`
- `Status`
- `Contractor`
- `Material Status`
- `SD Issue`
- `Notes`
- `Materials Needed`
- `Photos`

Recommended Turn Repairs scheduling fields, if approved:

- `Target Date`
- `Scheduled Date`
- `Next Action`
- `Waiting On`
- `Move-In Deadline`
- `Major Item`

Recommended new or staged tables:

1. `Turn Repair Capture Sessions`
   - `Session Name`
   - `Property`
   - `Session Date`
   - `Session Type`
   - `Default Area / Location`
   - `Default Contractor`
   - `Uploaded By`
   - `Status`: Draft, Needs Review, Reviewed, Promoted, Archived
   - `Session Notes`
   - `Source`: Portal, Helper Upload, Manual

2. `Turn Repair Capture Items`
   - `Capture Session`
   - `Property`
   - `Repair`
   - `Area / Location`
   - `Contractor`
   - `Notes`
   - `Materials Needed`
   - `Material Status`
   - `Priority / Major Item`
   - `Target Date`
   - `Next Action`
   - `Waiting On`
   - `Photos`
   - `Source Photo Count`
   - `Review Status`: Needs Review, Approved, Promoted, Skipped, Duplicate
   - `Promoted Turn Repair`
   - `Created From`
   - `Uploaded By`

3. Optional `Contractor Share Logs`
   - `Property`
   - `Contractor`
   - `Shared Items`
   - `Share Type`: Link, PDF, Email Draft
   - `Shared At`
   - `Shared By`
   - `Notes`

If adding new Airtable tables is too much for the closeout pass, use the existing Gmail/AI review queue pattern as a temporary staging table, but a dedicated capture table is cleaner for Phase 2.

### Airtable API Pattern

Reuse the receipt tracker pattern currently implemented in:

- `src/app/portal/alex/receipts/ReceiptExtractionDemo.tsx`
- `src/app/api/portal/alex/receipts/create-review/route.ts`
- `src/app/api/portal/alex/receipts/promote/route.ts`
- `src/app/api/portal/alex/receipts/properties/route.ts`
- `src/lib/portal/alex/airtable-review-queue.ts`

Equivalent Turn Repairs endpoints:

1. `GET /api/portal/alex/turn-repairs/properties`
   - List properties for dropdowns.
   - Reuse `listSandboxProperties()` initially.

2. `POST /api/portal/alex/turn-repairs/capture-sessions`
   - Create a capture session.
   - Store default property/date/session metadata.

3. `POST /api/portal/alex/turn-repairs/capture-items`
   - Create staged capture item(s).
   - Accept multipart form data for photo uploads.
   - Attach photos to the capture item or upload to storage first and store URLs.

4. `GET /api/portal/alex/turn-repairs/review`
   - Return staged capture sessions/items grouped by property/date.

5. `POST /api/portal/alex/turn-repairs/promote`
   - Promote approved capture item into `Turn Repairs`.
   - Same safety style as receipt `promote`: validate record IDs, validate property exists, create downstream record, update staged record with related record ID and processed timestamp.

6. `POST /api/portal/alex/turn-repairs/quick-update`
   - Stage or apply approved quick updates:
     - material purchased;
     - status done;
     - target/scheduled date;
     - next action / waiting on;
     - quick note;
     - sketch/photo upload.

7. `POST /api/portal/alex/turn-repairs/share-preview`
   - Build contractor-facing preview for selected property/contractor.

8. `POST /api/portal/alex/turn-repairs/share-log`
   - After Alex sends/exports, record what was shared.

Security rule:

- All routes require `requireAlexPortalSession()`.
- Live Airtable writes must be disabled unless a separate live-write env flag is enabled and Alex has explicitly approved the behavior.
- Default implementation writes only to sandbox/staging.

### Field Mapping: Capture Item To Turn Repairs

Promotion should map staged fields into `Turn Repairs` as follows:

- `Repair` <- reviewed repair title/description.
- `Property` <- selected property record.
- `Area / Location` <- reviewed area.
- `Contractor` <- selected contractor, if known.
- `Notes` <- reviewed notes plus source session/date.
- `Material Status` <- selected material status.
- `Materials Needed` <- reviewed materials list.
- `Priority` <- selected priority or major item signal.
- `Target Date` <- reviewed target date, if field exists.
- `Next Action` <- reviewed next action, if field exists.
- `Waiting On` <- reviewed waiting-on value, if field exists.
- `Photos` <- attached/uploaded photos.
- `Status` <- blank/Open by default unless explicitly set.

Append source metadata to notes:

```text
[YYYY-MM-DD Portal capture]
Session: Initial turn inspection
Source: Alex mobile portal
Notes: ...
```

Do not overwrite existing notes during quick updates. Append dated summaries.

### Offline / Poor-Service Behavior

Alex specifically said service was bad and Airtable mobile caused false closeouts. The portal should account for unreliable field conditions.

V1 minimum:

- Keep form state in browser while the page is open.
- Disable double-submit while upload is in progress.
- Show clear upload success/failure state.
- Never mark a repair closed from a background or accidental event.
- Completion updates require an explicit tap and confirmation.

Future enhancement:

- Local draft storage using `localStorage` or IndexedDB.
- Retry queue for uploads that fail due to service.
- "Unsynced drafts" banner.

### Demo Flow For Alex

Use this demo script if showing the proposed build live:

1. Open the refreshed Airtable `Property Hub - Turn Repairs` interface.
2. Show current records and the filters/views already prepared.
3. Explain the gap:
   - "This is good for managing the list, but your notes show Airtable mobile is not the right capture surface."
4. Open the private Alex portal.
5. Show the existing receipt extraction flow as the pattern:
   - messy input;
   - structured review;
   - sandbox write after approval.
6. Present the Turn Repair Command Center spec:
   - Capture;
   - Update;
   - Schedule;
   - Use;
   - Share.
7. Walk one hypothetical example:
   - select `125 Westridge Dr`;
   - start `Initial turn inspection`;
   - upload three kitchen photos;
   - add note "scrape and paint kitchen wall";
   - review later from desktop;
   - promote to `Turn Repairs`;
   - assign contractor and target date;
   - use the material shopping view;
   - generate contractor list.
8. Ask Alex to validate:
   - should capture create draft rows immediately or a review queue only?
   - are photos grouped by property/date enough for now?
   - should contractor sharing be PDF, email draft, or view-only link first?

### Demo Framing

Use this wording:

> I would not try to force the Airtable mobile app to be the field tool. Airtable should stay the source of truth, but the field layer should be a small mobile portal built around how you actually walk houses: pick a property, capture photos and quick notes, then review/promote the useful items into Turn Repairs later. The same pattern can support scheduling, materials, contractor walkthroughs, end-of-night completion checks, and eventually helper uploads.

### Closeout vs Next Phase

Reasonable closeout items:

- Document this implementation direction.
- Clean up the Airtable Turn Repairs interface and views.
- Confirm field order, filters, and active/material/contractor/checklist views.
- Use the receipt tracker as the proof that portal-to-Airtable review-first writeback is feasible.

Next phase items:

- Build `/portal/alex/turn-repairs/capture`.
- Build capture session/item staging tables.
- Add photo upload handling.
- Add nightly review/promote UI.
- Add scheduling / next-action fields and views.
- Add mobile material/status/checklist work views.
- Add contractor share preview/export.
- Add helper upload permissions.
- Add live-write mode after sandbox approval.

### Airtable Interface Direction

For the Turn Repairs list/detail view, use this display order:

1. `Repair`
2. `Area` / `Area / Location`
3. `Contractor`
4. `Notes`
5. `Material Status`
6. `Materials Needed`
7. `Priority` / major item signal
8. `Photos`
9. `Property`

For active working views:

- Filter to repairs where `Repair` is not empty.
- Exclude `Done` records.
- Keep blank statuses visible because current records can have blank `Status`.
- Prefer not to show `Status` in the main active list if all active results are implicitly open.
- Allow status editing from detail/mobile checklist view.

Recommended controls:

- Property filter.
- Contractor filter.
- Area filter.
- Material Status filter.
- Search.
- Detail panel with photos.

### Phone Workflow

Minimum viable phone workflow:

- View open repairs by property.
- Filter by contractor.
- Filter to `Material Status = Need to Buy`.
- Update `Material Status` from `Need to Buy` to `Purchased`.
- Mark item `Done`.
- Add a short note.
- Open photos/detail without horizontal hunting.

Do not build a complex mobile data-entry system yet. Alex already found the Airtable app too slow for initial capture, and his preferred capture path is phone photos first, computer entry later.

### Contractor Share Workflow

Minimum viable contractor share:

- Filter records by property and contractor.
- Generate a clean read-only list with:
  - repair
  - area
  - notes
  - materials needed
  - photos if available
- Send only after Alex reviews.
- Contractors cannot edit.

This can start as a manual Airtable shared view/export process. Automating contractor emails should be a later step after the list format is approved.

## Implementation Phases

### Phase A: Before Tomorrow Morning

Goal: improve call readiness without changing live operational data.

Deliverables:

- This implementation spec.
- Optional private portal `Turn Repairs operating plan` page.
- Clear call agenda and scope boundary.
- If using Airtable in the call, continue using the refreshed sandbox Turn Repairs preview.

Acceptance criteria:

- Duncan can explain what Alex asked for in under two minutes.
- Duncan can distinguish quick interface changes from larger automation asks.
- Duncan has a recommended pre-call demo order.
- No live records are changed.

### Phase B: Closeout Pass, If Approved

Goal: make the Turn Repairs interface field-ready and confirm the portal command-center direction without building the full Phase 2 tool yet.

Deliverables:

- Live or sandbox-approved Turn Repairs interface/view update.
- Property, contractor, area, and material-status controls.
- Active/open item view.
- Material shopping view.
- Contractor review view.
- Completion checklist view.
- Field order adjusted to Alex's requested order.
- A short implementation decision recap for the Turn Repair Command Center:
  - capture session model;
  - nightly review/promote model;
  - scheduling / next-action model;
  - mobile material/status/checklist model;
  - contractor share format;
  - photo storage choice for v1.

Acceptance criteria:

- Alex can open one property, filter its active repairs, and walk a contractor through them.
- Alex can pull a material list while shopping.
- Alex can mark purchased materials and completed work from his phone.
- Photos are visible in record detail.
- Alex has approved which portal modules belong in the next paid phase, if any.

### Phase C: Turn Repair Command Center

Goal: build the reliable mobile layer that Airtable mobile is not providing, without introducing risky automation.

Candidate deliverables:

- Field capture page with property/session/photo/notes flow.
- Staged capture tables or review queue.
- Nightly review and promotion UI.
- Mobile material shopping view.
- Schedule / next-action view.
- Mobile contractor walkthrough/call view.
- Mobile completion checklist.
- Quick note / Tul sketch upload.
- Contractor read-only email/export generator.
- Photo archive by property/date/session.
- Helper upload workflow with limited permissions.
- End-of-turn promotion to Maintenance History with manual approval.

Acceptance criteria:

- Every automation has a review/approval gate.
- Contractors/helpers get least-privilege access.
- Alex can capture photos/notes in the field without using Airtable mobile.
- Alex can review and promote staged capture items into Turn Repairs from desktop.
- Alex can see which repairs are unassigned, unscheduled, or deadline-risk items.
- Alex can update purchased material status and completion status from phone.
- Alex can generate a contractor-facing list without giving edit access.
- No financial/accounting records are created without review.
- No security deposit decisions are automated.

### Phase D: Adjacent Operations

Goal: extend the same review-first pattern into adjacent property workflows after the Turn Repairs workflow is stable.

Candidate deliverables:

- Receipt tracker connected to approved receipt extraction.
- HVAC filter tracking using Assets or Scheduled Services.
- Maintenance History promotion workflow.
- Google Drive/Photos archive integration, if the v1 portal upload model is not enough.
- More advanced Tul notes/photo extraction experiment.

## Call Agenda

1. Confirm the five-part workflow: capture, update, schedule, use from phone, share with contractors.
2. Review the refreshed sandbox Turn Repairs interface against his real current data.
3. Demo the existing receipt tracker as the Airtable review/writeback pattern for a future portal build.
4. Decide the active item layout:
   - field order;
   - whether `Status` should be hidden from active list;
   - detail view photo placement.
5. Decide filters:
   - property;
   - contractor;
   - area;
   - material status.
6. Decide which phone problems should move to the portal instead of Airtable mobile:
   - photo capture;
   - scheduling / next action;
   - material purchased update;
   - contractor walkthrough;
   - completion checklist;
   - quick note/sketch upload.
7. Discuss contractor list format and whether manual export is acceptable for v1.
8. Park larger items:
   - photo folder automation;
   - helper upload;
   - receipt tracker;
   - HVAC filter tracker;
   - Maintenance History promotion.

## Recommended Framing For Alex

Use this framing on the call:

> Your notes are pointing to the Turn Repairs list becoming the operating center for turn season. The cleanest first step is not to automate everything. It is to make the active repair list easy to filter by property, contractor, area, and materials, and make the phone workflow good enough for shopping, contractor walks, and end-of-day completion checks. Then we can add contractor sharing and photo/archive automation after we agree on the working view.

## Key Questions To Ask Alex

- When you say `Major Item`, should that be a new checkbox, a `Priority` option, or both?
- Should blank `Contractor` mean `Alex / unassigned`, or should we add an explicit `Unassigned` choice?
- Should `Status` stay simple: blank/Open, In Progress, Done?
- Should `Purchased` automatically remove an item from the shopping list, or should there be a separate `Still Need` checkbox?
- Does he need explicit `Target Date`, `Scheduled Date`, `Next Action`, and `Waiting On` fields, or is contractor/status enough for this turn season?
- Should move-in dates drive repair urgency at the property level?
- For contractor lists, do you want one list per property, one list per contractor, or property + contractor together?
- Are contractors expected to see photos, or only the text list?
- Is the photo-folder problem urgent for this turn season, or can it wait until after the interface is working?
- For helper uploads, are helpers uploading only photos, or photos plus repair descriptions?

## Alex Document Coverage Checklist

This spec covers the full pasted document, not only the initial capture section.

### 1. Capture Initial Info

Alex need:

- walk house;
- take photos on phone;
- avoid slow Airtable mobile capture;
- enter structured repair data;
- organize photos by property/date;
- eventually let helpers upload photos.

Spec coverage:

- `Field Capture` portal page.
- Capture sessions by property/date/session type.
- Batch photo upload.
- Optional repair title/notes/materials/contractor fields.
- Staged review before promotion to `Turn Repairs`.
- Photo storage model.
- Helper upload extension.

### 2. Update The Info

Alex need:

- keep Airtable as the global high-level list;
- continue using Tul organizer for detailed field thinking;
- reconcile important notes nightly;
- update materials, purchased status, sketches/photos, and quick notes from phone.

Spec coverage:

- `Nightly Review` portal page.
- Review/promote model based on the receipt tracker.
- `Quick Note / Sketch Upload`.
- `quick-update` API endpoint for material purchased, status, notes, and photos.
- Append-only notes rule so existing Airtable notes are not overwritten.

### 2.5. Schedule / Coordinate The Work

Alex need:

- know who is doing the repair;
- know when it needs to happen;
- coordinate work before move-in deadlines;
- identify unassigned or waiting-on items.

Spec coverage:

- `Schedule / Next Actions` portal page.
- Proposed scheduling fields: `Target Date`, `Scheduled Date`, `Next Action`, `Waiting On`, `Move-In Deadline`, `Major Item`.
- Contractor schedule view.
- Deadline risk view.
- Quick-update API support for target/scheduled date and next action.

### 3. View Info From Phone

Alex need:

- material list while shopping;
- contractor walkthrough list;
- filter by contractor during calls;
- completion checklist at night;
- update completed status from phone;
- avoid bad linear Airtable mobile experience;
- add property/contractor/area filters and better field order.

Spec coverage:

- `Mobile Work Views` portal page.
- `Material Shopping` view.
- `Contractor Walkthrough` view.
- `Contractor Call` view.
- `Completion Checklist` view.
- Airtable interface field order and filters.
- Poor-service safeguards and explicit confirmation for completion updates.

### 4. Share Info With Others

Alex need:

- deliver a clean contractor-facing list after the walkthrough;
- present himself as organized and efficient;
- prevent contractor edits.

Spec coverage:

- `Contractor Share` portal page.
- Share preview before sending.
- Read-only web page, PDF, email draft, or Airtable shared view fallback.
- Contractor-facing field list.
- Explicit exclusion list for private/internal fields.
- Contractor share log.

## Risk Notes

- Airtable interface creation/editing for the live base has previously been blocked by access level, even though table-level MCP edit access exists.
- Copying live data into sandbox creates a snapshot, not a live sync.
- Airtable attachment/photo copying can be incomplete because attachment URLs may not behave like a durable export/import.
- Building a custom portal with live writeback is possible, but it would cross the Phase 1 boundary unless Alex approves it.
- Google Photos/Drive folder routing from a phone alert state is likely not an Airtable-only solution; it may require Google Drive/Photos automation or a custom upload workflow.

## Bottom Line

Alex's attachment is a strong Phase 2 roadmap for the Turn Repairs system. The parts directly tied to the existing Phase 1 work are the Airtable interface layout, mobile working views, material tracking, and contractor-facing filtered lists. The photo storage, helper upload, contractor email automation, HVAC filter tracker, and receipt tracker are adjacent follow-ons that should be scoped separately after tomorrow's call.
