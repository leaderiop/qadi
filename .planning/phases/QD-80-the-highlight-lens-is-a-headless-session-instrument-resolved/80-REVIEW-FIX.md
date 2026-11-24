---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
fixed_at: 2026-11-24T00:00:00Z
review_path: .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase QD-80: Code Review Fix Report

**Fixed at:** 2026-11-24
**Source review:** 80-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 9 (scope all)
- Fixed: 9
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is false), not in a worktree. Every failing-first run is
recorded in `80-RED-EVIDENCE.md` under `## review fixes (iteration 1)`. WR-03 and IN-05 change logic, so they are
`fixed: requires human verification`.

## Fixed Issues

### WR-01: Nothing pins `preventDefault` on the consumed click

**Files modified:** `packages/devtools/test/react/Lens.dock.test.tsx`
**Commit:** fb6f80e1
**Applied fix:** a cell dispatches a cancelable click over a guarded `<a href>` while picking and over no guard, and reads
whether the default action survived. Seen failing with `event.preventDefault();` deleted from the handler (`the picked
link is not followed: expected true to be false`).

### WR-02: Nothing pins that the handlers read the guard list at event time

**Files modified:** `packages/devtools/test/react/Lens.dock.test.tsx`
**Commit:** 5d3a764f
**Applied fix:** a cell adds a guard while picking, then expects the next pointer move to draw exactly that guard and the
next click to pick it (second row marked). Seen failing against a stale-closure scratch edit (the handlers reading a
list captured when the listeners are added: `the late guard is the one drawn: expected [] to deeply equal [ 'b' ]`).

### WR-03: `choose` can record a pick and still not consume the click when a lens listener throws (requires human verification)

**Files modified:** `packages/devtools/src/react/useLens.ts`, `packages/devtools/test/react/Lens.adapter.test.tsx` (new)
**Commit:** a07c554a
**Applied fix:** per the orchestrator's decision ADR-QD-177 is kept. The handler finds the guard first, then
`let consumed = true; try { consumed = lens.choose(id); } finally { if (consumed) { preventDefault; stopPropagation } }`,
with a one-line why-comment (`choose` notifies only when the pick moved, so a throw means it did). The new cell subscribes
a lens listener that throws on the pick and asserts the pick is recorded, the event is default-prevented and the throw
reaches the dispatch. Seen failing on the old handler (`the click was consumed: expected false to be true`).

### IN-01: `InstrumentToggle.characterisation.test.tsx` title and header describe the removed behaviour

**Files modified:** `packages/react/test/InstrumentToggle.characterisation.test.tsx`,
`.planning/phases/QD-80-.../80-characterisation-check.mjs`
**Commit:** 79273c7b
**Applied fix:** `toggle-no-rerender` is now a declared multi-line flip (`edits`: two header lines, the title, the
assertion; the assertion line is still the one seen red on the base). A flip is applied or reverted whole and a partly
applied one is refused; the self-test went from 16 to 24 cases. The extended check was seen failing on the file with only
the assertion applied (`only some of its edits are applied`) and on the restored base text, and the file was moved by the
script's own `flip` command. New title: "a memoised consumer of the context does not render again when instrument is
toggled". `--all-flipped` and `--red-recorded` pass (devtools 4 of 4, react 1 of 1).

### IN-02: A held assertion cannot fail, so it does not pin the Escape exit

**Files modified:** `packages/devtools/test/react/QuestionsPanel.gates.test.tsx`,
`.planning/phases/QD-80-.../80-pinned-check.mjs`
**Commit:** 5a761fd3
**Applied fix:** the assertion in "leaves the mode on Escape" now reads that the button text is back to "pick a control on
the page". `80-pinned-check.mjs` gained one mechanism: an edit may lie in the held region only when it states a non-blank
`inRegion` reason (declared as `escape-assertion`); every other byte stays held. Self-test went from 7 to 10 cases. Seen
failing: with `useLens.ts` ignoring Escape (scratch, restored with `cp`) the old assertion passed all 26 cells and the new
one failed; the old check refused the edit before it was declared. `--all-applied`: 4 of 4.

### IN-03: A keyboard-initiated click is hit-tested at its recorded coordinates

**Files modified:** `packages/devtools/src/react/Lens.ts`, `packages/devtools/src/react/useLens.ts`,
`packages/devtools/test/react/Lens.click.test.ts` (new), `packages/devtools/test/react/Lens.adapter.test.tsx`
**Commit:** 717639bd
**Applied fix:** `gateIdOfClick(document, click, instances)` beside `gateIdAt`: a click with `detail === 0` whose target is
an element is placed by the guard containing that element; every other click, and a click whose target is not an element
(the held tests dispatch on `document`), keeps its coordinates. The handler uses it; `pointermove` is unchanged. Seen
failing before it existed (`gateIdOfClick is not a function`, 3 cells) and the adapter cell on the old handler (`a control
no guard holds keeps its click: expected false to be true`).

