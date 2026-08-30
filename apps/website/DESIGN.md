---
name: Qadi
description: Effect-native authorization for TypeScript.
colors:
  ink: "oklch(0.17 0.014 260)"
  ink-void: "oklch(0.13 0.012 260)"
  ink-raised: "oklch(0.19 0.014 260)"
  ink-chamber: "oklch(0.15 0.013 260)"
  parchment: "oklch(0.93 0.006 260)"
  parchment-dim: "oklch(0.85 0.006 260)"
  testimony: "oklch(0.68 0.01 260)"
  footnote: "oklch(0.6 0.01 260)"
  verdict-teal: "oklch(0.72 0.15 195)"
  verdict-teal-bright: "oklch(0.78 0.13 195)"
  verdict-teal-emphasis: "oklch(0.82 0.13 195)"
  seal-gold: "oklch(0.75 0.13 80)"
  allow-green: "oklch(0.75 0.14 150)"
  deny-red: "oklch(0.65 0.16 25)"
  hairline: "oklch(1 0 0 / 0.08)"
  testimony-bright: "oklch(0.72 0.01 260)"
  navlink: "oklch(0.75 0.01 260)"
  parchment-code: "oklch(0.82 0.006 260)"
  footnote-gold: "oklch(0.65 0.03 80)"
  marquee-label: "oklch(0.68 0.05 80)"
  table-header: "oklch(0.63 0.01 260)"
  comparison-body: "oklch(0.7 0.01 260)"
  comparison-body-bright: "oklch(0.8 0.01 260)"
  deny-red-emphasis: "oklch(0.7 0.16 25)"
  seal-gold-bright: "oklch(0.85 0.08 80)"
  code-function: "oklch(0.75 0.12 200)"
typography:
  display:
    fontFamily: "Marcellus, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2.25rem, 4vw, 3.625rem)"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'IBM Plex Sans', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "'IBM Plex Mono', monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.14em"
  scale:
    watermark: "130px"
    fine: "11px"
    caption: "13px"
    caption-plus: "13.5px"
    control: "14px"
    body-tight: "15px"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "48px"
  xl: "72px"
  hero: "96px"
components:
  button-primary:
    backgroundColor: "{colors.verdict-teal}"
    textColor: "{colors.ink-void}"
    rounded: "{rounded.sm}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.verdict-teal}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.parchment}"
    rounded: "{rounded.sm}"
    padding: "12px 20px"
  button-outline-hover:
    textColor: "{colors.seal-gold}"
  card:
    backgroundColor: "{colors.ink-raised}"
    textColor: "{colors.testimony}"
    rounded: "{rounded.lg}"
    padding: "24px"
  eyebrow-label:
    textColor: "{colors.verdict-teal-bright}"
    typography: "{typography.label}"
---

# Design System: Qadi

## Overview

**Creative North Star: "The Judge's Ledger"**

Qadi's site reads like a judge's own record: dark, unadorned at rest, and evidentiary rather than persuasive. It doesn't sell — it presents a case, cites the numbers behind every claim, and lets a geometric seal-mark (an eight-point star, never a circle) authenticate a page the way a wax seal authenticates a document. The name means "the judge," and the whole system is built to feel like the thing a judge would actually keep: precise, quiet, unwilling to overstate.

The palette is almost monochrome — a stack of near-black, faintly blue-gray surfaces — until a decision needs marking. Then exactly two accents appear: **verdict teal**, the color of an interactive choice being offered or a decision rendered, and **seal gold**, the color of authentication and ornament — the star marks, the hairline dividers, the ledger-line under a header. Neither accent is decorative wallpaper; each carries a specific meaning and stays rare because of it. Two more colors exist purely as verdict semantics, not brand accents: green for Allow, red for Deny, used only inside the site's own decision diagrams.

Type carries the "judge vs. evidence" split directly: a serif display face (Marcellus) for anything that reads like a heading or a ruling, and a monospace face (IBM Plex Mono) for anything that reads like a citation, a code excerpt, or a label — the two typefaces are never used interchangeably, and a reader should be able to tell which register a line is in before reading a single word of it.

**Key Characteristics:**
- Near-monochrome dark ground; teal and gold appear only with intent, never as ambient decoration
- Angular geometric ornament only — the eight-point star and its diamond satellites are the system's one recurring motif, and no curved or circular decorative shape ever appears
- Serif headings, monospace labels/code, sans body — three faces, three fixed jobs, never swapped
- Flat surfaces with colored glow instead of dark drop-shadows; depth comes from four tonal steps of near-black, not elevation shadows
- Interactive elements are reserved at rest and reveal their ornament only on hover or focus — nothing announces itself before being addressed

