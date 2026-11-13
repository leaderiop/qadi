---
phase: 33-one-sealed-evaluation-layer
verified: 2026-11-12T16:20:00Z
status: passed
score: 12/12 must-haves verified
covered_files:
  - ".planning/phases/33-one-sealed-evaluation-layer/33-01-PLAN.md"
  - ".planning/phases/33-one-sealed-evaluation-layer/33-01-SUMMARY.md"
  - ".planning/phases/33-one-sealed-evaluation-layer/33-02-PLAN.md"
  - ".planning/phases/33-one-sealed-evaluation-layer/33-02-SUMMARY.md"
  - ".planning/phases/33-one-sealed-evaluation-layer/33-03-PLAN.md"
  - ".planning/phases/33-one-sealed-evaluation-layer/33-03-SUMMARY.md"
  - ".planning/phases/33-one-sealed-evaluation-layer/33-04-PLAN.md"
  - ".planning/phases/33-one-sealed-evaluation-layer/33-04-SUMMARY.md"
  - ".planning/phases/33-one-sealed-evaluation-layer/33-05-PLAN.md"
  - ".planning/phases/33-one-sealed-evaluation-layer/33-05-SUMMARY.md"
  - ".planning/phases/33-one-sealed-evaluation-layer/33-06-PLAN.md"
  - ".planning/phases/33-one-sealed-evaluation-layer/33-06-SUMMARY.md"
  - "packages/core/src/EvaluationEnvironment.ts"
  - "packages/core/src/index.ts"
  - "packages/core/test/helpers.ts"
  - "packages/devtools/src/index.ts"
  - "packages/devtools/src/model/Simulation.ts"
  - "packages/devtools/src/model/SimulationSession.ts"
  - "packages/devtools/src/model/SimulationSource.ts"
  - "packages/devtools/src/react/Simulator.tsx"
  - "packages/testing/src/QadiReviewLayer.ts"
covered_digest: "v4:sha256:58f3d8d376a824503da6ff8562a1beb7200a899927b39468c0e4fa3d7726eef2"
re_verified: 2026-11-13
behavior_unverified: 0
overrides_applied: 0
---

# Phase 33: One sealed evaluation layer Verification Report

