# Consulting Site Implementation Verification

Date: 2026-07-18

## Implemented phases

- Baseline, preserved contracts, acceptance rubric, and hard gates documented.
- Buyer situations, engagement ladder, unified CTA language, and information architecture implemented in English and French.
- Three art-direction theses compared; Founder-Led Operations Studio selected and implemented.
- Design constitution added with tokens, visual rules, responsive rules, evidence policy, accessibility gate, performance gate, event contract, and banned patterns.
- Homepage rebuilt around fit, proof, engagement, safe delivery, founder trust, AI/data boundaries, and contact.
- Workflow-audit hero and outputs aligned with the new offer.
- Homepage proof shortened to three cases while the complete proof dossier and case studies remain intact.
- Contact now includes business name, direct email, response expectation, privacy guidance, accessible errors, and the existing booking option.
- Reduced-motion and global focus-visible behavior added.
- CTA, booking, audit-submit, and homepage-inquiry events are distinguishable while the Google Ads conversion remains intact.

## Verification evidence

- `npm run lint` — pass.
- `npm run test:unit` — 66 tests passed, 0 failed.
- `npm run build` — pass; 116 static pages generated. Missing Vercel Blob credentials only produced expected private-admin fallback warnings.
- Browser desktop `/en` — meaningful content, no Next.js error overlay, primary CTA and proof path visible.
- Browser mobile 390px `/en` — no horizontal overflow; primary CTA navigated to `/en/ai-workflow-audit`; audit route had no error overlay.
- Browser mobile 320px `/fr` — no horizontal overflow; localized content rendered; mobile navigation opened with Services, Work, Method, About, and the primary CTA.

## Production release evidence

- PR #86 merged as `30a1500`; Vercel deployed the revamp to production on 2026-07-18.
- Production verification found and repaired two Google Ads CSP gaps in PRs #87 and #88. Final production commit: `77b8cab`.
- Live `/en`, `/fr`, and `/en/ai-workflow-audit` rendered the intended localized headings without horizontal overflow or a runtime error overlay.
- The Google Ads conversion script and follow-on measurement request loaded successfully after the CSP repairs.
- The final live browser pass returned no console errors on the English homepage, French homepage, or workflow-audit route.

## Post-launch measurement

The implementation creates the event contract and retains Vercel Analytics and Speed Insights. The fixed baseline, five-session protocol, measurement boundaries, and 14/30-day decision rules are recorded in `docs/consulting-site-post-launch-study.md`. Do not claim conversion improvement until the post-launch sample and qualitative sessions exist.
