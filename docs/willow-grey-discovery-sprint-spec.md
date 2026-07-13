# Willow Grey Interiors Discovery Sprint Spec

## Status

Working specification for the proposed first phase.

This document is grounded in:

- the original Head of Automation & AI brief
- Duncan's application and follow-up correspondence with Caroline and Lucy
- Caroline's July 9 workflow, software-stack, and organisational-design documents
- Caroline's stated preference for approximately 90% of work to operate in Monday.com and Studio Designer
- the existing WillowOps research prototype and integration proof work

It is not yet a final client proposal. Fee, exact dates, and production implementation scope remain to be agreed.

## Engagement Goal

Define a practical operating model that reduces repeated data entry, supports Willow Grey's move to pod-based delivery, and makes Monday.com and Studio Designer the two main places where the team runs the business.

The sprint should leave Willow Grey with a clear answer to four questions:

1. What information should live in Monday.com, Studio Designer, Xero, and the supporting tools?
2. Where is the team currently entering or chasing the same information more than once?
3. Which workflow should be improved first to create a visible, low-risk win?
4. What should be implemented next, in what order, at what level of effort?

## Confirmed Context

### Business direction

- Willow Grey is moving from a founder-led structure to pod-based project delivery.
- Caroline's target is to transition from CEO and designer to a CEO-only role by 2028.
- Lucy is becoming the operational and commercial owner for systems, reporting, invoicing, forecasting, and data accuracy.
- The intended delivery structure has two active pods and a possible third pod later.
- The growth plan depends on clearer accountability, better profitability visibility, less duplicated administration, and less dependence on Caroline.

### Systems direction

- Monday.com is the current operational hub for CRM, sales pipeline, project management, tasks, deadlines, automations, and project status.
- EstiMAC currently supports quotations, estimates, product schedules, and invoices, but requires extensive manual product entry and does not integrate well.
- Studio Designer is planned as the replacement for EstiMAC and is intended to handle specifications, procurement, proposals, purchasing, invoicing, and financial reporting.
- Xero remains the company accounting system for banking, VAT, payroll, reporting, and year-end accounts.
- Outlook, Teams, WhatsApp, Keynote, Coohom, Apple Notes, iCloud Drive, and supplier portals support communication, meetings, files, presentations, design work, and sourcing.
- Caroline wants approximately 90% of operational work to happen in Monday.com and Studio Designer, with the other systems supporting them.

### Current operating pain

- Every major project stage currently includes manual work.
- Information is repeatedly copied between systems.
- Multiple team members are involved in each project, creating communication overhead and unclear ownership.
- Everyone is included in project WhatsApp groups, creating avoidable interruptions.
- Keynote proposal boards are a major manual task.
- Profitability, forecasting, pod capacity, and project health are not yet reliably visible from live data.
- Monday contains experimental KPI work created with its AI features, but Caroline confirmed those boards are not connected to live data.

## Working Principles

1. **Design the operating model before building integrations.** Automation should support the new pod structure, not make the old founder-dependent process faster.
2. **Enter data once wherever practical.** Each important field should have one owner and one authoritative home.
3. **Keep Monday operational.** Monday should show ownership, stage, deadlines, risk, next action, and cross-team visibility without trying to replace specialist design or accounting systems.
4. **Keep Studio Designer specialist.** Studio Designer should own detailed specification, procurement, purchasing, proposal, and project-finance records if its implementation and integration capabilities support that model.
5. **Keep Xero authoritative for statutory accounting.** No workflow should create or alter accounting records until ownership, approvals, duplicate prevention, and reconciliation are defined.
6. **Use communication tools as channels, not records of truth.** Important decisions and actions from Outlook, Teams, WhatsApp, and notes must become structured project information where needed.
7. **Start review-first.** Initial automations should prepare, validate, or draft records for human approval before they write, send, or post externally.
8. **Prefer durable quick wins.** Do not build deeply into EstiMAC if the same work will be discarded during the Studio Designer transition.

## Sprint Scope

### 1. Current-State Process Map

Map the real workflow from enquiry through project closeout across these stages:

1. Enquiry and discovery call
2. Initial consultation and design quotation
3. Ideasbook and design consultation
4. Proposal, revisions, and design invoicing
5. Handover from design to project management and procurement
6. Trade quotations, project packs, drawings, and approvals
7. Timeline, purchasing, deliveries, and client updates
8. Installation, snagging, final invoices, reviews, and referrals

For each stage, record:

- accountable role and supporting roles
- system currently used
- information created or changed
- manual re-entry points
- approval or decision required
- downstream handoff
- common delay, error, or exception

### 2. Monday.com Workspace Audit

Review only the boards Caroline identified as live: everything above the Archives section.

Inventory:

