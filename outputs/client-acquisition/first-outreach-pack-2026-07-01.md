# First Outreach Pack - AI Automation Client Acquisition - 2026-07-01

Purpose: convert the current research into practical outreach without spending more Upwork connects.

Rule for this pack: public replies should be useful and low-pitch. DMs are only for explicit paid asks, posts inviting contact, or people who engage after the public reply.

## Immediate Queue

### 1. Reddit r/forhire - Universal Intent Engine

- Source: `outputs/ai-consulting-leads/2026-07-01.md`
- Prospect: `Emergency-Anybody734`
- URL: `https://www.reddit.com/r/forhire/comments/1ufdkbq/hiring_lead_gen_ai_automation_engineer_to_build/`
- Why first: explicit hiring post, clear stack fit, public budget, lead-gen automation project.
- Action: public comment plus DM.

Public reply:

```text
This is the kind of thing I would not try to build all at once. I would start with one or two source types, get the Clay enrichment and scoring clean, then make the alert/review step reliable before adding more channels.

The review step matters a lot here. If every signal goes straight into outbound, you will spend a bunch of time cleaning up bad matches later.
```

DM:

```text
Hi, I saw your Universal Intent Engine post. This is close to the automation work I build: lead capture, enrichment, scoring, routing, and human-reviewed follow-up.

I would scope a V1 around two source channels into Clay, a qualification layer, and a review queue before anything outbound fires. That keeps the first build useful without turning it into a giant system on day one.

Background: https://www.duncananderson.ca/en
Booking: https://cal.com/duncan-anderson-sdo5hp/ai-automation-discovery-call
```

### 2. Make Community - Retell AI Webhook Mapping

- Source: `outputs/ai-consulting-leads/2026-07-01.md`
- Prospect: `Joseph_Linco`
- URL: `https://community.make.com/t/retell-ai-webhook-data-not-mapping-through-make-ai-toolkit-to-downstream-modules/111482`
- Why first: explicit Make engineering help request, concrete broken workflow, likely small paid troubleshooting pass.
- Action: public reply. DM only if the forum allows it or the poster engages.

Public reply:

```text
I would debug this by putting the raw Retell payload, the AI Toolkit output, and the downstream bundle next to each other for the same call. Usually the fix is not rebuilding the whole scenario, it is normalizing the fields once before Calendar/Outlook/Twilio/Sheets touch them.

If the downstream modules are each mapping slightly different versions of the same value, it will keep breaking in annoying ways.
```

DM:

```text
Hi Joseph, I saw your Retell/Make AI Toolkit mapping issue. I handle these as fixed troubleshooting passes: inspect one good webhook payload, normalize the AI Toolkit output into stable JSON fields, then remap the downstream modules with a short before/after note.

If you are looking to pay someone to get this unstuck, my background is here: https://www.duncananderson.ca/en
Booking: https://cal.com/duncan-anderson-sdo5hp/ai-automation-discovery-call
```

### 3. Airtable Community - FallLine Process Automation

- Source: `outputs/ai-consulting-leads/2026-07-01.md`
- Prospect: `dbloemhof`
- URL: `https://community.airtable.com/jobs-board-16/airtable-process-automation-and-agent-integration-e-g-make-api-48303`
- Why first: explicit freelance support request around Airtable, Make/API, AI intake, matching, and email automation.
- Action: public reply plus DM/contact if available.

Public reply:

```text
I would split this into three pieces before building: the matching rules, the AI intake output format, and the email/send logic. Airtable should probably stay as the place where a person can review the record and see what happened.

Make/API can do the moving parts, but I would avoid letting the automation make invisible decisions until the matching rules are boring and repeatable.
```

DM:

```text
Hi, I saw your FallLine Airtable process automation post. I build Airtable/Make/API systems where Airtable stays the reviewable source of truth and the automation handles the repeatable handoffs.

For your case I would start with a small proof build: matching logic, AI intake processing, and one email automation path with logs. Then expand once the rules are stable.

Background: https://www.duncananderson.ca/en
Booking: https://cal.com/duncan-anderson-sdo5hp/ai-automation-discovery-call
```