### IN-04: The comment over-claims what a document-capture `stopPropagation` consumes

**Files modified:** `packages/devtools/src/react/useLens.ts`
**Commit:** bd9176db
**Applied fix:** the comment says the click is intercepted before the page's target and bubble handlers, and that a
window-capture listener or an earlier document-capture listener still sees it. BEH-QD-737 carries the same correction
(see the spec commit). Comment only, so no failing-first run.

### IN-05: An armed reveal that no row takes fires later, unasked (requires human verification)

**Files modified:** `packages/devtools/src/model/LensSession.ts`, `packages/devtools/test/model/LensSession.test.ts`
**Commit:** f0b869a8
**Applied fix:** `cancel` and `highlight` set `armed = undefined` unconditionally, before `move`, so a no-op still disarms;
`hover` leaves it. The reveal cell (new title: "... toggle, cancel and highlight disarm a reveal that was not taken and
hover does not; ...") pins each branch: a no-op cancel, a drawing then a cancel, a highlight, a highlight that moves
nothing, and a hover. Seen failing on the old session (`expected true to be false`; 1 failed, 14 passed). Doc comments of
the module, `takeReveal` and `armed` state the rule. The unmount exit (`cancel`) now drops an untaken reveal, as the review
suggested.

### IN-06: The panel subscribes to the lens twice

**Files modified:** `packages/devtools/src/react/useLens.ts`, `packages/devtools/src/react/QuestionsPanel.tsx`,
`packages/devtools/test/react/Lens.adapter.test.tsx`
**Commit:** 8707a5d0
**Applied fix:** decided to remove it: `useLens` returns the `LensSnapshot` it read and the panel builds `view` from that,
so no interface widens beyond one return type. A new cell wraps `lens.subscribe` and counts held subscriptions: 1 while
the panel is mounted, 0 after unmount. Seen failing with both files taken from the commit before (`while mounted: expected
2 to equal 1`).

## Spec

Commit f4db2fa0, all through `scripts/spec-revise.mjs --date 2026-11-24`: BEH-QD-737 (default action cancelled, click
placed by its element when it reports no pointer, swallowed whatever a subscriber does, the capture wording) and BEH-QD-739
(reveal dropped by `toggle`, `cancel` and `highlight`, not by `hover`) in `spec/behaviors/28-devtools-screens.md` 1.61 to
1.62; ADR-QD-193 1.1 to 1.2 (transition table rows, decisions 6 and 8, the before/after title, the enforcement paragraph);
`spec/traceability.md` 1.304 to 1.305 (two new test files traced, three rows restated); `spec/README.md` 1.375 to 1.376.
The CCR-QD-472 row reads `spec/README.md` Rev 1.376 (this row) and cites ADR-QD-193 1.2, traceability 1.305 and
28-devtools-screens 1.62; its other citations are unchanged. `pnpm spec:verify:strict`: 21 pass, 0 fail.

## Verification

- devtools project: 85 files, 1905 passed (was 1897; +8: 2 dock, 3 adapter, 3 click). React project: 40 files, 650 passed.
- `pnpm typecheck` clean. `node scripts/check-house-style.mjs`: `604 file(s) clean (3 declared switch(es), 77 type-test
  file(s))`; no `.tst.ts` was added. `check-api-surface.mjs`: 942 exports.
- `80-check.mjs scan-forbidden`, `scan-ids`, `trailers` (38 plan commits), `--self-test` (113) pass.
- `80-characterisation-check.mjs --all-flipped` (devtools 4 of 4, react 1 of 1) and `--red-recorded` pass;
  `80-pinned-check.mjs --all-applied` (4 of 4); both Phase 79 checks pass.
- Stryker was not run. `LensSession.ts` changed (`cancel`, `highlight`), so the mutation close needs a restart for the
  lens-session group; `useLens.ts`, `Lens.ts` and `QuestionsPanel.tsx` are outside the mutation glob.

## For the orchestrator

- The `@qadi/devtools` patch changeset names four behaviour changes; the review fixes add two small ones (a keyboard click
  is placed by its control; an untaken reveal is dropped when the reader leaves or highlights). The changeset was not edited.

---

_Fixed: 2026-11-24_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
