# WillowOps Phase 1 Setup Runbook

## Goal

Create the first working slice of the WillowOps prototype:

Monday.com status change -> Make webhook scenario -> local WillowOps API -> AI-ready project context -> dashboard visibility.

This phase proves the operating model before we connect Microsoft 365, Xero, WhatsApp, or Studio Designer.

## Local Prototype URLs

After running `npm run dev`:

- Dashboard: `http://localhost:3000/en/willowops-prototype`
- Dashboard JSON: `http://localhost:3000/api/willowops/dashboard-data`
- Monday webhook endpoint: `http://localhost:3000/api/willowops/webhooks/monday/status-change`
- AI discovery brief endpoint: `http://localhost:3000/api/willowops/ai/discovery-brief`
- Combined Make scenario endpoint: `http://localhost:3000/api/willowops/scenarios/qualified-enquiry`
- Outlook draft dry-run endpoint: `http://localhost:3000/api/willowops/microsoft365/outlook-draft`
- Studio Designer CSV adapter endpoint: `http://localhost:3000/api/willowops/studio-designer/import`
- Xero invoice event endpoint: `http://localhost:3000/api/willowops/xero/invoice-event`
- WhatsApp draft endpoint: `http://localhost:3000/api/willowops/whatsapp/message-draft`
- Weekly leadership report endpoint: `http://localhost:3000/api/willowops/reports/leadership-weekly`
- Training handoff endpoint: `http://localhost:3000/api/willowops/training/handoff`

## One-Command Local Smoke Test

With the dev server running, verify every local Phase 1 endpoint:

```bash
npm run willowops:smoke
```

Expected result:

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

Optional: import this Postman collection for a clickable API demo:

`/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/willowops-phase-1.postman_collection.json`

## Make.com Localhost Tunnel

Make.com usually cannot call `http://localhost:3000` because Make runs in the cloud.

Start a tunnel:

```bash
npm run willowops:tunnel
```

Then paste the public HTTPS URL into the Make HTTP module, with this path appended:

`/api/willowops/scenarios/qualified-enquiry`

## Optional Monday API Setup

If you have a Monday API token, create the prototype boards and seed items from the local CSVs:

Dry run:

```bash
npm run willowops:monday:setup
```

Apply:

```bash
MONDAY_API_TOKEN=your_token_here npm run willowops:monday:setup -- --apply
```

The script is dry-run by default and will not create anything unless `--apply` is passed.

If your dev server uses a different port, use that port in the URLs.

## Step 1: Monday Boards

Current account state:

- Workspace: `My Team`
- `Client Enquiries`: `https://duncananderson.monday.com/boards/18419980466`
- `Design Projects`: `https://duncananderson.monday.com/boards/18419980860`
- `Procurement Tracker`: `https://duncananderson.monday.com/boards/18419980922`
- `Automation Log`: `https://duncananderson.monday.com/boards/18419981032`

The boards were created manually from Monday's board creation flow. The next board step is replacing Monday's default sample rows/statuses with the Willow-specific sample data below. If a Monday API token becomes available, the setup script can create a clean parallel set from the CSVs.

CSV files:

- `/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/client-enquiries.csv`
- `/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/design-projects.csv`
- `/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/procurement-tracker.csv`
- `/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/automation-log.csv`

### Board 1: Client Enquiries

Purpose: Track lead intake through proposal outcome.

Status labels:

- New
- Qualified
- Discovery Scheduled
- Proposal Sent
- Won
- Lost

Columns:

- Client
- Email
- Phone
- Lead Source
- Budget Range
- Owner
- Next Action
- Last Touch
- Automation Status

Seed row:

- Client: Charlotte Reeves
- Email: charlotte.reeves@example.com
- Phone: +44 7000 111111
- Lead Source: Website enquiry
- Budget Range: GBP 75k-100k
- Owner: Operations
- Status: New
- Next Action: Prepare discovery call brief
- Last Touch: 2026-06-29
- Automation Status: Not started

### Board 2: Design Projects

Purpose: Track project delivery from kickoff through aftercare.

Status labels:

- Kickoff
- Concept Design
- Sourcing
- Client Approval
- Procurement
- Installation
- Aftercare
- Complete

Columns:

- Client
- Service Type
- Lead Designer
- Project Manager
- Install Date
- Risk Status
- Next Action
- Finance Status

Seed rows:

- Reeves Residence / Discovery Scheduled / On track
- Shah House / Procurement / At risk
- Brooks Study / Client Approval / Watch

### Board 3: Procurement Tracker

Purpose: Track design items, supplier movement, and delays.

