# FrameBible-v1.9.1

FrameBible v1.9.1 adds API-ready request manifests and a production-readiness dashboard on top of the v1.8 generation-package workflow.

## v1.9.1 highlights
1. **API Parameter Manifest**
   - Model-specific request templates for Seedance 2.5, Veo 3.1, and Kling.
   - Uses package-relative reference placeholders instead of pretending local browser images are public URLs.
   - Excludes credentials, callback secrets, and provider tokens.
2. **Production Dashboard**
   - Project and Scene statuses: Ready / Needs Review / Blocked.
   - Status derives from capability errors, continuity errors/warnings, missing generation references, Shot completeness, and package readiness.
   - Direct navigation to affected Scene/Shot/Export controls.
3. **Generate Package extension**
   - Adds `api-request.json` and readiness metadata alongside prompt, manifest, references, and contact sheet.

## Verified provider baselines
- Seedance 2.5 via Higgsfield API
- Veo 3.1 via Gemini API
- Kling Open Platform text-to-video baseline

FrameBible generates request templates only; it does not submit video-generation requests from the browser.
