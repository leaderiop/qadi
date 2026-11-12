---
phase: 24-simulation-source-preparation
verified: 2026-11-11T08:20:00Z
status: passed
score: 9/9 must-haves verified
covered_files:
  - ".changeset/simulation-source-preparation.md"
  - ".planning/phases/24-simulation-source-preparation/24-01-PLAN.md"
  - ".planning/phases/24-simulation-source-preparation/24-01-SUMMARY.md"
  - ".planning/phases/24-simulation-source-preparation/24-02-PLAN.md"
  - ".planning/phases/24-simulation-source-preparation/24-02-SUMMARY.md"
  - ".planning/phases/24-simulation-source-preparation/24-03-PLAN.md"
  - ".planning/phases/24-simulation-source-preparation/24-03-SUMMARY.md"
  - "packages/devtools/src/index.ts"
  - "packages/devtools/src/model/SimulationSession.ts"
  - "packages/devtools/src/model/SimulationSource.ts"
  - "packages/devtools/src/react/Simulator.tsx"
  - "packages/devtools/test/model/SimulationSession.test.ts"
  - "packages/devtools/test/model/SimulationSource.prepare.test.ts"
  - "packages/devtools/test/surface.tst.ts"
  - "spec/README.md"
  - "spec/behaviors/29-devtools-simulator.md"
  - "spec/decisions/050-a-simulation-is-sealed.md"
  - "spec/overview.md"
  - "spec/traceability.md"
covered_digest: "v4:sha256:49d308051e8fe2ca1d4b274b637b9c00248f849f6526edb7e5b23da24a0b4320"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 24: Simulation source preparation Verification Report

