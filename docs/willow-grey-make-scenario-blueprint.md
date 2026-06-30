# WillowOps Make Scenario Blueprint

## Scenario

`WillowOps - Qualified enquiry to discovery brief`

## Purpose

Prove the first automation slice:

Qualified enquiry event -> Make.com -> WillowOps operating layer -> AI brief -> Outlook-ready draft -> Monday update suggestions -> automation log object.

## Recommended First Build

Start with the fast two-module scenario. Once it works, replace the manual webhook trigger with a real Monday.com trigger.

## Module 1: Webhooks - Custom Webhook

Name:

`WillowOps qualified enquiry trigger`

Purpose:

Receive a test event that represents a Monday.com enquiry moving from `New` to `Qualified`.

Test payload:

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

Payload file:

`/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/make-qualified-enquiry-scenario-payload.json`

Manual webhook test command:

```bash
curl -s -X POST 'PASTE_MAKE_WEBHOOK_URL_HERE' \
  -H 'Content-Type: application/json' \
  --data-binary @/Users/duncananderson/Desktop/AI_Portfolio/worktrees/slot-1/outputs/willowops-phase-1/make-qualified-enquiry-scenario-payload.json \
  | python3 -m json.tool
```

## Module 2: HTTP - Make A Request

Name:

`Call WillowOps qualified enquiry scenario`

Method:

`POST`

URL for local curl/Postman only:

`http://localhost:3000/api/willowops/scenarios/qualified-enquiry`

URL for the Make HTTP module:

`https://YOUR_TUNNEL_URL/api/willowops/scenarios/qualified-enquiry`

Headers:

```text
Content-Type: application/json
```

Body type in Make's current HTTP module:

`application/json`

Body input method:

`JSON string`

Request body:

For first test, paste the static test payload from Module 1. This is the current proven setup. After the proof run, replace static values with mapped fields from the webhook bundle.

Expected response fields:

- `scenario`
- `normalizedEvent`
- `normalizedEvent.humanReviewRequired`
- `mondayUpdates`
- `mondayUpdates.nextAction`
- `mondayUpdates.automationStatus`
- `outlookDraft`
- `outlookDraft.subject`
- `outlookDraft.body`
- `aiBrief`
- `aiBrief.summary`
- `aiBrief.risks`
- `automationLog`

## Module 3: Optional Monday Update

Add only after Modules 1-2 work.

Module:

`Monday.com - Change multiple column values` or equivalent Monday update action.

Purpose:

Write the output of the WillowOps scenario back to the `Client Enquiries` or `Design Projects` board.

Suggested mappings:

| Monday Column | Value From HTTP Response |
| --- | --- |
| `Next Action` | `mondayUpdates.nextAction` |
| `Automation Status` | `mondayUpdates.automationStatus` |
| `Risk Status` | `project.riskStatus` or `mondayUpdates.riskStatus` when present |
| `Finance Status` | `mondayUpdates.financeStatus` when present |

For the first real test, do not update many columns. Start with:

- `Next Action`
- `Automation Status`

## Module 4: Optional Automation Log Item

Add only after Monday update works.

Module:

`Monday.com - Create an item`

Board:

`Automation Log`

Suggested mappings:

| Automation Log Column | Value From HTTP Response |
| --- | --- |
| `Source System` | `automationLog.sourceSystem` |
| `Event Type` | `automationLog.eventType` |
| `Project` | `automationLog.projectId` |
| `Status` | `automationLog.status` |
| `Human Review` | `automationLog.humanReviewRequired` |
| `Retry Count` | `automationLog.retryCount` |
| `Error Message` | `automationLog.errorMessage` |

## Module 5: Optional Outlook Draft

Do not add live Outlook actions until the dry-run flow is trusted.

Production direction:

- Use Microsoft Graph OAuth.
- Create a draft with `POST /me/messages`.
- Keep live `POST /me/sendMail` disabled until the team explicitly approves auto-send mode.

Graph-shaped payload already returned by:

`POST /api/willowops/microsoft365/outlook-draft`

## Tunnel Setup

Make usually cannot call local `localhost`.

Run:

```bash
npm run willowops:tunnel
```

If the tunnel starts at:

`https://example.trycloudflare.com`

Use this in Make:

`https://example.trycloudflare.com/api/willowops/scenarios/qualified-enquiry`

## Error Handling

Add this after the first successful run:

1. If HTTP status is not `200`, route to review.
2. If `normalizedEvent.missingFields` is not empty, set `Automation Status` to `Needs Review`.
3. If `aiBrief.reviewRequired` is true, do not send external communication.
4. If any Monday update fails, create an Automation Log item with `Failed`.

## First Successful Demo Criteria

- Make webhook receives test payload.
- HTTP module receives `200` from WillowOps endpoint.
- Response includes AI brief and Outlook draft.
- Monday board is not required for the first Make proof.
- If Monday update module is added, only `Next Action` and `Automation Status` are updated.

Current proof status:

- Webhook module received the sample fixture payload.
- HTTP module is saved with `POST`, public tunnel URL, `application/json`, and `JSON string`.
- Make `Run once` completed successfully with one webhook bundle and one HTTP bundle.

## Talking Point

This scenario intentionally separates workflow orchestration from business logic. Make handles triggers and routing, while the WillowOps operating layer normalizes data, applies guardrails, prepares AI outputs, and returns clear review-first actions for Monday, Outlook, and the automation log.
