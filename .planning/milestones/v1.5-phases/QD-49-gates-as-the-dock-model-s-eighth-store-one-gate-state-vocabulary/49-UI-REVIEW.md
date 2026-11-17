# Phase 49 — UI Review

**Audited:** 2026-11-16
**Baseline:** 49-UI-SPEC.md (no-visual-change contract)
**Screenshots:** not captured (library devtools dock, no dev server; evidence is the byte-exact characterisation suite plus the diff against 76330fbd)
**Interaction captures:** off

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Every string verbatim except the one authorised D-12a clause (GATES_ABSENT_TEXT) |
| 2. Visuals | 3/4 | Markup and testids unchanged; no focal-point change; pre-existing no aria-label on the pick button |
| 3. Color | 4/4 | No colour edits; treatment contract moved to core words, tests green |
| 4. Typography | 4/4 | No size or weight edits in the diff |
| 5. Spacing | 4/4 | No spacing edits in the diff |
| 6. Experience Design | 3/4 | Behaviour contract holds per tests; two inherited gaps (no confirm on invalidate, no loading state for the model's first pass) |

**Overall: 22/24**

---

## Top 3 Priority Fixes

1. **Pick button and highlight controls carry no aria-label (0 `aria-label` in QuestionsPanel.tsx)** — screen-reader users get only the visible text, and the picking state is not announced — add `aria-pressed={lens.picking}` to the pick button. Inherited, not a Phase 49 regression.
2. **`invalidate all` has no confirmation** — a mis-click drops every cached decision — accepted by the checker as a non-blocking FLAG; leave unless the user asks.
3. **The dock renders `null` until the model exists (`DevtoolsDock.tsx`, `model === undefined ? null`)** — a one-pass blank on first mount, now also covering the gate registry subscription — acceptable, since the model builds synchronously in a layout effect; only worth a look if a flash is ever reported.

No BLOCKERs. All three are WARNING-level and pre-existing.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)
- `QuestionsPanel.tsx` `GATES_ABSENT_TEXT` is the single deliberate edit: "Pass gates — usually atoms.gates, from @qadi/react — to list who is asking." This matches Open Question 1 and D-12a exactly. The em dashes are retained.
- `GATES_EMPTY_TEXT`, the questions-absent, questions-empty, keying note, `asked, nothing mounted` and highlight copy all appear unmodified in the diff context or in lines that were moved verbatim.
- No stale `useGateInstances` reference remains in `packages/devtools/src`.
- The `DevtoolsDock.tsx` prop docs were rewritten as the spec required.

### Pillar 2: Visuals (3/4)
- The gates and questions blocks are now built by `Match.tagsExhaustive` over `GatesView` and `QuestionsView`. They emit the same elements and testids: `qadi-gates-absent` for both Absent and Empty, `qadi-pick` for Listed, and the same `<code>` and `<em>` structure.
- Gates and questions stay independent halves of the snapshot (Behaviour Contract 2); the Unsampled arm renders null as before.
- Deduction: icon-less, text-only controls have no aria attributes, and the focal point is undeclared (a checker FLAG accepted earlier).

### Pillar 3: Color (4/4)
- The diff touches no colour tokens and no `style=` literal other than the moved `muted`/`font.sizeSmall` pair. `displayOfGateState`, `treatmentOf` and `isLocatable` are still used, so the Failed/Denied separation (INV-QD-006) is unchanged. The unknown-state `Unrecognised` row is pinned by the characterisation tests.

### Pillar 4: Typography (4/4)
- No `fontSize` or `fontWeight` lines changed. The two sizes (12 and 11) and the inherited 400/600/700 weights stand as in the contract.

### Pillar 5: Spacing (4/4)
- The 3px, 6px, 8px and 14px literals are untouched. The PickButton wrapper still has `marginBottom: 6`.

### Pillar 6: Experience Design (3/4)
- Evidence: `npx vitest run --project devtools packages/devtools/test/react` gave 24 files and 374 tests passing, which includes the twelve-cell byte-exact characterisation captured on the phase base.
- Contract points 1-5 and 8 are satisfied structurally. The panel reads one snapshot through `useStoreSnapshot`, so there is a single moment per render. It passes `snapshot.instances` (the flat list) to `useLens`. React keys keep the `${policyLabel}-${index}` format.
- The host no longer re-renders on a gate change. The model subscribes in its own scope, so the Activity reopen reads the current registry (point 7). This was covered by tests I did not individually re-inspect.
- Deductions: no confirmation on `invalidate all` (inherited), and no explicit pending state for the first model pass (inherited).
- Registry audit: shadcn is not used, so it was skipped.

---

## Files Audited
- packages/devtools/src/react/QuestionsPanel.tsx
- packages/devtools/src/react/DevtoolsDock.tsx
- packages/devtools/src/react/useDockModel.ts
- packages/devtools/test/react/ (suite run, 374 passing)
- 49-UI-SPEC.md, 49-CONTEXT.md