### 4. Reddit r/CRM - Custom CRM for Tennis Centre

- Source: `outputs/lead-lists/explicit_help_request_leads_2026-06-30.csv`
- Prospect: `u/360gamer101`
- URL: `https://www.reddit.com/r/CRM/`
- Why first: real operating system need: bookings, invoices, SMS/email, functions, casual court hire, and portal.
- Action: public reply first; DM only after engagement or if the thread invites paid help.

Public reply:

```text
I would map the tennis centre operations before picking the CRM. Weekly lessons, casual court hire, functions, invoices, and player messages are probably not one generic CRM problem.

The decision I would make first is what system owns the booking/event record. Once that is clear, the rest can hang off it: invoices, reminders, player notes, and portal/status updates. If you pick a CRM before that, you may end up fighting the calendar model forever.
```

DM after engagement:

```text
Hi, saw your tennis centre CRM post. If you decide this is something you want outside help with, I can help map the operating model and turn it into a build/configuration plan around bookings, billing, messages, and portal updates.

Background: https://www.duncananderson.ca/en
Booking: https://cal.com/duncan-anderson-sdo5hp/ai-automation-discovery-call
```

### 5. Reddit r/CRM - Donor Management Around Tessitura/Ticketmaster

- Source: `outputs/lead-lists/explicit_help_request_leads_2026-06-30.csv`
- Prospect: `u/justcheckingin38`
- URL: `https://www.reddit.com/r/CRM/comments/1u7nucs/crm_for_donor_management_to_complement/`
- Why first: high-value nonprofit operations/reporting problem with existing systems and manual tax receipts/benefits.
- Action: public reply first; DM only after engagement.

Public reply:

```text
I would be careful about treating this as a CRM replacement question. If Tessitura/Ticketmaster are staying, the useful layer may be reporting, donor relationship notes, benefits tracking, and receipt workflows around them.

The thing I would map is where each record is supposed to live: ticketing, donations, memberships/benefits, contacts, and reporting. Once that is clear, you can decide whether you need a CRM, Airtable-style ops layer, or just cleaner integrations and reports.
```

DM after engagement:

```text
Hi, I saw your donor management post. If you end up wanting paid help mapping the options, this is the kind of systems problem I work on: existing ticketing/CRM tools, reporting, manual handoffs, receipts, and workflow cleanup without forcing a full rip-and-replace.

Background: https://www.duncananderson.ca/en
Booking: https://cal.com/duncan-anderson-sdo5hp/ai-automation-discovery-call
```

### 6. Reddit r/CRM - Consultancy CRM for 5-10 Employees

- Source: `outputs/lead-lists/explicit_help_request_leads_2026-06-30.csv`
- Prospect: `u/Delicious-Anybody742`
- URL: `https://www.reddit.com/r/CRM/comments/1u4jy1k/crm_for_a_consultancy_business_managing_clients/`
- Why first: small business process design need across sales, quoting, work allocation, portal updates, and Xero.
- Action: public reply first; DM only after engagement.

Public reply:

```text
For a 5-10 person consultancy, I would keep the first version boring. Separate the sales pipeline from the work pipeline, then define the handoff between quote accepted, job created, task owner assigned, and invoice/accounting update.

The tech-resistant user point matters. A slightly less powerful setup that people actually update will beat a fancy CRM that becomes stale after two weeks.
```

DM after engagement:

```text
Hi, I saw your consultancy CRM post. If you decide to pay someone to map and set this up, I can help turn the sales/quote/job/Xero flow into a simple system your team can actually maintain.

Background: https://www.duncananderson.ca/en
Booking: https://cal.com/duncan-anderson-sdo5hp/ai-automation-discovery-call
```

### 7. Reddit r/CRM - High-Volume Lead SMS Automation

