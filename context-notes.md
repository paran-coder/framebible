# FrameBible v2.0.1 — Context Notes

## Goal

v2.0.1 is a focused UI/UX refinement and documentation release. It keeps the v2.0.0 data model and production capabilities while correcting structural problems visible in the deployed Story screen and adding a detailed in-product user manual.

## Source guidance

The UI review follows the supplied `ui-polish` skill: structure before styling, clarity before decoration, reusable patterns, purposeful interaction, restrained motion, realistic implementation, and a final consistency review.

## Scope

### Story restructuring
- Replace the wide multi-column idea composer with a vertical task flow: section header → text area → secondary/primary actions.
- Reduce AI Assist to a compact utility row; keep provider/key details behind disclosure.
- Simplify the Logline surface so it no longer competes with Scene editing.
- Replace the horizontal Scene card strip with a scalable Scene Navigator + Scene Editor workspace on wide screens.
- Split the Scene Editor into Details / Cast & Props / Continuity tabs.
- Preserve rule-based draft generation, AI draft generation, scene CRUD/reorder, bindings, transition events, and existing data contracts.

### Ongoing visible polish
- While implementing the Story restructure, fix obvious hierarchy, density, card, overflow, label, and action-consistency problems discovered in Assets, Shots, Export, Dashboard, and the app shell.
- Do not turn v2.0.1 into a full visual rewrite; prefer targeted reusable improvements.

### In-product manual
- Add a dedicated `/manual` page with a detailed user guide.
- Use a documentation layout: sticky/table-of-contents navigation on desktop, readable article column, anchor links, callouts, keyboard shortcuts, workflow guidance, troubleshooting, and local-first/privacy explanations.
- Keep the manual available without a backend.
- Add a visible Manual entry in the app sidebar.

### Open Graph preparation
- Add a static `manual.html` entry so social crawlers can read manual-specific metadata without requiring JavaScript execution.
- Prepare Open Graph / Twitter tags for a future 1200×630 image at `/og/framebible-1200x630.png`.
- Keep the image file absent until the user provides it; metadata and path are prepared in advance.
- Use `og:image:width=1200` and `og:image:height=630`.

## Architecture decisions

- Preserve schemaVersion 2 and project storage format.
- Preserve the existing SPA for production editing screens.
- Add a Vite multi-page entry for `manual.html` and a React manual entry point.
- Use Vercel `cleanUrls` so the built `manual.html` is served as `/manual` without a catch-all SPA rewrite. The editor does not require URL-based client routing.
- No server, authentication, analytics, or cloud database is introduced.

## Non-goals

- No new AI/model capability.
- No schema migration.
- No video generation backend.
- No PWA/offline-worker work in this release.
- No broad visual effects, gradient system, or motion-heavy redesign.