Status labels:

- Proposed
- Approved
- PO Required
- Ordered
- Acknowledged
- Delayed
- Delivered
- Installed

Columns:

- Project
- Room
- Supplier
- Item
- Client Approval
- PO Status
- Invoice Status
- Expected Delivery
- Blocked Reason

Seed rows:

- Shah House / Entrance hall / Heritage Lighting / Statement pendant and wall lights / Delayed
- Brooks Study / Study / Atelier Fabrics / Window treatment fabric / Proposed
- Reeves Residence / Kitchen / Stone & Surface Ltd. / Honed stone worktop sample set / Proposed

### Board 4: Automation Log

Purpose: Make automation behavior visible and debuggable.

Status labels:

- Success
- Needs Review
- Failed
- Retried

Columns:

- Source System
- Event Type
- Project
- Started At
- Finished At
- Retry Count
- Human Review
- Error Message

## Step 2: Create The First Make Scenario

Scenario name:

`WillowOps - Qualified enquiry to discovery brief`

Detailed scenario blueprint:

`/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/docs/willow-grey-make-scenario-blueprint.md`

### Fast version: one local endpoint

Use this first if you want the simplest working proof.

1. Add a `Custom webhook` trigger in Make.
2. Copy the Make webhook URL.
3. Add a second module: `HTTP - Make a request`.
4. Configure the HTTP request:
   - Method: `POST`
   - URL: public tunnel/deployment URL + `/api/willowops/scenarios/qualified-enquiry`
   - Body type: `Raw`
   - Content type: `JSON`
   - Request content from:

`/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/make-qualified-enquiry-scenario-payload.json`

5. Run the scenario once.
6. Confirm the HTTP response includes:
   - `normalizedEvent`
   - `mondayUpdates`
   - `outlookDraft`
   - `aiBrief`
   - `automationLog`

This proves the full first slice: Monday-style event -> Make -> WillowOps operating layer -> AI brief -> Outlook-ready draft -> automation log object.

Use `http://localhost:3000/api/willowops/scenarios/qualified-enquiry` only for local curl/Postman testing. Make.com runs in the cloud and needs a public tunnel or deployed URL.

## Step 3: Microsoft 365 / Outlook Dry Run

Before setting up Microsoft Graph OAuth, test the draft payload locally.

Request file:

`/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/outlook-draft-request.json`

Command:

```bash
curl -s -X POST http://localhost:3000/api/willowops/microsoft365/outlook-draft \
  -H 'Content-Type: application/json' \
  --data-binary @/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/outlook-draft-request.json \
  | python3 -m json.tool
```

Expected response:

- `dryRun: true`
- `reviewRequired: true`
- `graphDraftPayload.subject`
- `graphDraftPayload.body.content`
- `graphDraftPayload.toRecipients`

This gives us the Microsoft 365 shape without sending email. Later, once OAuth is configured, this maps to Microsoft Graph draft creation through `POST /me/messages` or live send through `POST /me/sendMail`.

## Step 4: Studio Designer CSV Adapter

Studio Designer API access is an unknown until the client confirms their account and vendor support. For the prototype, test the integration boundary with CSV export data.

Request file:

`/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/studio-designer-import-request.json`

Command:

```bash
curl -s -X POST http://localhost:3000/api/willowops/studio-designer/import \
  -H 'Content-Type: application/json' \
  --data-binary @/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/studio-designer-import-request.json \
  | python3 -m json.tool
```

Expected response:

- `sourceSystem: Studio Designer`
- `adapterMode: csv_export`
- `normalizedItems`
- `reviewQueueCount`
- risk events for delayed or approval-pending procurement items

## Step 5: Xero Invoice Event Mock

Use this to prove finance visibility without Xero OAuth.

Request file:

`/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/xero-invoice-overdue-event.json`

Command:

```bash
curl -s -X POST http://localhost:3000/api/willowops/xero/invoice-event \
  -H 'Content-Type: application/json' \
  --data-binary @/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/xero-invoice-overdue-event.json \
  | python3 -m json.tool
```

Expected response:

- `sourceSystem: Xero`
- `mondayUpdates.financeStatus`
- `mondayUpdates.riskStatus`
- `dashboardImpact`
- `automationLog`

## Step 6: WhatsApp Draft Mock

Use this to prove short client/supplier updates without Meta/WhatsApp Business setup.

Request file:

`/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/whatsapp-supplier-delay-draft-request.json`

Command:

```bash
curl -s -X POST http://localhost:3000/api/willowops/whatsapp/message-draft \
  -H 'Content-Type: application/json' \
  --data-binary @/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/whatsapp-supplier-delay-draft-request.json \
  | python3 -m json.tool
```