- board and dashboard purpose
- groups, columns, statuses, dependencies, mirrors, formulas, and connected boards
- views and dashboards people actually use
- existing automations and integrations
- duplicate client, project, task, and finance fields
- stale or experimental boards
- permissions and ownership
- fields required for the future pod model
- whether each live board supports a decision or merely stores information

The audit must not change live boards during discovery.

### 3. System and Data Ownership Model

Define the intended owner for each core business object:

| Business object | Likely owner | Discovery question |
| --- | --- | --- |
| Lead and opportunity | Monday.com | Which fields are required before design work begins? |
| Client and property | Monday.com or Studio Designer | Which system creates the durable client identifier? |
| Project stage, owner, risk, and next action | Monday.com | Which status changes should trigger downstream work? |
| Design brief and presentation assets | iCloud/Keynote/Coohom, linked from Monday | Which files need structured metadata rather than only folder storage? |
| Product specifications and proposals | Studio Designer | What import, export, and API options are available? |
| Procurement, purchase orders, and delivery | Studio Designer, surfaced in Monday | Which summary fields must be visible to the pod? |
| Accounting transactions and payment status | Xero | Which status can be safely reflected in Monday or Studio Designer? |
| Client and trade communication | Outlook/WhatsApp/Teams | Which actions or decisions must be logged back to the project? |
| Leadership and pod KPIs | Derived from trusted source fields | Which metrics can be calculated reliably today? |

This table is a hypothesis. The sprint must confirm it using live boards, real examples, Studio Designer capabilities, and team interviews.

### 4. Duplicate-Entry and Handoff Register

Create a register of repeated manual work. Each entry should include:

- source and destination systems
- fields being copied
- person doing the work
- frequency and approximate time spent
- error or omission risk
- whether the task will survive the Studio Designer migration
- feasibility of template, import, native integration, Make scenario, API integration, or AI-assisted extraction
- required human approval

The register should distinguish:

- elimination: the second entry is unnecessary
- synchronization: the same value must appear in two systems
- transformation: information must be reformatted or summarized
- communication: a person must be notified or asked to act
- control: a check or approval must happen before continuing

### 5. Pod-Based Future-State Workflow

Design a future-state flow that makes pod ownership visible and reduces unnecessary cross-team communication.

At minimum, define:

- how a new project is assigned to a pod
- when ownership moves from sales to design to project management
- which events require Caroline, Lucy, or a pod lead to intervene
- how project risk and installation readiness are surfaced
- how procurement and finance exceptions are escalated
- how client communication ownership changes by stage
- what each pod reviews in its weekly meeting
- what leadership reviews across all pods

### 6. First Pilot Selection and Design

Select one production pilot, not a portfolio of simultaneous automations.

Candidate workflows should be scored on:

- hours of manual work removed
- number of repeated entries eliminated
- business impact
- data sensitivity
- exception complexity
- dependence on the Studio Designer rollout
- ability to measure success within two to four weeks
- reversibility if the workflow needs adjustment

The leading hypothesis is a review-first data-entry pilot that takes one repeated source, extracts or maps agreed fields, flags missing information, and prepares a record for approval before it reaches Monday.com, Studio Designer, Xero, or a spreadsheet.

Possible pilot candidates to validate:

- create a project once and prepare the matching records required by the next system
- turn an approved design/project handover into a structured project-management intake
- prepare invoice-ready data and supporting references without creating the Xero invoice automatically
- convert supplier updates into structured procurement changes and assigned follow-ups
- generate a client-update draft from approved project status fields

The sprint must not select a pilot only because a prototype already exists. The chosen workflow must be confirmed against current frequency, effort, ownership, and Studio Designer timing.

### 7. KPI and Leadership Reporting Definition

Validate the proposed KPI framework before building dashboards.

Prioritize a small set of metrics that have trusted inputs, clear owners, and an action attached. Likely candidates include:

- pipeline value and future secured revenue
- active projects by pod and stage
- project delivery risk and installation readiness
- invoice turnaround and outstanding debtors
- design-to-project-management conversion
- forecast accuracy
- pod capacity and team utilisation
- project or pod profitability, once source data is reliable

For every KPI, define:

- business question it answers
- exact calculation
- source fields and system
- owner
- update frequency
- data-quality checks
- expected action when the metric is outside tolerance

Do not put the existing experimental Monday KPI boards into production until their source fields and calculations are validated.

## Discovery Activities

### Document and System Review

- Review the live Monday boards above Archives.
- Review existing Monday automations, dashboards, and integrations.
- Review one representative active project and one recently completed project.
- Review a sample EstiMAC proposal, product schedule, or export.
- Review the intended Studio Designer setup, implementation plan, available exports, and integration documentation.
- Review a representative project folder, proposal board, timeline, and client update.
- Review the current Xero handoff at a process level; direct financial access is not required initially.

### Stakeholder Sessions

Run focused sessions rather than one broad workshop:

