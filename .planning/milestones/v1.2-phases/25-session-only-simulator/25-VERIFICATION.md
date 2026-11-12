---
phase: 25-session-only-simulator
verified: 2026-11-11T09:00:00Z
status: passed
score: 3/3 roadmap success criteria verified (all 11 requirements satisfied in code)
covered_files:
  - ".planning/phases/25-session-only-simulator/25-01-PLAN.md"
  - ".planning/phases/25-session-only-simulator/25-01-SUMMARY.md"
  - ".planning/phases/25-session-only-simulator/25-02-PLAN.md"
  - ".planning/phases/25-session-only-simulator/25-02-SUMMARY.md"
  - ".planning/phases/25-session-only-simulator/25-03-PLAN.md"
  - ".planning/phases/25-session-only-simulator/25-03-SUMMARY.md"
  - ".planning/phases/25-session-only-simulator/25-04-PLAN.md"
  - ".planning/phases/25-session-only-simulator/25-04-SUMMARY.md"
  - ".planning/phases/25-session-only-simulator/25-05-PLAN.md"
  - ".planning/phases/25-session-only-simulator/25-05-SUMMARY.md"
  - "packages/devtools/src/index.ts"
  - "packages/devtools/src/model/Inspect.ts"
  - "packages/devtools/src/model/Replay.ts"
  - "packages/devtools/src/model/SimulationSession.ts"
  - "packages/devtools/src/react/DevtoolsDock.tsx"
  - "packages/devtools/src/react/Simulator.tsx"
  - "packages/devtools/src/react/useScoped.ts"
  - "packages/devtools/src/react/useSimulationSession.ts"
covered_digest: "v4:sha256:74834cd2218321aa8c2e7366e1ae645c2b0ef3edfa4a22b0278ea84df6556a85"
behavior_unverified: 0
human_verification:
  - test: "Open a running dock with a Live-capable host, run a Live check, switch tabs away from Simulator and back, then edit the form and run again."
    expected: "Form, capture and result are preserved across the tab round trip (the owner/frame split in DevtoolsDock keeps the session above the screen); no flash of an empty form; a superseded run does not leave the result under another policy."
    why_human: "Visual/interaction preservation in a real browser dock. happy-dom tests cover the logic, not what a reviewer sees."
    human_judgment: true
---

# Phase 25: Session-only Simulator Verification Report

**Phase Goal:** The Simulator is a view of its session: no owned mode, no form codecs or readings in the view, and the session owns its runs' lifetime through a FiberHandle in a Scope.
**Status:** passed (human validation of the one visual item: "All good, continue", 2026-11-11)
**Re-verification:** No, initial verification

## Observable Truths (roadmap contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `OwnedSimulator` is gone; every `<Simulator>` render in its test builds a session | VERIFIED | `grep -rnw OwnedSimulator packages features spec .changeset` has no hits. `Simulator` is `FC<{ session }>` (`Simulator.tsx:55-59`). The test file has one `render(` site, the `mount()` helper (`Simulator.test.tsx:78-85`), which calls `makeSimulationSession` in a test-owned `Scope`; `afterEach` closes them. The base had 27 render sites, now 30 `mount(` uses plus the definition. `sightings` is not on `SimulatorProps`. |
| 2 | `setAction`, `choosePolicyAt`, the run reading, cost and baseline reading are session-level and model-tested | VERIFIED | `SimulationSession.ts`: `policyMenu` (:443, `policyMenuOf` :285), `cost` (:451, `costOf` :303), `baselineReading` (:455), `Ran.reading` (:518), `choosePolicyAt` (:620), `setAction` (:700). `Simulator.tsx` only reads `snapshot.policyMenu`, `snapshot.cost`, `snapshot.baselineReading`, `result.reading`, and calls `session.choosePolicyAt(event.target.selectedIndex)` and `session.setAction(...)`. It has no codec or schema import and no `useMemo`. Its only state is the chip typing buffer. Model tests are in `test/model/SimulationSession.test.ts`. Mutation score is not lower (see WX-05). |
| 3 | `reap`, `hasRetired` and `dispose` are gone; a superseded run is interrupted before the command returns; closing the scope interrupts the run in flight | VERIFIED | Word-grep for the three names finds no members in `src`. The test file mentions them only in `it.effect("a session has no reap, hasRetired or dispose…")` (:450-474), asserting `"reap" in session` is false and that no `reap` or `dispose` span exists. `makeSimulationSession` is `Effect.fn("qadi.devtools.makeSimulationSession")` returning `Effect.fn.Return<SimulationSession, never, Scope.Scope>` (:325-327). It acquires `FiberHandle.make` (:348) and `FiberHandle.runtime` (:349). `supersede()` (:475-478) bumps the generation and installs `fork(Effect.void)` into the handle, which interrupts the previous fiber synchronously. A finalizer (:352-358) bumps the generation and sets `closed`, registered after the handle so it runs first. The `devtools` project suite passes: 45 files, 1195 tests. |

**Score:** 3/3. No truth is behavior-dependent without a test: the interrupt-before-return and scope-close invariants are exercised by the model tests, which pass (re-run here).

## Specific Checks Requested

