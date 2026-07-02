# Top Five Copy/Paste Pack - 2026-07-01

Purpose: the exact five messages to send manually today. These use the verified live proof link: `https://www.duncananderson.ca/en/ai-workflow-audit`.

Do not mark a tracker row as sent until the message is actually posted/sent.

## 1. Reddit r/forhire - Universal Intent Engine

Tracker row: `1`

URL: `https://www.reddit.com/r/forhire/comments/1ufdkbq/hiring_lead_gen_ai_automation_engineer_to_build/`

Channel: Reddit DM

Subject:

```text
Universal Intent Engine
```

Message:

```text
I saw your Universal Intent Engine post. I build practical lead and ops automation systems, and I would keep your V1 tighter than the full vision: two source channels into Clay, a qualification layer, and a human-reviewed alert queue before any founder outreach fires.

The part I would be careful with is the intent filter. Scraping more sources is easy to make noisy; the useful build is the part that rejects weak signals and keeps the decision trail visible.

Relevant proof: https://www.duncananderson.ca/en/ai-workflow-audit

For a basic V1 with two channels into Clay/Zapier or Make, I would expect roughly 1-2 weeks depending on source access and how clean the Clay waterfall needs to be. First thing I would ask is which two channels you want to prove before expanding: community/forum intent, funding/news signals, or website visitor enrichment.
```

After sending: `status=sent`, `posted_or_sent_at=2026-07-01`, `next_follow_up_at=2026-07-03`.

## 2. PeoplePerHour - WooCommerce & API Integration Developer

Tracker row: `15`

URL: `https://www.peopleperhour.com/freelance-jobs/technology-programming/e-commerce-cms-development/woocommerce-api-integration-developer-4506356`

Channel: PeoplePerHour proposal/message

Message:

```text
Hi Tony,

I would approach this as a payment-event reliability rebuild, not just another Zapier cleanup.

The first thing I would map is the post-payment chain:

Stripe verified event -> WooCommerce order -> PDF delivery -> QuickBooks receipt/invoice -> tracking/log record -> delayed follow-up emails.

The important pieces are idempotency and retries. A QuickBooks outage should not resend the PDF. A webhook retry should not create a duplicate invoice. A failed follow-up job should be visible in logs instead of silently dying.

For the first phase, I would suggest:

1. inspect the current WooCommerce/Stripe/Zapier path
2. define the exact event that is allowed to trigger fulfillment
3. decide whether this should stay in Zapier with better guards or move into a small WordPress/plugin/webhook layer
4. implement one reliable paid-order path with logs and retry handling
5. test duplicate, failed-sync, and delayed-email cases

Relevant proof of the kind of work I do: https://www.duncananderson.ca/en/ai-workflow-audit

Questions before estimating tightly:

- Is PDF delivery currently generated dynamically, or is it a fixed file/download per SKU?
- Is QuickBooks sync failing because of Zapier steps, customer/item matching, tax calculation, or API downtime?
- Do you want the follow-up emails inside WordPress/WooCommerce, or through a transactional provider?
```

Short version if the platform box is tight:

```text
Hi Tony, I would treat this as a payment-event reliability rebuild: Stripe verified event -> WooCommerce order -> PDF delivery -> QuickBooks sync -> tracking/logs -> delayed follow-ups.

The key is idempotency. A webhook retry should not create a duplicate invoice, and a QuickBooks failure should queue/retry without resending the PDF or breaking checkout. I would start by mapping the current Zapier failure points, then decide whether to harden Zapier or move the fragile steps into a small webhook/plugin layer.

Relevant proof: https://www.duncananderson.ca/en/ai-workflow-audit
```

After sending: `status=sent`, `posted_or_sent_at=2026-07-01`, `next_follow_up_at=2026-07-03`.

## 3. Make Community - Retell AI Webhook Mapping

Tracker row: `2`

URL: `https://community.make.com/t/retell-ai-webhook-data-not-mapping-through-make-ai-toolkit-to-downstream-modules/111482`

Channel: public Make reply first

Public reply:

```text
I would debug this by putting the raw Retell payload, the AI Toolkit output, and the downstream bundle next to each other for the same call.

Usually the fix is not rebuilding the scenario. It is normalizing the client fields once before Calendar, Outlook, Twilio, and Sheets touch them. I would test with 4-5 fixed keys first: client_name, phone, email, appointment_time, summary. If Sheets receives those cleanly, the issue is AI Toolkit output shape/parsing, not Retell or the downstream apps.
```

DM after engagement:

```text
Hi Joseph, I saw your Retell/Make mapping issue.

If you are looking to pay someone to fix it, I would handle it as a focused troubleshooting pass: inspect one successful webhook payload, normalize the AI Toolkit output into stable JSON fields, then remap Calendar/Outlook/Twilio/Sheets from those fields and leave a short before/after note.

Relevant page: https://www.duncananderson.ca/en/ai-workflow-audit
```

After posting: `status=commented`, `posted_or_sent_at=2026-07-01`, `next_follow_up_at=2026-07-02`.

## 4. Synergy Effect - AI Automation Engineer / n8n & AI Agent Developer

Tracker row: `23`

