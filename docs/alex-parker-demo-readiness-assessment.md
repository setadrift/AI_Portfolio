# Alex Parker Demo Readiness Assessment

Date: 2026-06-25

## Bottom Line

The Phase 1 work is still demo-worthy, but the right demo order matters.

Demo first:

1. Sandbox Airtable `Property Hub - Turn Repairs`
2. Sandbox Airtable `Property Hub - Sandbox v2 / Property Review`
3. Portal receipt extraction
4. Gmail sweep setup / review-first workflow

Do not lead with old Gmail sweep writeback rows or old Expense demo rows. The Turn Repairs refresh replaced the stale sandbox `Turn Repairs` sample data with a current 116-record snapshot, which is good for tomorrow's review but invalidates some old sandbox record IDs referenced by last week's Gmail sweep demo rows.

## Current Airtable State

### Interfaces

Sandbox base: `appRB4L3wVfpN9tIb`

Available interfaces:

- `Property Overview`
  - page `Property Hub - Turn Repairs`
  - source table `Turn Repairs`
  - page ID `pagH3aVxhAAoMTUys`
- `Property Hub - Sandbox v2`
  - page `Property Review`
  - source table `Properties`
  - page ID `pagTtmtYUGiB1VxP5`

### Turn Repairs Refresh

Current sandbox `Turn Repairs` count: 116.

This is now a current-data preview based on the live `Turn Repairs` table. It includes current June 23-25 repair data and is much better for Alex's immediate ask than the old 8-record test sample.

Impact:

- The old 8 sandbox `Turn Repairs` rows were deleted.
- New sandbox `Turn Repairs` rows were created from live data.
- Old sandbox `Turn Repairs` record IDs referenced by older demo artifacts may no longer resolve.
- The property-centered v2 interface benefits from the refresh because its linked `Turn Repairs` section now points at the refreshed table.

### Gmail Review Queue

The sandbox `Gmail Review Queue` still exists and currently has demo/review rows.

Use it to explain the review-first pattern:

- AI/classifier puts uncertain items in a review queue.
- Clear operational updates can be proposed.
- User approves before any write.

Do not use it as proof that every old related-record link still works. Some older review rows reference old sandbox `Turn Repairs` record IDs that were removed during the refresh.

### Receipt Writeback Records

Verified sandbox `Maintenance History` demo row:

- Work: `Scrape and paint kitchen wall`
- Vendor: `The Home Depot`
- Property: `125 Westridge Dr`
- Cost: `$71.54`
- Created from Alex portal receipt review.

Known issue found during review:

- Older sandbox `Expenses` demo rows for a 125 Westridge receipt are linked to `117 Westridge Dr`.
- Root cause: the property suggestion matcher could prefer a shared-street-token result over the exact house number.
- Fix implemented locally: property matching now respects street numbers, so `117 Westridge Dr` cannot beat `125 Westridge Dr` when `125` is present in the query/context.

Demo implication:

- After the matcher fix is deployed, receipt extraction and review can be shown.
- Avoid showing the old Expense rows as evidence.
- If demonstrating writeback, use a fresh test after deploy or use `review_only` / Maintenance History path only.

## Current Portal State

Production URL:

- `https://www.duncananderson.ca/portal/alex`

Verified on 2026-06-25:

- Alex login returns 200.
- `/portal/alex` returns 200.
- `/portal/alex/receipts` returns 200.
- `/portal/alex/gmail-sweep` returns 200.
- Receipt extraction returns 200 when called with the same multipart/form-data shape the UI uses.
- Extraction correctly returns:
  - vendor `Home Depot`
  - date `2026-06-19`
  - amount `74.18`
  - property `125 Westridge Dr`
  - work description `Scrape and paint kitchen wall`
  - recommended destination `Maintenance History`
  - confidence `high`

Pending before full receipt writeback demo:

- Deploy the property matcher fix.
- Re-test `/api/portal/alex/receipts/properties` for `125 Westridge Dr`.
- If doing writeback live in the demo, create a fresh sandbox-only test row and delete/ignore it afterward.

## Recommended Demo Script

1. Open Airtable sandbox `Property Hub - Turn Repairs`.
   - Show that it now has the current repair list, not the stale sample data.
   - Search for current records:
     - `Condensate line broke`
     - `Possible water intrusion`
     - `Floor joists under LR`
     - `Price out Icynene upstairs bed`

2. Open `Property Hub - Sandbox v2 / Property Review`.
   - Frame it as the broader property-centered prototype.
   - Explain that this is the shape for starting from a property and seeing linked operational context.

3. Open the private portal.
   - Show the two prototype areas:
     - Receipt extraction
     - Gmail sweep setup

4. Demo receipt extraction without over-claiming.
   - Paste the Home Depot example.
   - Show the structured extraction.
   - Explain the approval/writeback concept.
   - Only promote into sandbox after the matcher fix is deployed and verified.

5. Demo Gmail sweep as a workflow pattern.
   - Show the skill/setup page.
   - Explain that this is review-first and not unattended Gmail automation.
   - Avoid claiming it is running on Alex's real Gmail.

## Client Framing

Use this framing with Alex:

> I refreshed the Turn Repairs sandbox interface with the real current repair list so we can review the interface against your actual field data. The broader property hub and the portal prototypes are still sandbox/review-first. Nothing is writing to your live base yet. The main thing I want your feedback on is which workflow surfaces feel useful enough to move toward live: the repair interface, the property-centered hub, the Gmail review pattern, or the receipt extraction/writeback flow.

## Scope Boundary

Still not live:

- No live Airtable writeback.
- No unattended Gmail automation.
- No production receipt storage.
- No automatic Turn Repairs material-status updates.
- No accounting-grade expense reconciliation.

Next best paid/live step:

- Recreate only the approved Airtable interface/view patterns in the live base.
- Keep Gmail and receipt workflows as separate follow-on scope unless Alex explicitly approves them.
