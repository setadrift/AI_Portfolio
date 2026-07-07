# Task: WillowOps GPT Data Entry Intake Build

Generate complete replacement source files for a fresh WillowOps data-entry
intake prototype backed by an OpenAI extraction endpoint.

Use only the evidence packet for facts, existing conventions, and constraints.
Do not reference or preserve the current WillowOps page implementation. The
current page is intentionally omitted because this build should start from the
new GPT-backed data-entry concept.

Goal:
- Let Lucy/Willow Grey test a real-feeling workflow: paste or upload messy data,
  run GPT extraction, review structured fields, and see where the approved
  record could go.
- Keep it honest: extraction is live, but nothing writes to Monday.com,
  spreadsheets, Studio Designer, Xero, or a database.
- Keep the first project small: one repeated manual data-entry task, strict
  human review, no final system-of-record decision.

Hard scope:
- Return replacement contents for `src/app/willowops-prototype/page.tsx`.
- Return replacement contents for `src/app/willowops-prototype/ScenarioRunner.tsx`.
- Return complete contents for a new route:
  `src/app/api/willowops/data-entry/extract/route.ts`.
- Do not edit shared data files.
- Do not edit global layout or styles.
- Do not add dependencies.

Required API behavior:
- `POST /api/willowops/data-entry/extract`.
- Accept JSON body with:
  - `rawText: string`
  - optional `sourceLabel?: string`
- Also support multipart form uploads if practical without dependencies:
  - read a text-like file from `file`
  - reject unsupported/binary files with a clear 400
  - if multipart support makes the code too brittle, implement paste-first JSON
    and make upload UI read text client-side before posting JSON.
- Use `OPENAI_API_KEY` server-side only.
- If `OPENAI_API_KEY` is missing, return a deterministic fallback extraction
  with `generatedBy: "fallback"`.
- If OpenAI fails or times out, return fallback extraction rather than hanging.
- Use a strict schema-shaped response. If exact Structured Outputs syntax is
  uncertain, use a conservative JSON prompt and validate/coerce the response.
- Never send secrets to the client.
- Never write to external systems.

Extraction schema:
- `generatedBy`: `"openai"` or `"fallback"`
- `recordTitle`: string
- `sourceSummary`: string
- `confidence`: `"High"` | `"Medium"` | `"Low"`
- `fields`: array of `{ label: string; value: string; confidence: "High" | "Medium" | "Low"; evidence: string }`
- `missingFields`: string[]
- `reviewWarnings`: string[]
- `recommendedDestination`: `"Spreadsheet row"` | `"Monday board item"` | `"Future central record"` | `"Needs decision"`
- `suggestedNextAction`: string
- `rawText`: string

Critical extraction rules:
- Every extracted field value must be traceable to the input.
- If a value is inferred, mark confidence `Medium` or `Low` and explain in
  `evidence`.
- If a useful field is missing, put it in `missingFields`.
- Do not invent client names, amounts, dates, systems, approval status, owners,
  or destination systems.

Required UI behavior:
- Page is client-facing and minimal.
- Paste box is primary.
- Upload control is optional but should be included if easy to do client-side
  with text files.
- Button: `Extract fields`.
- Show loading, error, and result states.
- Result panel shows structured fields, missing fields, confidence, suggested
  next action, and review state.
- Human review controls:
  - `Mark reviewed`
  - `Edit fields` visual-only or disabled
  - `Reject` visual-only or disabled
- Destination preview shows:
  - Spreadsheet row
  - Monday board item
  - Future central record
- The destination previews are examples only. Do not imply a write happened.
- Technical details and raw JSON stay behind `Developer response`.

Copy requirements:
- Headline: `Turn hours of repetitive data entry into review-ready records.`
- Supporting copy must mention that Lucy said manual data entry already takes
  paid weekly hours.
- Disclaimer must say this is connected only to a GPT extraction endpoint, not
  Willow Grey's live inbox, spreadsheets, Monday.com, Studio Designer, Xero, or
  any database.
- Include this guardrail:
  `Monday.com can be a useful operational destination for reviewed records, but it is not necessarily the canonical database.`
- Avoid supplier-delay, procurement-chaser, and enquiry-discovery framing.

Output format:
- Return exactly three file sections and nothing else.
- Section 1:
  `FILE: src/app/willowops-prototype/page.tsx`
  followed by complete TypeScript/TSX contents in a code fence.
- Section 2:
  `FILE: src/app/willowops-prototype/ScenarioRunner.tsx`
  followed by complete TypeScript/TSX contents in a code fence.
- Section 3:
  `FILE: src/app/api/willowops/data-entry/extract/route.ts`
  followed by complete TypeScript contents in a code fence.
- Do not return a patch or diff.
- Do not include commentary before, between, or after file sections.
- Do not omit imports, types, helper functions, or closing braces.

Acceptance criteria:
- `page.tsx` presents the GPT-backed data-entry prototype and does not import
  old WillowOps mock project data.
- `ScenarioRunner.tsx` handles paste/upload, calls
  `/api/willowops/data-entry/extract`, and renders review-ready output.
- The new API route compiles in Next.js and uses `OPENAI_API_KEY` only on the
  server.
- Missing OpenAI key and OpenAI failures return fallback output.
- No live writes or integration claims appear.
- No supplier-delay, procurement-chaser, or enquiry-discovery example appears.
- Technical details remain behind `Developer response`.
- Code is ASCII-only and TypeScript-valid.
