# Phase 36 — UI Review

**Audited:** 2026-11-13
**Baseline:** 36-UI-SPEC.md (approved)
**Screenshots:** not captured (code-only audit; no dev server for the dock, per orchestrator instruction)
**Interaction captures:** off (workflow.ui_interaction_capture is false). Interaction findings are code-derived.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Timeline copy matches the contract verbatim; Diagnostics copy unchanged |
| 2. Visuals | 3/4 | One shared StoppedBox; the focus ring is JS-driven and untested visually; the reason block is a tab stop with the default ring |
| 3. Color | 4/4 | No hardcoded colors; the accent ring and amber Restart border use theme tokens as declared |
| 4. Typography | 4/4 | Only `font.size`, `font.sizeSmall`, weights 400/600 |
| 5. Spacing | 3/4 | Values match the contract; the 12px/8px stacking and the `padding: 12` literal are accepted, not tuned |
| 6. Experience Design | 3/4 | Alert-once, focus return and the readsTimeline record are sound; edge cases below were not verified in a browser |

**Overall: 21/24**

---

## Top 3 Priority Fixes

1. **Focus ring depends on `:focus-visible` at focus time** — after a mouse click on Restart, `target.focus()` may not match `:focus-visible`, so no ring is drawn and focus placement is invisible. This is arguably intended, but the spec says "a keyboard user sees where focus went" and the case is unverified — add a browser/e2e check for the keyboard path (Enter on Restart) and note the mouse path as accepted.
2. **Ring is cleared by writing `style.outline = ""` on blur** — if React re-renders the element's `style` prop (the Services/Questions roots pass `style: { padding: 12 }`), a stale ring is unlikely but not guaranteed. Pin it with a test that focuses, re-renders, and blurs.
3. **Restart button and reason `<pre>` keep the browser default ring** (accepted follow-up in the spec, item 3). The default ring may be low-contrast on the amber-tinted `#2d2718`. Track the shared `focusRing` token across all tab stops as a follow-up so it is not forgotten.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)
- `TimelineNotice.tsx:17-23`: lead "Timeline stopped.", body, "Restart timeline", "Why the timeline stopped" all equal the Copywriting Contract.
- `DiagnosticsNotice.tsx:30-44`: the Diagnostics strings are unchanged and the sampled/unsampled bodies are kept.
- No generic labels (Submit, OK) in the phase files. No new empty-state copy, as specified.

### Pillar 2: Visuals (3/4)
- One stopped box (`StoppedBox.tsx`) serves both feeds, so the two notices cannot drift. The hierarchy is clear: amber lead at weight 600, body, a recessed reason block, then the button.
- No icon-only controls were added. The reason `<pre>` has `role="group"`, an `aria-label` and `tabIndex={0}`, so it is scrollable by keyboard.
- Gap: the focus ring for programmatic targets is applied by `focusRingProps` handlers (`focusRing.ts:14-24`). It is CSSOM-driven and could not be seen without a browser. Visual confirmation is missing.
- Gap: the `-2px` inset on the dock body can be clipped by the body's `overflow` if the body scrolls (check `theme.ts` `body`). An inset ring should survive this, but it was not viewed.

### Pillar 3: Color (4/4)
- Grep of `StoppedBox.tsx`, `TimelineNotice.tsx` and `focusRing.ts` found no hex or rgb literals. Everything comes from `colors.*` and `withAlpha`.
- The accent appears in the focus ring only (a new reserved use, as the contract says). Amber (`colors.error`) is on the box border, the lead and the Restart border, nothing else.
- The contract's computed ratios (6.78:1 ring, 6.57:1 amber on N) were taken from the spec and not re-measured.
- Status is never carried by color alone: the lead phrase and the `role` do the work.

### Pillar 4: Typography (4/4)
- No `fontSize` other than `font.size` and `font.sizeSmall`. The lead uses `fontWeight: 600` explicitly, not a bare `<strong>` (`StoppedBox.tsx:128`). The reason block inherits the family.

### Pillar 5: Spacing (3/4)
- All values are multiples of 4 or the declared inherited exceptions: `8px 12px`, `8px 0 0`, `padding: 8`, `marginTop: 8`, and the `12px 12px 0` slot (`TimelineNotice.tsx:42`).
- The 2px and -2px ring values are literals in `focusRing.ts`, as the contract allows.
- Risk: the notice slot has no bottom padding, so the gap to the screen is 8px, or 20px on screens with `padding: 12`. This is accepted by the contract but is uneven between tabs.

### Pillar 6: Experience Design (3/4)
- Alert-once: the role is decided in `useState(() => announced.current.stop !== status)` at mount, and the ledger updates in `useLayoutEffect`. A new stop gets a new key through `stoppedKey`, so it remounts and re-announces. Sound.
- Focus return: `restart` calls `onRestart()` then `closest(focusTarget)` narrowed by `instanceof HTMLElement` (`StoppedBox.tsx:109-113`). There is no cast, and the targets are typed as a closed union of two selectors.
- `readsTimeline: Record<TabId, boolean>` (`DevtoolsDock.tsx:64`) is closed over `TabId`, so a new tab fails to compile until it declares its answer.
- The dock body is `tabIndex={-1}` with the ring props (`DevtoolsDock.tsx:254`). The Services and Questions roots use `diagnosticsRootProps`, which spreads the ring props.
- Gap: there is no pending or disabled state on Restart, by contract. Rapid double clicks are idempotent per the contract, but I did not verify this.
- Gap: a successful restart is not announced, a stated and accepted gap for screen-reader users.
- Not browser-tested: keyboard and mouse focus-visible behaviour.

---

## Registry Safety
Skipped: no `components.json`, shadcn not initialized.

## Files Audited
- /Users/mohammadalmechkor/Projects/Perso/qadi/packages/devtools/src/react/StoppedBox.tsx
- /Users/mohammadalmechkor/Projects/Perso/qadi/packages/devtools/src/react/TimelineNotice.tsx
- /Users/mohammadalmechkor/Projects/Perso/qadi/packages/devtools/src/react/focusRing.ts
- /Users/mohammadalmechkor/Projects/Perso/qadi/packages/devtools/src/react/DiagnosticsNotice.tsx
- /Users/mohammadalmechkor/Projects/Perso/qadi/packages/devtools/src/react/DevtoolsDock.tsx (grep only: lines 64, 188-190, 254, 349)
- /Users/mohammadalmechkor/Projects/Perso/qadi/packages/devtools/src/react/ServicesPanel.tsx and QuestionsPanel.tsx (grep only)
- /Users/mohammadalmechkor/Projects/Perso/qadi/packages/devtools/src/react/theme.ts (`button`)
- 36-UI-SPEC.md (read; the 36-*-SUMMARY.md, PLAN.md and CONTEXT.md files were not read)
