# FrameBible v2.0.0 — Checklist

## Phase 0 — Baseline
- [x] Copy v1.9.1 baseline
- [x] Create v2.0.0 planning documents
- [x] Preserve v1.9.1 data contracts and core generation features

## Phase 1 — Design system + app shell
- [x] Replace legacy page-level visual hierarchy with v2 token overrides
- [x] Improve sidebar readability and navigation states
- [x] Standardize workspace toolbar and page headers
- [x] Define constrained and wide page variants
- [x] Improve editable/read-only/disabled control states
- [x] Preserve System as the default theme with Light/Dark support
- [x] Raise critical microcopy/readability floor
- [x] Self-review — 9.1/10

## Phase 2 — Asset Bible
- [x] Split editor into Overview / Variants / References / Continuity / Prompt tabs
- [x] Reduce default vertical page length
- [x] Keep CRUD, variants, reference upload, locks, and prompt copy intact
- [x] Use a sticky asset library on wide screens
- [x] Add responsive horizontal asset library fallback
- [x] Self-review — 9.4/10

## Phase 3 — Story + Shots
- [x] Compact AI provider UI into an optional settings disclosure
- [x] Reduce security notice visual weight without hiding its meaning
- [x] Preserve story generation and scene editing
- [x] Collapse duplicate scene overview by default
- [x] Keep Blocking Board visually dominant
- [x] Move composition suggestions into a collapsible drawer
- [x] Add explicit visual marker for zone-bound Blocking Board nodes
- [x] Self-review — 9.2/10

## Phase 4 — Export
- [x] Reframe Export around Scene Generation Package
- [x] Add Prompt / API / References / Package tabs
- [x] Hide raw API JSON by default
- [x] Keep model setup and capability feedback above the package workspace
- [x] Preserve continuity, contact sheet, manifest, project export, and Scene Package generation
- [x] Move final package actions into a focused readiness card
- [x] Self-review — 9.4/10

## Phase 5 — QA
- [x] TypeScript/TSX syntax transpile check — 72 files, 0 syntax errors
- [x] CSS structural check — 1048 opening / 1048 closing braces, 0 literal escaped-newline artifacts
- [x] Pure core strict TypeScript compilation
- [x] Core runtime smoke — project parse, Continuity, 3 prompt adapters, 3 API manifests, readiness
- [x] Version consistency — package/app/sample project at 2.0.0
- [ ] Dependency-backed `npm test` — blocked in this environment because npm registry did not respond
- [ ] Dependency-backed `npm run build` — blocked by the same dependency-install limitation
- [ ] Actual browser visual QA of v2.0.0 — requires a built/dev-served app
- [ ] Browser responsive QA / console scan — requires a built/dev-served app

## Release note
v2.0.0 intentionally adds no new production capability. It reorganizes the v1.9.1 feature set around clearer task hierarchy and progressive disclosure. A dependency-backed Vercel/local build remains the final release gate.
