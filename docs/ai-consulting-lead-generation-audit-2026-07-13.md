# AI Consulting Lead Generation Audit — 2026-07-13

## Objective

Build a short-term consulting pipeline from opportunities Duncan can actually pursue, rather than a large feed of vaguely relevant automation content and conventional jobs.

## Findings

### Reddit scanner

- The production quote-grounded scanner is healthy: all 26 fixtures pass.
- The repo skill still described the retired legacy monitor, creating a high risk that future maintenance would tune the wrong scanner and config.
- Discovery was strong on generic operator pain but weak on explicit implementation language and tool communities where buyers ask for a professional.
- A bounded live smoke reached Reddit successfully, but the configured OpenAI API key returned `insufficient_quota` during classification. The scanner now supports a one-candidate smoke limit and writes `ok=false` when every attempted classification fails, so this condition cannot look like a healthy zero-lead day. API quota remains an operational blocker for productive live Reddit runs; deterministic prefiltering and fixture validation remain healthy.

Changes:

- Updated the Reddit skill to the production v2 scanner, config, fixtures, commands, output contract, and portal route.
- Added `r/Zapier`, `r/Airtable`, and `r/n8n` to the reviewed communities.
- Added global searches for paid integration help, requests to build/fix workflows, professional tool help, and manual finance/admin workflows.
- Kept quote verification, owned-business context, operational-workflow evidence, and human review unchanged.

### Broader Codex automation scan

- The July 13 run was operationally healthy: 42/42 source checks, 25 fetched candidates, 16 scored, and 6 included.
- Its scoring contract allowed generic job-board/company signals into Best Leads without proving contractor status or Duncan's location eligibility.
- That produced false positives such as a Latin-America-only role and company hiring signals with no confirmed short-term contractor path.
- The publisher aggregated every fresh 4/5 or 5/5 block, so model drift could reach the admin board.

Changes:

- Updated the scheduled automation to prioritize direct clients, RFPs, and partner/overflow work; conventional job boards are now secondary.
- A job-board lead now needs an explicit consulting/contract/freelance/fractional/temporary/RFP engagement and confirmed location eligibility to enter Best Leads.
- Added explicit engagement, location, eligibility-evidence, and rejection-gate diagnostics to the automation contract.
- Added the same deterministic job-board eligibility gate to both the publisher and the portal's local aggregate builder. Older job-board rows without proof now fail closed.

## Recommended Client Acquisition System

Lead scanners should be one input, not the whole sales system. Run the following weekly operating rhythm:

1. **Direct demand (daily, 30–45 minutes):** respond to new public RFPs, vendor-community requests, and Reddit buyer posts within the same day. Lead with one concrete implementation observation and a low-risk first step.
2. **Partner channel (five targeted contacts per week):** build relationships with small accounting-tech firms, fractional CFO/bookkeeping practices, web/product agencies, and Make/n8n/Airtable specialists that need overflow delivery. Offer white-label implementation, documentation, and client handoff.
3. **Warm network (three conversations per week):** ask past collaborators, operators, and professional-services contacts for introductions to one business carrying a repetitive reporting, client-communication, document, or reconciliation workflow.
4. **Proof assets (one per week):** publish a visual, outcome-first teardown or mini case study showing the before-state, architecture, controls/exceptions, and business result. Avoid generic demos without a real buyer scenario.
5. **Productized entry offer:** sell a paid workflow diagnostic or tightly scoped automation sprint before proposing a large transformation. Make the deliverables, decision point, timeline, and fixed price easy to understand.
6. **Follow-up discipline:** every qualified lead gets a next action and follow-up date. Use a 0/3/7/14-day sequence with a new useful observation, not repeated “checking in” messages.

### Platform-channel sequence

- **Now:** complete Make's technical/partner training and build enough delivery proof to pursue placement in the [Make partner directory](https://www.make.com/en/partners-directory). The directory is buyer-facing and organized around consulting and implementation services.
- **Now:** apply to the [Zapier Solution Partner Program](https://zapier.com/l/partners), which is explicitly intended for consultancies providing implementation and managed automation services.
- **After three active n8n customers:** join the [n8n Expert Partner waitlist](https://n8n.io/expert-partners/). The current pilot says applicants should already have at least three customers actively using n8n, so community participation and direct delivery should come before treating this as a near-term lead source.
- **In parallel:** contact small listed partners whose positioning complements Duncan's and offer overflow capacity. Prioritize firms that sell strategy or managed services but may need hands-on API, documentation, and exception-workflow delivery.

## Metrics That Matter

Track these separately by source family every week:

- qualified opportunities found;
- same-day responses sent after human review;
- replies and discovery calls;
- proposals and wins;
- estimated contract value;
- median days from post to first response;
- false-positive reason (location, employment type, stale, weak buyer intent, unreachable);
- win rate by offer and source.

Optimize for discovery calls and proposals per hour spent, not raw lead count.
