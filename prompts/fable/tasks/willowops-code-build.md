# Task: WillowOps Prototype Full-File Code Build

Generate complete replacement source files for rebuilding the WillowOps
prototype page from the design-led build spec.

Use only the evidence packet for facts, existing code, routes, and data. Do not
invent live integrations. Do not add dependencies. Do not edit unrelated files.

Do not reference or preserve the existing prototype page design. The current
page implementation is intentionally not included in the packet. Build a fresh
page from the business goal, existing data contracts, and endpoint contracts.

Hard scope:
- Return replacement contents for `src/app/willowops-prototype/page.tsx`.
- Return replacement contents for `src/app/willowops-prototype/ScenarioRunner.tsx`.
- Do not edit `src/lib/willowops/prototype-data.ts`.
- Do not edit API routes.
- Do not delete routes or data exports.

Required behavior:
- Rebuild the page as a polished, minimal, buyer-facing, scroll-first demo.
- Show one workflow only: new enquiry -> AI discovery brief -> reviewed Outlook
  draft -> board update.
- Keep the page honest: simulated data, no live Monday.com or Outlook claims,
  no sending claims.
- Keep technical proof collapsed by default.
- Keep only two runnable proof scenarios: `Prepare discovery brief` and `Draft
  follow-up email`.
- Remove visible mentions of Studio Designer, Xero, WhatsApp, procurement,
  finance, source-of-truth tables, stack maps, 30-day plans, and broad platform
  language.

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
- Preserve the existing API paths for the two remaining scenarios.
- Avoid nested cards where possible.
- Use only existing Tailwind classes and standard React.
- Keep copy ASCII-only.
- It is acceptable to remove existing helper components and replace them with
  new local helpers in `page.tsx`.
- It is acceptable to rewrite `ScenarioRunner.tsx` substantially as long as the
  two proof routes still work.

Acceptance criteria the patch must satisfy:
- `page.tsx` renders exactly six buyer-facing sections: hero, four-step story,
  Reeves enquiry card, what this saves/safeguards, collapsed technical proof,
  closing CTA.
- `ScenarioRunner.tsx` renders exactly two buttons.
- The hero contains: `From new enquiry to a discovery brief -- without the admin
  in between.`
- The page includes a simulated-data disclaimer.
- The page includes `Follow-up email -- Draft, awaiting your approval`.
- The page includes `Draft and review only`.
- Visible copy does not include `Xero`, `Studio Designer`, or `WhatsApp`.
- Technical details remain behind `Developer response`.
