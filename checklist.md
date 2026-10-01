# FrameBible v2.0.1 — Checklist

## Phase 0 — Baseline and planning
- [x] Copy v2.0.0 source baseline
- [x] Create/update README.md, context-notes.md, checklist.md, User manual.md before implementation
- [x] Preserve v2.0.0 feature and data contracts

## Phase 1 — Story structure
- [x] Redesign Idea Composer as a vertical workflow
- [x] Normalize Local Draft / AI Draft action hierarchy
- [x] Reduce AI Assist to a compact utility row
- [x] Simplify Logline surface
- [x] Replace horizontal Scene cards with Scene Navigator + Editor workspace
- [x] Add Details / Cast & Props / Continuity editor tabs
- [x] Preserve scene CRUD, ordering, bindings, events, AI/rule-based generation
- [x] Self-review — 9.4/10

## Phase 2 — Targeted cross-screen polish
- [x] Review hierarchy/action/card/spacing issues while implementing
- [x] Add persistent Manual navigation entry
- [x] Reduce default panel shadow saturation across production screens
- [x] Keep minimum readable microcopy and visible focus states
- [x] Keep Shots board dominant and Export raw JSON secondary
- [x] Preserve System theme default and reduced-motion behavior
- [x] Self-review — 9.1/10

## Phase 3 — Detailed manual page
- [x] Add dedicated manual React entry/page
- [x] Add desktop table of contents with anchor navigation
- [x] Cover quick start, Dashboard, Asset Bible, Story, Shots, Export
- [x] Cover Character Variants, Continuity, Blocking Board, Spatial Zones, transitions, model capabilities, package export
- [x] Cover local storage, BYOK security, backup/import/export, troubleshooting, keyboard shortcuts
- [x] Add responsive manual layout
- [x] Add visible Manual entry in app sidebar
- [x] Self-review — 9.4/10

## Phase 4 — OG metadata / multi-page build
- [x] Add `manual.html` with page-specific title/description/Open Graph/Twitter tags
- [x] Reserve `/og/framebible-1200x630.png`
- [x] Add 1200×630 width/height and PNG type metadata
- [x] Add OG/Twitter metadata to the main app entry as well
- [x] Configure Vite multi-page build for index.html + manual.html
- [x] Configure Vercel clean URLs so manual.html is deployed as `/manual`
- [x] Self-review — 9.3/10

## Phase 5 — QA
- [x] TypeScript/TSX syntax check — 74 files, 0 syntax diagnostics
- [x] CSS structural check — brace counts match, 0 literal escaped-newline artifacts
- [x] HTML parser smoke — index.html and manual.html
- [x] Manual TOC/section anchor consistency check
- [x] OG/Twitter metadata presence check
- [x] Version consistency — package/app/sample project at 2.0.1
- [ ] Dependency-backed `npm test` — npm registry install timed out; `vitest` unavailable locally
- [ ] Dependency-backed `npm run build` — dependency installation unavailable in this environment
- [ ] Browser visual QA — requires a successfully installed/dev-served app
- [ ] Verify supplied 1200×630 OG image after it is added
- [x] Final self-review — 9.1/10

## Release note
v2.0.1 focuses on the deployed Story-screen hierarchy problem and adds a real user-manual route. The next validation step should be the user's normal `npm install && npm test && npm run build`, followed by screenshots of Story and `/manual` from Vercel for final visual tuning.
