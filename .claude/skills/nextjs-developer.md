# Senior Next.js Developer Intelligence

Apply these principles whenever working on any Next.js code in this portfolio project.

## App Router Architecture

- This project uses Next.js 16 with App Router — all routing lives under `src/app/`
- Default to React Server Components. Only add `"use client"` when the component needs browser APIs, hooks (useState, useEffect, useRef), or event handlers
- Keep client components as leaf nodes — push `"use client"` as far down the component tree as possible
- Use `layout.tsx` for shared UI that persists across navigations (header, footer, providers)
- Use `page.tsx` as the entry point for each route segment
- API routes go in `src/app/api/[endpoint]/route.ts` using the Route Handler pattern with exported HTTP method functions (GET, POST, etc.)
- Colocate related files: keep component-specific types, utils, and styles near their components

## React Server Components

- Server Components can directly access databases, environment variables, and server-only modules
- Never import `useState`, `useEffect`, or other client hooks in Server Components
- Pass serializable props from Server to Client Components (no functions, classes, or Dates)
- Use Server Components for data fetching — fetch at the component level, not in a centralized data layer
- Leverage async/await directly in Server Components for data loading
- Use `loading.tsx` or `<Suspense>` boundaries for streaming and progressive rendering

## TypeScript Strict Mode

- `strict: true` is enabled in tsconfig.json — maintain this
- Define explicit types for component props using `interface` (not `type` for object shapes with extension potential)
- Use the path alias `@/*` → `./src/*` for all imports
- Prefer `as const` for literal types and discriminated unions
- Never use `any` — use `unknown` with type guards if the type is truly unknown
- Type API responses and form data explicitly
- Use `satisfies` operator for type-checking object literals while preserving narrow types

## Core Web Vitals Optimization

### Largest Contentful Paint (LCP)
- Ensure the hero section's primary content loads without JavaScript dependency
- Use Server Components for above-the-fold content — no client-side rendering delay
- Preload critical fonts with `next/font` (already configured with Inter)
- Avoid layout shifts from dynamically loaded content in the viewport

### First Input Delay (FID) / Interaction to Next Paint (INP)
- Minimize client-side JavaScript — keep `"use client"` components small and focused
- Debounce or throttle expensive event handlers (scroll, resize, input)
- Avoid long-running synchronous operations in event handlers
- Use `startTransition` for non-urgent state updates

### Cumulative Layout Shift (CLS)
- Always set explicit `width` and `height` on images (or use `next/image` which handles this)
- Reserve space for dynamically loaded content with fixed dimensions or aspect-ratio
- Avoid injecting content above existing content after page load
- Use `font-display: swap` (handled by next/font automatically)

## SEO Meta Tags & Structured Data

- Define metadata using the Metadata API in `layout.tsx` or `page.tsx` — never use raw `<meta>` tags
- The root layout already defines comprehensive metadata: title, description, OpenGraph, Twitter cards, robots
- JSON-LD structured data is embedded in the root layout as ProfessionalService schema
- When adding new pages, export a `metadata` object or `generateMetadata()` function
- Ensure every page has a unique `title` and `description`
- Use `canonical` URLs to prevent duplicate content issues
- OpenGraph images should be 1200x630px for optimal social media display

## Image Optimization

- Always use `next/image` (`import Image from "next/image"`) instead of raw `<img>` tags
- Set `priority` on above-the-fold images (hero, profile photo) to preload them
- Use `sizes` prop to specify responsive image sizes: `sizes="(max-width: 768px) 100vw, 50vw"`
- Prefer modern formats — Next.js automatically serves WebP/AVIF when supported
- For decorative/background images, consider CSS background-image with Tailwind's arbitrary url value syntax
- Store static assets in `/public` — reference with absolute paths (`/images/photo.jpg`)
- Use `placeholder="blur"` with `blurDataURL` for progressive loading on key images

## Caching Strategies

### Static vs Dynamic
- This portfolio is primarily static content — leverage Next.js static generation by default
- Pages without dynamic data are automatically statically generated at build time
- The contact form API route (`/api/contact`) is inherently dynamic — this is correct

### Fetch Caching
- `fetch()` in Server Components is cached by default in production — deduplicated across the render tree
- Use `{ cache: 'no-store' }` for data that must be fresh every request
- Use `{ next: { revalidate: 3600 } }` for data that can be stale for a period (ISR)
- For this portfolio: project data is in constants, so no fetch caching concerns currently

### Route Segment Config
- Export `const dynamic = 'force-static'` on pages that should always be statically generated
- Export `const revalidate = 3600` for ISR with a specific interval
- API routes default to dynamic — keep `/api/contact` as dynamic

## Vercel Deployment Best Practices

- Environment variables: Set `RESEND_API_KEY` in Vercel project settings (not committed to repo)
- Use `.env.example` as documentation for required variables (already exists)
- Build output is automatically optimized by Vercel — no custom configuration needed
- Edge functions: Consider `export const runtime = 'edge'` for API routes that need low latency and don't use Node-specific APIs
- Headers and redirects: Configure in `next.config.ts` rather than middleware when possible
- Preview deployments: Every PR branch gets a preview URL — test there before merging
- Analytics: Vercel Web Analytics and Speed Insights can be added via `@vercel/analytics` and `@vercel/speed-insights` packages if needed
