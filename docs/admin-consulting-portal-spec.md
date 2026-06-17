# Admin Consulting Portal V1 Spec

Date: 2026-06-17  
Project: Duncan Anderson personal site  
Owner: Duncan Anderson  
Route family: `/portal/admin`

## Objective

Turn the existing admin portal into a simple internal hub for managing Duncan's AI consulting work.

V1 should help answer:

- What leads am I working?
- What client projects are active?
- What do I need to do next?
- What proposals or invoices are pending?
- Where is the key context for each project?

This is not a client-facing portal, full CRM, invoicing system, or project management product. It is a lightweight command center for Duncan.

## Existing Context

The site already has:

- Admin auth through the existing portal session system.
- Admin route family at `/portal/admin`.
- Existing admin layout at `src/app/portal/admin/layout.tsx`.
- Current admin home redirecting to `/portal/admin/leads`.
- Existing lead digest data reader in `src/lib/portal/admin/leads.ts`.
- Existing lead digest page at `src/app/portal/admin/leads/page.tsx`.
- Existing lead scan API at `src/app/api/portal/admin/leads/run/route.ts`, protected by the same admin session check.
- Existing environment-driven admin user support through `ADMIN_PORTAL_PASSWORD` / `PORTAL_USERS`.

V1 should extend this existing structure.

## Non-Goals

Do not build these in V1:

- Client-facing project portals.
- Multi-user permissions beyond existing admin-only access.
- A full database-backed CRM.
- Stripe API integration.
- Gmail API integration.
- Calendar integration.
- File upload/storage.
- Automated lead scraping.
- AI chat over project context.
- Public pages.
- Complex task dependencies.
- Time tracking.

## Recommended V1 Shape

Use four admin sections:

1. Dashboard
2. Leads
3. Projects
4. Tasks

Keep the data model file-based or static TypeScript for V1 unless existing project infrastructure already provides a better simple store.

Recommended first implementation:

- `src/app/portal/admin/page.tsx` becomes the dashboard instead of redirecting to leads.
- `src/app/portal/admin/leads/page.tsx` remains or continues to serve the existing lead digest UI.
- Add `/portal/admin/projects`.
- Add `/portal/admin/tasks`.
- Add a small data module under `src/lib/portal/admin/consulting.ts`.

## Navigation

Admin layout should expose:

- Dashboard
- Leads
- Projects
- Tasks
- Sign out

The header should still identify the area as `Duncan Admin`.

## Data Model

V1 can use typed seed data in code. This avoids migrations and lets the portal prove the workflow before adding persistence.

### Lead

Fields:

- `id`
- `name`
- `source`
- `business`
- `painPoint`
- `status`
- `lastContactAt`
- `nextFollowUpAt`
- `valueEstimate`
- `links`
- `notes`

Statuses:

- `New`
- `Contacted`
- `Discovery Booked`
- `Proposal Sent`
- `Won`
- `Lost`
- `Dormant`

### Project

Fields:

- `id`
- `client`
- `project`
- `status`
- `phase`
- `fee`
- `paymentStatus`
- `startedAt`
- `targetDate`
- `nextAction`
- `scope`
- `successCriteria`
- `links`
- `notes`

Statuses:

- `Discovery`
- `Proposal`
- `Active`
- `Waiting on Client`
- `Complete`
- `Paused`

Payment statuses:

- `Not Invoiced`
- `Deposit Sent`
- `Deposit Paid`
- `Final Due`
- `Paid`

### Task

Fields:

- `id`
- `title`
- `projectId`
- `client`
- `status`
- `priority`
- `dueAt`
- `type`
- `notes`

Statuses:

- `Todo`
- `Doing`
- `Waiting`
- `Done`

Priorities:

- `High`
- `Medium`
- `Low`

Types:

- `Client Follow-Up`
- `Build`
- `Proposal`
- `Invoice`
- `Research`
- `Admin`

## Dashboard Requirements

Dashboard should show:

- Active project count.
- Leads requiring follow-up.
- Tasks due today / overdue.
- Pending proposal or invoice count.
- This month's booked revenue, calculated from seed project fee data if available.

Dashboard sections:

1. `Today`
   - Tasks due today or overdue.
   - Waiting-on-client items.

2. `Active Projects`
   - Client/project name.
   - Current phase/status.
   - Next action.
   - Payment status.

3. `Follow-Ups`
   - Leads or clients with next follow-up due.

4. `Recent / Important Links`
   - Alex Airtable sandbox.
   - Stripe invoice link if available.
   - Cal booking link.
   - Lead tracker / relevant docs.

## Projects Page Requirements

Projects page should show a compact table/card list of all current consulting projects.

For each project show:

- Client
- Project name
- Status
- Phase
- Fee
- Payment status
- Target date
- Next action

For V1, a project detail page is optional. If implemented, route should be:

- `/portal/admin/projects/[id]`

Project detail should show:

- Scope
- Success criteria
- Open tasks
- Links
- Notes

## Tasks Page Requirements

