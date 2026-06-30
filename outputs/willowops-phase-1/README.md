# WillowOps Phase 1 Files

## Monday CSV Imports

- `client-enquiries.csv`
- `design-projects.csv`
- `procurement-tracker.csv`
- `automation-log.csv`

Import each file into Monday.com as its own board inside the `WillowOps Prototype` workspace.

## Make Scenario Payloads

- `make-qualified-enquiry-scenario-payload.json`
  - Best first payload. Use with `POST /api/willowops/scenarios/qualified-enquiry`.
- `make-status-change-payload.json`
  - Lower-level status-change normalizer payload.
- `ai-brief-request.json`
  - Calls the standalone AI discovery brief endpoint.

## Mock Integration Payloads

- `outlook-draft-request.json`
  - Microsoft 365 / Outlook draft dry run.
- `studio-designer-import-request.json`
  - Studio Designer CSV adapter test.
- `xero-invoice-overdue-event.json`
  - Xero invoice event mock.
- `whatsapp-supplier-delay-draft-request.json`
  - WhatsApp-style supplier update draft.

## Key Local URLs

- Dashboard: `http://localhost:3000/en/willowops-prototype`
- Fast Make endpoint: `http://localhost:3000/api/willowops/scenarios/qualified-enquiry`
- Weekly report: `http://localhost:3000/api/willowops/reports/leadership-weekly`
- Training handoff: `http://localhost:3000/api/willowops/training/handoff`

## Verification

Run:

```bash
npm run willowops:smoke
```

Expected result:

```text
WillowOps Phase 1 smoke test passed against http://localhost:3000
```

## Optional API Test Collection

- `willowops-phase-1.postman_collection.json`

Import this into Postman if you want a clickable API demo for all local endpoints.
