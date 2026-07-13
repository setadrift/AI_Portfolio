# Proof-Led Work Section Revamp

Status: implemented and audited on 2026-07-13
Owner: Duncan Anderson
Primary reviewer: a business owner, operator, recruiter, or implementation partner deciding whether Duncan can be trusted with paid AI and automation work

## Objective

Replace the current portfolio catalogue with a compact proof dossier that makes Duncan's strongest work understandable and credible within ten seconds.

The redesigned experience must improve the odds of winning consulting engagements by answering four buyer questions immediately:

1. Has Duncan shipped consequential systems, not just prototypes?
2. What did he personally own?
3. What can the reviewer inspect as evidence?
4. Does he handle operational risk, exceptions, and handoff responsibly?

## Current-State Problems

- Lightweight prototypes, private sandboxes, and production systems receive similar prominence.
- The portfolio emphasizes sample count, system count, tool lists, and implementation language.
- Project pages rely on long prose sections without enough visual or operational evidence.
- The Mindbody proof of concept and WillowOps proposal prototype weaken the stronger work by making the collection feel padded.
- Private work is described without giving the reviewer a useful representative view or a clear confidentiality boundary.
- Status is unclear: a reviewer cannot quickly distinguish a live product, a delivered client system, confidential prior employment, and a speculative prototype.

## Portfolio Editorial Policy

### Featured work

The primary portfolio will feature exactly four systems:

1. **The Lineup** — live founder-built product.
2. **Dispute Defender** — confidential production enterprise system.
3. **Turn-season property operations** — completed client delivery, anonymized in the public story.
4. **Trauma Therapy Group Publisher** — completed client delivery.

### Removed from the primary experience

- Mindbody enrollment proof of concept.
- WillowOps proposal prototype.
- Separate cards for rental receipts, repairs, Gmail review, and contractor sharing; these belong to one property-operations case study.
- Sample-count and systems-count metrics.
- Prototype taxonomy such as `Runnable prototype` and `Workflow sandbox`.

### Secondary work

Deal Engine may remain reachable as earlier enterprise work, but it will not receive homepage prominence.

## Evidence Rules

- Never imply that representative visuals are literal client screenshots.
- Label reconstructed private-system visuals as representative and anonymized.
- Do not invent testimonials, revenue, time savings, conversion lift, or client usage.
- Use current public proof for The Lineup: live website and App Store listing.
- Describe exact ownership: founder-built, built while employed, or client delivery.
- Put technical implementation behind the operational story.
- Include one explicit risk-control or exception-handling example per featured project.

## Information Architecture

### Homepage work section

First screen of the section:

- Label: `Selected work`
- Headline explaining that these are systems that shipped and had to work.
- Short editorial statement emphasizing evidence over a long project list.
- Small trust line distinguishing live, client-delivered, and confidential work.

Featured project:

- The Lineup receives the largest surface.
- Real App Store product imagery is shown.
- The card includes role, status, result, three proof points, a case-study link, and a live-product link.

Supporting projects:

- Three editorial rows, not equal generic cards.
- Each includes a representative operational visual, honest status, concise outcome, proof points, and one relevant risk-control note.

Footer:

- Link to the full selected-work index.
- Paid-work CTA tied to a buyer's own workflow.

### Selected work index

- Replace the current eight-sample catalogue.
- Show only the same four featured systems.
- Explain the proof standard and status labels.
- Use a large visual for each project.
- Include a short `What this proves` statement.

### Case study pages

Every featured case study follows this hierarchy:

1. Status, role, and scope.
2. Outcome-led headline.
3. Large evidence visual.
4. `What changed` summary.
5. Before-and-after operating workflow.
6. Concrete system responsibilities.
7. Risk control / human-review boundary.
8. Evidence and external links.
9. Technical details.
10. CTA to discuss a similar paid engagement.

## Visual Direction

- Founder-led technical due diligence.
- Off-white, slate, and ink surfaces with the existing blue accent used sparingly.
- Editorial rows and bordered evidence frames rather than repeated SaaS cards.
- Real product imagery where public; faithful representative operational surfaces where private.
- Modest radii, minimal shadow, no glow, glass, decorative gradients, or generic AI imagery.
- Small uppercase status labels only when they communicate evidence level.
- Desktop compositions must collapse into a clean single column on mobile.

## Featured Project Content

### The Lineup

- Status: Live product.
- Role: Founder, product owner, and solo builder.
- Result: A public multi-sport product connecting models, live odds, user decisions, subscriptions, and results.
- Evidence: App Store screenshots, public product URL, App Store listing.
- Risk control: automated grading and public result history make model output accountable.

### Dispute Defender

- Status: Production enterprise system.
- Role: Data scientist / system builder while employed.
- Result: High-volume dispute work moved from manual evidence gathering to tailored evidence packages.
- Evidence: representative anonymized workflow reconstruction.
- Risk control: source evidence remains connected to each response; identifying company data is not exposed.

### Turn-Season Property Operations

- Status: Client delivery.
- Role: Workflow designer and implementation consultant.
- Result: Airtable remained the source of truth while field capture, review, contractor handoff, and receipt work gained safer operating surfaces.
- Evidence: representative anonymized portal view based on the delivered workflow.
- Risk control: uncertain or staged information requires review before promotion into permanent records.

### Trauma Therapy Group Publisher

- Status: Client delivery.
- Role: Workflow designer and implementation consultant.
- Result: Google Docs content moves through structured cleanup, SEO and image review, and WordPress draft creation.
- Evidence: representative workflow view and public client website.
- Risk control: the system creates drafts; a person remains responsible for publication.

## Acceptance Criteria

- Mindbody and WillowOps do not appear in the homepage work section or selected-work index.
- The homepage features exactly four projects with distinct status and role labels.
- The Lineup displays real public product imagery and links to live external proof.
- Private-system visuals are explicitly labeled representative/anonymized.
- No primary work surface advertises sample count or system count.
- Featured project pages provide visual proof before long technical prose.
- Project copy distinguishes live product, client delivery, and prior employment.
- The design is usable at desktop and 375px mobile widths without horizontal overflow.
- English and French routes build successfully.
- ESLint and the production build pass.
- Browser verification covers the homepage work section, one public-product case study, one private-system case study, and mobile layout.
