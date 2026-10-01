# FrameBible v2.0.0 — Context Notes

## Goal

v2.0.0 is a UI/UX polish release. It preserves the v1.9.1 data model and production features while reorganizing the interface into a calmer, higher-density cinematic production workspace. No new generation capability is added.

## Design principles

1. Structure before decoration. Page hierarchy, workspace geometry, and task flow come first.
2. Light-first, system theme by default. Dark mode remains fully supported.
3. The active production object must dominate the screen. Secondary suggestions, raw JSON, and setup detail are progressively disclosed.
4. Use three visual surface levels only: canvas, workspace surface, inset/control. Avoid wrapping every section in a card.
5. Minimum readable type scale: labels/meta 11–12px, body 14px, section titles 16–18px, page titles 30–34px.
6. Purposeful semantic color only: green=ready, amber=review, red=blocked/error, teal=active production context.
7. Inputs look editable; disabled/read-only states are visually distinct.
8. Keyboard focus and reduced-motion remain supported.

## Information architecture changes

### App shell
- Refine sidebar proportions, navigation readability, top history bar, page widths, and spacing tokens.
- Use wider fluid workspaces for Assets/Shots and constrained reading widths for Dashboard/Story/Export.

### Asset Bible
- Keep left asset library.
- Replace the long vertical editor with right-side tabs: Overview, Variants, References, Continuity, Prompt.
- Only the active task is visible at once.

### Story
- Keep natural-language story flow prominent.
- Collapse provider/key setup into a compact AI connection control and optional settings disclosure.
- Reduce warning prominence and tighten scene editing density.

### Shots
- Preserve the successful three-column structure.
- Make Blocking Board the visual center.
- Move composition suggestions into a collapsible drawer.
- Clarify selected/linked/locked/warning states.

### Export
- Reframe around “Generation Package”.
- Add tabs: Prompt, API, References, Package.
- Raw JSON is secondary and appears only in API view.
- Keep capability, continuity, contact sheet, and package generation intact.

## Non-goals
- No schema migration.
- No new model adapters.
- No new AI providers.
- No direct browser video generation.
- No server/backend.