Tasks page should be organized for action, not exhaustive project management.

Sections:

- Overdue
- Today
- This Week
- Waiting
- Backlog

Each task should show:

- Title
- Client/project
- Priority
- Due date
- Type
- Status

V1 does not need inline editing. Static data is acceptable.

## Leads Page Requirements

Keep the existing Reddit lead digest functionality intact.

If adding manual consulting leads to the same page, clearly separate:

- `Lead Digest`
- `Manual Pipeline`

Do not break current lead monitor parsing or published digest behavior.

## Initial Seed Data

Add at least one real project:

### Alex Parker

- Client: Alex Parker
- Project: Airtable Turn-Season Workflow
- Status: Active
- Phase: Sandbox prototype / awaiting client feedback
- Fee: `$750`
- Payment status: Deposit Paid
- Next action: Wait for Alex sandbox feedback, then revise or prepare live rollout
- Links:
  - Sandbox Interface URL
  - Local implementation spec path
  - Proposal / scope notes if available

Optional seed records:

- Reddit lead generation project / internal.
- Personal site admin portal project / internal.

## UI Direction

Keep the UI quiet and utilitarian.

Use:

- dense but readable cards/tables
- small status pills
- restrained colors
- clear section headings
- no marketing hero
- no decorative graphics
- no nested cards

This should feel like an operator dashboard, not a public landing page.

Responsive requirements:

- Dashboard, Projects, and Tasks must be usable on laptop and phone widths.
- Tables can become stacked rows/cards on small screens.
- Text should wrap cleanly; no horizontal page overflow.
- Empty states should be explicit, e.g. `No tasks due today`.
- External links should open safely with `target="_blank"` and `rel="noreferrer"` where appropriate.

## Technical Approach

Recommended files:

- `src/lib/portal/admin/consulting.ts`
  - types
  - seed data
  - helper selectors for dashboard metrics

- `src/app/portal/admin/page.tsx`
  - dashboard

- `src/app/portal/admin/projects/page.tsx`
  - project list

- `src/app/portal/admin/tasks/page.tsx`
  - task queue

- optional: `src/app/portal/admin/projects/[id]/page.tsx`
  - project detail

Update:

- `src/app/portal/admin/layout.tsx`
  - admin nav links
  - default login redirect can remain `/portal/admin` or `/portal/admin/leads`

Avoid new dependencies.

Implementation notes:

- Prefer server components for Dashboard, Projects, and Tasks because v1 is read-only/static.
- Add client components only if interaction is actually needed.
- Keep helper logic in `consulting.ts` small and deterministic.
- Use ISO date strings in seed data and format dates in the UI.
- Avoid real sensitive client details in seed data; link to local docs or external tools only where useful.
- Do not reuse the `RedditLead` type name for manual consulting leads if that creates confusion with the existing lead digest parser.
- Preserve the existing Leads page styling/functionality; do not refactor it as part of this v1 unless required for navigation consistency.

## Implementation Order

1. Add `src/lib/portal/admin/consulting.ts` with typed seed data and dashboard helper functions.
2. Update `src/app/portal/admin/layout.tsx` navigation to include Dashboard, Leads, Projects, and Tasks.
3. Replace the `/portal/admin` redirect with the Dashboard page.
4. Add `/portal/admin/projects`.
5. Add `/portal/admin/tasks`.
6. Verify `/portal/admin/leads` still renders and scan controls are unchanged.
7. Run `npm run lint`.

Do not add persistence, edit forms, or external integrations in this pass.

## Access / Security

V1 uses existing admin session protection.

Requirements:

- Admin pages must stay under `/portal/admin`.
- Existing `AdminLayout` session check must continue protecting all admin routes.
- Existing `/api/portal/login` and `/api/portal/logout` behavior should not change.
- Existing `/api/portal/admin/leads/run` authorization behavior should not change.
- Non-admin portal users must not access admin routes.
- Portal pages remain `noindex`.
- Do not expose sensitive client contact details unless needed.
- Do not store secrets in seed data.

## Acceptance Criteria

V1 is complete when:

- `/portal/admin` shows a useful dashboard instead of redirecting straight to leads.
- Admin nav includes Dashboard, Leads, Projects, Tasks, and Sign out.
- `/portal/admin/projects` shows at least Alex's active project.
- `/portal/admin/tasks` shows actionable grouped tasks.
- Existing `/portal/admin/leads` behavior still works.
- Existing lead scan API behavior still works or is untouched.
- Admin auth behavior is unchanged.
- Pages render cleanly at mobile and desktop widths.
- Empty sections have clear empty states.
- No real client secrets, private contact details, or payment links are hardcoded.
- `npm run lint` passes.

## Future Enhancements

Only consider after V1 is useful:

- Persistent storage for manual projects/tasks.
- Edit forms.
- Project detail pages with notes and deliverables.
- Stripe invoice status sync.
- Gmail/Cal context links.
- Per-client private portals.
- AI summary over project context.
- Automated follow-up reminders.
