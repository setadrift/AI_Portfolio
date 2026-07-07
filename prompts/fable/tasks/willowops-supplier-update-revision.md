# Task: WillowOps Supplier Update Revision

Generate complete replacement source files that revise the current WillowOps
prototype from an enquiry/discovery demo into a safer supplier-update workflow
demo.

Use only the evidence packet for facts, existing code, routes, and data. Do not
invent live integrations. Do not add dependencies. Do not edit unrelated files.

This is a revision of the current implementation, but the new business scenario
is different. Preserve useful technical structure only where it helps. Do not
keep enquiry/discovery framing just because it exists in the current files.

Hard scope:
- Return replacement contents for `src/app/willowops-prototype/page.tsx`.
- Return replacement contents for `src/app/willowops-prototype/ScenarioRunner.tsx`.
- Do not edit `src/lib/willowops/prototype-data.ts`.
- Do not edit API routes.
- Do not delete routes or data exports.

New scenario:
- Supplier update -> project action -> reviewed supplier/client-safe draft ->
  board/project visibility.
- The business problem is boring and repeatable: supplier emails, delivery
  changes, missing status, and manual chasing across tools.
- The prototype should avoid assuming Willow Grey's enquiry intake process,
  sales process, design judgment, or client discovery questions.

Required behavior:
- Rebuild the page as a polished, minimal, buyer-facing, scroll-first demo.
- Show one workflow only: supplier update -> AI extracts project/item/action ->
  team reviews draft/chaser -> project board reflects the next action.
- Keep the page honest: simulated data, no live supplier inbox, Monday.com, or
  Outlook claims, no sending claims.
- Keep technical proof collapsed by default.
- Prefer one runnable proof scenario if only one existing endpoint maps cleanly.
- If using the existing Studio Designer import endpoint as technical proof,
  keep the visible framing as "supplier update / procurement review" rather
  than an integration claim.
- Visible copy may mention supplier updates, delivery dates, project action,
  review queue, Make.com, Monday.com, Outlook draft, and procurement chaser.
- Visible copy must not position the demo as a full procurement system or a live
  Studio Designer integration.

Output format:
- Return exactly two file sections and nothing else.
- Start the first section with:
  `FILE: src/app/willowops-prototype/page.tsx`
- Then provide the complete replacement contents for `page.tsx` in a
  TypeScript code fence.
- Start the second section with:
  `FILE: src/app/willowops-prototype/ScenarioRunner.tsx`
- Then provide the complete replacement contents for `ScenarioRunner.tsx` in a
  TypeScript code fence.
- Do not include commentary before, between, or after the two file sections.
- Do not return a patch or diff.
- Do not omit imports, helper components, types, or closing braces.

Code constraints:
- Keep TypeScript valid.
- Keep React server/client boundaries valid.
- Preserve existing API paths for whichever proof scenarios are used.
- Avoid nested cards where possible.
- Use only existing Tailwind classes and standard React.
- Keep copy ASCII-only.
- It is acceptable to remove existing helper components and replace them with
  new local helpers in `page.tsx`.
- It is acceptable to rewrite `ScenarioRunner.tsx` substantially.

Acceptance criteria:
- The page headline clearly communicates a supplier-update/admin scenario, not
  enquiry discovery.
- The first viewport makes the value obvious in under 10 seconds.
- The visible demo is one workflow only.
- The page includes a simulated-data disclaimer.
- The page includes human review / draft-only language.
- Technical proof stays behind `Developer response`.
- No visible copy claims live integrations.
- The implementation does not require data-file or API-route edits.
