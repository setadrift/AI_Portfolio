---
name: gmail-sweep
description: "Run the Alex Parker Gmail-to-Airtable sweep prototype. Searches Gmail, classifies rental emails, prepares Airtable updates, and writes only approved sandbox changes."
allowed-tools:
  - Bash
  - Read
  - Grep
user-invocable: true
---

# /gmail-sweep

Run a controlled Gmail-to-Airtable sweep for Alex Parker's rental workflow.

This is a prototype, not a scheduled production automation. Default to dry-run unless Duncan explicitly approves sandbox writes in the current conversation. Never send email, move/label email, delete email, or write to Alex's live Airtable base.

## Default Safety Rules

- Use sandbox Airtable base only: `appRB4L3wVfpN9tIb`.
- Do not touch live base `app2KyW4e15ghRQDZ`.
- Use a bounded Gmail search query.
- For Duncan's demo, use `subject:"[Alex Sandbox Gmail Sweep Demo]" newer_than:7d`.
- Read full messages/threads where available; do not rely only on snippets.
- Show proposed changes before writing.
- Ask for explicit approval before any Airtable write.
- If Duncan has already explicitly approved sandbox writes, apply only the high-confidence approved-write queue to the sandbox and then verify the changed records.
- Apply at most 3 writes unless the user explicitly approves more.
- Append to notes; never replace existing notes.
- Keep medium/low confidence matches in manual review.
- Track processed Gmail message IDs only after successful Airtable MCP writes and skip those IDs on later runs unless the user explicitly asks to rescan.

## Local Fixture Demo

To prove the flow without Gmail/Airtable writes:

```bash
node client-work/alex-parker/prototypes/gmail-sweep-agent/gmail-sweep-agent.mjs
```

To simulate approved writes against a local JSON copy:

```bash
node client-work/alex-parker/prototypes/gmail-sweep-agent/gmail-sweep-agent.mjs --apply-local
```

After `--apply-local`, the prototype writes a processed-message ledger:

```text
client-work/alex-parker/prototypes/gmail-sweep-agent/outputs/processed-message-ids.json
```

Later runs skip approved/applied message IDs by default. To intentionally reprocess them:

```bash
node client-work/alex-parker/prototypes/gmail-sweep-agent/gmail-sweep-agent.mjs --include-processed
```

Important: `--apply-local` is only a local JSON simulation. It does not prove Airtable was updated and should not be treated as a real Gmail/Airtable processed ledger. For real MCP runs, record the actual Gmail message IDs only after Airtable MCP updates succeed.

For real Gmail-to-Airtable MCP runs, use a separate processed-message ledger:

```text
client-work/alex-parker/prototypes/gmail-sweep-agent/outputs/processed-gmail-message-ids.json
```

## MCP Connector Flow

When Gmail and Airtable MCP tools are available:

1. Search Gmail for message IDs using the bounded query.
2. Read the returned message bodies.
3. Check `outputs/processed-gmail-message-ids.json` and skip any Gmail message IDs already written in a previous approved sandbox MCP run.
4. Convert remaining Gmail results into the local email fixture shape:

```json
{
  "id": "gmail-message-id",
  "threadId": "gmail-thread-id",
  "date": "ISO timestamp",
  "from": "Sender <sender@example.com>",
  "to": "recipient@example.com",
  "subject": "Subject",
  "body": "Full message body"
}
```

5. Build the dry-run result using the same planning contract as the local prototype.
6. Present:
   - emails reviewed
   - emails skipped as already processed
   - relevant emails found
   - proposed Airtable updates
   - approved-write queue
   - manual-review queue
   - skipped items
7. Ask:

```text
I found X high-confidence updates that can be written to the sandbox.
Do you want me to apply these exact changes?
```

8. Only after approval, use Airtable MCP write tools for approved sandbox updates.
9. Re-read the changed Airtable records and verify the expected fields changed.
10. After successful Airtable writes, append the real Gmail message IDs to `outputs/processed-gmail-message-ids.json`.