## Colors

Almost monochrome by design — the palette earns its two accents by rationing them.

### Primary
- **Verdict Teal** (`oklch(0.72 0.15 195)`): the filled-surface accent — primary buttons, the nav scroll-progress line, the qadi-highlighted comparison card. Used as a solid fill, never as running text.
- **Verdict Teal, Bright** (`oklch(0.78 0.13 195)`): the on-dark-text form of the same hue — eyebrow labels, links, section numbers, highlighted API names. This is the accent a reader actually reads as "teal," since the filled version is rarely seen as text.
- **Verdict Teal, Emphasis** (`oklch(0.82 0.13 195)`): a brighter step of the same hue for text that needs to stand out against an already-teal-tinted surface — the architecture walkthrough's `evaluate` label sitting on its own teal-tinted panel, the "qadi" comparison-card's own accent text.

### Secondary
- **Seal Gold** (`oklch(0.75 0.13 80)`): the ornament and authentication accent — the eight-point star marks, hairline section dividers, the nav's bottom gradient line, corner brackets that appear on card hover. Gold never fills a surface; it only draws lines, marks, and small geometric shapes.
- **Seal Gold, Bright** (`oklch(0.85 0.08 80)`): the hover-state form of Seal Gold for footer text links — a brighter, less saturated step than the ornament use, since it needs to read as emphasis rather than as a mark or line.

