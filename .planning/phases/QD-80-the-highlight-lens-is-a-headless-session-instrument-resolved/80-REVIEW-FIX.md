---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
fixed_at: 2026-11-24T00:00:00Z
review_path: .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-REVIEW.md
iteration: 2
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase QD-80: Code Review Fix Report

**Fixed at:** 2026-11-24
**Source review:** 80-REVIEW.md (iteration 2)
**Iteration:** 2

**Summary:**
- Findings in scope: 5 (scope all)
- Fixed: 5
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is false), not in a worktree. Every failing-first run is
recorded in `80-RED-EVIDENCE.md` under `## review fixes (iteration 2)`. Stryker was not run, as instructed: IN-01 and IN-03
touch `packages/devtools/src` (a doc comment in `LensSession.ts`; the adapter's signature in `useLens.ts`), so the mutation
close recorded by 80-12 is no longer for the current head and would need `record close <group> --restart`.

## Fixed Issues

### WR-01: ADR-QD-193's table and count did not match the changeset or the code

**Files modified:** `spec/decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md`,
`.changeset/devtools-lens-is-a-headless-session.md`, `spec/README.md`
**Commit:** b6152881
**Applied fix:** the table gained "A click made from the keyboard while picking" (held by `Lens.adapter.test.tsx` and
`Lens.click.test.ts`) and "A reveal not yet taken" (held by the reveal cell of `LensSession.test.ts`); "Four interaction
rules" is "Seven" in the section lead and in Consequence 2 (seven interaction rows plus the toggle). The changeset opens
"in seven ways", the listener sentence is its seventh bullet, and the dropped-reveal bullet names the toggle too. The CCR
row's own "naming the four behaviour changes" is now "the seven changes a reader sees". ADR-QD-193 1.3, README 1.377.

### IN-04: `gateIdOfClick` shadowed `click.target` with its first parameter

**Files modified:** `packages/devtools/src/react/Lens.ts`
**Commit:** 93961c30
**Applied fix:** the first parameter is `doc`. A rename: the lens tests and `pnpm typecheck` pass; no failing-first run.

### IN-01: "`hover` leaves the reveal armed" (necessity)

**Files modified:** `packages/devtools/src/model/LensSession.ts`, `packages/devtools/test/model/LensSession.test.ts`,
`spec/decisions/193-...md`, `spec/behaviors/28-devtools-screens.md`, `spec/traceability.md`, `spec/README.md`
**Commit:** 195c3ac4
**Applied fix (requires human verification: it is a reachability judgement):** decided by reachability, as the orchestrator
directed. The state is real: `choose` publishes `Idle` with the reveal armed, and the `pointermove` listener stays attached
until React commits that snapshot, so a `hover` can arrive in `Idle` with the reveal armed and must move nothing and leave
it. The rule is kept and stated precisely in the session's two doc comments, the reveal cell's title ("... and a hover, which
moves nothing from idle, does not ..."), ADR-QD-193 decision 8, and BEH-QD-739. The same reachability corrected a second
claim, "`hover` and `choose` from `Idle` are reachable only headlessly" (ADR-QD-193 decision 2, BEH-QD-736), which is now
"reached by the adapter only between a pick and its listeners coming off, and otherwise only headlessly". The hover line of
the cell is seen failing against a scratch edit in which `hover` disarms (`expected false to be true`; restored with `cp`).
ADR-QD-193 1.4 and 1.5, 28-devtools-screens 1.63 and 1.64, traceability 1.306, README 1.378 to 1.380.

### IN-02: The throwing-subscriber cell pinned happy-dom's propagation

**Files modified:** `packages/devtools/test/react/Lens.adapter.test.tsx`, `packages/devtools/src/react/useLens.ts`,
`spec/behaviors/28-devtools-screens.md`, `spec/decisions/193-...md`, `spec/README.md`
**Commit:** 1555cf0e
**Applied fix:** the cell reads the subscriber's failure from either channel (thrown out of `dispatchEvent`, or an `error`
event on the window, default-prevented so the run is not reported) and asserts the pick is recorded, `defaultPrevented`
holds, and the failure surfaced. Its title ends "and its failure is not caught by the adapter". BEH-QD-737's requirement
and its quoted title, ADR-QD-193 decision 6 and the handler's comment say the adapter does not catch the failure, where they
said it "reaches the dispatch", and BEH-QD-737 adds what a browser does with a listener's error. Seen failing against a
scratch edit of the handler that catches and drops the error (`the subscriber's failure surfaced: expected false to be
true`; restored with `cp`). ADR-QD-193 1.6, 28-devtools-screens 1.65, README 1.381.

### IN-03: The panel subscribed to the questions store twice

**Files modified:** `packages/devtools/src/react/useLens.ts`, `packages/devtools/src/react/QuestionsPanel.tsx`,
`packages/devtools/test/react/Lens.adapter.test.tsx`, `spec/decisions/193-...md`, `spec/traceability.md`, `spec/README.md`
**Commit:** 54575a40
**Applied fix:** `useLens(lens, questions, instances)` is handed the guards the panel already read to render, and the
handlers still read `questions.getSnapshot().instances` when the event arrives, so the dependencies and the listener
behaviour are unchanged. The adapter cell's probe reads the store with `useStoreSnapshot`, as a caller that does not render
from it must (said in the doc comment). A new cell counts the panel's subscriptions to a wrapped questions store, next to the
lens one, and was seen failing first (`while mounted: expected 2 to equal 1`; 1 failed, 3 passed). ADR-QD-193 decision 6 and
its enforcement paragraph, and the traceability row for the adapter test, say one subscription to each store.
ADR-QD-193 1.7, traceability 1.307, README 1.382.

## Spec revisions

| Document | Revision now |
| -------- | ------------ |
| `spec/decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md` | 1.7 (was 1.2) |
| `spec/behaviors/28-devtools-screens.md` | 1.65 (was 1.62) |
| `spec/traceability.md` | 1.307 (was 1.305) |
| `spec/README.md` | 1.382 (was 1.376); the CCR-QD-472 row reads `Rev 1.382 (this row)` and cites ADR-QD-193 1.7, 28-devtools-screens 1.65 and traceability 1.307 |

## Checks (main checkout, after the last commit)

- devtools project: 85 files, 1906 tests passed; react project: 40 files, 650 tests passed
- `pnpm typecheck` clean; `node scripts/check-house-style.mjs`: 604 file(s) clean (3 declared switch(es), 77 type-test file(s));
  `node scripts/check-api-surface.mjs`: 942 export(s) documented across 9 package(s)
- `pnpm spec:verify:strict`: PASS 21, FAIL 0, SKIP 0; `node scripts/spec-revise.mjs --check` clean
- `80-check.mjs scan-forbidden` and `scan-ids`: clean; `80-characterisation-check.mjs --all-flipped` (devtools 4 of 4, react 1
  of 1) and `--red-recorded`: pass; `80-pinned-check.mjs --all-applied`: 4 of 4; both Phase 79 checks pass

---

_Fixed: 2026-11-24_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
