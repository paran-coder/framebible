# FrameBible v2.0.1 — User Manual Source

This Markdown file is the source checklist for the in-product `/manual` page. The website manual is intended to be substantially more detailed than this summary.

## Recommended workflow
1. Build the Asset Bible first: characters, variants, locations, props, reference images, and locks.
2. Use Story to turn a natural-language concept into Scenes and review each Scene's purpose, cast, props, and transitions.
3. Use Shots to define framing, lenses, camera motion, blocking, spatial zones, and explicit movement transitions.
4. Use Dashboard to find blockers and review items for the chosen model.
5. Use Export to validate capabilities, review continuity, inspect prompts, and generate a Scene Package.

## Story v2.0.1
Story uses a left Scene Navigator and a right editor on wide screens. The active Scene editor is divided into Details, Cast & Props, and Continuity so long productions remain manageable. AI provider configuration stays secondary to the story itself.

## Local-first storage
FrameBible stores project data in browser IndexedDB. Browser/site-data deletion can remove that local copy, so export project JSON/ZIP backups for important work. API keys used by experimental browser-direct BYOK are session-only and are not written into project exports.

## Manual page
Open `/manual` from the sidebar for the full guide, including quick start, screen-by-screen instructions, continuity concepts, Blocking Board and Spatial Zones, generation packages, backup/restore, keyboard shortcuts, and troubleshooting.

## OG image
The manual page is prepared for a 1200×630 Open Graph image at:
`/og/framebible-1200x630.png`

The actual image should be added later without changing the metadata path.
