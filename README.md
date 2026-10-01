# FrameBible v2.0.1

FrameBible is a local-first browser workspace for AI-film preproduction: character and asset continuity, story structure, shot design, blocking geography, model-aware prompt compilation, and generation packages.

## v2.0.1 — Story hierarchy + user manual

This release refines the deployed v2.0 interface without changing the project schema or generation feature set.

Changes:
- Story rebuilt around a scalable Scene Navigator + tabbed Scene Editor
- simpler Idea Composer, AI Assist, and Logline hierarchy
- normalized local-draft and AI-draft actions
- targeted de-card/shadow polish across existing production screens
- persistent sidebar link to a detailed user manual
- dedicated multi-page `/manual` experience covering workflow, features, storage, security, export, shortcuts, and troubleshooting
- static Open Graph/Twitter metadata on the app and manual
- future 1200×630 OG asset slot at `public/og/framebible-1200x630.png`
- Vite multi-page output so manual metadata is available to crawlers without JavaScript execution

## Stack
- Vite + React + TypeScript
- Zustand
- Dexie / IndexedDB
- Zod
- JSZip
- Lucide React
- Vitest + React Testing Library

## Local run
```bash
npm install
npm test
npm run build
npm run dev
```

## Routes
- `/` — FrameBible production workspace
- `/manual.html` — manual in local Vite development
- `/manual` — clean manual URL when deployed on Vercel

## Open Graph image
When the 1200×630 image is ready, add it as:

```text
public/og/framebible-1200x630.png
```

Both `index.html` and `manual.html` already reference `/og/framebible-1200x630.png`.

FrameBible requires no application backend for project editing. Project data is stored in the browser by default. Session-only BYOK credentials are not included in project JSON or ZIP exports.

## QA status
Source syntax, CSS structure, HTML metadata, and documentation-route checks pass. Dependency-backed tests/build/browser QA remain to be run in an environment where npm packages can be installed.
