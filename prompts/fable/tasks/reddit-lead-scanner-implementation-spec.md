# Task: Reddit Lead Scanner Implementation Spec

Create a comprehensive implementation spec for rebuilding Duncan's Reddit-only AI consulting lead scanner based on the prior Fable redesign response in the packet.

Important context:
- The prior Fable response is the design direction to build from, even though it was truncated during the output/admin UX section.
- Treat the prior response as accepted strategy unless you find a concrete implementation contradiction or a better implementation detail while writing the spec.
- The goal is not another product critique. The goal is a detailed implementation spec Codex can execute in a feature branch.
- Do not preserve existing scoring, queue, digest, or admin abstractions unless they are useful compatibility layers.
- The implementation should remain Reddit-only.
- Duncan's real target is not "people mentioning AI tools." It is people who likely already operate, own, manage, or are responsible for a real business process and may want to hire an expert who is good with AI/workflow implementation.
- Do not make the scanner property/real-estate-specific, Monday/Zapier/Make-specific, or narrowly tied to the latest failed run. Use the latest failed run as failure evidence and fixture material, not as the product boundary.
- Current code and admin surfaces are context for migration and compatibility only. The spec should define the best Reddit lead scanner for Duncan's consulting workflow, even if that means replacing most current concepts.

Main decision question:

What exact implementation spec should Codex follow to rebuild the Reddit scanner into the quote-grounded, speaker/intent-first system proposed in the prior Fable redesign?

Required output:

1. Executive spec summary
- State the target architecture in 5-8 bullets.
- State what should be deleted, bypassed, or deprecated from the current scanner.

2. Current-to-target migration map
- Map current concepts to new concepts:
  - `score`, `fitScore`, `replyabilityScore`
  - `buyerQueue`
  - `buyerSituation`
  - `explicitEvidence`
  - `isReplyTodayLead`
  - `formatLead`
  - admin queues
- Say whether each is kept, renamed, replaced, compatibility-only, or removed.

3. Data model and contracts
- Define the new internal candidate/classification object.
- Define the persisted run status fields.
- Define the markdown digest output contract.
- Define what the admin parser/UI must support.
- Include exact enum values for:
  - speaker
  - intent
  - consulting_fit
  - confidence
  - final queue
  - rejection reason

4. Pipeline design
- Specify the staged pipeline from fetch to publish:
  - fetch/discovery
  - deterministic prefilter
  - LLM classification
  - quote verification
  - deterministic queue assignment
  - digest/status writing
  - publish/admin ingestion
  - feedback/state update
- For each stage, list inputs, outputs, failure behavior, and acceptance conditions.

5. LLM classifier contract
- Provide the exact structured JSON schema Fable recommends Codex implement.
- Provide the classifier prompt shape, including:
  - role/instructions
  - allowed labels
  - verbatim quote requirements
  - hard refusal/null rules
  - examples or example categories to include
- Explain how code must verify returned quotes as substrings before trusting classification.
- Explain retry/fallback behavior when LLM classification fails.

6. Deterministic filters and source strategy
- Define subreddit allowlist, denylist, query rules, and source-health/quarantine behavior.
- Include first-pass query examples.
- Define high-precision hard rejects that should happen before LLM spend.
- Define what must not be hard-rejected before LLM because it is too ambiguous.

7. Queue assignment and ranking
- Give deterministic rules for Contact Today, Comment Only, Watch / Market Intel, and Reject.
- Include ranking rules inside Contact Today and Comment Only.
- Include caps and zero-lead behavior.
- Include examples from the failed latest run and where each should land.

8. Admin UI / UX spec
- Define the ideal admin board experience after this rebuild.
- Include what a lead row should show, what details should show, and what feedback controls Duncan needs.
- Include how source health and rejection summaries should be shown.
- Include compatibility guidance for existing admin queues if a migration is staged.

9. Feedback and learning loop
- Define how Duncan's judgments should be stored.
- Define author/source/query quarantine rules.
- Define how reviewed examples should influence future classifier prompts or fixtures.
- Include a simple starting persistence plan that does not require overbuilding.

10. Fixture and verification plan
- Provide a fixture matrix with at least 20 cases.
- Include all latest false positives as explicit reject fixtures.
- Include positive Contact Today and Comment Only examples.
- Include quote-verification failure cases.
- Include seller/content/job/fiction/consumer/vendor-selection cases.
- Include commands/tests Codex should run before shipping.

11. Staged implementation plan
- Break the work into small PR-sized phases.
- For each phase, list files likely touched, behavior changed, tests, and rollback risk.
- Identify the first patch Codex should make.
- Identify which existing code should be left alone until later.

12. Open questions / missing evidence
- List only decisions that materially affect implementation.
- If evidence is sufficient for the first patch, say so.

Constraints:
- Reddit-only.
- No automated outreach.
- Do not optimize for daily volume.
- Contact Today should be allowed to be empty.
- Do not use keyword density as positive evidence.
- Do not write full implementation code, but make the spec concrete enough that Codex can implement it without another strategy pass.
