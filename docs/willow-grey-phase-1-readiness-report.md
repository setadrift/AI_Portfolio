# WillowOps Phase 1 Readiness Report

## Current State

The local Phase 1 prototype is ready to demo. It covers the operating model Willow Grey described:

- process mapping and source-of-truth design
- Monday.com board model
- Make.com orchestration pattern
- AI discovery brief and draft generation
- Microsoft 365 / Outlook draft dry run
- Studio Designer CSV adapter
- Xero invoice event mock
- WhatsApp-style message draft
- dashboard and weekly leadership reporting
- training and handoff plan

Make.com app wiring and live cloud-to-local connectivity are now proven with a temporary `cloudflared` tunnel. The remaining unproven work is replacing Monday default sample rows/statuses, mapping real Monday item fields into the Make scenario, and optionally writing WillowOps output back into Monday.

## Main Demo URL

`http://localhost:3000/en/willowops-prototype`

Use the dashboard in this order:

1. Top-level metrics.
2. Scenario Runner.
3. Source-of-truth map.
4. Project pipeline.
5. AI discovery brief.
6. Monday board blueprint.
7. Automation health.
8. Training and handoff.

## Local Verification

Run:

```bash
npm run willowops:smoke
npm run lint
```

Current expected smoke output:

```text
PASS dashboard data
PASS qualified enquiry scenario
PASS Outlook draft dry run
PASS Studio Designer CSV import
PASS Xero invoice event
PASS WhatsApp message draft
PASS weekly leadership report
PASS training handoff guide
WillowOps Phase 1 smoke test passed against http://localhost:3000
```

## Key Artifacts

### Spec and setup

- `docs/willow-grey-automation-ai-prototype-spec.md`
- `docs/willow-grey-phase-1-setup-runbook.md`
- `docs/willow-grey-monday-make-click-guide.md`
- `docs/willow-grey-make-scenario-blueprint.md`
- `docs/willow-grey-phase-1-status.md`
- `docs/willow-grey-phase-1-demo-talk-track.md`

### Local app

- `src/app/willowops-prototype/page.tsx`
- `src/app/willowops-prototype/ScenarioRunner.tsx`
- `src/app/[locale]/willowops-prototype/page.tsx`
- `src/lib/willowops/prototype-data.ts`
- `src/lib/willowops/ai-brief.ts`

### API endpoints

- `GET /api/willowops/dashboard-data`
- `POST /api/willowops/scenarios/qualified-enquiry`
- `POST /api/willowops/webhooks/monday/status-change`
- `POST /api/willowops/ai/discovery-brief`
- `POST /api/willowops/microsoft365/outlook-draft`
- `POST /api/willowops/studio-designer/import`
- `POST /api/willowops/xero/invoice-event`
- `POST /api/willowops/whatsapp/message-draft`
- `GET /api/willowops/reports/leadership-weekly`
- `GET /api/willowops/training/handoff`

### Scripts

- `npm run willowops:smoke`
- `npm run willowops:monday:setup`
- `npm run willowops:tunnel`

### Output files

- `outputs/willowops-phase-1/client-enquiries.csv`
- `outputs/willowops-phase-1/design-projects.csv`
- `outputs/willowops-phase-1/procurement-tracker.csv`
- `outputs/willowops-phase-1/automation-log.csv`
- `outputs/willowops-phase-1/make-qualified-enquiry-scenario-payload.json`
- `outputs/willowops-phase-1/willowops-phase-1.postman_collection.json`

## Real vs Mocked

### Proven locally

- dashboard renders
- scenario runner calls local APIs
- OpenAI brief generation works
- Microsoft Graph-shaped draft payload is produced
- Studio Designer CSV import normalizes procurement data
- Xero mock maps invoice state into finance/risk updates
- WhatsApp mock creates review-first message drafts
- leadership report summarizes risks and next actions
- training/handoff plan is represented in app and API

### Proven externally

- Make scenario exists in the user account
- Make can call the local app through a tunnel
- Make custom webhook receives the sample payload
- Make HTTP module returns a successful response from the WillowOps endpoint

### Pending external proof

- Monday board seed rows/statuses are replaced with Willow-specific examples
- Monday trigger maps real board fields into the scenario payload
- Monday update module writes back `Next Action` and `Automation Status`

## Next External Steps

1. Monday boards have been created in `My Team`:
   - `Client Enquiries`: `18419980466`
   - `Design Projects`: `18419980860`
   - `Procurement Tracker`: `18419980922`
   - `Automation Log`: `18419981032`

2. Replace Monday's default sample rows/statuses with Willow-specific examples, or rerun `npm run willowops:monday:setup -- --apply` if a Monday API token is available.

3. Start the local app:

```bash
npm run dev
```

4. If using Make.com, expose local app:

```bash
npm run willowops:tunnel
```

5. Make scenario currently exists:
   - Custom webhook trigger.
   - HTTP `POST` to tunnel URL + `/api/willowops/scenarios/qualified-enquiry`.
   - Static fixture payload for first proof run.
   - Verified successful `Run once` with one webhook bundle and one HTTP bundle.

6. After the Make fast scenario works:
   - replace manual webhook trigger with a Monday.com trigger
   - map real Monday item fields
   - optionally update `Next Action` and `Automation Status`

## Interview Framing

Use this wording:

> I started with the source-of-truth problem rather than the tools. Monday should be the visible operating layer, Studio Designer and Xero should remain specialist systems of record, Outlook and WhatsApp should be communication channels, and Make should orchestrate events. AI is useful for summaries, drafts, missing-information checks, and leadership reports, but the first implementation should stay review-first so the team trusts it before anything sends or writes automatically.

## Practical Boundary

The local prototype is complete enough for interview prep and a technical demo. Production value now depends on external account setup, real system access, and process discovery with Willow Grey.