Manual-review items should be written to the sandbox `Gmail Review Queue` table when Duncan approves queue writes or when demonstrating the ideal workflow. This queue is where uncertain tenant questions, receipts/invoices, medium-confidence matches, and "not safe to auto-write" items live after a sweep.

## Approved Sandbox Write Flow

When Duncan explicitly approves sandbox writes, use Airtable MCP `_update_records_for_table` for each approved-write payload:

```json
{
  "baseId": "appRB4L3wVfpN9tIb",
  "tableId": "...",
  "records": [
    {
      "id": "...",
      "fields": {
        "fld...": "value"
      }
    }
  ]
}
```

Then verify with Airtable MCP `_list_records_for_table` using the changed record IDs and field IDs.

Do not write manual-review items. Do not write receipt/invoice proposals. Do not write live base `app2KyW4e15ghRQDZ`.

Known sandbox write targets:

| Table | Table ID | Allowed write use |
| --- | --- | --- |
| `2026 Move In` | `tblicbQTve3RMbOzc` | update matched move-in records with appended notes, requested move-in date, utilities/Apts.com checkboxes, and follow-up flag |
| `2026 Move Out` | `tblRUJMwgXmh30deR` | update matched move-out records with appended notes, move-out date, SD return name/address, and follow-up flag |
| `Turn Repairs` | `tblRd922G2nOlmlmO` | update matched repair records with appended notes, `Status = Open`, and `SD Issue = true` only when clearly supported |
| `Gmail Review Queue` | `tblcN2NELRJKSD2G2` | create review rows for manual-review items that should not directly update operational tables |

Current verified sandbox field IDs:

```text
2026 Move In:
- Requested Move In: fldjc3ObufdrccMqS
- Apts.com Set Up: fldzoyzvefObhzwWy
- Utilities Set Up: fldsOb03m2ZhAWwLW
- Notes: fldtCQ6Agac86vPWw
- Follow-Up Needed: fldFOTE9o0Zq7C0iV

2026 Move Out:
- Move Out Date: fldiwY2dFBkB1dZ3u
- SD Return Name: fldt6ZejOJJovTnDi
- SD Return Address: fldrqMXi4JmJR5ncd
- Notes: fld31TrQrDMEujhmx
- Follow-Up Needed: fldyDzPxyaz6O6V3A

Turn Repairs:
- Notes: fldu9oRL8TxYdiHHX
- Status: fldoqQli4cTVdolTM
- SD Issue: fld7iMMqBAZ0RScbk

Gmail Review Queue:
- Review Item: fld45ElisK37cSeHu
- Status: fldynvsHQUrfI7CY5
- Category: fldhb0A3clZ3p3R6C
- Confidence: fld7QKizoBM7mJsoF
- Email Date: fldsmud9btlbIcOj7
- From: fldP1iGJQSULHp1Fd
- Subject: flddZmwE0ccBDite6
- Matched Property: fldeL2uOogRTeOHcv
- Matched Person: fldlInEkE0qUpz31E
- Suggested Destination: fldsbCuCNY5qcwqA6
- Related Record ID: fld91h3FqZ6D7Ru9c
- AI Summary: flds29mRPQliJO8D9
- Recommended Action: fldDjxgsV4WMygX9E
- Extracted Data: fldmrKMaonRT3Qq20
- Gmail Message ID: fldWPit2vtqZsCAaH
- Gmail Link: fldD6ctfme1Y92jp1
- Sweep Run: fldReVZjAuSsKsQva
```

## Airtable Write Boundaries

Allowed sandbox destinations:

- `2026 Move In`
- `2026 Move Out`
- `Turn Repairs`
- `Gmail Review Queue`
- proposed-only for `Maintenance History`
- proposed-only for `Expenses`

Allowed common updates:

- append `Notes`
- set `Follow-Up Needed`
- set clear explicit dates
- set clear SD return name/address
- set `Turn Repairs.Status = Open`
- set `Turn Repairs.SD Issue = true` only with clear email evidence and approval
- create `Gmail Review Queue` rows for manual-review items

## Output Requirement

Finish with a concise summary:

- what was reviewed
- what was written
- what was skipped
- what needs manual review
- confirmation that live Airtable was not touched
