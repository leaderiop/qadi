---
phase: QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary
fixed_at: 2026-11-16T10:15:00Z
review_path: .planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-REVIEW.md
iteration: 2
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase QD-49: Code Review Fix Report (iteration 2)

**Fixed at:** 2026-11-16T10:15:00Z
**Source review:** `.planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-REVIEW.md`
**Iteration:** 2

**Summary:**
- Findings in scope: 4 (`--all`: WR-01, IN-01, IN-02, IN-03)
- Fixed: 4
- Skipped: 0

Edits were made in the main checkout (`workflow.use_worktrees` is `false`). Every spec file touched was bumped through
`scripts/spec-revise.mjs` in the commit that changed it, and the new revisions are on the CCR-QD-440 row in `spec/README.md`
(Rev 1.223, 1.224, 1.225), not a new CCR. No new ids. The 49-02 characterisation is untouched and no existing expected value
in the panel tests changed. WR-01, IN-02 and IN-03 are logic fixes; each is committed on its own and each new test was shown to
fail with the source change reverted, so all three are marked "requires human verification".

## Fixed Issues

### WR-01: A throwing unsubscribe left `configure` half-applied and the model stuck

**Status:** fixed: requires human verification
**Files modified:** `packages/devtools/src/model/DockModel.ts`, `packages/devtools/test/gateRegistryDouble.ts`, `packages/devtools/test/model/DockModel.test.ts`, `spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md` (Rev 1.2), `spec/behaviors/28-devtools-screens.md` (Rev 1.26), `spec/README.md` (Rev 1.223)
**Commit:** 8aceb349
**Applied fix:** `watchGates` takes the handle out of `offGates` before calling it and calls it in its own `try`; the new `subscribe` is a second, independent `try`, so a throwing release can neither skip the new subscription and the `rejoin`, nor run again on the next `configure`. The finalizer does the same (handle out of state first, throw swallowed after `closed` is set, since a closing model has nowhere to state it). Which registry the failure names: a failed release is stated as `Failed` with its reason and names the registry that was left; a failed `subscribe` of the new registry wins over it, because that one names the registry the model now reads. The old registry's leaked listener only calls `rejoin`, which reads the registry the model holds now. The double gained `failRelease` (the unsubscribe throws and the listener stays live); M42 covers the configure-swap path (release once, new registry applied in full, not called again by a repeat configure, an `undefined` configure or the close) and M42 b the close path (the scope still closes, the release is called once). With `DockModel.ts` reverted both M42 cases fail. ADR-QD-162 decision 5 and BEH-QD-584 now say it; the "never half applied" claim holds on this path.

### IN-01: Stale header comments said gates "stay a plain prop"

**Status:** fixed
**Files modified:** `packages/devtools/src/model/DiagnosticsFeed.ts`, `packages/devtools/src/model/DiagnosticsStore.ts`
**Commit:** e4dff113
**Applied fix:** Both headers now say gates are the dock model's own input (`DockModelInputs.gates`), a registry the model subscribes to (ADR-QD-162). ADR-QD-047:197 was left as it is: its Rev 1.16 amendment supersedes it and change history is prepend-only. `spec/process/house-rules-evidence.md` was not edited (quoted history).

### IN-02: The failure reason's stack made "same reason publishes nothing" depend on the call path

**Status:** fixed: requires human verification
**Files modified:** `packages/devtools/src/model/DockModel.ts`, `packages/devtools/test/model/DockModel.test.ts`, `spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md` (Rev 1.3), `spec/behaviors/28-devtools-screens.md` (Rev 1.27), `spec/README.md` (Rev 1.224)
**Commit:** 02aa3fca
**Applied fix:** `rejoin` compares a `failureKey` (an error's `name: message`; for a value that is not an error, its rendered reason) instead of the rendered reason, so the same throw built afresh on another call path publishes nothing. The displayed reason is unchanged: still `Cause.pretty`, stack included, as `DiagnosticsStatus.Stopped` carries it. M38 gained a step where a new `Error` with the same message is thrown and the snapshot and listener count do not move; it fails with the change reverted. BEH-QD-583's "same failure reason" and ADR-QD-162 decision 5 say what "the same" means.

### IN-03: A failed watch stayed failed in two cases the spec did not state

**Status:** fixed: requires human verification
**Files modified:** `packages/devtools/src/model/DockModel.ts`, `packages/devtools/test/gateRegistryDouble.ts`, `packages/devtools/test/model/DockModel.test.ts`, `spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md` (Rev 1.4), `spec/behaviors/28-devtools-screens.md` (Rev 1.28), `spec/README.md` (Rev 1.225)
**Commit:** f0e8ee6c
**Applied fix:** Completeness over the spec-only option. `configure` now watches again when `next.gates !== gatesNow || watchFailure !== undefined`, so a `configure` with the same registry object retries a failed `subscribe` (and a failed release, which clears the same way) and re-joins. `watchGates` releases whatever is held first, so a retry never double-subscribes, and a watch that worked is never retried. The double gained `mendSubscribe` and `mendReadsQuietly`. M43 pins the retry (still failing: stated again, 2 subscriptions; mended: recovered, 1 listener; no resubscribe afterwards and changes arrive) and fails with the retry reverted. M44 pins the other case as the spec now states it: a registry that mends without announcing stays `Failed` through a quiet poll tick (a quiet tick reads nothing) and is read again by a registry announcement, a poll that changed the questions, or any `configure`. M42 also checks that a release failure clears on the next `configure` of the same registry. BEH-QD-584 and ADR-QD-162 decision 5 state this precisely.

## Skipped Issues

None.

## Verification

Where the gates ran: the main checkout on branch `arch-wave-10` (no worktree).

| Check | Result |
| ----- | ------ |
| `pnpm exec vitest run --project devtools` | pass, 64 files, 1516 tests |
| `pnpm exec vitest run --project react` | pass, 34 files, 518 tests |
| `pnpm typecheck` | pass |
| `pnpm lint` | pass (warnings only, none in changed lines) |
| `pnpm circular` | pass |
| `pnpm test:tstyche` | pass, 293 tests, 613 assertions |
| `pnpm spec:verify:strict` | pass, 21 of 21 |
| `pnpm spec:examples` | pass, 116 blocks |
| `pnpm spec:website-examples` | pass, 67 blocks |
| `pnpm spec:api` | pass |
| `pnpm spec:claims` | pass |
| Stryker (`stryker.devtools.mjs`, model files changed) | `DockModel.ts` 100.00 (117 killed, 0 survived); `Gates.ts` 100.00 (66 killed, 0 survived) |

---

_Fixed: 2026-11-16T10:15:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
