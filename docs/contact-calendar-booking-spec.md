# Contact Page Calendar Booking Spec

## Goal

Add a clear way for prospective clients to book a meeting from the contact section with real availability, reducing back-and-forth after Reddit/website outreach.

## Recommendation

Use a hosted scheduler first, then embed or link it from the contact page.

Preferred options:

1. Calendly: easiest mainstream setup, strong Google Calendar sync, simple inline/popup embeds.
2. Cal.com: good free/customizable option, cleaner developer-oriented embed story, works well if branding/customization matters.
3. Google Calendar Appointment Scheduling: lowest extra-tool overhead if using Google Calendar already, but less flexible for branding and integrations.

Recommended MVP: use Calendly or Cal.com with a single 30-minute "AI Automation Discovery Call" event, then add a booking CTA to the existing contact section. Start with an external booking link styled like a button. Avoid building custom calendar logic and avoid an inline embed until the link has proved useful.

## Source Notes

- Calendly supports inline embed, pop-up text, and pop-up widget options for websites.
- Cal.com supports inline, pop-up, button, and email embed formats and lets visitors book without leaving the site.
- Google Calendar Appointment Scheduling creates booking pages from availability and can be shared with others; all booked appointments show on the calendar.

## User Flow

1. Visitor lands on the contact section.
2. Visitor sees two paths:
   - "Send a message" via the existing contact form.
   - "Book a discovery call" via scheduler CTA.
3. Visitor clicks booking CTA.
4. Scheduler opens either:
   - inline on the page, if embedded, or
   - in a new tab, if using link-only fallback.
5. Visitor chooses an available time.
6. Booking provider sends confirmation and calendar invite.

## Scheduler Setup

Create one public event type:

- Name: AI Automation Discovery Call
- Length: 30 minutes
- Location: Google Meet or Zoom
- Availability: weekday blocks only
- Buffer: 15 minutes before/after
- Minimum notice: 12-24 hours
- Daily limit: 2-4 calls
- Questions:
  - Name
  - Email
  - Company / website
  - What workflow are you trying to automate?
  - What tools are involved?
  - Is this exploratory or are you looking to hire?

Suggested event description:

```text
A short call to understand your workflow, tools, and whether there is a practical automation or internal-tool build worth scoping.
```

## Implementation Scope

### Config

Add a booking URL to `src/lib/constants.ts`:

```ts
export const BOOKING_URL = "https://cal.com/your-handle/ai-automation-discovery";
```

If the booking URL may change often, use a public env var instead:

```text
NEXT_PUBLIC_BOOKING_URL=https://...
```

Recommendation: use a constant first for the initial implementation. It is simpler and avoids another production env dependency. If the URL is not known at build time, use a small helper that reads `process.env.NEXT_PUBLIC_BOOKING_URL` and hides the CTA when it is not configured.

Do not add private scheduler API keys. The public booking URL is enough for the MVP.

### Contact Section UI

Update `src/components/sections/Contact.tsx`:

- Keep the existing contact form.
- Add a secondary booking panel or CTA in the left text column.
- Text should be concise and human:

```text
Prefer to talk it through?
Book a 30-minute discovery call.
```

- Add a button:

```text
Book a call
```

- Open the booking URL in a new tab with `target="_blank"` and `rel="noreferrer"`.
- Use a plain `<a>` styled with the same Tailwind classes as `Button`, or extend `src/components/ui/Button.tsx` to accept external-link props. The current `Button` uses the localized `next-intl` `Link`, so passing an external Cal.com/Calendly URL directly may be the wrong abstraction.
- Include an `aria-label` if the visible CTA does not make the destination obvious.
- Do not remove the existing contact form success/error flow.

Implementation detail for the current layout:

- `Contact.tsx` is already a client component.
- `SectionWrapper` constrains content to `max-w-5xl`, so keep the booking CTA compact in the left column instead of adding a wide nested card.
- The app already uses `/en` and `/fr` localized routes; the booking URL itself can stay locale-neutral unless the scheduler supports localized event pages.

### Optional Inline Embed

Do not make inline embed the default unless it looks good on mobile and does not slow the contact page.

If embedding:

- Use a dedicated `BookingEmbed` client component.
- Lazy-load it only after the user clicks "Show availability".
- Use a fixed responsive container:
  - desktop min-height: 700px
  - mobile min-height: 650px
- Provide a fallback link under the embed:

```text
Open booking page
```
- Confirm the scheduler iframe is allowed by the current Content Security Policy before shipping an embed. The production CSP currently restricts scripts and frames, so a future embed may require adding the scheduler domain to `frame-src` and/or `script-src`.

### Internationalization

The app uses `next-intl`, so add strings to:

- `messages/en.json`
- `messages/fr.json`

English keys under `contact`:

```json
{
  "bookingHeading": "Prefer to talk it through?",
  "bookingDescription": "Book a 30-minute discovery call and we can map the workflow together.",
  "bookingCta": "Book a call"
}
```

French can be a straightforward translation, but keep it shorter than the existing paragraph copy so the contact section does not become text-heavy on mobile.

Suggested French keys:

```json
{
  "bookingHeading": "Vous préférez en parler?",
  "bookingDescription": "Réservez un appel de 30 minutes pour décortiquer le workflow ensemble.",
  "bookingCta": "Réserver un appel"
}
```

## Design Notes

- Keep it consistent with the current portfolio style.
- Do not add a floating scheduling widget globally.
- Do not use a modal for the MVP.
- The booking CTA should feel like a second contact option, not a sales pop-up.
- Preserve the current contact form because some leads will prefer asynchronous outreach.
- Avoid adding another full card inside the existing contact layout. Use spacing, border-top, or a compact callout so the section stays light.
- If using a button-like anchor, match the existing square-corner button style.

## Acceptance Criteria

- Contact page shows both contact form and booking CTA.
- Booking CTA opens the configured scheduler URL.
- Link works from `/en` and `/fr`.
- External link opens safely with `target="_blank"` and `rel="noreferrer"`.
- CTA is hidden or omitted if no booking URL is configured.
- No secrets are exposed.
- Page remains accessible by keyboard.
- Mobile layout does not overlap or crowd the form.
- Existing contact form still submits successfully after the change.
- `npm run lint` and `npm run build` pass.

## Manual Test Plan

1. Visit `/en#contact`.
2. Click `Book a call`.
3. Confirm scheduler opens and displays real availability.
4. Book a test slot.
5. Confirm calendar invite arrives.
6. Submit the existing contact form and confirm email still arrives.
7. Visit `/fr#contact`.
8. Confirm translated booking copy appears and the same scheduler opens.
9. Test mobile viewport for contact section layout.
10. Test keyboard tab order through the contact form and booking CTA.

## Future Enhancements

- Add an inline scheduler after the first booking link proves useful.
- Track booking CTA clicks with Vercel Analytics or PostHog.
- Add different booking links for "Discovery Call" vs "Existing Client".
- Prefill scheduler fields from the contact form if the user has already typed their name/email.