- Source: `outputs/lead-lists/explicit_help_request_leads_2026-06-30.csv`
- Prospect: `u/MaxDmitrie`
- URL: `https://www.reddit.com/r/CRM/comments/1u8xlnq/we_generate_a_high_volume_of_leads_each_month/`
- Why next: direct lead follow-up automation need, but public reply should be careful around compliance and handoff.
- Action: public reply first.

Public reply:

```text
I would separate the texting tool from the process design. The important parts are: where the lead comes from, how consent/opt-out is handled, what counts as a qualified reply, when the automation stops, and who owns the human follow-up.

Most tools can send the SMS. The messy part is reply handling and making sure a hot lead does not sit in some disconnected inbox.
```

DM after engagement:

```text
Hi, saw your SMS automation post. If you decide to pay someone to design/build it, I can help with the intake, reply handling, qualification, stop rules, and CRM handoff so it is not just another blasting tool.

Background: https://www.duncananderson.ca/en
Booking: https://cal.com/duncan-anderson-sdo5hp/ai-automation-discovery-call
```

### 8. Reddit r/AiAutomations - Agency Job Hunting and Proposals

- Source: `outputs/lead-lists/explicit_help_request_leads_2026-06-30.csv`
- Prospect: `u/Holiday-Occasion4189`
- URL: `https://www.reddit.com/r/AiAutomations/comments/1tz9hao/looking_for_a_tool_to_automate_job_hunting_and/`
- Why next: relevant to lead monitoring and proposal drafting, but likely tool-shopping unless budget appears.
- Action: public reply first.

Public reply:

```text
I would not try to fully automate proposal sending at the start. I would build the system around catching opportunities, sorting them, drafting a rough first pass, and assigning a human owner to approve/send.

For a five-person agency, the win is probably not "send more proposals automatically." It is making sure good-fit jobs do not disappear while everyone is busy with client work.
```

DM after engagement:

```text
Hi, saw your agency proposal automation post. If you decide to pay someone to build the first version, I can help with opportunity monitoring, qualification, draft generation, review/approval, and follow-up tracking.

Background: https://www.duncananderson.ca/en
Booking: https://cal.com/duncan-anderson-sdo5hp/ai-automation-discovery-call
```

## Agency / Subcontractor Messages

Use these for Make/n8n/Airtable freelancers or small agencies that already sell automation and may need overflow implementation.

### Short version

```text
Hi [name], I noticed you are taking on Make/n8n/Airtable automation work.

If you ever need overflow implementation help, I can take scoped builds off your plate: API glue, Airtable bases, Make/n8n scenarios, AI review steps, CRM handoffs, and QA/error handling.

I am not trying to compete for your clients. I am looking for subcontract work where the scope is already sold or close to sold.

Background: https://www.duncananderson.ca/en
```

### More specific version

```text
Hi [name], saw your work around [Make/n8n/Airtable/CRM].

I am looking for implementation/subcontract work on practical automation builds: fixing brittle scenarios, connecting APIs, adding human review steps, cleaning up Airtable/CRM handoffs, and documenting the system so the client can operate it.

If you ever sell a project and need another builder behind the scenes, I would be interested.

Background: https://www.duncananderson.ca/en
```

## Upwork Connect Policy

Do not spend connects today unless all of these are true:

- The post names a stack Duncan can credibly implement quickly.
- The post has a narrow first deliverable.
- The buyer has recent spend/history or a clear budget.
- The proposal can reference a directly relevant work sample.
- It is not a generic AI chatbot, vague automation, or low-budget research task.

Current Upwork leads from the July 1 scan are useful for positioning, but they should not outrank free, explicit public demand in Reddit, Make, Airtable, n8n, and PeoplePerHour.

## Today's Execution Block

1. Post public replies to items 1-3.
2. Send DMs for items 1 and 3 if platform/contact rules allow.
3. Post public replies to items 4-6.
4. Send 5 subcontractor messages to active Make/n8n/Airtable sellers.
5. Log every action in the portal/tracker with status: `commented`, `dm_sent`, `watch`, or `replied`.

