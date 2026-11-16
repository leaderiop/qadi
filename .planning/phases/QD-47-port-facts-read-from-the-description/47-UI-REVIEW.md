# Phase 47 — UI Review

**Audited:** 2026-11-16
**Baseline:** 47-UI-SPEC.md (no-visual-change contract), diffed against base 9f205122
**Screenshots:** not captured (code-only audit; no dev server requirement per orchestrator)
**Interaction captures:** off

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All 5 consequence strings and 5 call templates verbatim vs base; `attempts` suffix unchanged |
| 2. Visuals | 4/4 | ServicesPanel diff touches only the import and describe dispatch; no markup change |
| 3. Color | 4/4 | No style or token edits; amber stays on defaulted cards only |
| 4. Typography | 4/4 | No size or weight edits |
| 5. Spacing | 4/4 | No spacing edits (the inherited 8px 10px padding FLAG is unchanged) |
| 6. Experience Design | 3/4 | Test hooks stable; one unpinned behaviour shift (see below) |

**Overall: 23/24**

---

## Top 3 Priority Fixes

1. **Unnamed present port now follows `isPortDefault`, not `name !== undefined && ...`** — WARNING. On base, a present port with `name === undefined` always read `defaulted: false`. Now it reads whatever core's structural check says, so an unnamed spread wrapper (or an unnamed default) can flip to defaulted and show `defaulted — ` plus the amber consequence. This is intended by D-09, but the card text for that case (`stateOf` shows `wired, unnamed` first) hides the defaulted state from the user. Check `stateOf` ordering, or pin the case in a test.
2. **Long-text backstop is unverified visually** — the SignatureHistory consequence and call row were not screenshotted. Wording and styles are unchanged, so risk is low. Do one manual look at the dock.
3. **Doc comment accuracy** — none needed. The PortReport.defaulted JSDoc was rewritten as the spec required.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)
`packages/devtools/src/model/PortReading.ts` carries the five consequence strings. Each one is character-identical to the removed `CONSEQUENCES` table (checked in the Wiring.ts diff). Each `describe` arm is the same template as the removed `describeOne` arm, including the fallbacks `not recorded`, `no answer`, `no resource`, `anywhere`, and the `from a '{role}'` and `on {resourceId}` branches. `ServicesPanel.tsx` `describe` keeps the ` · {n} attempts` suffix. `ServicesPanel.reading.test.tsx` and the other ServicesPanel tests pass (2 files, 55 tests).

### Pillar 2: Visuals (4/4)
The ServicesPanel.tsx diff is +1 import, -42 lines of `describeOne`, and a two-token swap to `describeCall`. No JSX, no data-testid and no props changed. Port reading is now a mapped type over `PortName`, so a sixth port without a row is a compile error.

### Pillar 3: Color (4/4)
No colour tokens or style literals appear in the diff. The consequence-line accent is still driven by `port.defaulted === true`. Only the set of qualifying ports changed (spreading wrappers now qualify), as the spec states.

### Pillar 4: Typography (4/4)
No font size or weight changes.

### Pillar 5: Spacing (4/4)
No spacing changes. The spec's non-blocking FLAG on the inherited `8px 10px` card padding stands.

### Pillar 6: Experience Design (3/4)
- All spec test hooks are untouched (`qadi-port`, `data-defaulted`, `qadi-port-consequence`, and the others).
- State coverage (empty, partial, overflow, attempts) is pinned by the characterisation test and passes.
- WARNING: the defaultedness semantic change (Fix 1 above) is intended, but its unnamed-port corner is the only place the user-visible state can differ from the base without a named test in the spec.
- No third-party registries; shadcn is not initialised. The registry audit was skipped.

---

## Files Audited
- packages/devtools/src/react/ServicesPanel.tsx
- packages/devtools/src/model/PortReading.ts
- packages/devtools/src/model/Wiring.ts
- packages/devtools/src/model/PortCalls.ts (diff stat only)
- packages/devtools/test/react/ServicesPanel.reading.test.tsx (run, passing)
