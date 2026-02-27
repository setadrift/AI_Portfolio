# UI/UX Design Intelligence

Apply these principles whenever working on any visual component in this portfolio project.

## Design Consistency

- Maintain a unified visual language across all sections — consistent border radii, shadow depths, and spacing
- Reuse the established component patterns (SectionWrapper, Button, ProjectCard) rather than creating one-off styles
- Keep visual hierarchy clear: one primary CTA per section, secondary actions styled distinctly
- Ensure all interactive elements have consistent hover/focus/active states

## Color Palette Usage

The project uses a warm/slate/amber palette defined in `src/app/globals.css` via `@theme inline`:

- **warm-50/100/200** — Background tones for sections and cards (alternating via SectionWrapper)
- **slate-600/700/800/900** — Typography hierarchy (900 for headings, 700 for body, 600 for muted text)
- **amber-500/600/700** — Primary accent color for CTAs, links, and highlights (#d97706 base)
- Never introduce new colors outside this palette without explicit request
- Use amber sparingly — it should draw the eye to the most important actions
- Maintain sufficient contrast: dark text on light backgrounds, light text on dark/amber backgrounds

## Typography Pairing

- Primary font: Inter (loaded via next/font for performance)
- Fallback: Geist Sans, system sans-serif stack
- Heading scale: Use Tailwind's text-3xl/4xl/5xl with font-bold or font-semibold
- Body text: text-base (16px) or text-lg (18px) with font-normal, leading-relaxed for readability
- Keep line lengths comfortable — max-w-2xl or max-w-3xl for prose content

## Spacing System

- Use Tailwind's spacing scale consistently — prefer multiples of 4 (p-4, p-8, p-12, p-16)
- Section padding: py-16 on mobile, py-20 or py-24 on desktop
- Component internal padding: p-6 for cards, p-4 for smaller elements
- Gap in grids/flex: gap-6 or gap-8 for card grids, gap-4 for smaller lists
- Never use arbitrary spacing values (e.g., p-[13px]) — stick to the scale

## Hover & Animation

- Transitions should be subtle and quick: `transition-all duration-200` or `duration-300`
- Buttons: slight scale (`hover:scale-105`) or background color shift (`hover:bg-amber-600`)
- Cards: subtle lift with shadow (`hover:shadow-lg hover:-translate-y-1`)
- Links: color transition or underline animation
- Use `ease-in-out` for natural-feeling motion
- Avoid excessive animation — one transform property per hover state is usually enough
- Add `focus-visible:` styles that match hover states for keyboard navigation

## Responsive Layouts

- Mobile-first approach: write base styles for mobile, add `sm:`, `md:`, `lg:` for larger screens
- Breakpoint patterns used in this project:
  - Single column on mobile → 2 columns at `sm:` → 3 columns at `lg:` for grids
  - Stack vertically on mobile → side-by-side at `md:` for content + image layouts
  - Hidden elements on mobile shown at `md:` (e.g., desktop nav)
- Use `grid` with responsive column counts: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Test touch targets: minimum 44x44px for interactive elements on mobile
- Images and cards should be full-width on mobile with appropriate padding

## Accessibility & Contrast

- WCAG 2.1 AA minimum contrast ratios: 4.5:1 for normal text, 3:1 for large text (18px+ bold or 24px+)
- slate-700 on warm-50/white passes AA for body text — maintain this pairing
- amber-600/700 on white passes AA for large text — use for headings/buttons only, not small text
- Always provide visible focus indicators (ring styles) for keyboard users
- Use semantic HTML: `<nav>`, `<main>`, `<section>`, `<footer>`, `<h1>`–`<h6>` in order
- Include `aria-label` on icon-only buttons and navigation landmarks
- Form inputs must have associated `<label>` elements
- Ensure color is never the sole indicator of state — pair with icons or text

## Modern Design Patterns

### Minimalism
- Embrace whitespace — generous padding and margins create visual breathing room
- Limit content per section: one clear message, one CTA
- Use subtle separators (background color changes) rather than hard borders between sections
- Remove decorative elements that don't serve a purpose

### Glassmorphism
- Apply selectively — best for floating elements like the sticky header or modal overlays
- Recipe: `bg-white/80 backdrop-blur-md border border-white/20 shadow-lg`
- The Header already uses `backdrop-blur` — keep this pattern consistent if adding similar floating UI
- Ensure text remains readable over blurred backgrounds

### Bento Grid
- Asymmetric grid layouts where some cards span multiple columns/rows
- Use CSS Grid with `col-span-2` or `row-span-2` for featured items
- Maintain consistent gap spacing across all grid items
- Works well for project showcases or skill/feature highlights
- Example pattern: `grid grid-cols-2 md:grid-cols-4` with hero card at `col-span-2 row-span-2`
