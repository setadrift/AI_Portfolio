# WillowOps Fable Test

This is a local, approval-gated Fable setup for choosing the next targeted
WillowOps prototype build before sending a follow-up to Willow Grey.

The Anthropic key is read from `.env.local` through `ANTHROPIC_API_KEY`. Do not
commit `.env.local`, `.tmp/fable-packets`, or `.tmp/fable-runs`.

## Recommended Command

```bash
scripts/willowops_fable_targeted_prototype.sh
```

Default mode builds a fresh evidence packet and runs the dry-run approval
preview only. It does not call Anthropic.

The dry run prints:
- packet path
- task prompt path
- model and effort
- estimated token/cost budget
- approval id
- exact approved-run command

Current wrapper budget is intentionally less conservative for the prototype
strategy pass: up to 18,000 estimated input tokens and 2,500 output tokens,
with medium Fable effort. The dry-run estimate should still stay below a
one-dollar ceiling.

## Run After Reviewing The Dry Run

Only run the exact approved command emitted by `--dry-run`. The script refuses
to call Anthropic unless the matching `--require-approved-run-id` is supplied.

Equivalent wrapper form:

```bash
scripts/willowops_fable_targeted_prototype.sh --run .tmp/fable-packets/PACKET_FILE.md APPROVAL_ID
```

## Implementation Spec Pass

After the direction pass has produced a recommendation, use this wrapper to ask
Fable for an implementation-ready spec:

```bash
scripts/willowops_fable_implementation_spec.sh
```

Default mode builds a packet from the prior Fable response, current prototype
files, relevant mock data, and the two remaining API routes. It only runs the
dry-run preview.

Run the real call only with the approval id emitted by that dry run:

```bash
scripts/willowops_fable_implementation_spec.sh --run .tmp/fable-packets/PACKET_FILE.md APPROVAL_ID
```

## Design-Led Build Spec Pass

Use this pass when the current prototype should not constrain the redesign. It
asks Fable to treat the existing page as raw material and produce a polished
buyer-facing build spec:

```bash
scripts/willowops_fable_design_build_spec.sh
```

Default mode builds a packet from the prior direction response, the prior
implementation-spec response, current prototype files, relevant mock data, and
the two local proof routes. It only runs the dry-run preview.

This pass intentionally allows a large response budget so the design spec does
not stop midway.

Run the real call only with the approval id emitted by that dry run:

```bash
scripts/willowops_fable_design_build_spec.sh --run .tmp/fable-packets/PACKET_FILE.md APPROVAL_ID
```
