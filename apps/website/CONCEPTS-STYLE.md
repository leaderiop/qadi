# Concepts Page Style Guide

Internal working doc for `apps/website/CONCEPTS-PLAN.md`. Not linked from the
site. Read this before writing or editing any `docs/concepts/*.md` page.

## Page template

Every Concepts page follows the same shape as the 6 existing pages
(`tokens-permissions.md`, `roles.md`, `policy-adt.md`, `matchers.md`,
`evaluation.md`, `enforcement.md`):

1. **Frontmatter** — `title` (short, matches the sidebar label) and
   `description` (one sentence, states the page's actual claim, not just its
   topic — see the existing 6 pages for the pattern).
2. **Opening paragraph(s), plain language, before any code or diagram.**
   Explain what the concept *is* and why it exists, in a sentence a reader
   who has never seen Qadi can follow. Don't open with a type signature.
3. **At least one diagram** (see below) placed where it clarifies structure
   a paragraph alone would make you re-read twice — a tree, a lattice, a
   flow, a before/after. Not decorative: if a diagram doesn't teach
   something the prose doesn't already say as clearly, cut it.
4. **At least one example that compiles.** `pnpm spec:website-examples`
   type-checks every fenced ` ```ts `/` ```typescript ` block against the
   real published package types — an example that doesn't import what it
   uses, or calls a signature that doesn't exist, fails the build. Prefer
   ` ```typescript ` (fully compiled) over ` ```ts ` (reference fragment)
   wherever the snippet can stand alone; see the 6 existing pages for both
   styles in use.
5. **Closing link out** to the spec behavior/decision doc(s) the page is
   drawn from, on GitHub — `https://github.com/leaderiop/qadi/blob/main/spec/...` —
   matching every existing page's closing line.

Keep the existing 6 pages' prose largely intact when upgrading them (Job 1) —
add the diagram and the extra example; don't rewrite accurate prose for its
own sake.

## Diagram approach: hand-authored inline SVG

Decided over Mermaid (new build dependency) and ASCII (least visually rich).
**Verified working**: raw `<svg>...</svg>` markup dropped directly into a
`.md` file's body passes through Astro 7.2.9's markdown pipeline unescaped —
confirmed by a throwaway build (`pnpm build`, checked the built HTML for the
literal tag, zero `&lt;svg` occurrences). No component, no `.mdx` conversion,
no remark plugin needed. Just write the `<svg>` tag directly in the `.md`
file, same level as any other paragraph.

### Palette

Docs are **dark-only** (`apps/website/src/styles/starlight.css` — the theme
toggle is removed; `:root` and `:root[data-theme="light"]` carry identical
values). So diagrams need no light-mode branch — but still use the CSS
custom properties below rather than hardcoded hex/oklch where one exists, so
a diagram tracks any future palette tweak instead of drifting from it.

| Role | Value | Use for |
| ---- | ----- | ------- |
| Body/label text | `var(--sl-color-gray-2)` | default diagram text |
| Bright text | `var(--sl-color-white)` | emphasized node labels |
| Dim text | `var(--sl-color-gray-3)` | captions, secondary annotations |
| Hairline | `var(--sl-color-hairline)` (`oklch(1 0 0 / 0.08)`) | default box/connector strokes |
| Hairline, stronger | `var(--sl-color-hairline-light)` (`oklch(1 0 0 / 0.14)`) | a box that needs to read as slightly more present |
| Accent (teal) | `var(--sl-color-accent)` | an active/highlighted node, an arrow being traced |
| Accent, bright | `var(--sl-color-accent-high)` | teal text on a teal-tinted fill |
| Seal gold | `var(--qadi-seal-gold)` | marks/ornament only — never a fill, never a verdict. Reserve for something like a "this is the answer" pointer, sparingly |
| Panel fill | `oklch(0.19 0.014 260)` (ink-raised) | a raised box's background |
| Void fill | `oklch(0.13 0.012 260)` | a code/data panel's background |
| **Allow** | `oklch(0.75 0.14 150)` | an `Allow` verdict node/edge — **only** an actual Allow verdict, never general "success" |
| **Deny** | `oklch(0.65 0.16 25)` | a `Deny` verdict node/edge — **only** an actual Deny verdict, never general "error" |

Allow-green and deny-red are literal `oklch(...)` values, not CSS custom
properties — this matches how the marketing pages already use them
(`src/data/landing-content.js`, `src/pages/index.astro`), so a diagram's
markup is consistent with the rest of the codebase rather than inventing a
new token these pages don't share.

**The Two-Accent Rule and Angles-Not-Circles Rule from `DESIGN.md` apply to
diagrams too**: teal/gold stay rare and meaningful, green/red stay
meaning-locked to actual Allow/Deny, and every box is a rounded rect
(`rx="6"`–`"8"`, matching the site's 6-10px corner radii) — never a circle or
curved connector. Arrows are straight or right-angled polylines, not curves.

### Structure and conventions

- **Root element**: `<svg viewBox="0 0 W H" width="100%" style="max-width: NNpx" role="img" aria-label="...">` — no fixed pixel `width`/`height` attributes (the viewBox + `width="100%"` + a `max-width` cap is what keeps a diagram from overflowing a narrow viewport; the site has no horizontal-scroll affordance around prose). Always set `aria-label` to a one-sentence description of what the diagram shows — screen-reader users get this instead of the visual.
- **Text**: `font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)"` for code identifiers/labels (permission names, `_tag` values), `font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)"` for plain-language captions — the same serif-judges/mono-cites split `DESIGN.md` uses everywhere else, carried into diagrams. Never Marcellus inside an SVG (it's a display face for page headings only). Font sizes: `11`–`13` for node labels, `10` for captions/footnotes — matching the site's Fine/Caption scale.
- **Boxes**: `<rect rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)" stroke-width="1"/>` as the default node.
- **Arrows**: a single shared `<marker>` per diagram (defined once in a `<defs>` block) rather than repeating marker XML per arrow. Stroke `var(--sl-color-gray-3)` at rest, `var(--sl-color-accent)` when the arrow represents the path actually taken (e.g. the branch that decided a trace).
- **Keep diagrams small**: one idea each. A diagram that needs its own scrollbar has too much in it — split it, or simplify what it shows.

### Worked example

The enforcement page's six-call diagram (Job 1.6) is the reference
implementation — look at `docs/concepts/enforcement.md`'s rendered diagram
markup directly for a concrete, working example of all of the above
(box style, arrow markers, text roles, allow/deny coloring) before writing a
new one from scratch.

## Verification checklist per page

- [ ] `pnpm --filter website build` (or `pnpm build` from `apps/website/`)
      succeeds with the new/changed page included.
- [ ] Every ` ```ts `/` ```typescript ` fence type-checks:
      `pnpm spec:website-examples` from the repo root.
- [ ] Diagram renders (spot-check the built HTML, or `pnpm --filter website dev`
      and look at it) — an unescaped `<svg>` should appear in the output,
      not `&lt;svg&gt;`.
- [ ] Page frontmatter `title`/`description` set; no sidebar config change
      needed (Concepts autogenerates from the directory).
- [ ] Closing spec link present and points at a real file under `spec/`.
- [ ] Update the row in `CONCEPTS-PLAN.md`'s page inventory table and check
      off the task in its job section.
