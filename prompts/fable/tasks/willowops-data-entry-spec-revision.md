# Task: WillowOps Data Entry Intake Spec Revision

Revise the Willow Grey data-entry intake build spec into an implementation-ready
spec.

Use only the evidence packet. Do not inspect or reference the existing prototype
page implementation. Do not write code. Do not create a patch. The existing page
is intentionally not included because the next build should be from scratch.

Context:
- Lucy mentioned manual data entry already takes paid weekly hours.
- A Fable review concluded the data-entry direction is right but the current
  spec still overfits to supplier-delay/procurement examples.
- The revised spec must avoid assumptions about Willow Grey's sales process,
  supplier process, database architecture, and exact system of record.
- The revised spec should be specific enough for Codex to build a new page from
  scratch without reading the current page.

Decision question:

What is the revised implementation-ready build spec for a fresh WillowOps
data-entry intake prototype, incorporating the review feedback and avoiding
overfit to the existing page or old supplier-update prototype?

Required output, in this order:

Spec title:
- One line.

Goal:
- 3-5 sentences.
- Anchor the prototype in manual data-entry hours Lucy mentioned.
- State that the page is built from scratch and does not preserve the old page.

Demo scenario:
- Define the single canonical messy input.
- The input must be generic enough for any business.
- The input must not be supplier-delay, enquiry-discovery, or procurement-chaser
  specific.
- Every extracted field must be traceable to the input.

Page structure:
- List the sections in final page order.
- For each section, include purpose, visible content, and interaction behavior.

Data model:
- Define the visible extracted fields.
- Define missing fields.
- Define confidence display.
- Define review states.
- Include only fields supported by the canonical input.

Destination framing:
- Explain how to present spreadsheet, Monday board, and future database
  previews without choosing the final system of record.
- Include exact guardrail copy about Monday.com being an operational destination,
  not necessarily the canonical database.

Copy deck:
- Final headline.
- Final supporting paragraph.
- Simulated-data disclaimer.
- Section labels.
- Button/control labels.
- Follow-up email framing line.

Interaction spec:
- Define exactly what happens on initial load.
- Define exactly what happens when the user clicks `Extract fields`.
- Define exactly what happens when the user clicks `Mark reviewed`.
- Confirm no API calls or live writes are required.

Build scope:
- State which files Codex should replace.
- State which files Codex should not edit.
- State whether API routes are needed.
- State whether current prototype code should be used as reference.

Acceptance criteria:
- Exactly 10 checkable bullets.
- Include no-overfit, buyer clarity, traceability, missing fields, confidence,
  review state, destination ambiguity, no live writes, and no domain assumptions.

Test plan:
- Code-level checks only.
- Do not include browser/frontend testing.

Open questions:
- List at most 3.
- If none block implementation, say `None blocking.`

Budget:
- Target 1,200-1,600 words.
- Be implementation-ready.
- Do not write code.
- Do not end mid-sentence.
