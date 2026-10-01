# FrameBible-v1.9.1 User Manual

## Production Dashboard
Open **Export** to see project/Scene readiness.
- **Ready**: current deterministic checks pass.
- **Needs Review**: no hard blocker, but warnings or incomplete production metadata remain.
- **Blocked**: at least one hard capability, continuity, or package-data issue exists.

A readiness label is not a prediction of generation quality. It only reports whether FrameBible's explicit rules are satisfied.

## API Parameter Manifest
Choose Seedance, Veo, or Kling in Export. FrameBible can preview/download an `api-request.json` request template.

Local reference images are written as `package://...` placeholders. They must be uploaded/hosted by a secure execution layer before a real provider API call. Credentials are never included.

## Scene Generate Package
The Scene ZIP contains the prompt, contact sheet, references, capability report, `manifest.json`, and `api-request.json`.
