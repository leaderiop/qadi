---
phase: QD-37-a-scoped-run-that-a-newer-run-supersedes
verified: 2026-11-14T04:00:00Z
status: passed
score: 8/8 must-haves verified
covered_files:
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-01-PLAN.md"
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-01-SUMMARY.md"
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-02-PLAN.md"
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-02-SUMMARY.md"
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-03-PLAN.md"
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-03-SUMMARY.md"
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-04-PLAN.md"
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-04-SUMMARY.md"
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-05-PLAN.md"
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-05-SUMMARY.md"
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-06-PLAN.md"
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-06-SUMMARY.md"
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-07-PLAN.md"
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-07-SUMMARY.md"
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-08-PLAN.md"
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-08-SUMMARY.md"
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-09-PLAN.md"
  - ".planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-09-SUMMARY.md"
  - "packages/devtools/src/model/DiagnosticsFeed.ts"
  - "packages/devtools/src/model/SimulationSession.ts"
  - "packages/devtools/src/model/SupersedingRun.ts"
  - "packages/devtools/src/model/TimelineFeed.ts"
  - "packages/devtools/test/model/SimulationSession.runs.test.ts"
  - "packages/devtools/test/model/SupersedingRun.test.ts"
covered_digest: "v4:sha256:c112463c4f13ec52a37058de378a468806ef68fddd7e62becff0199d5f49a2f3"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 37: A scoped run that a newer run supersedes - Verification Report

**Phase Goal:** A scoped run that a newer run supersedes (generation, close, finalizer order, stop, land only while current) is written once in one package-private devtools module, so the three stores that restate it by hand stop drifting, and a restart from inside a store's own notification leaves the newest run live.
**Verified:** 2026-11-14
**Status:** passed
**Re-verification:** No, initial verification (verified on the tree after the review fixes 6934fe16, cff0df37, dc266bbd, 0231bbfc)

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
| -- | ----- | ------ | -------- |
| 1  | RUN-01: one package-private module owns handle, token, closed, finalizer order, interrupt-on-replace, stop, land-only-while-current via `begin` -> publish -> `fork(token, effect)` | VERIFIED | `packages/devtools/src/model/SupersedingRun.ts` (143 lines): `FiberHandle.make`, finalizer added after the handle, `begin/fork/isCurrent/stop/closed`; `drain` holds one pending slot. Not in either barrel or `spec/overview.md` (grep of `SupersedingRun` finds only the module and its three adopters in `packages/devtools/src`). |
| 2  | RUN-02: the three stores use it and none declares `let generation`, `let closed`, `FiberHandle.make/runtime` or a bump-in-finalizer block | VERIFIED | `FiberHandle` appears nowhere in `packages/devtools/src` outside `SupersedingRun.ts`; negative grep on added lines since `c52e0d65` hits only the module. `TimelineFeed.ts:121`, `DiagnosticsFeed.ts:170`, `SimulationSession.ts:351` call `makeSupersedingRun()`; each lands only via `isCurrent(token)`. |
| 3  | RUN-03: module tests through its interface: supersede, close mid-run (defecting finalizer), stop in each state, interrupt vs failure, two scopes | VERIFIED | `packages/devtools/test/model/SupersedingRun.test.ts` R1-R17 (R3 defecting release, R5-R8 stop in four states, R9 hook, R10 two scopes). Ran green. |
| 4  | RUN-04: `stop` is one unconditional rule, pinned by one test: no run changes nothing, notifies nobody | VERIFIED | `stop: () => { fork(begin(), Effect.void); }` with no guard; the old `FiberHandle.getUnsafe` guard is gone from the session (`supersede` is `runs.stop()`); `DiagnosticsFeed.off` also calls `runs.stop()`. R5/R7 pin no hook and no span, each with a positive control (dc266bbd). |
| 5  | RUN-05: restart from inside Starting/Reading notification leaves the newest run live in all three stores; run-body-starts-a-command repaired | VERIFIED | `fork` re-checks the token; a nested fork is held and installed after the outer start (R11-R14). RED commits precede each conversion (`3b02577b`->`c2e17206`, `6feb79ee`->`254bb6c6`, `188de790`->`5e72a2eb`). The repaired form (D-07) is stronger than "reported", as D-07 and ADR-QD-150 state. |
| 6  | RUN-06: behaviour unchanged: session run still a root span, interruption never reads Stopped (INV-QD-313), session reads defect/self-interrupt as Broke; feeds' filter is one named hook the session does not use | VERIFIED | `SimulationSession.ts` `land` keeps `{ root: true }` and maps any non-success with a current token to `Broke`; `runs.fork(mine, land(...))` passes no hooks. Feeds pass `onFailure`; the module calls it only for a current, non-interrupt-only failure. Pre-existing store tests pass unchanged (only an import line changed in `TimelineFeed.test.ts`). |
| 7  | RUN-07: seeded model-based property over begin, fork, land, stop, close | VERIFIED | `SupersedingRun.test.ts` `FastCheck.asyncProperty`, `numRuns: 300, seed: 3701`, with nine non-vacuity floors of 30 each. Passes. |
| 8  | RUN-08: ADR-QD-137 section 7 and point 3 corrected; AGENTS.md section 10 stops naming `it.scoped` | VERIFIED | `spec/decisions/137-...md` Rev 1.3 amended, cross-links ADR-QD-150; `AGENTS.md` section 10 now lists `it.effect`, `it.layer`, `TestClock` and the `Scope.makeUnsafe` recipe; `it.scoped` no longer appears there. |