Expected response:

- `channel: WhatsApp`
- `dryRun: true`
- `reviewRequired: true`
- `draft.message`
- `automationLog`

## Step 7: Weekly Leadership Report

Use this to show management visibility across projects, procurement, finance, and automation health.

Command:

```bash
curl -s http://localhost:3000/api/willowops/reports/leadership-weekly | python3 -m json.tool
```

Expected response:

- `summary`
- `executiveNarrative`
- `atRiskProjects`
- `financeFlags`
- `procurementFlags`
- `automationReviewQueue`
- `recommendedLeadershipActions`

## Step 8: Training And Handoff Plan

Use this to show that the implementation includes team adoption, not just automation.

Command:

```bash
curl -s http://localhost:3000/api/willowops/training/handoff | python3 -m json.tool
```

Expected response:

- `trainingModules`
- `handoffChecklist`
- `sourceOfTruthRows`
- `recommendedRollout`

### Expanded version: separate normalization and AI modules

Use this after the fast version works.

1. Add a `Custom webhook` trigger in Make.
2. Copy the Make webhook URL.
3. Add a second module: `HTTP - Make a request`.
4. Configure the HTTP request:
   - Method: `POST`
   - URL: `http://localhost:3000/api/willowops/webhooks/monday/status-change`
   - Body type: `Raw`
   - Content type: `JSON`
   - Request content from:

`/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/make-status-change-payload.json`

Payload:

```json
{
  "board": "Client Enquiries",
  "itemId": "monday_item_123",
  "projectId": "project_reeves",
  "projectName": "Reeves Residence",
  "previousStatus": "New",
  "newStatus": "Qualified",
  "changedAt": "2026-06-30T14:00:00Z",
  "changedBy": "Operations"
}
```

5. Run the scenario once.
6. Confirm the HTTP response includes:
   - `normalizedEvent`
   - `recommendedAutomation`
   - `aiBriefInput`

7. Add a third module: `HTTP - Make a request`.
8. Configure the AI brief request:
   - Method: `POST`
   - URL: `http://localhost:3000/api/willowops/ai/discovery-brief`
   - Body type: `Raw`
   - Content type: `JSON`
   - Request content from:

`/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/ai-brief-request.json`

9. Confirm the response includes:
   - `brief.summary`
   - `brief.risks`
   - `brief.discoveryQuestions`
   - `brief.internalNextActions`
   - `brief.outlookDraft.subject`
   - `brief.outlookDraft.body`

If `OPENAI_API_KEY` is not set locally, the endpoint returns a deterministic fallback brief. This is intentional so the prototype still works during setup.

Note: If Make cannot reach `localhost`, use a tunnel such as ngrok or Cloudflare Tunnel and replace the local URL with the public tunnel URL.

## Step 3: Test Without Make

You can test the endpoint directly:

```bash
curl -s -X POST http://localhost:3000/api/willowops/webhooks/monday/status-change \
  -H 'Content-Type: application/json' \
  -d '{
    "board": "Client Enquiries",
    "itemId": "monday_item_123",
    "projectId": "project_reeves",
    "projectName": "Reeves Residence",
    "previousStatus": "New",
    "newStatus": "Qualified",
    "changedAt": "2026-06-30T14:00:00Z",
    "changedBy": "Operations"
  }' | python3 -m json.tool
```

## Step 4: What To Say In The Willow Grey Call

Use this framing:

> I started by modelling the source-of-truth problem rather than jumping straight into tools. Monday owns operational status, Studio Designer likely owns design/procurement detail, Xero owns finance, Outlook and WhatsApp are communication channels, and Make acts as the workflow orchestration layer. The first automation slice is a qualified enquiry becoming a structured discovery brief, draft follow-up, project next action, and automation log.

## Done Criteria

Phase 1 is done when:

- The local dashboard runs.
- Monday boards exist with at least the seed rows.
- The Make scenario can post a sample status-change payload.
- The local webhook returns normalized project context.
- The AI brief endpoint returns a discovery brief and Outlook-ready draft.
- The Outlook dry-run endpoint returns a Microsoft Graph-ready draft payload without sending email.
- The Studio Designer CSV adapter returns normalized procurement items and review flags.
- The Xero mock endpoint returns finance status and dashboard impact.
- The WhatsApp draft endpoint returns a review-first supplier/client message.
- The leadership report endpoint summarizes cross-system risk and next actions.
- The training endpoint returns role-based modules and a handoff checklist.
- You can explain the source-of-truth map without reading notes.
