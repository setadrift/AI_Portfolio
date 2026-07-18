# Consulting Site Baseline and Acceptance Contract

Date: 2026-07-18

## Preserved routes

- `/en` and `/fr`
- `/[locale]/ai-workflow-audit`
- `/[locale]/ai-workflow-audit/[workflow]`
- `/[locale]/work-samples`
- `/[locale]/projects/[slug]`

The redesign preserves localized routing, canonical metadata, structured service data, contact delivery, first-touch attribution, Google Ads conversion handling, proof links, and all existing case-study URLs.

## Baseline findings

- The homepage rendered Hero → Projects → About → Contact. The existing consulting-offer component was not mounted.
- The first viewport relied on an abstract input/output diagram rather than verifiable production evidence.
- The long proof dossier appeared before engagement options or fit criteria.
- CTA language varied among Send the workflow, Request an audit, Book a discovery call, See proof, and the general contact form.
- Founder identity appeared after the complete project section.
- There was no public AI/data-use boundary statement.
- Entrance animation did not have a reduced-motion override.
- Analytics covered booking and form conversion, but did not have a common consulting CTA event.

## Acceptance rubric

Score each area from 0 to 2. Release requires at least 20/24 and no zero for positioning, proof, trust, accessibility, or conversion.

| Area | Pass condition |
| --- | --- |
| Positioning | First viewport communicates audience, problem, outcome, and proof. |
| Services | Fit call, audit, and paid build have fit, deliverables, duration, and next decision. |
| Proof | At least two cases state baseline, intervention, result, safeguard, and evidence level. |
| Human trust | Duncan, experience, location, direct contact, and accountability are visible. |
| AI/data trust | Limitations, review, data handling, exceptions, and recourse are stated. |
| CTA | One primary workflow-discussion path and one secondary proof path. |
| Contact | Short labeled form, useful errors, privacy note, response expectation, and email fallback. |
| Content/IA | Buyer situations, services, proof, method, about, trust, and contact are ordered logically. |
| Visual system | Restrained founder-led system with no generic AI decoration. |
| Accessibility | WCAG 2.2 AA contract, focus, reduced motion, semantics, and 320px reflow. |
| Responsive/performance | No 320px overflow; responsive image sizing; Core Web Vitals instrumentation retained. |
| Validation | English/French browser checks, full unit suite, lint, and production build pass. |

## Hard failure gates

- Ambiguous first viewport.
- Misleading work status or invented proof.
- Competing primary actions.
- Missing keyboard focus, labels, errors, or reduced-motion behavior.
- Horizontal overflow at 320 CSS pixels.
- Broken localization, form delivery, metadata, attribution, or proof routes.
- Production build failure.