**Score:** 8/8 truths verified (0 present, behavior-unverified)

### Locked decisions (37-CONTEXT D-01..D-13)

| Decision | Honored | Evidence |
| -------- | ------- | -------- |
| D-01 module name/shape, scoped, sync build, package-private | yes | `makeSupersedingRun = Effect.fn(...)` requiring `Scope.Scope`; R17 builds under `Effect.runSync`; not exported. |
| D-02 two-step interface | yes | `begin`, `fork`, `isCurrent`, `stop`, `closed`. |
| D-03 `onFailure` hook, session passes none | yes | `ForkHooks.onFailure`; session `fork` call has no hooks. |
| D-04 opaque token | yes | branded `RunToken`; stores only call `isCurrent`. |
| D-05 unconditional stop | yes | see truth 4. |
| D-06 pre-fork re-check by default | yes | `fork` starts with `if (!isCurrent(token)) return false`. |
| D-07 in-prefix repair (held fork) | yes | `held`/`drain`; R11-R14. |
| D-08 synchronous start kept | yes | `install(next.run)` is called inside `fork`; no `yieldNow`, no `startImmediately: false`. |
| D-09 store tests unchanged | yes | only an import line differs in `TimelineFeed.test.ts`; nothing deleted. |
| D-10 mutation base committed first, no store drop | yes | `c8accf4c` is the first phase commit; see WX-05. |
| D-11 seeded property | yes | truth 7. |
| D-12 module tests incl. self-interrupt, two scopes, re-entrancy | yes | R1-R17 plus `SimulationSession.runs.test.ts` (self-interrupt reads `Broke`). |
| D-13 records, reserved numbers only | yes | ADR-QD-150, CCR-QD-428 row, BEH-QD-521..525, INV-QD-319..320, `.changeset/superseding-run.md` (`@qadi/devtools` patch). |

### Required Artifacts

| Artifact | Status | Details |
| -------- | ------ | ------- |
| `packages/devtools/src/model/SupersedingRun.ts` | VERIFIED | substantive, wired from three stores |
| `packages/devtools/test/model/SupersedingRun.test.ts` | VERIFIED | 764 lines, 18 tests incl. property |
| `packages/devtools/test/model/SimulationSession.runs.test.ts` | VERIFIED | 212 lines |
| `spec/decisions/150-a-scoped-run-that-a-newer-run-supersedes.md` + `index.yaml` row | VERIFIED | present, traceability row at `spec/traceability.md:307` |
| `spec/behaviors/28-devtools-screens.md` BEH-QD-521..525 | VERIFIED | headings at lines 1582-1701 |
| `spec/invariants.md` INV-QD-319, INV-QD-320 | VERIFIED | lines 3730, 3744 |
| `spec/README.md` CCR-QD-428 row | VERIFIED | line 365 |
| `.changeset/superseding-run.md` | VERIFIED | `@qadi/devtools: patch`, still present (nothing released) |
| `37-mutation-base.json`, `37-mutation-after.json`, `37-mutation-survivors.json` | VERIFIED | see WX-05 |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| TimelineFeed `readSource` | module | `reads.begin()`, `status.set(READING)`, `reads.fork(token, ..., { onFailure })` | WIRED |
| DiagnosticsFeed `start`/`off` | module | `runs.begin()`, `show(Starting)`, `runs.fork`; `off` -> `runs.stop()` | WIRED |
| SimulationSession `start`/`supersede`/`land` | module | `runs.begin()`, `commit()`, `runs.fork(mine, land(...))`; `land` guards on `runs.isCurrent(mine)` | WIRED |
| Landed writes | token | feeds' `marking.accept` guard on `isCurrent(token)` | WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Module, three stores, session runs | `npx vitest run --project devtools` on SupersedingRun, TimelineFeed, DiagnosticsFeed, SimulationSession* | 5 files, 175 tests passed | PASS |
| House style gate | `node scripts/check-house-style.mjs` | 496 files clean (3 declared switches, unchanged) | PASS |
| API surface gate 13 | `node scripts/check-api-surface.mjs` | 917 exports documented | PASS |
| Typecheck incl. tests | `tsc -p tsconfig.test.json --noEmit` | no output | PASS |