### Tertiary (verdict semantics, not brand accents)
- **Allow Green** (`oklch(0.75 0.14 150)`): exclusively an affirmative *verdict* — the "Allow" state inside decision diagrams and the DAG's decided-allow chip. Never used as a UI accent for anything that isn't itself standing in for an Allow/affirmative verdict: general "everything is fine" markers that aren't a policy decision — the hero's roadmap badge, the install snippet's `$` prompt, the model matrix's "shipped" label — stay in Seal Gold or Verdict Teal Bright instead. (An earlier draft of this entry cited those three as Allow Green examples; they were never built that way, and keeping green meaning-locked to an actual Allow/Deny verdict is what the Two-Accent Rule below depends on.)
- **Deny Red** (`oklch(0.65 0.16 25)`): exclusively the "Deny" state and the drift-defect warning in the problem section. Same rule — meaning-locked, not decorative.
- **Deny Red, Emphasis** (`oklch(0.7 0.16 25)`): a brighter step of Deny Red for text sitting inside its own Deny Red-bordered badge (the problem section's drift-alarm warning) — the same "text needs to stand out against an already-tinted surface" role Verdict Teal, Emphasis plays for teal.

### Neutral
- **Void** (`oklch(0.13 0.012 260)`): the deepest surface — code panels, the hero code-walkthrough background.
- **Ink** (`oklch(0.17 0.014 260)`): the page background.
- **Chamber** (`oklch(0.15 0.013 260)`): the nav bar and the model marquee band — one step darker than the page, marking them as fixed architecture rather than scrolling content.
- **Ink, Raised** (`oklch(0.19 0.014 260)`): card and panel surfaces — one step lighter than the page, the system's only elevation cue besides glow.
- **Parchment** (`oklch(0.93 0.006 260)`): primary text and headings.
- **Parchment, Dim** (`oklch(0.85 0.006 260)`): code text and secondary emphasis.
- **Testimony** (`oklch(0.68 0.01 260)`): body copy — the default reading color for prose.
- **Testimony, Bright** (`oklch(0.72 0.01 260)`): a step brighter than Testimony for body copy set against a lighter surface (`Ink, Raised` cards) where full Testimony would read slightly flat.
- **Comparison Body** (`oklch(0.7 0.01 260)`): the reading color inside the "three ways to do authorization" comparison cards — between Testimony and Testimony Bright, reserved for that one comparison's prose lines.
- **Comparison Body, Bright** (`oklch(0.8 0.01 260)`): the reading color inside the "qadi" comparison card specifically — the one highlighted card, tinted with Verdict Teal, where plain Comparison Body would read slightly flat against the tint.
- **Nav Link** (`oklch(0.75 0.01 260)`): the resting-state color for top-nav text links, a step brighter than body copy since it sits on the nav's own darker glass surface.
- **Parchment, Code** (`oklch(0.82 0.006 260)`): a brighter code-text tone than Parchment, Dim — used where a code line needs to read closer to full emphasis without reaching Parchment's heading-level brightness.
- **Code Function** (`oklch(0.75 0.12 200)`): the function-name token color in syntax-highlighted code — the hero's interactive typed-code panel (`codeColors.f`) and the problem section's static comparison snippet both use this exact value for the same syntactic role.
- **Table Header** (`oklch(0.63 0.01 260)`): the API-reference table's column-label color, tuned to clear 4.5:1 against the table header row's `oklch(0.21 ...)` background specifically (a step brighter than Footnote's general-purpose floor).
- **Footnote, Gold** (`oklch(0.65 0.03 80)`): the gold-tinted counterpart to Footnote, for the least-important label when it sits in gold's semantic territory — the nav's "قاضي · the judge" subtitle, the footer's "Effect v4 · TypeScript" line.
- **Marquee Label** (`oklch(0.68 0.05 80)`): the model-marquee band's uppercase labels — brighter and more saturated than Footnote Gold since the marquee band is its own fixed-architecture strip (see `Chamber`), not running prose.
- **Footnote** (`oklch(0.6 0.01 260)`): captions, timestamps, and the least important label on a screen. Raised from an earlier `0.55` after an accessibility audit found the darker value fell as low as 3.8:1 against `Ink, Raised` — below the WCAG AA floor this site commits to (see Accessibility & Inclusion in PRODUCT.md).
- **Hairline** (`oklch(1 0 0 / 0.08)`): the canonical value for the white-at-low-opacity border/divider scale below — every hairline border and divider is this same white, stepped only in alpha, never a solid gray.
- White at low, stepped opacity (`oklch(1 0 0 / 0.07)` through `/ 0.16`) draws every hairline border and divider — never a solid gray. The steps in active use: `0.07` (the marquee band's top/bottom rule, the lightest touch), `0.08` (the default card/panel border — the most common step by far), `0.1` (code-block borders, secondary panel emphasis), `0.12` (divider-gradient midpoints, muted card borders), `0.14` (pill/badge borders, the install-snippet's copy-button divider), `0.15` (the hero's unlit step-dots), `0.16` (the strongest hairline — the outline button and the nav's GitHub link).

### Named Rules
**The Two-Accent Rule.** Only verdict teal and seal gold ever function as brand accents. Green and red exist solely as Allow/Deny verdict semantics inside diagrams and never appear as a generic UI accent, a link color, or a decorative highlight.

**The No-Wallpaper Rule.** Neither accent fills a large background area. Teal fills small, discrete surfaces (a button, a highlighted card); gold never fills anything — it only draws lines and marks.

## Typography

**Display Font:** Marcellus (with Georgia, 'Times New Roman', serif fallback)
**Body Font:** IBM Plex Sans (with sans-serif fallback)
**Label/Mono Font:** IBM Plex Mono (with monospace fallback)

**Character:** A Roman-inscription serif for anything that renders a judgment, set against a technical monospace for anything that renders evidence — the pairing itself is the "judge vs. citation" split made visible before a reader parses a single word.

### Hierarchy
- **Display / H1** (400, 58px / `clamp(2.25rem, 4vw, 3.625rem)`, 1.12 line-height, 0.005em tracking): the hero headline only — one per page, ever.
- **Headline / H2** (400, 36px, 1.2 line-height, -0.01em tracking): section titles. Always paired with a mono eyebrow label above it and a near-invisible oversized serif page-number watermark (`oklch(1 0 0 / 0.035)`, 130px) in the section's top-right corner.
- **Body** (400, 15-18px, 1.6 line-height, max ~68ch): prose paragraphs, set in Testimony gray, never full Parchment brightness — full brightness is reserved for headings and short emphasis spans.
- **Label** (500, 12px, 1.4 line-height, 0.14em tracking, uppercase): section eyebrows ("01 · the problem"), nav links, badges, and code comments. Mono only, always tracked wide, always uppercase when it names a section.
- **Code** (400/500, 12-13px, IBM Plex Mono): inline code and full code panels, syntax-colored against the Void background.

### Extended Scale

Below Label (12px), inside Body's 15-18px range, and above it, seven more steps recur often enough to be sizes rather than drift:

- **Watermark** (130px): the near-invisible oversized section-number digit, already named in Headline/H2 above — listed here too so it reads as one enumerated ramp rather than a one-off exception.
- **Fine** (11px): the smallest real text on the page — table `on denial` copy, card sub-captions, the architecture trace's service labels.
- **Caption** (13px): the single most common step below Body — nav links, code-panel chrome (`document.ts`, `↺ replay`), card labels, comparison-card body text.
- **Caption, Plus** (13.5px): a half-step up from Caption for slightly higher-emphasis captions — the package cards' description text, the hero panel's caption body.
- **Control** (14px): interactive control text — the hero's primary/outline button labels.
- **Body, Tight** (15px): the lower bound of Body's documented 15-18px range, called out explicitly since several section intros (`p` tags directly under an H2) sit at exactly this step rather than the wider range.
- **Wordmark** (21px): the serif "qadi" brand logotype specifically — sits between Body (18px) and Headline (36px) with nothing else at that step, used identically (same size, tracking, and color) in the nav's `.wordmark` and the footer lockup so the brand mark reads as one fixed size everywhere it appears, never scaled to fit its container.

### Named Rules
**The Serif-Judges, Mono-Cites Rule.** A serif face renders a claim or a heading; a monospace face renders a citation, a label, or a fact. The sans body face renders everything else. No exceptions swap a job between faces.

## Layout

Single-column, centered content at `max-width: 1280px` (1080-1280px on inner card grids), 48px horizontal gutters that narrow on mobile. Sections stack vertically with generous top padding (44-76px) rather than a persistent grid — this is a long-form scroll narrative on the homepage, not a dashboard. Card grids use CSS grid with `gap: 16-24px`; two- and three-column comparison layouts are the most common grid shape. The hero uses a two-column `1fr 1.1fr` split (copy left, live code panel right) that collapses to one column on narrow viewports. Docs pages use Starlight's own sidebar + content + right-rail TOC layout unmodified.

## Elevation & Depth

Flat with colored glow, not drop-shadow elevation. Depth comes from four tonal steps of near-black (Void → Ink → Chamber → Ink Raised) rather than shadow blur — a raised card is a lighter fill, not a shadowed one. Glow is reserved for emphasis, not hierarchy: a soft, wide, accent-tinted glow (`box-shadow: 0 0 40px oklch(0.72 0.15 195 / 0.12)`) marks the one highlighted item in a comparison, and one large ambient dark shadow (`0 24px 60px oklch(0 0 0 / 0.45)`) sits under the hero's floating code panel to lift it off the page. Nothing else in the system casts a shadow.

### Shadow Vocabulary
- **Ambient lift** (`box-shadow: 0 24px 60px oklch(0 0 0 / 0.45)`): the hero code panel only — the system's one "this floats above the page" moment.
- **Accent glow, wide** (`box-shadow: 0 0 40px oklch(0.72 0.15 195 / 0.12)`): marks the single highlighted/recommended option in a side-by-side comparison.
- **Accent glow, tight** (`box-shadow: 0 0 10px oklch(0.75 0.13 80 / 0.5)`): the nav's scroll-progress line, a small in-motion accent rather than a resting-state treatment.
- **Accent glow, active-step** (`box-shadow: 0 0 20px oklch(<hue> / 0.25)`): marks whichever node is currently active in a live, multi-step animated walkthrough (the architecture trace's chips and eval/output boxes, the DAG's decided allow/deny chip) — teal while the step is in progress, the reached Allow-green/Deny-red once a verdict lands. Distinct from Accent glow, wide: this one is per-step and JS-driven rather than a static highlighted comparison card.

### Named Rules
**The Flat-Until-Marked Rule.** Every surface is flat at rest. A shadow or glow appears only to mark the one thing on screen that deserves attention — never as ambient decoration on ordinary cards.

## Shapes

Angular only. The system's one recurring geometric form is an eight-point star (`clip-path`/SVG polygon, `points="50,8 56.9,33.4 79.7,20.3 66.6,43.1 92,50 66.6,56.9 79.7,79.7 56.9,66.6 50,92 43.1,66.6 20.3,79.7 33.4,56.9 8,50 33.4,43.1 20.3,20.3 43.1,33.4"`), used as the site's logo mark, as a slowly-rotating watermark in the status section, and as small satellite marks (diamonds and quarter-stars) flanking section dividers and the model marquee. Corners on functional UI (cards, panels, code blocks) are gently rounded — 8-10px on containers, 6px on buttons and inputs, fully round (999px) on pills and badges — but no decorative shape is ever circular or curved. Borders are hairline (1px), always a stepped white-alpha value, never a solid gray.

### Named Rules
**The Angles-Not-Circles Rule.** Every decorative or ornamental shape is a polygon. A circle, blob, or curved medallion never appears as decoration anywhere on the site — this was a deliberate, explicit correction made during design and is a hard invariant, not a style preference.

## Components

### Buttons
- **Shape:** 6px radius, 12px/20px padding.
- **Primary:** Verdict Teal fill, Void text, 600 weight — lifts 2px and gains a soft teal glow on hover.
- **Outline / Ghost:** transparent fill, hairline white-alpha border, Parchment text — border shifts to Seal Gold and the button lifts 2px on hover.
- **Nav link:** no fill, Footnote-to-Parchment text on hover, and a gold-to-teal gradient underline that draws in from the left on hover — the underline is the only affordance a nav link gets.

### Cards / Containers
- **Corner Style:** 10px radius (large panels), 8px (code blocks).
- **Background:** Ink Raised against the Ink page background; Void for code/terminal-style panels.
- **Border:** 1px hairline, white-alpha (`oklch(1 0 0 / 0.08)` typical); the one highlighted card in a comparison gets a Verdict Teal border instead.
- **Signature hover behavior — the Ornate Rule:** a feature card reveals a Seal Gold corner bracket (top-left and bottom-right, `border-top`/`border-left` and `border-bottom`/`border-right` only) fading in on hover, like a wax-seal corner appearing on an authenticated page. A package card instead draws a teal-to-gold gradient hairline across its top edge on hover. Both effects are invisible at rest — nothing on the card announces its own interactivity before the reader engages it.
- **Internal Padding:** 20-28px, scaling loosely with the card's content density.

### Section Dividers (signature component)
Every homepage section opens with the same ornament instead of a plain rule: two gradient hairlines (fading from the page edge toward the center) meeting a slowly-rotating outlined eight-point star flanked by two small 45°-rotated gold diamonds. This replaces a conventional `<hr>` or `border-top` everywhere on the homepage — it is the system's signature transition, not a one-off flourish.

### Navigation
- **Style:** a sticky glass bar (blurred, semi-transparent Ink-to-Chamber gradient) with a thin teal-to-gold scroll-progress line along its very top edge and a gold-fading-to-teal hairline along its bottom edge.
- **Typography:** mono, 13px, Footnote-gray at rest.
- **Active/hover state:** the current section (via scroll-spy) or a hovered link turns Seal-Gold-tinted Parchment and draws its underline; nothing else changes.
- **Mobile:** the same bar, condensed; no separate mobile nav pattern exists yet.

### Docs Chrome (Starlight)
Docs pages keep Starlight's own header, sidebar, and right-rail TOC structure — the chrome itself is intentionally more conventional and utilitarian than the marketing pages, since its job is wayfinding through ~26 pages, not persuasion. But every color and font in it is Qadi's own: the full `--sl-color-*` set (background, text, hairline, and accent scales) carries the Ink/Void/Chamber/Parchment neutrals and Verdict Teal accent, `--sl-font`/`--sl-font-mono` carry IBM Plex Sans/Mono, and every heading inside the content area (`main :is(h1..h6)`) is set in Marcellus — the same "ruling vs. citation" split as the marketing pages, just applied to a Starlight-templated page instead of a hand-built one. Docs are **dark-only**, matching the marketing pages, which never had a light variant: the theme toggle is removed rather than left offering an undesigned mode, and the same dark values apply regardless of `[data-theme]` or system preference. The header keeps the same gold-to-teal hairline the marketing nav uses along its bottom edge — the one ornamental touch borrowed directly from the rest of the site.

## Do's and Don'ts

### Do:
- **Do** keep verdict teal and seal gold rationed — each should read as meaningful precisely because it's rare on any given screen.
- **Do** reveal a card's ornament (corner bracket, top-edge hairline) only on hover or focus, never at rest.
- **Do** pair every H2 with a mono eyebrow label and a numbered, near-invisible watermark — the numbering is real (it matches the page's actual section order), never decorative filler.
- **Do** use the eight-point star and its diamond satellites as the one recurring geometric signature, in dividers, logos, and watermarks alike.
- **Do** cite a real number (coverage, mutation score, gate count) wherever the copy would otherwise reach for an adjective.

### Don't:
- **Don't** use a circle, blob, or curved medallion as a decorative shape anywhere. This was an explicit, deliberate correction during this project's design phase and is a hard invariant.
- **Don't** build literal Moroccan-architecture pastiche (zellige tilework patterns, horseshoe arches, literal courtyard/fountain imagery) — the geometric language nods at the name's Arabic etymology without illustrating it literally.
- **Don't** reach for a gradient-heavy hero background, a generic rounded-card-with-left-border-accent pattern, or emoji as section markers — this project has consistently avoided the default AI-generated-design vocabulary and should keep doing so.
- **Don't** let green or red drift into general UI-accent use outside an explicit Allow/Deny verdict context.
- **Don't** claim a compliance/certification status anywhere on the site (see PRODUCT.md's Capabilities and Constraints) — this is a product-truth constraint that also binds visual and copy work: never design a badge, seal, or checkmark that implies "certified" or "compliant."