- Caroline: goals, decision points, founder dependencies, sales, and escalation
- Lucy: systems administration, invoicing, forecasting, data accuracy, and reporting
- Carmen and Philly: project delivery, trade coordination, client communication, and installation readiness
- Sophie and Bethany: design workflow, product entry, presentation creation, and handoff pain

Each session should use one real project example and identify what is entered, copied, checked, chased, and approved.

### Baseline Measurement

For the workflows under consideration, estimate or measure:

- staff time per project or per week
- number of systems touched
- number of repeated fields
- handoff delay
- correction or rework frequency
- missing-information frequency
- number of people unnecessarily copied into communications

These baselines become the comparison point for the first pilot.

## Deliverables

1. **Current-state workflow map** with roles, systems, handoffs, and exceptions.
2. **Monday workspace audit** identifying what is live, duplicated, missing, experimental, or no longer useful.
3. **System and data ownership matrix** for Monday.com, Studio Designer, Xero, and supporting tools.
4. **Duplicate-entry and handoff register** ranked by time, risk, and implementation feasibility.
5. **Pod-based future-state workflow** showing ownership, escalation, and management visibility.
6. **Prioritized automation backlog** grouped into quick wins, foundational changes, and later integrations.
7. **First pilot specification** with trigger, fields, approvals, exception paths, security controls, success measures, and rollback approach.
8. **KPI definition sheet** separating metrics that are ready now from those that require better data first.
9. **Implementation roadmap** for the next 90 days, including dependencies, sequencing, and indicative effort.
10. **Follow-on proposal** with implementation scope, timeline, fee, client responsibilities, and required access.

## Acceptance Criteria

The discovery sprint is complete when:

- every major project stage has an accountable owner and primary system
- the live Monday workspace has been inventoried without changing production data
- repeated-entry points are documented with evidence from real examples
- Studio Designer assumptions are separated from confirmed integration capabilities
- at least three improvement opportunities are scored consistently
- one pilot is selected with measurable success criteria and a human-review path
- each proposed KPI has a definition and trusted source, or is explicitly marked not yet measurable
- Willow Grey can approve, reject, or reprioritize the roadmap before implementation begins

## Out of Scope for Discovery

- changing live Monday boards or permissions
- migrating EstiMAC data into Studio Designer
- configuring Studio Designer for production
- building a full Monday-Studio Designer integration
- creating or changing live Xero transactions
- sending automated client, supplier, or trade messages
- launching AI-generated client communications without review
- implementing the full leadership dashboard
- attempting to move 90% of work into the two core systems during this phase
- guaranteeing API feasibility before vendor/account access is confirmed

## Access and Security

- Monday access should remain read-only during discovery.
- Use redacted examples where full client details are unnecessary.
- Do not download or retain client records beyond what is required for the agreed work.
- Do not copy credentials into documents, automation tools, or messages.
- Any future integration should use named accounts, least-privilege access, documented secrets storage, and revocable tokens.
- No live write, send, or accounting action should be enabled without a separate approval and test plan.

## Immediate Next Steps

1. Complete Duncan's Monday.com account setup from Caroline's invitation. The invitation is valid, but the account-completion screen requires Duncan to set his own Monday password.
2. Audit only the live boards above Archives and record board structure, ownership, automations, integrations, and data duplication.
3. Choose one active project and one completed project as walkthrough examples, with client details redacted where practical.
4. Confirm the Studio Designer implementation status, account owner, migration timing, and available import/export/API options.
5. Hold a focused working session with Lucy while Caroline is away, if Lucy is available, to validate the current finance, reporting, and administration flow.
6. Convert the findings into the short client proposal Duncan already committed to provide: scope, outputs, timeline, fee, and access required.

## Open Questions

- When will Studio Designer implementation begin, and who is leading it?
- Is EstiMAC still expected to be used for new projects during the transition?
- What data can be exported from EstiMAC and imported into Studio Designer?
- Which Monday plan and integration features are available on Willow Grey's account?
- Which native Monday integrations are already enabled, including Xero?
- What is the most time-consuming repeated entry task per week today?
- Which project stage currently creates the most delays or missing information?
- Which project and financial decisions must Caroline still make personally?
- What should Lucy be able to see each week without assembling a report manually?
- Which metrics in the organisational-design document are already calculated from real data?
- Who should own client communication at each project stage in the pod model?
- What level of access and support can the Studio Designer vendor provide for integration discovery?

## Existing Technical Proof

The existing WillowOps prototype demonstrates reusable patterns for:

- Monday-triggered workflow events
- Make.com orchestration
- review-first structured data extraction
- Outlook draft creation
- Studio Designer-shaped CSV normalization
- Xero invoice-status mapping
- WhatsApp-style draft generation
- leadership reporting and automation logs

These are technical proofs, not validated Willow Grey solutions. They should be used to accelerate feasibility work after the discovery sprint selects the real first pilot.