The full `pnpm check:pr` was not re-run here; the orchestrator is running it after the review fixes. 37-09 recorded exit 0 on `021e3bf7`.

### Requirements Coverage

Every ID declared in the nine plans' frontmatter is accounted for in REQUIREMENTS.md (all marked Complete, Phase 37 / All v1.4 phases). No orphaned Phase 37 IDs.

| Requirement | Plans | Status | Evidence |
| ----------- | ----- | ------ | -------- |
| RUN-01 | 02, 03 | SATISFIED | truth 1 |
| RUN-02 | 02, 05, 06, 09 | SATISFIED | truth 2 |
| RUN-03 | 03, 08 | SATISFIED | truth 3 |
| RUN-04 | 01, 03, 06, 08 | SATISFIED | truth 4 |
| RUN-05 | 02, 03, 05, 06, 08 | SATISFIED | truth 5 |
| RUN-06 | 01, 02, 05, 06 | SATISFIED | truth 6 |
| RUN-07 | 04, 08 | SATISFIED | truth 7 |
| RUN-08 | 07 | SATISFIED | truth 8 |
| WX-01 | 09 | SATISFIED | 37-09 SUMMARY records `check:pr` exit 0 on `021e3bf7`; devtools tests, lint and typecheck re-confirmed here; orchestrator re-running after review fixes |
| WX-02 | 01, 07, 08, 09 | SATISFIED | only reserved numbers used (ADR-QD-150, CCR-QD-428, BEH-QD-521..525, INV-QD-319..320); `next-id.mjs` not run (no trace in commits) |
| WX-03 | 09 | SATISFIED | gate 13 passes; module is package-private so no export row is owed |
| WX-04 | 02-06, 09 | SATISFIED | negative grep on added src lines: no `as`, `!`, `any`, `switch`, `fnUntraced`, `async`/`await`, `console`, `process.env`, clock; house-style budgets unchanged |
| WX-05 | 01, 09 | SATISFIED | below |
| WX-06 | 01, 02, 05, 06, 09 | SATISFIED | characterisation commits (`796648b0`, `2209c47a`) and RED commits precede each conversion |
| WX-07 | 07, 09 | SATISFIED | no public break; patch changeset, nothing released, no version-packages commit |

WX-05 detail (`37-mutation-base.json` vs `37-mutation-after.json`, same invocation):

| File | Base | After |
| ---- | ---- | ----- |
| TimelineFeed.ts | 1 | 1 |
| DiagnosticsFeed.ts | 0.9279 | 0.9474 |
| SimulationSession.ts | 0.9767 | 0.9819 |
| SupersedingRun.ts | new | 0.9434, 3 survivors, each named equivalent with a reason in `37-mutation-survivors.json` |

The survivor lines (`:94:29`, `:94:45`, `:121:13`) match the current source after the IN-01/IN-02 edits. Core and others' coverage thresholds were met in the 37-09 run (99.49 statements, 98.05 branches overall); source changes since are doc-only plus the IN-01 simplification.

### Anti-Patterns Found

None. No `TBD`/`FIXME`/`XXX`/`TODO` in the modified files. No stubs: every store's landed values come from real runs.

### Human Verification Required

None. The review-fix IN-01 ("necessity" finding, removed a branch) is covered by R9 and the property, and its mutation was re-measured with all survivors equivalent.

### Gaps Summary

No gaps. The protocol is written once in `SupersedingRun.ts`, the three stores use it with no restated handle, counter or closed flag, restarts from inside a notification or a synchronous start leave the newest run live, and the records, changeset and mutation evidence are in place.

---

_Verified: 2026-11-14_
_Verifier: Claude (gsd-verifier)_
