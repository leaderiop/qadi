# Phase 34 — UI Review

**Audited:** 2026-11-12
**Baseline:** 34-UI-SPEC.md (approved)
**Screenshots:** not captured (no dev server; dev-tool dock inside a library). Code-only audit.
**Interaction captures:** off (workflow.ui_interaction_capture is false)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Every string in DiagnosticsNotice.tsx matches the contract verbatim; reason shown unaltered |
| 2. Visuals | 3/4 | Stopped notice is the sole tinted/bordered block; focus after restart has no visible indicator |
| 3. Color | 4/4 | Amber only on stopped border/lead/tint; Starting neutral; no hardcoded colors |
| 4. Typography | 3/4 | Two weights (600/400), two sizes as declared; Starting lead inherits muted, 4px xs gap unused |
| 5. Spacing | 3/4 | 8px 12px padding, 8px margins as declared; declared 4px xs token never used |
| 6. Experience Design | 3/4 | All states, once-per-stop alert, suppressions present; a11y and visual backstops unverified |

**Overall: 20/24**

---

## Top 3 Priority Fixes

1. **Focus is invisible after Restart** (WARNING) — `restart()` focuses the screen root, and `diagnosticsRootProps` sets `outline: "none"`, so a keyboard user gets no focus indication after the button unmounts. Fix: keep `outline: none` but add a `:focus-visible` treatment, or move focus to the Starting notice (give it `tabIndex={-1}`) so the announced region and the focus agree.
2. **role="alert" reads the whole `Cause.pretty` stack** (WARNING) — `DiagnosticsNotice.tsx` StoppedNotice puts the `<pre>` reason inside the alert section, so the first presentation of a stop can read many stack frames aloud. The spec said not to put alert on the `<pre>`, but it did not address the nesting. Fix: add `aria-atomic="false"`/`aria-live` scoping is not enough; render the lead+body in the alert and the reason as a sibling outside the role="alert" element.
3. **Visual and a11y backstops are unverified** (WARNING) — the amber tint legibility, focus ring and hidden-`<Activity>` rebuild (D-06) are declared as a human browser check; no evidence of it was found in the summaries or this audit. Record the check before shipping.

Minor: the `Starting` role="status" is mounted already containing its text; some screen readers skip announcing a live region inserted with content. Consider rendering the region empty first. Also the spec's 4px `xs` gap (lead vs body) is declared but the lead and body are inline separated by a single space, so the token is dead spec text; reconcile the spec.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)
Constants at DiagnosticsNotice.tsx:17-26 match the Copywriting Contract exactly (lead phrases, both stopped bodies, "Restart diagnostics", "Why diagnostics stopped"). The visible button text is the accessible name; no differing aria-label. Suppression copy ("no activity reading", "no counts read yet.") present in ServicesPanel.tsx:107 and QuestionsPanel.tsx:301-303. No generic labels. No finding below pass level.

### Pillar 2: Visuals (3/4)
Stopped notice is the only tinted, bordered block and sits first on both screens (ServicesPanel.tsx:123, QuestionsPanel.tsx:103); Starting is neutral with no button, as contracted. Deductions: focus handling after restart (fix 1); focal-point and amber legibility claims were not visually verified (no screenshots).

### Pillar 3: Color (4/4)
Only `colors.error`, `colors.border`, `colors.text`, `colors.surface` and `withAlpha(colors.error, 0.12)` are used; no hex or rgb literals in the new file; accent untouched. Not color-alone: words, role and button also distinguish states.

### Pillar 4: Typography (3/4)
Weights 600 (strong) and 400 only; sizes `font.size` and `font.sizeSmall` (reason). Starting lead is muted like its body, so the lead has weight but no color emphasis; acceptable per spec but low differentiation.

### Pillar 5: Spacing (3/4)
Notice padding `8px 12px`, `panel`'s `marginBottom: 8` supplies the 8px notice margin, reason `margin: "8px 0 0"`, `padding: 8`, button `marginTop: 8`. All multiples of 4. The declared `xs` 4px token has no usage. Root padding 12 matches the inherited exception.

### Pillar 6: Experience Design (3/4)
Covered: Off/Starting/Live/Stopped dispatch via `Match.tagsExhaustive` (DiagnosticsNotice.tsx, bottom), `isUnsampled` shared by both panels, announce-once via a dock-owned `announced` ref (DevtoolsDock.tsx:167-169) with mode fixed per mount/new stop, restart idempotent, reason scrolls at 96px and is keyboard-focusable, no destructive action. Gaps: items under fixes 1 to 3. Note the tests (DiagnosticsNotice.test.tsx, DiagnosticsScreens.test.tsx) were listed but not run in this audit.

---

## Files Audited
- packages/devtools/src/react/DiagnosticsNotice.tsx
- packages/devtools/src/react/ServicesPanel.tsx (grep and excerpts)
- packages/devtools/src/react/QuestionsPanel.tsx (grep and excerpts)
- packages/devtools/src/react/DevtoolsDock.tsx (grep)
- packages/devtools/src/react/theme.ts (panel token)
- 34-UI-SPEC.md

Registry audit: skipped (no components.json, no third-party registries).