**Phase Goal:** Review and simulation are built from one evaluation-environment builder in `@qadi/core`, and whether the sink and the decision cache are shadowed is stated, required and tested instead of decided silently by each copy.
**Verified:** 2026-11-12T16:20:00Z
**Status:** passed
**Re-verification:** Yes, 2026-11-13 at HEAD of arch-wave-8 (initial verification 2026-11-12 kept below)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1/SEAL-01: core exports one builder (ports, id prefix, injected clock layer); `qadiReviewLayer` and `simulationLayer` are built from it; copied lines gone; devtools has no runtime dependency on `@qadi/testing` | VERIFIED | `packages/core/src/EvaluationEnvironment.ts` exports `evaluationEnvironment`, `EvaluationEnvironmentOptions`, `EvaluationShadowing`, `EvaluationClock`; `index.ts:18` re-exports it. `QadiReviewLayer.ts:157` and `Simulation.ts:74` call it. `@qadi/testing` appears in devtools `package.json` only under devDependencies (unchanged since the phase base), and no import of it exists in `packages/devtools/src` (one prose mention in `SimulationSource.ts`, accepted). |
| 2 | SC2/SEAL-02: shadowing is a required closed-union argument, never a default, never a boolean pair; rule stated in INV-QD-042 and both layers' docs | VERIFIED | `shadow: EvaluationShadowing` is non-optional; `EvaluationShadowing = "none" \| "sinkAndCache"`; dispatched by `Match.value(shadow)` with `Match.when` x2 and `Match.exhaustive`. `EvaluationEnvironment.tst.ts` pins the exact option shape and uses `not.toBeCallableWith` for each missing option. INV-QD-042 restated (invariants.md:1701) and cites ADR-QD-146, INV-QD-311/312. `qadiReviewLayer` and `simulationLayer` doc comments both state the choice. |
| 3 | SC3/SEAL-03: outer sink and cache still used under the review layer (new tests); simulation shadows both (INV-QD-042 tests green); `"sim"` prefix asserted | VERIFIED | `QadiReviewLayer.test.ts` has "an outer sink receives every record..." and "an outer decision cache is the one an evaluation under it fills and answers from". `Simulation.test.ts` seal tests are unchanged since the phase base (devtools test diff is only the new conformance file, a comment edit in `SimulationSource.test.ts`, and a line removed from `surface.tst.ts`) and pass. `sim` is asserted at `Simulation.test.ts:434` and the conformance test (`sim-1`, `sim-2`). |
| 4 | SC4/SEAL-04: conformance test shows ids, clock determinism and fail-closed ports agree; `packages/core/test/helpers.ts` built from the builder | VERIFIED | `ReviewSimulationConformance.test.ts`: ids, fail-closed for every port, live clock, deterministic clock (4 tests, pass). `helpers.ts:52` `subjectSetLayer` calls `evaluationEnvironment({ ..., shadow: "none" })`. |
| 5 | SC5/SEAL-05: clock vocabulary settled and recorded, no `effect/testing` import added to core | VERIFIED | `grep effect/testing packages/core/src` returns nothing. `EvaluationClock = "live" \| "deterministic"` replaces testing's `"live" \| "test"` and devtools' `SimulationClock`; a grep for `SimulationClock` outside history (upgrading.md before-example, ADR-146, README/overview change history, CHANGELOG) finds no source use. Each package maps the word to a layer in one `clockLayer` function. Recorded in ADR-QD-146. |
| 6 | Builder behaviour: `none` leaves outer sink/cache; `sinkAndCache` installs discarding sink and private per-build cache | VERIFIED | `EvaluationEnvironment.test.ts` 7 tests pass (re-run: 7/7). |
| 7 | Spec records consistent: ADR-QD-146, ADR-QD-050 Rev 1.5, INV-QD-042 restated, INV-QD-311/312, BEH-QD-501..505, CCR-QD-424 with ARCH-81, traceability rows | VERIFIED | `decisions/index.yaml` has ADR-QD-146 and the file exists (112 lines); 050 header Revision 1.5 with a change-history entry; invariants.md has INV-QD-311 (3608) and 312 (3622); BEH-QD-501..503 in `06-services.md`, 504..505 in `29-devtools-simulator.md`; every id appears in `traceability.md` (BEH 501:4, 502:2, 503:2, 504:4, 505:3; INV-311/312: 5 each; ADR-146: 4); CCR-QD-424 row at `spec/README.md:361` plus ARCH-81 across ten spec files. |
| 8 | Overview rows (WX-03): four new exports rows present; `SimulationClock` row gone | VERIFIED | `overview.md:294` names the four exports; `SimulationClock` appears only in the Change History (accepted). Gate 13 passed in the check:pr log. |
| 9 | WX-07: changesets carry **Breaking.** for testing and devtools only; upgrading.md 0.12 section exists | VERIFIED | `sealed-evaluation-environment-testing.md` and `-devtools.md` start with `**Breaking.**`; the core changeset (minor, additive) does not. `apps/website/.../reference/upgrading.md` has "## 0.12: one clock vocabulary, `EvaluationClock`" with before/after. `testing.md` website page updated to `"deterministic"`. |
| 10 | WX-05: mutation of the new module shows no survivor | VERIFIED | `33-mutation-after.json` = `{EvaluationEnvironment.ts: 1}`. The still-present `reports/mutation/mutation.json` shows `{Killed: 6, Ignored: 2}` for the module (no Survived, no NoCoverage). Base recorded the touched files as unmeasured, so there is nothing to regress. |
| 11 | WX-04/WX-06: no new `as`, `!`, `any`, `switch`, `fnUntraced`, `async`, ambient console/clock; characterisation tests precede the refactor | VERIFIED | Diff scan of `packages/*/src` and `helpers.ts` added lines finds none (matches were comments only). Commit order: `cd00086e` baseline, `28f3237f` and `646ad991` pins on the phase base, then `d8122f1c` feat, `ba821259`, `d0d8ca65`, `f8c9c10f` refactors. Existing test edits are renames (`"test"` to `"deterministic"`) and one comment. |
| 12 | WX-01/02/03: gate green, records use reserved numbers | VERIFIED | `pnpm check:pr` green on HEAD per the supplied log (not re-run, as instructed). Targeted re-runs here: core `EvaluationEnvironment.test.ts` 7/7, testing `QadiReviewLayer` + `TestLayers` 39/39, devtools conformance + Simulation* 261/261. 33-SECURITY `threats_open: 0`, 33-REVIEW-DISPOSITION `open: 0`, 33-VALIDATION `nyquist_compliant: true`. |

**Score:** 12/12 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `packages/core/src/EvaluationEnvironment.ts` | VERIFIED | Substantive (100 lines), exported, consumed by three call sites. |
| `packages/core/test/EvaluationEnvironment.{test,tst}.ts` | VERIFIED | Runtime and type pins; pass. |
| `packages/testing/test/QadiReviewLayer.test.ts` | VERIFIED | SEAL-03 pins. |
| `packages/devtools/test/model/ReviewSimulationConformance.test.ts` | VERIFIED | SEAL-04 conformance. |
| `spec/decisions/146-*.md`, changesets (3), upgrading.md section | VERIFIED | Present and consistent. |

### Key Link Verification

| From | To | Status |
|------|----|--------|
| `qadiReviewLayer` | `evaluationEnvironment` (`shadow: "none"`, prefix default `eval`) | WIRED |
| `simulationLayer` | `evaluationEnvironment` (`shadow: "sinkAndCache"`, prefix `sim`) | WIRED |
| `helpers.ts subjectSetLayer` | `evaluationEnvironment` (`shadow: "none"`, `Layer.empty`) | WIRED |
| `EvaluationEnvironment.ts` | `DecisionSink`, `decisionCacheLayer`, `evaluationIdSequential` | WIRED |
| core barrel | `EvaluationEnvironment.ts` | WIRED |

