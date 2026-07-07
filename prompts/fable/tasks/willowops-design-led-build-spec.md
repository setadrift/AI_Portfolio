# Task: WillowOps Design-Led Build Spec

Create a build-ready redesign spec for the WillowOps follow-up prototype.

Use only the evidence packet for facts, data, routes, and constraints. Do not
write code. Do not assume live integrations. Do not preserve the current visual
design, layout, or component hierarchy unless it genuinely serves the buyer.

The existing prototype is raw material, not a design target.

Context:
- The selected demo is one story: new enquiry -> AI discovery brief -> reviewed
  Outlook draft -> board update.
- The audience is Lucy Howson and Willow Grey leadership after an interview
  about disconnected tools and manual admin.
- The goal is a follow-up artifact that feels sharp, simple, credible, and
  commercially useful.
- The current prototype is too internal-facing, text-heavy, and scattered.
- The implementation must remain technically honest: simulated data, local mock
  endpoints, no claims of live Monday.com or Outlook connectivity.

Design freedom:
- You may redesign the page structure, visual hierarchy, interaction model,
  copy, and component composition.
- You may recommend replacing the current card/table/panel structure.
- You may recommend a more editorial, product-demo, or workflow-story layout if
  it serves the buyer.
- You must keep the scope narrow: one workflow only.

Decision question:

What exact design-led implementation spec should Codex follow to rebuild the
prototype into a polished, minimal, buyer-facing demo that Lucy could understand
in under 60 seconds?

Required output, in this order:

Design thesis:
- 4-6 sentences.
- State what the page should feel like.
- State what the current design should stop doing.
- State the one thing the reader should remember.

Final experience:
- Describe the page from top to bottom.
- Include the first viewport, main demo area, technical proof area, and closing.
- Be specific about layout, density, spacing, and hierarchy.

Interaction model:
- Define the primary interaction or walkthrough.
- Say whether the demo should be scroll-first, click-through, stepper-based, or
  something else.
- State what changes on interaction and what remains static.
- State how the two local endpoints should appear, if at all.

Copy system:
- Final headline.
- Final subheadline.
- Section labels.
- Microcopy for simulated data and human approval.
- Button/control labels.
- One follow-up-email framing line that matches the page.

Data and content mapping:
- Map each visible area to existing packet data or route output.
- State what existing content should be removed from the visible demo.
- State whether any new mock data constants are required.

File-by-file build plan:
- `src/app/willowops-prototype/page.tsx`
- `src/app/willowops-prototype/ScenarioRunner.tsx`
- `src/lib/willowops/prototype-data.ts`, if needed
- Any new component files, only if genuinely useful
- For each file, specify add/change/remove.

Visual direction:
- Palette guidance.
- Typography hierarchy.
- Card/panel treatment.
- Mobile behavior.
- Accessibility and readability constraints.
- What to avoid visually.

Acceptance criteria:
- Exactly 10 checkable bullets.
- Include buyer clarity, scope discipline, interaction, mobile, technical
  honesty, and route/proof checks.

Implementation notes:
- Call out any subtle engineering issues Codex should watch for.
- Call out any places where the design should not follow the current code.
- Include a short order of operations for the build.

Test plan:
- Exact commands to run.
- Exact browser checks to perform.
- Exact text or UI elements to verify absent.

Open questions:
- List at most 3.
- If none block implementation, say `None blocking.`

Budget:
- Target 1,300-1,700 words.
- Be concrete enough that Codex can implement without asking follow-up
  questions.
- Do not write code.
- Do not end mid-sentence.