URL: `https://community.n8n.io/t/hiring-ai-automation-engineer-n8n-ai-agent-developer/294904`

Channel: email application to `info@s-e.lt`, then optional short public note

Subject:

```text
Project-based AI automation / n8n contractor application
```

Email:

```text
Hi Tomas / Synergy Effect team,

I saw your AI Automation Engineer / n8n & AI Agent Developer post. The part that stood out to me is your line that an AI agent is not just a prompt. I agree with that. In paid client work I would rather define the process, data shape, validation path, retry/error behavior, and handoff notes before making the model step bigger.

Answers to your questions:

1. What n8n, AI agent or RPA solution have you built?
I have been building AI-assisted business automation around lead research, public-source scanning, scoring, review queues, and portal publishing. The most relevant current system is a recurring lead-research and admin-dashboard workflow that gathers public opportunities, classifies them, writes a digest, publishes rows into Supabase, and verifies what loaded.

2. Which systems did you integrate?
Next.js/TypeScript, Supabase/Postgres, Vercel Blob, OpenAI-style structured outputs, public web sources, CSV/Markdown reporting, Google-style workflow handoffs, and admin UI review surfaces. I am also comfortable around REST APIs, webhooks, Airtable-style queues, Google Workspace, and Make/Zapier-style automation logic.

3. What was the business problem?
The goal was to stop relying on manual spreadsheet hunting and cold outreach guesses. The system needed to find current AI automation buyer intent, separate real leads from stale or generic posts, publish the best rows into an internal admin board, and keep the source evidence visible.

4. What solution did you create?
A public-source lead scan workflow with scoring rules, source-diversity checks, generated digests, status JSON, Supabase publishing, admin-board parsing, and verification checks. I also added fields for lead type and free-to-pursue path so the operator can focus on no-credit/no-Connect opportunities first.

5. What was the result?
It produces a daily shortlist of scored automation leads with proof links, suggested replies, and tracker rows. The useful part is not just the list; it is the review trail, rejected/source notes, and the ability to see exactly what loaded into the admin surface.

6. Have you worked with OpenClaw or similar agent frameworks?
Not OpenClaw specifically. I have worked with Codex-style agent workflows, local skills/runbooks, structured tool use, and human-in-the-loop automation. I would be transparent about ramping on OpenClaw, but the underlying patterns are familiar: controlled tool access, repeatable instructions, bounded outputs, logging, and review before action.

7. What is your availability for project-based remote cooperation?
Project-based remote work is exactly what I am looking for right now. I can take on a contained first slice and expand if the first delivery is useful.

8. What is your preferred cooperation model and compensation expectation?
I prefer a paid first slice with a concrete deliverable: workflow contract, implementation, test cases, error/retry behavior, and handoff notes. After that, fixed-scope projects or part-time ongoing implementation work both fit. Compensation depends on scope, but I am not looking for unpaid trial work.

Relevant proof/context: https://www.duncananderson.ca/en/ai-workflow-audit

Duncan
https://www.duncananderson.ca/en
```

Optional public note after emailing:

```text
I emailed the full application and answered the eight questions in the post. The fit for me is a contained project-based slice where the output is more than a workflow canvas: input/output contract, error and retry behavior, test cases, and handoff notes.
```

After sending: `status=sent`, `posted_or_sent_at=2026-07-01`, `next_follow_up_at=2026-07-04`.

## 5. TargetPatientsMD - Freelance AI Automation Engineer

Tracker row: `19`

URL: `https://community.n8n.io/t/hiring-freelance-ai-automation-engineer-remote/299853`

Channel: email to `kat@targetpatientsmd.com`

Subject:

```text
Scale - Claude/n8n lead-gen workflow reliability
```

Email:

```text
Scale

Hi Kat,

I saw your post for a freelance AI automation engineer. My fit is implementation and repair work around AI-assisted lead-gen systems: source data, enrichment, structured Claude/OpenAI output, CRM handoff, logging, and workflow paths that need to keep running after the first demo.

For your existing outbound engine, I would start on reliability before volume:

- define the scraped lead record shape before enrichment
- add dedupe and rejection reasons so weak records do not flow downstream
- keep Claude output constrained enough that Instantly or GHL is not guessing
- make failed or uncertain records visible for review instead of silently dropping them

I have not run your exact medical lead-gen stack, so I would not pitch a broad takeover blindly. The first paid slice I would suggest is one path: scraped source lead -> AI qualification/enrichment -> CRM or campaign handoff -> rejection/logging path. If that slice is clean, then it makes sense to talk about retainer work.

Relevant proof/context: https://www.duncananderson.ca/en/ai-workflow-audit

Stack I am comfortable around: TypeScript/Next.js, Postgres/Supabase, APIs/webhooks, OpenAI/Claude workflows, Google Workspace, Airtable-style review queues, and human-approved automation systems.

Preferred arrangement: fixed first slice or short paid rescue/audit, then ongoing project-based work if the first result is useful.

Duncan
https://www.duncananderson.ca/en
```

After sending: `status=sent`, `posted_or_sent_at=2026-07-01`, `next_follow_up_at=2026-07-04`.
