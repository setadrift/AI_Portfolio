export const ALEX_GMAIL_SWEEP_SKILL = `Gmail Sweep Workflow For Rental Email Review

Purpose
Use this workflow with Claude and your Gmail/Airtable connectors to review rental-related email, classify what matters, and prepare Airtable updates for approval.

Important safety rule
Do not send emails, delete emails, move emails, label emails, or update Airtable records automatically. First show the proposed actions and ask for approval.

What the sweep should look for
- Move-in replies
- Move-out replies
- Utility setup confirmations
- Apts.com setup confirmations
- Tenant questions or requests
- Repair or damage reports
- Security-deposit issues
- Lowe's, Home Depot, contractor, receipt, or invoice emails
- New threads that are not replies to the original move-in/move-out email
- Forwarded messages where the useful information may be lower in the thread

Search strategy
Search recent rental email first, then expand if needed.

Suggested Gmail searches:
- newer_than:14d (move in OR move-in OR move out OR move-out OR utilities OR Apts.com OR repair OR receipt OR invoice OR Home Depot OR Lowe's)
- newer_than:30d (security deposit OR damage OR keys OR move date OR contractor)
- from:(homedepot.com OR lowes.com) newer_than:60d

Read full messages where possible. Do not rely only on Gmail snippets.

Classification categories
For each relevant email, classify it as one of:
- move_in_response
- move_out_response
- repair_issue
- receipt_or_invoice
- tenant_question
- no_action
- unclear_needs_review

Output sections
Return the sweep in these sections:

1. Needs Action
Emails that appear to need a reply, a decision, or an Airtable follow-up flag.

2. Ready For Airtable
High-confidence facts that are clear enough to prepare as Airtable updates, but still require approval before writing.

3. Waiting On Tenant
Items where the next step is waiting for a tenant reply or missing tenant information.

4. Unclear / Needs Manual Review
Items that may matter but should not be written into operational tables yet.

5. No Action Needed
Messages reviewed but skipped.

Airtable destination rules
- Move-in replies, requested move-in dates, utility setup, Apts.com setup, and move-in questions should map to 2026 Move In.
- Move-out dates, SD return name/address, furniture, utility replies, and security-deposit logistics should map to 2026 Move Out.
- Repair, contractor, damage, material, and field issues should map to Turn Repairs.
- Receipt and invoice items should first map to a review queue unless the destination is unquestionably clear.
- Unclear tenant questions and low-confidence matches should map to a review queue, not a permanent operational table.

Recommended review output for each email
- Subject
- Sender
- Date
- Classification
- Matched property, if any
- Matched tenant/person, if any
- Suggested Airtable destination
- Confidence: high, medium, or low
- Summary
- Proposed Airtable update
- Recommended action
- Whether it is safe to write after approval

Approval rule
Before writing to Airtable, show a short queue:

"I found X proposed Airtable updates and Y manual-review items. Do you want me to apply the high-confidence updates?"

Only write after approval.

Never write if:
- the property match is uncertain
- the tenant/person match is uncertain
- the email appears to contain multiple unrelated issues
- the message is only a receipt with no clear property
- the update would overwrite existing notes instead of appending
- the update would affect live data without explicit approval

Notes behavior
When adding notes, append a dated summary rather than replacing existing notes.

Suggested note format:
[YYYY-MM-DD Gmail sweep] Summary from email: ...
Source: sender / subject / date
Action needed: yes/no

Duplicate handling
Track which Gmail message IDs have already been processed. Do not process the same message again unless asked to rescan.

Final response format
Finish each sweep with:
- emails reviewed
- proposed updates
- items needing manual review
- skipped/no-action items
- what was written, if anything
- confirmation that nothing was written without approval
`;
