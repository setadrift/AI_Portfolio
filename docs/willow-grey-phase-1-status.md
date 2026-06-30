# WillowOps Phase 1 Status

## Local Prototype

Status: **proven locally**

- [x] Dashboard route exists: `/en/willowops-prototype`
- [x] Dashboard data endpoint exists: `/api/willowops/dashboard-data`
- [x] Qualified enquiry Make scenario endpoint exists: `/api/willowops/scenarios/qualified-enquiry`
- [x] AI discovery brief endpoint exists: `/api/willowops/ai/discovery-brief`
- [x] Outlook/Microsoft 365 dry-run endpoint exists: `/api/willowops/microsoft365/outlook-draft`
- [x] Studio Designer CSV adapter endpoint exists: `/api/willowops/studio-designer/import`
- [x] Xero invoice event mock endpoint exists: `/api/willowops/xero/invoice-event`
- [x] WhatsApp message draft mock endpoint exists: `/api/willowops/whatsapp/message-draft`
- [x] Weekly leadership report endpoint exists: `/api/willowops/reports/leadership-weekly`
- [x] Training handoff endpoint exists: `/api/willowops/training/handoff`
- [x] One-command smoke test exists: `npm run willowops:smoke`
- [x] Local smoke test passes
- [x] Lint passes

## External Account Setup

Status: **Make proof complete; Monday seed/mapping still pending**

- [x] Monday boards created in `My Team`
- [x] Monday board created: `Client Enquiries` (`18419980466`)
- [x] Monday board created: `Design Projects` (`18419980860`)
- [x] Monday board created: `Procurement Tracker` (`18419980922`)
- [x] Monday board created: `Automation Log` (`18419981032`)
- [ ] Monday status columns adjusted / seed rows replaced with Willow-specific sample data
- [x] Make scenario draft started in Make editor
- [x] Make custom webhook trigger created: `WillowOps qualified enquiry trigger`
- [x] Make webhook sample payload detected: `board`, `itemId`, `projectId`, `projectName`, `previousStatus`, `newStatus`, `changedAt`, `changedBy`
- [x] Local qualified-enquiry endpoint returns `200` for the Make sample payload
- [x] Public tunnel configured for Make via `cloudflared`
- [x] Make HTTP module points to public tunnel qualified enquiry endpoint
- [x] Make scenario test run succeeds with one webhook bundle and one HTTP bundle

## Optional Production-Like Integrations

Status: **not needed before Lucy call**

- [ ] Microsoft Graph OAuth app registered
- [ ] Outlook draft creation through `POST /me/messages`
- [ ] Xero demo company OAuth connection
- [ ] Xero real webhook verification
- [ ] WhatsApp Business Cloud API test number
- [ ] Studio Designer confirmed API/export access
- [ ] Zapier secondary webhook proof

## Current Recommended Next Step

The four Monday boards now exist in Duncan's monday.com account under `My Team`:

- `Client Enquiries`: `https://duncananderson.monday.com/boards/18419980466`
- `Design Projects`: `https://duncananderson.monday.com/boards/18419980860`
- `Procurement Tracker`: `https://duncananderson.monday.com/boards/18419980922`
- `Automation Log`: `https://duncananderson.monday.com/boards/18419981032`

They were created manually from Monday's board creation flow. Next, replace Monday's default sample rows/statuses with the Willow-specific seed rows below or rerun via the Monday API setup if an API token is available.

Reference CSVs:

- `/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/client-enquiries.csv`
- `/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/design-projects.csv`
- `/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/procurement-tracker.csv`
- `/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/automation-log.csv`

Then create the Make scenario using:

- `/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/make-qualified-enquiry-scenario-payload.json`

Make progress:

- Webhook module is created and has successfully detected the sample fixture payload.
- HTTP module is saved with `No authentication`, `POST`, `application/json`, and `JSON string` body mode.
- HTTP module is currently using the static fixture payload for the first proof run.
- `npm run willowops:tunnel` is running through `cloudflared`; the URL is temporary and changes when restarted.
- Local test proof: `POST http://localhost:3000/api/willowops/scenarios/qualified-enquiry` returns `200` for `make-qualified-enquiry-scenario-payload.json`.
- Public tunnel proof: `POST https://<trycloudflare-url>/api/willowops/scenarios/qualified-enquiry` returns `200` for `make-qualified-enquiry-scenario-payload.json`.
- Make scenario proof: `Run once` completed after sending the fixture payload to the custom webhook; Make showed one webhook bundle and one HTTP bundle processed.

Detailed Make scenario guide:

- `/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/docs/willow-grey-make-scenario-blueprint.md`