### Data-Flow Trace (Level 4)

Not applicable: no rendered dynamic data; layer composition only.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Builder behaviour | `vitest run --project core packages/core/test/EvaluationEnvironment.test.ts` | 7 passed | PASS |
| Review layer pins and clock rename | `vitest run --project testing QadiReviewLayer.test.ts TestLayers.test.ts` | 39 passed | PASS |
| Conformance and simulation seal | `vitest run --project devtools ReviewSimulationConformance.test.ts model/Simulation` | 261 passed | PASS |

### Probe Execution

Step 7c: SKIPPED (no probes declared by the phase).

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| SEAL-01 .. SEAL-05 | SATISFIED | Truths 1 to 5. |
| WX-01 .. WX-07 | SATISFIED | Truths 9 to 12. |

No orphaned requirements.

### Anti-Patterns Found

None. No TBD/FIXME/XXX or stub patterns in the touched source files.

### Human Verification Required

None.

### Gaps Summary

No gaps. Observations, none blocking: the devtools `package.json` keeps `@qadi/testing` as a devDependency (pre-existing, used by the conformance test, so it does not reach consumers); `clockLayer` in each package uses a ternary on a two-member union rather than `Match`, which AGENTS.md section 5a permits (the rule covers `_tag` dispatch, and `switch` is the forbidden form).

## Re-verification (2026-11-13)

Status stayed `passed` (12/12). Reason for re-verification: `verification.status` read `stale` because phases 31..36 changed covered files. All three moved files changed after this phase's last commit (`030df8dc`); the other six covered source files (`EvaluationEnvironment.ts`, core `index.ts`, `helpers.ts`, devtools `index.ts`, `Simulation.ts`, `QadiReviewLayer.ts`) have an empty diff since `030df8dc`.

| Moved file | Later commits | Judgement |
|------------|---------------|-----------|
| `packages/devtools/src/model/SimulationSource.ts` | `546a9a65` (36-05) `describeSource`; `00d04248` (36-08) a description builds no recorder, one `ReadySource`/`RefusedSource` split; `8e8ac22c` (36) build a snapshot source once per row set | Expected. `PreparedSource` is split into `ReadySource`/`RefusedSource`, and `prepareSource` now returns it directly while `describeSource` serves the dock. The `Live` row still builds `live(ports)`/`live(recorder.layer)`; the 33 prose (`09af1949`) still stands (line 18, "All three are sealed the same way"). Nothing touches shadowing, the id prefix or the clock. |
| `packages/devtools/src/model/SimulationSession.ts` | `00d04248`, `0cbd2f95` (36-08) | Expected. Switches `build()` to `describeSource`, drops `baselineReading` from the snapshot (the reading now lives on `Baseline.Checked`), types `program` with `ReadySource`. `EvaluationClock` (this phase's vocabulary) is still the clock type threaded through runs. No shadowing or environment code. |
| `packages/devtools/src/react/Simulator.tsx` | `0cbd2f95` (36-08) | Expected. `BaselineCard` reads `baseline.reading` instead of a separate prop; still imports `EvaluationClock` from `@qadi/core`. UI only. |

No regression found: the builder (`evaluationEnvironment`, required `shadow: EvaluationShadowing`, `Match.exhaustive`), its three call sites (`qadiReviewLayer` `shadow: "none"`, `simulationLayer` `shadow: "sinkAndCache"` prefix `sim`, `helpers.ts` `shadow: "none"`), INV-QD-042 (invariants.md:1703), INV-QD-311/312 (3616/3630), ADR-QD-146 (`spec/decisions/146-*.md`), and the three `sealed-evaluation-environment-*` changesets are all present. `grep effect/testing packages/core/src` is still empty. `@qadi/testing` is still devDependency-only in devtools, with no import in `packages/devtools/src`. No TBD/FIXME/XXX or `switch` in the moved files.

Evidence at HEAD: `pnpm vitest run --project core --project testing --project devtools EvaluationEnvironment QadiReviewLayer ReviewSimulationConformance model/Simulation` gave 9 files / 274 tests passed. The `check:pr` log at `341c1c15` (exit 0: vitest 200 files / 4917 tests, tstyche, coverage 99.47%, e2e 30 passed) was read, and later commits are `.planning`-only.

Requirements: SEAL-01..05 and WX-01..07 are all `[x]` in REQUIREMENTS.md and mapped Complete (rows 127-131, 148-154); no orphaned ids. The WX-04 note (no new `as`/`any`/`switch`/`async`) holds for the three moved files.

---

_Verified: 2026-11-12T16:20:00Z_
_Re-verified: 2026-11-13_
_Verifier: Claude (gsd-verifier)_
