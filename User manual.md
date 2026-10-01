# FrameBible v2.0.0 — User Manual

## Navigation
Use the left sidebar to move between Dashboard, Asset Bible, Story, Shots, and Export. Theme defaults to **System**. Undo/Redo and History remain in the top workspace bar.

## Dashboard
Use Dashboard as the production readiness overview. Select a target model and review Ready / Needs Review / Blocked scenes. The dashboard reports explicit capability, continuity, and package rules; it does not claim to predict output quality.

## Asset Bible
Select an asset from the left library, then work in one focused editor tab at a time:
- **Overview** — identity/location/prop fields
- **Variants** — character wardrobe and physical-state variants
- **References** — base reference images
- **Continuity** — locked fields
- **Prompt** — character sheet and identity-reference prompt package

On narrower screens, the asset library becomes a horizontal strip instead of consuming the whole page height.

## Story
Write an idea in natural language, generate a rule-based or AI-assisted draft, and edit the selected Scene. The provider/model/key controls are collapsed by default; open **AI 설정** only when changing the connection. API keys remain session-only. The full scene overview is also optional so the active Scene editor stays dominant.

## Shots
The central Blocking Board is the primary workspace. Reorder/select shots on the left and edit camera/action details in the right Inspector. Zone-linked nodes display a small binding marker. Composition treatments are available from **구도 제안** but remain collapsed during normal blocking work.

## Export
Export is organized around a Scene Generation Package. First select the Scene and target model, then confirm model settings. Use the package workspace tabs:
- **Prompt** — human-readable model prompt
- **API** — credential-free API parameter manifest / raw JSON
- **References** — generation reference selection and contact-sheet context
- **Package** — Continuity review, readiness summary, Scene Package ZIP, Project JSON, and Project ZIP

Raw JSON is available when needed but is no longer the primary view.

## Before deployment
Run:
```bash
npm install
npm test
npm run build
```
Then visually inspect Dashboard, Assets, Story, Shots, and Export at desktop width and one narrow/mobile width before treating v2.0.0 as release-ready.