| Check | Status | Evidence |
|-------|--------|----------|
| No owned mode; `Simulator` takes `{ session }` | VERIFIED | See truth 1. |
| View holds no named computation, codec or reading | VERIFIED | `Simulator.tsx` imports no codec; `policyMenu`, `cost`, `baselineReading`, `Ran.reading`, `choosePolicyAt` and `setAction` are defined in the model. |
| `makeSimulationSession` is `Effect.fn` in a Scope with a `FiberHandle`; `supersede()` exists | VERIFIED | `SimulationSession.ts:325-349, 475`. |
| No `reap`, `hasRetired` or `dispose` members | VERIFIED | See truth 3. |
| `useScoped` is package-private | VERIFIED | Not in `src/index.ts` or `src/react/index.ts`. It is imported only by `useSimulationSession.ts` and its test. The barrel diff since base adds only types (`PolicyMenu`, `PolicyMenuOption`, `SweepCost`, `BaselineReading`, `RecordOutcome`, `ObligationState`). Gate 13 (`check-api-surface.mjs`): 906 exports documented, clean. |
| ADR-QD-137, BEH-QD-460/461, CCR-QD-415 exist; changeset names the interface change | VERIFIED | `spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md` (Rev 1.1, supersedes ARCH-20 D-20-b). `spec/behaviors/29-devtools-simulator.md:889` and `:958`. CCR row at `spec/README.md:353`. ADR-047 amended (Rev 1.11). `.changeset/simulator-session-only.md` is `@qadi/devtools: minor` and names the scoped constructor, the removed `reap`/`hasRetired`/`dispose`, `setAction`, `choosePolicyAt` and the new types. The two earlier changesets were corrected (WR-04). `node scripts/spec-revise.mjs --check` passed. |
| No gate, threshold or script edited since 17fa6738 | VERIFIED | `git diff --name-only 17fa6738 HEAD` outside `.planning`, `packages/devtools/{src,test}`, `spec/`, `features/` and `.changeset` is empty. Nothing under `scripts/`, stryker, vitest, oxlint, tsconfig or any `package.json`. |
| WX-04 (no `as`, `!`, `any`, `switch`, `fnUntraced`, `async`, ambient clock or console) | VERIFIED | Grep of the touched src files found none. `check-house-style.mjs`: 451 files clean, 3 declared switches (the budget is unchanged). |

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| SIM-01 | SATISFIED | `OwnedSimulator` and the `sightings` prop are gone from the view; tests build sessions. |
| SIM-02 | SATISFIED | `setAction` and `choosePolicyAt` are on the session. The view parses no select value; it passes `selectedIndex`. |
| SIM-03 | SATISFIED | `policyMenu`, `cost`, `baselineReading` and `Ran.reading` are in the snapshot, and the file is under the devtools Stryker gate. |
| SIM-04 | SATISFIED | Scoped constructor, `FiberHandle`, scope-close finalizer, and the three members removed (truth 3). |
| SIM-05 | SATISFIED | `spec/overview.md` Rev 1.92 lists the new types and the scoped constructor; the changeset exists; gate 13 is green. |
| WX-01 | SATISFIED, with a caveat | The orchestrator reports `pnpm check:pr` exit 0 at the end of 25-05. I did not re-run it, as instructed. The later review-fix commits touch only `useScoped.ts`, one test, ADR-QD-137 and a changeset. Their gates were reported green (devtools 1195, BDD 568, typecheck, lint). |
| WX-02 | SATISFIED | ADR-QD-137, CCR-QD-415, BEH-QD-460/461 and the traceability and README rows are present. Only the reserved numbers are used; ADR-QD-136 is unused by design. |
| WX-03 | SATISFIED | Overview names the added exports and drops the removed members; gate 13 is clean. |
| WX-04 | SATISFIED | See the check above. |
| WX-05 | SATISFIED | Per-file Stryker scores, base to after (`25-mutation-base.json`, `25-mutation-after.json`): `SimulationSession.ts` 0.9641 to 0.9694 and `Replay.ts` 1.0 to 1.0. No `src/model` file changed after the "after" run (the last model commits are 718e5c26 and a5176f52). The later review fixes touched only `react/useScoped.ts`. `Inspect.ts` changed by comment and type exports only and is not in the baseline set. I did not re-run Stryker. Coverage thresholds were covered by the orchestrator's check:pr. |
| WX-06 | SATISFIED | 25-02 recorded 31 RED model tests against the phase base (the base's own assertion showed a superseded run waiting on `reap`), and 25-03 was the GREEN. WR-02 and WR-03 carry regression tests seen failing before their fixes. |

No orphaned requirements: all 11 IDs are claimed by the phase plans.

## Anti-Patterns

No `TBD`, `FIXME` or `XXX` markers in the touched src files. No stubs: the view's values flow from the session snapshot, which computes them from the policy, source and run state. A stale doc comment at `Simulator.tsx:52` still names `useOwnedSimulationSession`, which does exist, so it is accurate.

## Open Items (non-blocking)

- WR-01 (a `run` issued from a subscriber during a synchronously landing run could leave `Running` stuck) was skipped. The fixer's probes found no run that lands synchronously, so the race is not reproducible. Warning only; it is not a goal truth.
- IN-01 (an empty baseline sentence renders silently if the "present exactly when `Checked`" invariant breaks) and IN-02 (stale test comments about synchronous settling) stay open as Info.

## Human Verification Required

### 1. Dock preserves simulator state across tabs (human_judgment: true)

**Test:** In a running dock, run a Live check, switch to another tab and back, edit the form, and run again.
**Expected:** Form, capture and result survive the round trip. There is no flash of an empty form on first paint (the dock owner renders nothing until `useScoped`'s layout effect has built the session). A superseded run never lands under another policy.
**Why human:** The look and feel of a real browser dock, and StrictMode and `Activity` behaviour in a real host. The tests run in happy-dom.

## Gaps Summary

None. Every roadmap success criterion and every requested check is confirmed in the code. The `devtools` project suite (1195 tests), `spec-revise --check`, `check-house-style` and `check-api-surface` were re-run here and pass. I did not run `pnpm check:pr` or Stryker. The status is `human_needed` only because of the one visual item.

---

_Verified: 2026-11-11T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
