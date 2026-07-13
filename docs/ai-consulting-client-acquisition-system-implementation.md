# AI Consulting Client Acquisition System — Implementation Evidence

Verified: 2026-07-13

## Delivered workflow

The protected admin portal now supports the complete weekly acquisition rhythm from discovery review through opportunity qualification, human-recorded outreach, follow-up, partner development, proof reuse, proposal evidence, win handoff, and weekly learning. Runtime reads for consulting projects and commitments come from Supabase; the original arrays remain only as migration input.

## Acceptance evidence

| #     | Requirement                                                                  | Evidence                                                                                                                                                                                  |
| ----- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–2   | Promote one lead while preserving source, evidence, URL, lead key, and offer | Lead detail promotion UI plus live `consulting:verify`; normalized URL, email, organization, and discovery-key deduplication are asserted.                                                |
| 3     | Durable activity and commitment history                                      | Opportunity detail renders stored activities, upcoming commitments, proof reuse, source evidence, and project linkage.                                                                    |
| 4–6   | Day 3/7/14 cadence, draft safety, reply cancellation                         | Live verifier proves outbound cadence, sequence end, Day 14 nurture, and reply cancellation. The UI records only actions Duncan confirms happened.                                        |
| 7–8   | Visible defects and correctly prioritized Today queue                        | Today surfaces missing actions, fresh paid requests, partner overflow, elapsed response windows, replies, proposal/discovery work, follow-ups, and weekly deficits with explicit reasons. |
| 9–10  | Weekly partner/warm/proof goals and durable relationship/program records     | Today, Partners, Proof, and Metrics show 5/3/1 progress; partner profiles, influence links, warm conversations, and editable platform requirements persist in Supabase.                   |
| 11    | Buyer-first proof with reuse history                                         | Proof records require buyer, decision, scenario, problem/cost, workflow, controls, outcome, offer, publication data, and linked opportunity reuse.                                        |
| 12    | Offer attribution before proposal                                            | Proposal validation requires a productized offer or the durable Custom scope offer.                                                                                                       |
| 13–14 | Reconciled funnel denominators and currency safety                           | Metrics derive stage reach from opportunities and stored activity, show numerator/denominator, and keep open and weighted pipeline values separated by currency.                          |
| 15    | Idempotent migration before static reads retire                              | Two consecutive seeds returned the same 4 opportunities, 5 projects, 8 commitments, 4 legacy activities, and 1 proof asset. No admin runtime page imports the static consulting arrays.   |
| 16–17 | Protected, validated mutations and no automated sending                      | Every consulting mutation route checks the admin session and validates server-side. No acquisition code calls an email, DM, or social sending provider.                                   |
| 18    | Lead scanner/publisher regressions                                           | Reddit fixtures pass 26/26. The publisher reconciles 2 Reddit and 11 automation rows to Blob/Supabase with no unknown posted dates.                                                       |
| 19    | Engineering and browser gates                                                | ESLint, TypeScript, production build, migration history, live integration verification, and desktop/mobile browser checks pass with no overlays, browser errors, or mobile overflow.      |
| 20    | Weekly rhythm without a spreadsheet                                          | Discovery, Today, Pipeline, Commitments, Partners, Proof, Metrics, Projects, and the durable Friday lesson/Monday offer emphasis are all available inside the protected portal.           |

## Repeatable verification

```bash
npm run consulting:seed
npm run consulting:test
npm run consulting:verify
npm run leads:reddit:v2:fixtures
npm run leads:publish
npm run leads:publish:automation
npm run lint
npx tsc --noEmit
npm run build
```

The live verifier creates isolated fixtures and removes them before exit. It does not send outreach.
