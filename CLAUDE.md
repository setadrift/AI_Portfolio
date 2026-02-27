# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- `npm run dev` — Start Next.js development server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint (Next.js core-web-vitals + TypeScript rules)

## Architecture

Single-page portfolio built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, and **Tailwind CSS v4**.

### Routing & Layout

All content lives on the home page (`src/app/page.tsx`) with anchor-based navigation (#projects, #about, #contact). The root layout (`src/app/layout.tsx`) wraps everything with Header and Footer. There is one API route: `POST /api/contact` which sends emails via the Resend SDK.

### Component Organization

- `src/components/layout/` — Header (client component with mobile menu), Footer (server)
- `src/components/sections/` — Hero, Projects, About, Contact (Contact is client component for form state)
- `src/components/ui/` — Reusable primitives: Button (polymorphic — renders `<a>` or `<button>`), ProjectCard, SectionWrapper

Server components are the default. Only Header and Contact use `"use client"` (for useState/useEffect).

### Data & Constants

Site metadata, navigation links, and project data are centralized in `src/lib/constants.ts`. Projects are defined as typed objects in a `PROJECTS` array.

### Styling

Tailwind CSS v4 with an inline theme defined in `src/app/globals.css` (custom colors via `@theme inline`). No separate tailwind.config file. Uses warm/slate/amber palette, mobile-first responsive breakpoints, and alternating section backgrounds via SectionWrapper.

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

## Environment Variables

- `RESEND_API_KEY` — Required for the contact form API route. See `.env.example`.
