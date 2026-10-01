# FrameBible-v1.9.0 Checklist

## Phase 0 — Planning
- [x] README.md updated
- [x] context-notes.md updated
- [x] checklist.md updated
- [x] User manual.md updated
- [x] Current official provider parameter baselines checked

## Phase 1 — API Parameter Manifest
- [x] Add provider-neutral request-manifest type
- [x] Add Seedance 2.5 adapter
- [x] Add Veo 3.1 adapter
- [x] Add Kling adapter
- [x] Package-relative reference placeholders/bindings
- [x] No credentials/secrets in request output
- [x] Add `api-request.json` to Scene package
- [x] Add API manifest preview/download in Export UI
- [x] Unit/runtime coverage

Self-review: **9.5 / 10**

## Phase 2 — Production Dashboard
- [x] Add deterministic Ready / Needs Review / Blocked engine
- [x] Project summary cards
- [x] Scene readiness queue
- [x] Explain blockers/review items
- [x] Navigate to Scene / Shot / Export target
- [x] Responsive + keyboard-accessible controls
- [x] Keep dashboard state derived/non-persisted

Self-review: **9.4 / 10**

## Phase 3 — Generate Package
- [x] Add `api-request.json`
- [x] Add `readiness-report.json`
- [x] Keep manifest paths consistent
- [x] Preserve prompt/contact sheet/frame/reference files
- [x] Exclude credentials/session secrets

Self-review: **9.5 / 10**

## Phase 4 — Verification
- [x] Core tests: 48/48 passed with dependency-free harness
- [x] TS/TSX syntax: 70 files, 0 diagnostics
- [x] Strict semantic check for new core modules
- [x] Runtime: Seedance/Veo/Kling request templates
- [x] Runtime: credential-field exclusion
- [x] Runtime: package:// reference binding
- [x] Runtime: readiness states
- [x] Runtime: manifest/API-request/readiness file-path consistency
- [x] CSS structural checks
- [ ] npm install — package registry timed out in this environment
- [ ] npm test — dependencies unavailable
- [ ] npm run build — dependencies unavailable
- [ ] browser smoke/E2E — dev server unavailable

## Final self-review
**9.3 / 10** for the v1.9.0 implementation scope.
