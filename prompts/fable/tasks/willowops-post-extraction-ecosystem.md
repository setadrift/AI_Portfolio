# Task: WillowOps Post-Extraction Ecosystem Revision

Design and implement a focused revision to the final post-extraction section of
the WillowOps prototype.

Use only the evidence packet for current code and context. Do not redesign the
whole page. Do not change the extraction API. Do not change the sample PDF or
upload flow.

Goal:
- After fields are extracted, make the final two areas explain how the reviewed
  data maps into Willow Grey's broader operating ecosystem.
- Keep the page minimal and interactive-first.
- Avoid heavy diagrams, compact workflow strips, extra dashboards, or
  over-explaining.
- Make the handoff feel practical for a luxury interior design and project
  management business: finance, project ops, design/procurement records, and
  central data decisions.

Current target area:
- The `Review queue` panel.
- The `Where the approved record could go` panel.

Supported public-site context:
- Willow Grey offers interior design plus project management.
- Their work includes design proposals, cost estimates, 2D/3D plans, full item
  specifications, furniture, lighting, flooring, soft furnishings, accessories,
  purchasing, supplier issues, out-of-stock items, damaged goods, coordinating
  trades, installation, and keeping clients informed.
- Treat supplier invoices, quotes, delivery notes, project cost sheets, and
  client notes as plausible admin sources.

Design intent:
- The reviewer should understand that approval is the control point before any
  system update.
- The reviewer should see that different extracted fields can route to
  different tools:
  - Finance / Xero
  - Project Ops / Monday.com
  - Design / Studio Designer or project cost sheet
  - Future central database when the canonical record is decided
- Do not imply any live writes are happening.
- Do not imply every system would be connected in the first pilot.
- Keep Monday.com framed as an operational destination, not necessarily the
  canonical database.

Specific copy direction:
- Rename `Review queue` to something closer to:
  `Human review before anything moves`
- Replace review state explanatory copy with language like:
  `A team member checks the extracted fields, fixes anything uncertain, then
  chooses where the approved record should go.`
- Button labels should be clearer and less demo-like:
  - `Approve record`
  - `Edit before sending`
  - `Reject extraction`
- Disabled buttons may remain disabled/visual-only if that keeps scope small,
  but avoid noisy parentheticals like `(visual only in this prototype)` in the
  button labels.
- Add a concise audit-trail line:
  `In a pilot, this review step would create the audit trail: who approved it,
  what changed, and where it was sent.`
- Rename `Where the approved record could go` to something closer to:
  `After approval, route it to the right system`
- Destination intro should explain:
  `Different records should land in different places. A supplier invoice might
  update Xero and a project cost sheet; a delivery note might update Monday.com
  or Studio Designer; a client note might become a task or follow-up.`
- Destination cards should be more ecosystem-specific:
  - `Finance / Xero`
    `Invoice number, supplier, amount, VAT, due date, and payment status.`
  - `Project Ops / Monday.com`
    `Follow-up owner, delivery or access dates, procurement status, and blockers.`
  - `Design / Studio Designer or cost sheet`
    `Item specs, supplier references, room, quantity, and project budget impact.`
- Keep or incorporate the existing caveat:
  `Monday.com can be a useful operational destination for reviewed records, but
  it is not necessarily the canonical database.`
- Add a concise pilot caveat:
  `The first pilot would not connect every system at once. It would prove one
  repeatable workflow, then map approved fields into the right destination.`

Hard constraints:
- Return an implementation for `src/app/willowops-prototype/ScenarioRunner.tsx`
  only.
- Preserve the existing extraction, upload, sample PDF, loading, result fields,
  missing fields, review warnings, technical appendix, and fallback behavior.
- Do not edit `page.tsx`.
- Do not edit `src/app/api/willowops/data-entry/extract/route.ts`.
- Do not add dependencies.
- Keep code ASCII-only.
- Keep TypeScript valid.
- Avoid nested cards inside cards if easy; if keeping the current card style,
  reduce visual weight where practical.
- Do not perform browser testing.

Output format:
- First return a short section:
  `IMPLEMENTATION SPEC`
  with 5-8 bullets explaining exactly how the final two boxes will change.
- Then return exactly one file section:
  `FILE: src/app/willowops-prototype/ScenarioRunner.tsx`
  followed by complete TypeScript/TSX contents in a code fence.
- Do not return a patch or diff.
- Do not include any other commentary.

Acceptance criteria:
- `Review queue` area clearly explains human approval as the control point.
- Review buttons read as real business actions, not demo internals.
- Destination area clearly maps approved fields into Willow Grey's likely
  ecosystem: Xero, Monday.com, Studio Designer/cost sheet, and future central
  record decisions.
- The copy remains concise and buyer-facing.
- No live-write claims are introduced.
- The existing paste/upload/sample PDF/extract flow remains intact.
- Technical JSON remains behind the existing collapsed technical section.
