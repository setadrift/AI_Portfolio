# Mindbody Enrollment Prototype Redesign Spec

## Reviewer

An operations owner or hiring reviewer evaluating whether the builder can understand a messy enrollment workflow and produce a safe, concrete work sample.

## Decision

"Does this person understand the enrollment problem well enough to build it safely, document it, and work around an existing sync without creating cleanup work?"

## 10-second trust test

The first viewport must prove three things without internal tooling language:

1. The test purchase is understood.
2. Duplicate Mindbody enrollments are prevented before adding sessions.
3. HubSpot/Appiant risk is handled deliberately.

## Design direction

Quiet professional-services operations review. The page should feel like a prepared implementation note for a client, not a generated SaaS dashboard. Use restrained slate/white surfaces with green for safe/completed, amber for needs review, and blue only for secondary technical detail.

## Simplified direction

The page should not feel like a sales note, landing page, dashboard, or prospect-specific message. It should feel like a concise work sample that demonstrates a proper example of implementation thinking.

The simplest useful artifact is:

1. A short note that says what workflow is being demonstrated.
2. A concrete sample purchase check with four sessions.
3. A short list of what the first paid build would do.
4. A short list of what would intentionally stay protected.
5. A small technical disclosure for Make/Mindbody specifics.

Remove interactive theatrics unless they make the reviewer decision easier. The page should demonstrate implementation judgment, not perform as a software product.

## Information hierarchy

1. First viewport:
   - Neutral work-sample framing.
   - One sentence: "Check existing Mindbody enrollments before adding any sessions."
   - The sample result: 2 already booked, 2 to add, HubSpot identity untouched.

2. Main proof:
   - A small table showing the four course sessions and the decision for each.
   - No duplicated requirement checklist.

3. Trust and production path:
   - What I would build first.
   - What I would not touch.
   - What a team would need to provide before a live build.

4. Technical appendix:
   - Connector/module details.
   - Edge cases.

## Copy rules

Avoid:

- Scenario response
- Dry run
- Payload
- Module blueprint
- Guardrail
- Actions to run
- JSON documentation

Use:

- Test purchase
- Purchase follow-up
- What gets updated
- Protected HubSpot fields
- Automation step
- Technical appendix
- Implementation notes

## Components

- Use a single strong client-facing review panel in the hero.
- Use compact proof strips instead of many equal cards.
- Use checklists and ordered steps over nested card grids.
- Keep the interactive result panel, but label it as "Try the purchase follow-up."
- Keep raw JSON only behind "Developer detail."

## Success criteria

- A nontechnical reviewer can understand the prototype without knowing what an API payload is.
- Technical competence is still visible through field protection, duplicate prevention, exception handling, and implementation notes.
- The page avoids decorative AI tropes and overly broad automation claims.
- The primary action is tied to reviewing the work sample, not a vague discovery call.
- The page can be read as an implementation note without clicking anything.
