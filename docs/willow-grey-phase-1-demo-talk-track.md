# WillowOps Phase 1 Demo Talk Track

## 30-Second Positioning

I started by modelling the operating system rather than jumping straight into individual automations. The core idea is that Monday.com becomes the visible operating layer, Studio Designer and Xero remain specialist source systems, Outlook and WhatsApp are communication channels, and Make.com orchestrates workflow events between them.

The prototype is deliberately review-first: AI can summarize, draft, classify, and recommend next actions, but it does not send client messages, update finance records, or make permanent decisions without human approval.

## What The Prototype Proves

### 1. Source-of-truth thinking

The prototype separates responsibilities clearly:

- Monday.com owns project status, owners, next actions, and visible operational workflow.
- Studio Designer owns detailed design/procurement data, initially represented through a CSV adapter because API access needs confirmation.
- Xero owns invoice/payment truth.
- Outlook and WhatsApp handle communication, but do not become the source of truth.
- The dashboard and leadership report read from normalized operational data.

### 2. New enquiry to discovery brief

A Monday-style event, such as an enquiry moving from `New` to `Qualified`, triggers a Make-style scenario endpoint.

The scenario returns:

- normalized project event
- AI discovery brief
- missing information
- recommended internal next actions
- Outlook-ready draft
- automation log object

### 3. Review-first AI

AI is used for practical operational work:

- summarizing project context
- identifying risks and missing information
- drafting client or supplier messages
- preparing discovery questions
- generating leadership-friendly summaries

It does not invent prices, dates, supplier commitments, approvals, or finance status.

### 4. Management visibility

The dashboard and weekly leadership report show:

- active projects
- at-risk projects
- pending client approvals
- delayed procurement items
- outstanding finance exposure
- automation review queue
- recommended leadership actions

### 5. Integration risk handled pragmatically

Studio Designer is treated as an integration risk until account/vendor access is confirmed. The prototype uses a CSV adapter first, which is a practical way to validate the data model before depending on direct API access.

Microsoft 365/Outlook is also handled safely first: the prototype creates a Microsoft Graph-shaped draft payload but does not send email.

## Demo Flow

1. Open the dashboard:
   `http://localhost:3000/en/willowops-prototype`

2. Show the top-level metrics:
   - active projects
   - at-risk projects
   - delayed procurement
   - outstanding finance
   - automation review queue

3. Use the Scenario Runner:
   Click through the qualified enquiry, Outlook draft, Studio import, Xero event, WhatsApp draft, and leadership report examples. This shows the workflow behavior without leaving the dashboard.

4. Show the source-of-truth map:
   Explain that the hardest part is usually not the automation itself, but deciding which system owns which business object.

5. Show the Monday board blueprint:
   Explain how the boards represent the business process: enquiry, project delivery, procurement, and automation logs.

6. Run or describe the qualified enquiry scenario:
   `POST /api/willowops/scenarios/qualified-enquiry`

7. Show the AI discovery brief:
   Emphasize that AI creates a useful first draft, but the team reviews it before client communication.

8. Show Outlook dry run:
   `POST /api/willowops/microsoft365/outlook-draft`

9. Show Studio Designer CSV import:
   `POST /api/willowops/studio-designer/import`

10. Show Xero invoice event:
    `POST /api/willowops/xero/invoice-event`

11. Show WhatsApp draft:
    `POST /api/willowops/whatsapp/message-draft`

12. Show weekly leadership report:
    `GET /api/willowops/reports/leadership-weekly`

## What Is Real vs Mocked

### Real in the prototype

- data model
- source-of-truth map
- dashboard route
- local API endpoints
- AI brief generation
- OpenAI integration
- Microsoft Graph-shaped Outlook draft payload
- Make-compatible webhook payloads
- smoke test covering all local endpoints

### Mocked or dry-run

- Monday.com live board trigger
- Make live scenario execution
- Studio Designer API access
- Xero OAuth/webhook verification
- WhatsApp Cloud API send
- Microsoft Graph OAuth and live draft creation

## Production Path

### Phase 1: Discovery and process map

- Interview leadership and team members.
- Map enquiry, project, procurement, finance, and communication flows.
- Decide sources of truth.
- Identify quick wins and high-risk workflows.

### Phase 2: First production workflow

- Connect Monday.com and Make.com.
- Implement a qualified enquiry to discovery brief workflow.
- Keep Outlook and WhatsApp in draft/review mode.
- Add automation logs and failure visibility.

### Phase 3: System integrations

- Confirm Studio Designer export/API options.
- Connect Xero through approved OAuth/webhook setup.
- Add Microsoft Graph draft creation.
- Add WhatsApp Business only where there is clear business value and approval.

### Phase 4: Training and handoff

- Train team on board ownership and status discipline.
- Document what AI can and cannot do.
- Create failure/review queue process.
- Leave behind dashboard, SOPs, and maintenance notes.

## Short Answer If Asked "What Would You Do First?"

I would not start by adding AI everywhere. I would first map the current operating flow and identify the source of truth for leads, projects, procurement, finance, and communication. Then I would build one narrow, visible workflow: a qualified enquiry becomes a structured discovery brief, a reviewed Outlook draft, a Monday next action, and an automation log. Once that works reliably, I would expand into procurement, finance visibility, and leadership reporting.

## Short Answer If Asked "How Do You Avoid Making A Mess?"

I would keep automation review-first at the beginning, add clear logs for every run, and avoid letting AI make final decisions. The system should surface missing information instead of guessing. The team should always know which system owns the record, where to review generated outputs, and what happens when automation fails.
