# Daily Client Acquisition Runbook - 2026-07-01

Goal: create real conversations for AI automation work without buying more Upwork connects or sending broad cold-email batches.

## Daily Inputs

- Latest automation digest: `outputs/ai-consulting-leads/YYYY-MM-DD.md`
- Outreach tracker: `outputs/client-acquisition/outreach-action-tracker-2026-07-01.csv`
- Direct reply drafts: `outputs/client-acquisition/first-outreach-pack-2026-07-01.md`
- Partner drafts: `outputs/client-acquisition/partner-prospecting-pack-2026-07-01.md`
- Public offer page: `https://www.duncananderson.ca/en/ai-workflow-audit`

## Morning Scan

1. Run `/codex-automation-lead-scan`.
2. Confirm the digest has:
   - explicit posted dates
   - no more than 4 Upwork leads
   - at least 5 source families checked when possible
   - direct-client and partner-overflow opportunities separated
   - a free-to-pursue path for each top lead
3. Add the best new leads to the tracker with one of:
   - `draft_ready`
   - `needs_manual_review`
   - `watch`
   - `skip`

## Daily Outreach Block

Minimum daily actions:

- 5 public replies to direct-client help requests
- 3 DMs only where the post shows paid intent or invites contact
- 5 partner/subcontractor messages
- 2 follow-ups from prior replies or DMs

Do not count browsing, saving posts, or rewriting drafts as outreach actions.

## Public Reply Rules

- Answer the actual post, not a generic version of the problem.
- No website link in public replies unless the post asks for contact info.
- Keep it practical and short.
- Mention one useful diagnosis or implementation boundary.
- Avoid sounding like an agency pitch.

## DM Rules

Use a DM only when at least one is true:

- The post is an explicit paid/hiring request.
- The poster asks people to DM.
- The poster replies positively to a public comment.
- The platform norm supports direct applications.

DM structure:

1. Name the exact workflow they posted.
2. State the narrow version Duncan would build or fix first.
3. Give one proof link when appropriate: `https://www.duncananderson.ca/en/ai-workflow-audit`
4. Include booking link only when the person has shown paid intent.

## Partner Message Rules

Target:

- Make/n8n/Airtable automation agencies
- solo automation sellers
- CRM/RevOps consultants
- web shops selling AI or automation add-ons

Pitch:

> I am looking for scoped implementation or rescue work behind the scenes, not to compete for your client relationship.

Offer one narrow trial:

> Send me one broken workflow or one scoped build and I will map the repair path before implementation.

## Logging

Update the tracker after each action:

- `commented`
- `dm_sent`
- `partner_sent`
- `replied`
- `followed_up`
- `booked_call`
- `paid_scope_discussed`
- `closed_won`
- `closed_lost`
- `watch`
- `skip`

Add timestamps in `posted_or_sent_at` and follow-up dates in `next_follow_up_at`.

## Follow-Up Timing

- Public comment with no reply: check again after 24 hours.
- DM with no reply: follow up once after 48 hours if the post was explicit paid intent.
- Partner note with no reply: follow up once after 5 business days.
- Any positive reply: respond same day with a narrow next step.

## Daily Review

At the end of the day, count:

- public replies posted
- DMs sent
- partner notes sent
- positive replies
- calls booked
- paid scopes discussed

If there are fewer than 2 positive replies after 3 days:

- tighten the offer around one pain category
- use fewer generic automation words
- lead with a more specific repair path
- reduce public replies to broad tool-shopping posts
- increase partner/subcontracting messages

