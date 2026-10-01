# FrameBible v2.0.1 — Implementation Review

## Scope

v2.0.1 is a focused Story-architecture, visible-UI polish, and documentation release. It preserves the v2.0.0 project schema and generation features while correcting hierarchy problems visible in the deployed Story screen and adding a detailed `/manual` site page.

## Phase 1 — Story architecture

Implemented:
- replaced the three-column idea composer with a vertical composer where the input dominates and Local Draft / AI Assist are normalized actions
- reduced AI Assist to a compact utility row with provider/key details behind disclosure
- removed the visually dominant black logline number rail and replaced it with a quieter editable logline band
- replaced the horizontal Scene-card strip with a scalable Scene Navigator + Scene Editor workspace
- added Scene setup status dots for incomplete Purpose/Emotional Beat states
- split Scene editing into Details / Cast & Props / Continuity tabs
- preserved scene CRUD/reorder, character/variant bindings, prop continuity state, transition events, local story draft, and AI story draft application

Self-review: **9.4/10**. The information architecture now follows the actual task sequence and is more resilient as Scene count grows. Actual browser visual QA is still required.

## Phase 2 — Targeted cross-screen polish

Implemented:
- added the Manual entry to the persistent sidebar navigation
- reduced default panel shadow use across production screens to avoid card-on-card depth inflation
- kept the existing v2 Asset tab workspace, Shots Blocking Board priority, Export package tabs, and Dashboard readiness structure rather than rewriting already-functional areas
- preserved System theme default and existing reduced-motion behavior

Self-review: **9.1/10**. The release intentionally avoids another broad visual rewrite; it applies the supplied UI-polish principle of fixing structure first and making reusable, visible corrections while developing.

## Phase 3 — Detailed in-product manual

Implemented a dedicated React manual entry with:
- sticky desktop table of contents and responsive horizontal TOC on narrower widths
- quick-start workflow
- Dashboard / Asset Bible / Story / Shots / Export explanations
- Character Variants, Continuity Locks, Blocking Board, Spatial Zones, Camera Path, Spatial Timeline, Transition Events
- model capability and Prompt Adapter concepts
- Generation Package structure and package:// reference behavior
- local IndexedDB storage, backup/import guidance, session-only BYOK explanation
- Undo/Redo shortcuts and troubleshooting guidance
- link back to the production workspace

Self-review: **9.4/10**. The manual is substantially more detailed than the previous Markdown-only user guide while remaining a static browser page.

## Phase 4 — Open Graph and static route

Implemented:
- root `manual.html` Vite entry for crawler-readable manual metadata
- Vite multi-page build inputs for `index.html` and `manual.html`
- Vercel `cleanUrls: true` so the deployed manual is reachable at `/manual`
- shared future OG image path: `/og/framebible-1200x630.png`
- Open Graph + Twitter metadata on both the main app and manual
- explicit 1200×630 dimensions, PNG type, alt text, and `ko_KR` locale
- `public/og/.gitkeep` so the image directory exists until the supplied image is added

The user only needs to add the eventual image as:
`public/og/framebible-1200x630.png`

Self-review: **9.3/10**. Static metadata is ready without introducing a backend. An absolute canonical/og:image origin is intentionally not invented because the final production domain was not supplied.

## QA

Completed:
- TypeScript/TSX syntax transpile check: **74 files, 0 syntax diagnostics**
- CSS structural check: opening/closing braces match; no literal escaped-newline artifacts
- HTML parser smoke for `index.html` and `manual.html`
- manual section/TOC anchor consistency check
- Open Graph/Twitter metadata presence check on both HTML entries
- application/package/sample project version updated to **2.0.1**

Blocked in this execution environment:
- `npm install --ignore-scripts --no-audit --no-fund` timed out waiting for the npm registry
- `npm test` therefore stops with `vitest: not found`
- `npm run build` therefore reports missing installed type/module packages before application compilation
- browser/dev-server visual verification cannot be truthfully claimed without the installed dependency set

## Final self-review

**9.1/10**

The release substantially fixes the Story hierarchy issue visible in the supplied deployed screenshot and adds a useful documentation surface. The remaining confidence gap is dependency-backed Vite/Vitest/browser verification in the user's normal environment.
