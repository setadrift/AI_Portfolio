# WillowOps Monday + Make Click Guide

## Goal

Get the external Phase 1 proof working:

Monday board data -> Make scenario -> local WillowOps endpoint -> AI brief / draft / automation output.

This guide assumes the local dev server is already running at:

`http://localhost:3000`

## Part 1: Monday.com Board Setup

### Option A: create boards with API token

If you can get a Monday API token, this is faster than CSV import.

Dry run:

```bash
npm run willowops:monday:setup
```

Create boards/items:

```bash
MONDAY_API_TOKEN=your_token_here npm run willowops:monday:setup -- --apply
```

The script creates:

- `Client Enquiries`
- `Design Projects`
- `Procurement Tracker`
- `Automation Log`

It reads the CSV files in:

`/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/`

### Current Monday setup

The starter boards already exist in the `My Team` workspace:

- `Client Enquiries`: `18419980466`
- `Design Projects`: `18419980860`
- `Procurement Tracker`: `18419980922`
- `Automation Log`: `18419981032`

Next board task: replace Monday's default sample rows/statuses with the Willow-specific sample data below. If you want a clean parallel setup instead, import the CSVs manually or rerun the Monday API setup script with an API token.

### Option B: import CSVs manually

Import these files as separate boards:

1. `client-enquiries.csv`
2. `design-projects.csv`
3. `procurement-tracker.csv`
4. `automation-log.csv`

File folder:

`/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/`

Suggested board names:

- `Client Enquiries`
- `Design Projects`
- `Procurement Tracker`
- `Automation Log`

### Clean up imported columns

After import, Monday may treat some fields as plain text. That is fine for the first proof. If you have time, convert these columns:

`Client Enquiries`

- `Status` -> Status column
- `Last Touch` -> Date column
- `Automation Status` -> Status column

`Design Projects`

- `Stage` -> Status column
- `Install Date` -> Date column
- `Risk Status` -> Status column
- `Finance Status` -> Status column

`Procurement Tracker`

- `Status` -> Status column
- `Client Approval` -> Status column
- `PO Status` -> Status column
- `Invoice Status` -> Status column
- `Expected Delivery` -> Date column

`Automation Log`

- `Status` -> Status column
- `Started At` -> Date/time if available, otherwise text is fine
- `Finished At` -> Date/time if available, otherwise text is fine
- `Human Review` -> Checkbox or Status

## Part 2: Make.com Fast Scenario

### Create scenario

1. Open Make.com.
2. Create a scenario named:

`WillowOps - Qualified enquiry to discovery brief`

3. Add module: `Webhooks`.
4. Choose: `Custom webhook`.
5. Create a webhook named:

`WillowOps qualified enquiry trigger`

6. Copy the webhook URL.

### Add HTTP module

1. Add second module: `HTTP`.
2. Choose: `Make a request`.
3. Set:
   - Method: `POST`
   - URL: public tunnel/deployment URL + `/api/willowops/scenarios/qualified-enquiry`
   - Body type: `Raw`
   - Content type: `JSON`

4. Paste this payload:

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

5. Run once.

### Public URL required for Make

Make runs in the cloud, so it cannot use your machine's `localhost:3000` directly. Use a tunnel or deployed URL for the HTTP module. Keep `http://localhost:3000/api/willowops/scenarios/qualified-enquiry` for local curl/Postman tests only.

Helper script:

```bash
npm run willowops:tunnel
```

If `cloudflared` or `ngrok` is installed, the helper will start a tunnel and tell you what URL shape to paste into Make.

Option A: Cloudflare Tunnel

```bash
brew install cloudflared
npm run willowops:tunnel
```

Option B: ngrok

```bash
brew install ngrok/ngrok/ngrok
ngrok config add-authtoken YOUR_NGROK_TOKEN
npm run willowops:tunnel
```

Then replace:

`http://localhost:3000/api/willowops/scenarios/qualified-enquiry`

with:

`https://your-tunnel-url/api/willowops/scenarios/qualified-enquiry`

## Part 3: Test Make Webhook Manually

If Make gives you a custom webhook URL, test it from the terminal:

```bash
curl -s -X POST 'PASTE_MAKE_WEBHOOK_URL_HERE' \
  -H 'Content-Type: application/json' \
  --data-binary @/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/make-qualified-enquiry-scenario-payload.json \
  | python3 -m json.tool
```

If the Make scenario is configured correctly, the HTTP module should call the local/tunnel endpoint and show a response containing:

- `normalizedEvent`
- `mondayUpdates`
- `outlookDraft`
- `aiBrief`
- `automationLog`

## Part 4: What To Do After Fast Scenario Works

Once the fast scenario works, add real Monday involvement:

1. Add a Monday.com trigger module.
2. Trigger on item/status update in `Client Enquiries`.
3. Map Monday item fields into the HTTP request body.
4. Keep the local endpoint unchanged.

Mapping:

- Monday board name -> `board`
- Monday item id -> `itemId`
- Project lookup/static mapping -> `projectId`
- Project/client name -> `projectName`
- Old status -> `previousStatus`
- New status -> `newStatus`
- Event timestamp -> `changedAt`
- User -> `changedBy`

For the first real test, hard-code:

```json
"projectId": "project_reeves",
"projectName": "Reeves Residence"
```

Then later replace that with real Monday item data.

## Part 5: Explain The Proof

Use this language:

> The first automation slice is intentionally narrow. A qualified enquiry triggers Make, Make calls the operating layer, the operating layer normalizes the event, generates an AI discovery brief, prepares an Outlook-ready draft, and returns Monday update suggestions and an automation log. This proves the pattern before connecting live sends or permanent writes.

## Done Criteria

- [ ] Four Monday boards exist.
- [ ] Make scenario exists.
- [ ] Make custom webhook receives a test payload.
- [ ] Make HTTP module calls the local or tunnel endpoint.
- [ ] Response includes AI brief and Outlook draft.
- [ ] You can explain why this is review-first and safe.