**Phase Goal:** The rule for which simulation source is available, and that a Live run captures so Snapshot unlocks, lives in `SimulationSource.ts` alone.
**Verified:** 2026-11-11 (regenerated at HEAD 12a6631c after 6c198da1 and 12a6631c)
**Status:** passed
**Re-verification:** Yes (re-run after code-review fixes; previous status passed, 9/9, no gaps)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ROADMAP SC1: a 12-row table test covers every (choice x ports x capture) combination | VERIFIED | `packages/devtools/test/model/SimulationSource.prepare.test.ts` nests 3 choices x 2 ports states x 2 capture states, asserts `rows === 12`, and checks options order/enabled flags, prepared tag, refusal tag and reason (equal to the matching option's `why`), source tag, Snapshot `answers === capture`, and `captured` defined iff Live. Ran green (3 files, 90 tests). |
| 2 | ROADMAP SC2: the session no longer inspects a source variant's `_tag`; `resolveSource`/`sourceOptions` are gone | VERIFIED | `SimulationSession.ts` reads `_tag` only on `prepared` (`Ready`/`Refused`, lines 283, 384) and on its own `run`/`choice` unions. No `capturing`, `live(`, `ports === undefined`, `capture === undefined`, or `"Live"`/`"Snapshot"`/`"Fixtures"` literal remains in it. `grep resolveSource\|sourceOptions\|ResolvedSource` over `packages/*/src`, `packages/*/test`, `features`, `AGENTS.md` returns nothing; remaining hits are historical text (ADR-QD-050 amendment prose, two earlier changesets, overview change-history). |
| 3 | ROADMAP SC3: each Live run captures with its own recorder (pinned) | VERIFIED | `SimulationSession.test.ts` "each Live run captures with its own recorder (ARCH-72)" (added in 504ee3fd on the phase base, green there) plus the prepare-table test "each preparation records alone" (`answerCount(p1)=1`, `answerCount(p2)=0`). `runEffect` calls `prepareSource` once per run, after the last teardown yield; `rowsOf`'s Live row builds `capturing(ports)` inside its `ready` thunk, so no preparation is reused. Behavioural tests exist and pass, so this is not presence-only. |
| 4 | SRC-01: `prepareSource(choice, { ports, capture })` returns options and `Ready`/`Refused`; availability written once | VERIFIED | `SimulationSource.ts` exports `prepareSource`, `PreparedSource`, `SourcePreparation`; one private `rowsOf` table typed `{ readonly [K in SourceChoice]: SourceRow }` (a fourth source is TS2741) feeds both `options` and `prepared`. `capture === undefined` and `ports === undefined` each appear exactly once in the file. `SOURCE_ORDER` is also closed over `SourceChoice` (WR-02, 5977264c). |
| 5 | SRC-02: "a Live run captures" lives in `SimulationSource.ts` alone | VERIFIED | The recorder (`capturing(ports)`, `live(recorder.layer)`, `captured: recorder.answers`) is built only in `rowsOf`; the session `program` yields `ready.captured` when present and stores it as `capture`. No `_tag === "Live"` check or re-wrap in the session. |
| 6 | SRC-03: one table covers every combination; session tests only check a `Refused` becomes the run state | VERIFIED | Table test above; the two session describes that called `resolveSource`/`sourceOptions` were removed (179f366d); C2 refusal and capture-lifetime session tests remain and pass. |
| 7 | WX-01: `pnpm check:pr` green | VERIFIED (partial re-run) | Full `pnpm check:pr` was green at e7dabae8 (16 of 17 steps, mutation skipped by design). It was NOT re-run by this verifier at 12a6631c (over 10 minutes). Orchestrator re-ran after 6c198da1: devtools vitest 44 files / 1163 tests, `pnpm typecheck`, `pnpm lint` (house-style 449 files), `pnpm spec:verify:strict` 21/0, `spec-revise --check`, all green. This verifier re-ran the three model suites: 3 files, 90 tests pass. Diff since e7dabae8 touches one src file, one test, spec/README.md and planning files only. |
| 8 | WX-02..WX-04: records, overview/gate 13, no forbidden constructs or budget edits | VERIFIED | See Requirements Coverage. Diff of `packages/devtools/src` against the phase base adds no `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, `console`, `process.env` or clock call (matches were comments and a `type`-only import). `git diff 2c24f19d HEAD` touches no file under `scripts/`, `AGENTS.md`, vitest, or stryker config. |
| 9 | WX-05/WX-06: mutation score not lower; defect fixes preceded by a RED test | VERIFIED (with note) | `24-mutation-base.json` vs `24-mutation-after.json` (re-measured by the orchestrator after 6c198da1): SimulationSource.ts 0.9444 to 0.9841, SimulationSession.ts 0.9619 to 0.9641. Phase had no defect to fix (D-01), so WX-06 is vacuous for plans 24-01..03; the review's WR-01 fix added a test the fix report says was seen failing on the old ordering (not re-proved here). |

**Score:** 9/9 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/devtools/src/model/SimulationSource.ts` | `prepareSource`, moved types, closed table | VERIFIED | Substantive, wired from session, barrel and Simulator.tsx |
| `packages/devtools/src/model/SimulationSession.ts` | stores what `prepareSource` returns | VERIFIED | `prepareSource(` at build() and runEffect |
| `packages/devtools/test/model/SimulationSource.prepare.test.ts` | 12-row table | VERIFIED | 105 lines, green |
| `packages/devtools/test/model/SimulationSession.test.ts` | one-recorder-per-run test (ARCH-72) | VERIFIED | present, green; the replay-during-start test now asserts `run._tag === "Idle"` outright |
| `24-mutation-base.json` / `24-mutation-after.json` | per-file scores | VERIFIED | both name the two files |
| `spec/behaviors/29-devtools-simulator.md` | BEH-QD-455 | VERIFIED | section present; `prepareSource` cited in BEH-QD-220/322 |
| `spec/README.md` | CCR-QD-414 row | VERIFIED | row present, lists files and used/unused numbers |
| `.changeset/simulation-source-preparation.md` | `@qadi/devtools` patch | VERIFIED | present |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `SimulationSession.ts` | `SimulationSource.ts` | `prepareSource(` in build and runEffect, branch only on `prepared._tag` | WIRED |
| `index.ts` | `SimulationSource.ts` | `export type { SourceChoice, SourceOption, SourceRefusal } from "./model/SimulationSource.ts"` | WIRED |
| `Simulator.tsx` | `SimulationSource.ts` | type import moved with the declaration | WIRED |
| `spec/traceability.md` | prepare test | row naming `SimulationSource.prepare.test.ts` (BEH-QD-220, 455, ADR-QD-050) | WIRED |
| `surface.tst.ts` | barrel | `prepareSource` pinned as not exported (ADR-QD-099) | WIRED |

### Data-Flow Trace (Level 4)

Source options and refusal reach the dock from `prepareSource`'s table through the session snapshot (`options`, `refusal`); the capture flows from the Live recorder's `answers` into `capture`, and into `Snapshot` availability on the next `prepareSource`. Real data, not static: FLOWING.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| prepare table, session, source suites | `pnpm vitest run --project devtools` on the three files | 3 files, 90 tests pass | PASS |
| Full PR gate at HEAD | `pnpm check:pr` | exit 0 (mutation step skipped by design) | PASS |

### Probe Execution

No probes declared. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| SRC-01 | 24-01..03 | SATISFIED | Truth 4 |
| SRC-02 | 24-01..03 | SATISFIED | Truth 5 |
| SRC-03 | 24-01..03 | SATISFIED | Truth 6 |
| WX-01 | 24-03 | SATISFIED | Truth 7 |
| WX-02 | 24-01, 24-03 | SATISFIED | ADR-QD-050 dated amendment, BEH-QD-455, CCR-QD-414, traceability; ADR-QD-136, BEH-QD-456..459, INV-QD-292/293 appear only in CCR-QD-414's "unused" row; BEH-QD-455 is the only reserved number used; no stray placeholder |
| WX-03 | 24-02, 24-03 | SATISFIED | overview row moved to `model/SimulationSource.ts`; gate 13 green inside `check:pr` |
| WX-04 | 24-02, 24-03 | SATISFIED | Truth 8 |
| WX-05 | 24-01, 24-03 | SATISFIED | Truth 9; coverage thresholds enforced inside `check:pr` |
| WX-06 | 24-01, 24-03 | SATISFIED | Truth 9 |

All nine phase IDs are claimed by plan frontmatter and marked complete in REQUIREMENTS.md (the traceability table at lines 219/225 still says "Pending"; bookkeeping only). No orphaned requirements.

### Anti-Patterns Found

None blocking. No TBD/FIXME/XXX in touched src. The three new `throw new Error` lines in the prepare test are narrowing guards in test code.

### Human Verification Required

None.

### Re-verification of 6c198da1 and 12a6631c

`SimulationSession.ts` refactor is behaviour-preserving. Checked by reading the old and new code side by side:

- `seeded` is assigned in exactly one place, `reseed`, and there it is built from the same `entry` that `seedEntry = entry` just stored, so `seeded.entry === seedEntry` whenever `seeded` is set. The old guard `seeded !== undefined && seedEntry !== undefined` therefore reduces to `seeded !== undefined`.
- Every path that cleared `seeded` still clears it: `reseed` (now clears first, then re-sets only for a `Replayable` row, which matches the old else-branch for `undefined` entry and for non-replayable rows) and `choosePolicy` (`seeded = undefined`). `pin()` and the `choosePolicy` early-return still test `seeded === undefined`.
- `seedEntry` is still held separately and still used by `seed`'s same-entry guard and the run-question's decision lookup; the `choosePolicy` path still leaves it set, exactly as before.
- The `runEffect` comment change is text only. The IN-04 test tightening (Idle outright) passes.

Mutation comparison in CCR-QD-414 and `24-mutation-after.json` agree (0.9641 vs base 0.9619; 0.9841 vs base 0.9444). The README revision is 1.150 with a matching change-history line. No new `as`, `!`, `any`, `switch`, `async`/`await`, `console`, `process.env`, clock call or TBD/FIXME/XXX in the diff since e7dabae8; no file under `scripts/` or `AGENTS.md` touched since the phase base.

### Advisory (not blocking)

Review items IN-04, IN-05 and IN-06 from the first review are now resolved by 6c198da1/12a6631c (test asserts Idle, comment reworded, deferred-items marks the run-start window resolved). IN-01 (a recorder is built and discarded on each `build()` commit while Live is chosen, harmless), IN-02 and IN-03 (`Ready` spelled twice) remain info-only. Iteration-2 review files are untracked and were not re-read as evidence. The full `pnpm check:pr` and Stryker were not re-run by this verifier at 12a6631c; the Stryker figures come from the orchestrator's re-measurement.

### Gaps Summary

No gaps. The rule lives in `SimulationSource.ts`'s `prepareSource`, the session stores what it returns, the behaviour is pinned by a 12-row table plus per-run recorder tests, the spec records are in place, and the PR gate was green at e7dabae8 with the later, smaller changes covered by targeted re-runs.

---

_Verified: 2026-11-11T08:20:00Z_
_Verifier: Claude (gsd-verifier)_
