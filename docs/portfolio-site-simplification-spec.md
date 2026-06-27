# Portfolio Site Simplification Spec

## Objective

Restore the site from a broad AI workflow directory into a calm, precise operator portfolio for Duncan Anderson.

The main public experience should communicate one idea:

> Practical AI systems for messy business workflows.

The site should feel edited, intentional, and credible. It should not feel like an SEO inventory of industries or a generic AI automation agency.

## Research Basis

- Nielsen Norman Group's aesthetic and minimalist design heuristic: remove noise so necessary information has emphasis.
- Figma's visual hierarchy guidance: use size, contrast, placement, and spacing to direct attention.
- Hick's Law / Laws of UX: reduce choice count so users can decide faster.
- Baymard form-friction guidance: reduce perceived friction through simplification, smart defaults, and fewer unnecessary inputs.
- Figma landing-page guidance: focus the page around a clear goal with minimal distractions and visuals aligned to user intent.

## Diagnosis

The current workflow audit page is doing too many jobs:

- Public brand page.
- Google Ads landing page.
- Vertical SEO directory.
- Service explanation page.
- Qualification form.

The visible problem is not only copy length. The deeper problem is information architecture: too many industries, too many workflows, too many proof angles, and too many repeated sections. The design starts to imply "AI for everyone" instead of "Duncan builds useful operating systems."

## Design Direction

Use editorial minimalism:

- True white / very light neutral background.
- Charcoal text.
- Restrained blue accent.
- Hairline borders.
- Serif display headings.
- Clean sans body.
- Thin connector lines and small square nodes as the signature motif.
- Open bands and rails instead of nested cards.
- No hero eyebrow, badge, pill, fake dashboard metrics, robot imagery, AI icons, or gradient decoration.

## Information Architecture

### Public Navigation

- Brand: `Duncan Anderson`
- `Work`
- `Method`
- `Contact`
- Primary CTA: `Send the workflow`

### Home Page

The homepage should introduce the operator and point to proof.

Recommended hierarchy:

1. Hero: practical AI systems for messy workflows.
2. Projects/proof.
3. About.
4. Contact or workflow audit entry.

### Workflow Audit Page

Replace vertical sprawl with one focused page:

1. Hero
   - Headline: `Practical AI systems for messy business workflows`
   - Body: `I help owner-led businesses turn inboxes, spreadsheets, PDFs, calls, and follow-up into systems people actually use.`
   - CTA: `Send the workflow`
   - Secondary: `See proof`
   - Visual: operations map showing messy inputs converging into one operating lane.

2. Core Workflow Areas
   - `Intake`: Capture requests cleanly and get the right information up front.
   - `Follow-up`: Move work forward with clear next steps and fewer drops.
   - `Review`: Make decisions simpler with the right context in one place.

3. Proof
   - `The Lineup`: live product operations, data, payments, automation, monitoring.
   - `Travel automation`: high-volume operational AI systems for booking, disputes, and follow-up.
   - `Property operations`: real small-business system for tenant, maintenance, vendor, and field-work coordination.

4. Method
   - `Map`: understand the current workflow and where it breaks.
   - `Simplify`: remove friction before adding automation.
   - `Build`: ship practical tools the team can use.
   - `Operate`: hand off, support, and refine as the workflow changes.

5. Contact Form
   - Name.
   - Email.
   - Workflow textarea.
   - Submit.

## What To Remove From The Main Narrative

- The "Specific workflows" directory.
- The long "Other admin-heavy workflows" link list.
- Industry-heavy cards on the main workflow audit page.
- Heavy qualification fields in the first form experience.
- Repeated explanations of what AI automation is not.

Vertical pages can remain for ads and search, but they should not be part of the primary brand/navigation experience.

## Implementation Notes

- Keep vertical landing pages available at their existing URLs.
- Do not delete the vertical data model yet; it is useful for ads.
- Simplify the public workflow audit page first.
- Make the form lighter while preserving attribution capture and existing `/api/contact` behavior.
- Update header/footer language to match the new calmer architecture.
- Keep code native text and controls; the operations-map visual should be built with HTML/CSS, not a raster screenshot.

## Acceptance Criteria

- The workflow audit page no longer displays an industry directory.
- The first viewport has one headline, one short paragraph, one primary CTA, and one secondary proof link.
- The page uses three workflow buckets, three proof points, and four method steps.
- The form requires only name, email, and workflow.
- The design is less text-heavy, with clear whitespace and strong visual hierarchy.
- Existing ad landing URLs remain routable.
- `npm run lint` passes.
- `npm run build` passes, unless blocked by unrelated pre-existing configuration.
