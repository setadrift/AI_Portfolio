# Task: WillowOps Prototype Implementation Spec

Turn the selected prototype direction into a concrete implementation spec for
Codex to execute in one focused build pass.

Use only the evidence packet. Do not ask to inspect the repo. Do not write code.
Do not invent live integrations that the packet does not prove. The output
should be specific enough for a frontend engineer to implement directly.

Context:
- A prior Fable pass recommended narrowing the demo to one story:
  new enquiry -> AI discovery brief -> reviewed Outlook draft -> board update.
- The prototype is a follow-up work sample for Willow Grey Interiors after an
  interview about disconnected tools and manual admin handoffs.
- The page should feel credible to Lucy and leadership, not like an internal
  platform demo.
- The implementation should preserve the existing mock/simulated nature unless
  the packet proves live sandbox integrations.

Decision question:

What is the exact implementation spec for rebuilding the WillowOps prototype
around the enquiry-to-discovery workflow, while keeping the scope tight,
buyer-facing, and technically honest?

Required output, in this order:

Implementation summary:
- 3-5 sentences.
- State the intended first-screen impression.
- State the demo narrative in plain English.

Page structure:
- List the sections in final page order.
- For each section, include purpose, visible content, and what existing code or
  data it should use.

Component changes:
- Split by file: `src/app/willowops-prototype/page.tsx`,
  `src/app/willowops-prototype/ScenarioRunner.tsx`, and any data file changes.
- For each file, list exact removals, exact additions, and exact copy changes.
- Say when no data/model changes are required.

Interaction spec:
- Describe the primary demo interaction.
- Describe the technical proof interaction.
- State which scenarios remain runnable and which are removed from the visible
  demo.

Copy deck:
- Final headline.
- Final supporting paragraph.
- Final step labels.
- Final disclaimer/simulated-data note.
- Final CTA or closing line, if any.

Visual and UX constraints:
- Layout rules for desktop and mobile.
- What should be visually prominent.
- What should be subdued or hidden.
- Specific risks to avoid, including overclaiming live integrations.

Acceptance criteria:
- Exactly 8 checkable bullets.
- Include content, interaction, mobile, and honesty/claims checks.

Test plan:
- Exact local checks to run.
- Exact browser checks to perform.
- Do not include deployment steps.

Open questions:
- List at most 3.
- If none block implementation, say `None blocking.`

Budget:
- Target 1,100-1,400 words.
- Be concrete and implementation-ready.
- Do not write code.
- Do not end mid-sentence.
