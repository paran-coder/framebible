# FrameBible v2.0.0

FrameBible is a local-first browser workspace for AI-film preproduction: asset continuity, story structure, shot design, blocking geography, model-aware prompts, and generation packages.

## v2.0.0 — Production workspace redesign

v2.0.0 keeps the v1.9.1 feature set and data model while rebuilding the interface hierarchy for practical production work.

Key changes:
- unified light-first design language with System theme as the default
- clearer sidebar, typography, editable states, spacing, and surface hierarchy
- Asset Bible: left library + tabbed editor for Overview / Variants / References / Continuity / Prompt
- Story: compact AI connection control and collapsed secondary scene overview
- Shots: Blocking Board remains the primary surface; composition suggestions are optional
- Export: Generation Package workspace with Prompt / API / References / Package tabs
- raw API JSON is no longer the default view
- wider workspaces for Assets/Shots and calmer constrained widths for reading/review screens

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

FrameBible is designed as a static browser app. Project data stays in the browser by default. Session-only BYOK credentials are never included in project exports.

## Current QA status
Source-level syntax and core runtime checks pass. The build environment used to prepare this archive could not reach the npm registry, so a dependency-backed `npm test`, `npm run build`, and browser visual pass remain the final release gate.
