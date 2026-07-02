---
name: frontend-design
description: Audience-first frontend design and redesign workflow for pages, components, dashboards, demos, landing pages, prototypes, and UI polish. Use whenever Codex is asked to design, redesign, beautify, improve, style, make a page look professional, reduce "vibecoded" or generic AI UI, create a customer-facing demo, or change visual layout/copy of any web interface.
---

# Frontend Design

Use this skill before editing UI. The goal is not "make it prettier." The goal is a page that the intended viewer immediately understands, trusts, and wants to act on.

## Required Workflow

1. Identify the reviewer:
   - Who is looking at this?
   - What decision are they trying to make?
   - What would make them trust or reject the page in 10 seconds?

2. Convert requirements into buyer-facing proof:
   - Replace implementation-first framing with outcomes, evidence, and next steps.
   - Keep technical details only where they reduce risk for the reviewer.
   - Do not expose raw JSON, schema names, internal IDs, logs, or agent/process language as the primary experience.

3. Define a restrained design direction:
   - Choose one domain-appropriate feel, such as operational, professional services, founder-led consulting, clinic operations, finance ops, or technical due diligence.
   - Avoid novelty for its own sake. Business buyers trust clarity, specificity, and restraint more than spectacle.
   - Use the existing app's components, tokens, typography, and spacing unless there is a strong reason to diverge.

4. Design the information hierarchy before styling:
   - First screen: audience, problem, result, proof.
   - Middle: concrete workflow or artifact.
   - Bottom: implementation detail, documentation, raw data, and next action.
   - Put "why this matters" near every technical element.

5. Implement the smallest UI that carries the story:
   - Prefer real-looking operational surfaces, status summaries, timelines, checklists, and decision records.
   - Use cards only for discrete repeated items or framed tools. Do not nest cards inside cards.
   - Avoid decorative sections that do not answer a user question.

6. Verify with a critique pass:
   - Would the target reviewer describe it in their own words after 10 seconds?
   - Does the page sound like a consultant talking to a client, not a developer narrating internals?
   - Is every visible module tied to value, risk reduction, or next action?
   - Are there any generic AI tells listed below?

## Anti-Vibecoding Rules

Never default to:
- Purple or blue gradients, glow blobs, bokeh, floating orbs, glassmorphism, decorative abstract SVGs, oversized emoji/icon clusters, generic SaaS hero cards, or empty "AI-powered" claims.
- Dense internal JSON/log output as the main result.
- Labels like "scenario response," "payload," "prototype dry run," "module blueprint," or "agent output" unless the audience is explicitly technical.
- Abstract value statements such as "streamline operations," "unlock efficiency," or "automate workflows" without a concrete before/after.
- Too many equally weighted cards. If everything is highlighted, nothing is highlighted.
- Components that exist only because the agent can make them: badges, stat tiles, tabs, timelines, accordions, and charts must earn their place.

Prefer:
- Specific buyer language: "What Debbie sees after a purchase," "Sessions already booked," "Needs staff review," "Confirmation ready to send."
- Operational proof: before/after counts, skipped duplicates, saved handoffs, blocked risky updates, owner, next step.
- One clear primary action and one secondary action.
- Progressive disclosure: business summary first, technical appendix later.
- Quiet visual confidence: solid hierarchy, precise spacing, readable tables/lists, clear status language, few colors with semantic roles.

## Buyer-Facing Copy Rules

Replace internal language with the reviewer's language:

| Avoid | Use Instead |
| --- | --- |
| Scenario response | Purchase follow-up result |
| Dry run complete | Test purchase processed |
| JSON payload | Technical detail |
| Actions to run | What gets updated |
| Appiant guardrail | Protected HubSpot fields |
| Make module | Automation step |
| Source event | Purchase |
| Raw output | Developer view |

Every section needs one sentence that answers: "Why should this person care?"

## Customer Demo Pattern

For consulting demos and lead-response prototypes, structure the page like this:

1. Situation:
   - Name the client's real workflow and pain.
   - Avoid explaining your capabilities first.

2. Result:
   - Show the exact operational outcome the buyer wants.
   - Use realistic records, dates, amounts, and statuses.

3. Trust:
   - Show safeguards, exception handling, ownership, and what is intentionally not automated.

4. Production path:
   - Explain what happens with real credentials.
   - Separate live-system changes, human review, logs, and documentation.

5. Next action:
   - Make the paid test or call path explicit.

## Component Guidance

- Status summaries: Use one primary result panel with 2-4 metrics. Avoid dashboards with unrelated stats.
- Timelines: Use only when sequence matters. Keep labels outcome-focused.
- Tables: Use for comparison or audit trails. Make columns short and scannable.
- Technical detail: Put raw payloads, endpoints, field mappings, and IDs behind details/accordion sections.
- CTAs: Use verbs tied to the buyer's intent: "Review the test build," "Book the paid test," "Send the spec."
- Empty states: Explain the production meaning of the tool, not how the UI works.

## Visual Rules

- Use a restrained palette with semantic accents:
  - Success: green only for completed/safe outcomes.
  - Attention: amber only for review or pending action.
  - Risk: red only for failure/blockers.
  - Neutral: slate/white/off-white for structure.
- Keep border radius modest, usually 6-8px.
- Use shadows sparingly. Prefer borders, spacing, and hierarchy.
- Avoid one-note palettes and overdesigned backgrounds.
- Keep text sizes proportional to context. Tool panels should not use hero-scale type.
- Make mobile layouts resilient: no horizontal overflow except intentionally scrollable data tables.

## Verification Checklist

Before finishing a design task:

- Read the visible copy out loud from the buyer's perspective. Remove anything that sounds like internal implementation narration.
- Confirm first viewport communicates audience, result, and proof.
- Confirm technical details are available but not dominant.
- Run lint/build when code changed.
- Use browser verification for non-trivial UI: load the page, inspect the first viewport, click the primary interaction, check console errors, and inspect mobile or narrow behavior when layout risk exists.
- Report known limitations plainly, especially when a demo uses simulated data or no live credentials.

## Research Basis

This skill reflects current AI-assisted UI design guidance:

- Generic AI UI comes from underspecified design direction, missing design-system constraints, and skipping critique.
- Persistent design rules such as DESIGN.md help agents generate consistent UI instead of guessing.
- Agentic or automation UIs need transparency, status, override/review points, and recoverability.
- Production AI-assisted design still requires human judgment, accessibility checks, and code review.
