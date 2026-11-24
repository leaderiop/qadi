---
phase: QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws
verified: 2026-11-25T00:00:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-01-PLAN.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-01-SUMMARY.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-02-PLAN.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-02-SUMMARY.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-03-PLAN.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-03-SUMMARY.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-04-PLAN.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-04-SUMMARY.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-05-PLAN.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-05-SUMMARY.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-06-PLAN.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-06-SUMMARY.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-07-PLAN.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-07-SUMMARY.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-08-PLAN.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-08-SUMMARY.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-09-PLAN.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-09-SUMMARY.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-10-PLAN.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-10-SUMMARY.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-11-PLAN.md
  - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-11-SUMMARY.md
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/ExternalStore.ts
  - packages/devtools/src/model/SimulationSession.ts
  - packages/devtools/src/model/TimelineFeed.ts
covered_digest: "v4:sha256:f85db8896757ade2a06630b60f5dfd2a8f8ae2937f7933168961f8e6c0d75106"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 81: The dock model applies every input whatever a listener throws - Verification Report

**Phase Goal:** The dock model applies every input whatever a host listener throws, on the `configure` path and on the record path, and rethrows what it collected once at the end, so no listener can leave the model half-applied; the double `spread` on a capacity-and-catalogue change goes with it.
**Verified:** 2026-11-25
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A ten-store throw matrix is RED on the base and GREEN after: one throwing listener during `configure` leaves every other input applied and the throw reaches the caller after the last step | VERIFIED | `DockModel.listeners.test.ts` DL1-DL10 (one row per store) and DL11 (fails if the model exposes a store with no row). The shared `applied()` helper asserts timeline, status, roles, rail on explorer and simulation (same reference), dock rows, the simulation's Live option (ports set), questions and gates, diagnostics Live with the supplied reading, then an identical second `configure` moves nothing. `DockModel.ts` `configure` is seven thunks through `callAll`. `81-RED-EVIDENCE.md` records DL3-DL9 failing on the base and DL1/DL2 failing under a scratch edit (they are characterisation rows, green on the base). Re-run by me: `vitest run --project devtools packages/devtools/test/model` gives 52 files, 1515 tests passed. |
| 2 | One throw is rethrown as itself (`undefined`, `null` included); two or more once, collected, in step order, by one package-private rule shared by `notify`, the derived release and `configure`, with no second loop | VERIFIED | `ExternalStore.ts:82` `callAll(calls, message)`: try/catch per call, then `throwCollected` decides by count (none, one as itself, many as `AggregateError`). `notify` (`:98`) and the derived release (`:222`) call it; `DockModel.ts:414` and `TimelineFeed.ts:210` call it. `81-check.mjs single-source` (run by me) prints "one collect loop, in callAll". Not exported from any barrel (grep of the devtools index files finds nothing). Tests: `ExternalStore.callAll.test.ts` (8 rows: none, order, one as itself, `undefined`/`null`, collected order and message, duplicate values kept, nested `AggregateError` not flattened, live set); DL12-DL14, DL18, DL19 at dock level. |
| 3 | A throwing listener on a timeline publish with no `configure` leaves the explorer, simulation and dock on the timeline; every follower has moved when the throw reaches the caller | VERIFIED | `DockModel.ts` builds the rail as the model's fourth derived store (`makeDerivedStore`, parent `timeline`, key `{shown, catalogue}`); explorer and simulation are two listeners on the rail, the dock a listener on the timeline. `spread`, the `shown`/`rail` closure variables and the did-spread guard are gone. DL15 (always-throwing explorer listener, repeated `accept`s: simulation and dock follow, each accept rethrows) is RED on the base per `81-RED-EVIDENCE.md` and green now. |
| 4 | A capacity and a catalogue changed in one `configure` move the rail once; CR22 and BEH-QD-735 counts restated; step order pinned; M55 still throws before anything moves; M56 green | VERIFIED | DL16 asserts one rail publish each for explorer and simulation (RED on the base: 2 and 2). `ConfigureRule.test.ts` CR22 restated from `2, 2, 3, 3, 0, 1, 0, 2, 1, 0` to `2, 2, 2, 2, ...` (git diff against `902d2128`). `DockModel.test.ts` is unedited, so M55 and M56 pass as written. In `configure`, `completeDockInputs(next)` runs outside `callAll`, so a refused capacity throws before `held` or any store moves. Step order is the array literal in `DockModel.ts:414-433` (timeline, rail, roles, ports, gates, diagnostics, shown reading) and DL12 asserts `AggregateError.errors` order and the exact message "More than one step of the dock's configure threw." |
| 5 | The `begin()`-to-`fork()` window is closed at every site; a nested `configure` leaves the model on the inner inputs; the ADR, BEH, INV, traceability and the dock model's file header carry the rule | VERIFIED | Source diff against `902d2128`: `TimelineFeed.readSource` (`try { status.set(READING) } finally { reads.fork }`), `DiagnosticsFeed.start` (same around `show(Starting)`), `SimulationSession` run (same around `commit()` of `Running`); `GatesFeed` forks before it publishes, pinned by G49 (green on base, characterisation). `TimelineFeed.configure` runs resize and read through `callAll`, each reading `held` when it runs. Tests: TF28, TF29 (flipped and retitled), F31, SR6, TF37, DL17 (nested `configure` equals a plain `configure` on a fresh model, snapshot by snapshot), DL20. Records: `spec/decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md`, BEH-QD-741 to 745 headings in `spec/behaviors/28-devtools-screens.md`, INV-QD-407 and 408 in `spec/invariants.md` and `spec/traceability.md`, CCR-QD-473 in `spec/README.md`, and the `DockModel.ts` header (lines 13-20, 29-34) names `callAll`, the seven steps and four derived stores. |

**Score:** 5/5 truths verified (0 behavior-unverified: every state-transition and cancellation truth is exercised by a passing named test).

### D-09 dated refinement (honoured)

CONTEXT D-09 was refined at planning to use `try { publish } finally { fork }` at the three publish-then-fork sites and `callAll` only where two or more calls can throw. The code matches that refinement exactly: three `try/finally` windows, and `callAll` at `notify`, the derived release, `DockModel.configure` and `TimelineFeed.configure`. ADR-QD-194 exists and records it. Behaviour required by COLL-05 is unchanged.

### Decisions D-01 to D-13

| Decision | Honoured | Evidence |
|----------|----------|----------|
| D-01 branch, no merge, push or release | Yes | Branch `arch-wave-15`; one `@qadi/devtools` patch changeset; no version or publish commits. |
| D-02 reserved ids only | Yes | ADR-QD-194, CCR-QD-473, BEH-QD-741 to 745, INV-QD-407 and 408 are the only new ids. |
| D-03 tests first, RED on base | Yes | `81-RED-EVIDENCE.md`; `81-pinned-check.mjs --all-applied` (run by me): "8 files hold their base text, 4 of 4 declared flips applied". |
| D-04 / D-05 `callAll`, dock message | Yes | Signature `Iterable<() => void>`, live `Set` passed by `notify`, both old messages unchanged, the dock message asserted exactly in DL12. |
| D-06 rail as fourth derived store | Yes | `DockModel.ts`; not a member of `DockModel`, so BEH-QD-700's ten stores are unchanged (DL11). |
| D-07 steps through `callAll` in order, M55 first | Yes | See truth 4. |
| D-08 steps read `held` when they run | Yes | Thunks read `held` and `feedInputsOf(held)` at run time; DL17 and TF37. |
| D-10 counts measured then restated | Yes | DL16 and CR22. |
| D-11 records | Yes | ADR 194 plus amended ADR-QD-177, 185, 191, 192 (all four in the diff); BEH, INV, traceability, README CCR row; changeset. |
| D-12 mutation | Yes | `81-mutation.mjs compare` (run by me) exit clean: ExternalStore 88/88 to 84/84, DockModel 69/69 to 65/65, TimelineFeed 35/35 to 37/37, DiagnosticsFeed 58/58 to 60/60, SimulationSession 242/248 to 244/250. No new survivor, no new Ignored mutant; every score drop is killed mutants only. `git diff b340b9d5 HEAD -- packages/devtools/src` is empty, so the close measurement still describes HEAD. |
| D-13 archived v1.9 scripts | Yes | `81-archived-checks.mjs` records the scratch-copy invocation; the archive is untouched. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/devtools/src/model/ExternalStore.ts` | `callAll`, `notify` and release on it | VERIFIED | Substantive, wired at 2 sites here and 2 in other model files. |
| `packages/devtools/src/model/DockModel.ts` | rail derived store, seven steps, no `spread` | VERIFIED | Wired; `grep spread` finds no function. |
| `packages/devtools/src/model/TimelineFeed.ts` / `DiagnosticsFeed.ts` / `SimulationSession.ts` | closed windows | VERIFIED | Diffs read above. |
| `packages/devtools/test/model/DockModel.listeners.test.ts` | matrix DL1-DL20 | VERIFIED | 568 lines, all pass. |
| `packages/devtools/test/model/ExternalStore.callAll.test.ts`, `TimelineFeed.listeners.test.ts` | rule and feed tests | VERIFIED | Pass. |
| ADR-QD-194, BEH-QD-741..745, INV-QD-407/408, CCR-QD-473, changeset | records | VERIFIED | Present and traced. |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `ExternalStore.notify` | `callAll` | live `Set` passed directly | WIRED |
| derived release | `callAll` | releases array | WIRED |
| `DockModel.configure` | `callAll` | seven thunks reading `held` | WIRED |
| `TimelineFeed.configure` | `callAll` | resize and read thunks | WIRED |
| rail derived store | explorer, simulation | two rail listeners, in that order | WIRED |
| timeline | `dock.setTimeline` | listener subscribed after the rail | WIRED |

### Data-Flow Trace (Level 4)

Not applicable: headless model with no rendered dynamic data. The rail's value flows from `catalogueOf(timeline snapshot, held.catalogue)` to both consumers (asserted by reference equality in `applied()`).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| devtools model tests | `pnpm exec vitest run --project devtools packages/devtools/test/model` | 52 files, 1515 tests passed | PASS |
| one collect loop | `node 81-check.mjs single-source` (from repo root) | "one collect loop, in callAll" | PASS |
| forbidden forms in added lines | `node 81-check.mjs scan-forbidden` | none found | PASS |
| commit trailers | `node 81-check.mjs trailers` | 37 plan commits, one Claude trailer each | PASS |
| pinned flips | `node 81-pinned-check.mjs --all-applied` | 8 files at base text, 4 of 4 flips applied | PASS |
| mutation compare | `node 81-mutation.mjs compare` | no new open or Ignored mutant | PASS |

Not re-run by me, accepted from the orchestrator's measurements at HEAD d3bf55ed: `pnpm check:pr < /dev/null` exit 0 at daf7cd45 (only `.planning/` changed since) and `pnpm spec:package` exit 0. Stryker was not run, by instruction.

### Probe Execution

SKIPPED: the phase declares no `probe-*.sh`; its record scripts (`81-check.mjs`, `81-pinned-check.mjs`, `81-mutation.mjs`) are run above.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| COLL-01 | ten-store matrix, RED then GREEN | SATISFIED | Truth 1 |
| COLL-02 | record path total | SATISFIED | Truth 3 (DL15) |
| COLL-03 | one throw as itself, many collected, one package-private rule | SATISFIED | Truth 2 |
| COLL-04 | one rail move, counts restated, order pinned, M55/M56 | SATISFIED | Truth 4 |
| COLL-05 | window closed at every site, nested `configure` pinned | SATISFIED | Truth 5 |
| COLL-06 | ADR, BEH, INV, traceability, file header | SATISFIED | Truth 5 records |
| WX-01 | `pnpm check:pr` green | SATISFIED (orchestrator-measured) | exit 0 at daf7cd45 with only `.planning/` since. `REQUIREMENTS.md` still shows WX-01 "Pending" because it is a milestone-wide row ("All v1.10 phases"); that is bookkeeping, not a phase gap. |
| WX-02 | reserved ids only, `next-id.mjs` never run | SATISFIED | only reserved ids present; ADR 194 is used, not "Unused" |
| WX-03 | overview and gates 13/14 | SATISFIED | no export change; `callAll` is not in any barrel; `spec:package` exit 0 per orchestrator |
| WX-04 | no forbidden forms, budgets unchanged | SATISFIED | `scan-forbidden` clean; no change to `AGENTS.md` or `scripts/` since the base |
| WX-05 | coverage and mutation held | SATISFIED | mutation compare above; coverage gate is inside `check:pr` (orchestrator) |
| WX-06 | RED before change, new checks seen failing | SATISFIED | `81-RED-EVIDENCE.md` |
| WX-07 | no D-numbers or phase numbers in source, titles, BDD; nothing pushed or released | SATISFIED | `scan-forbidden` and `scan-ids` report nothing in `packages/`; the only `scan-ids` hits are in `.planning/` review notes, outside shipped files |

No orphaned requirement: every ID listed for Phase 81 in `REQUIREMENTS.md` (COLL-01 to COLL-06, WX-01 to WX-07) is claimed by the plans and the roadmap.

### Anti-Patterns Found

None blocking. The added source lines contain no `switch`, `fnUntraced`, `as`, `any`, `!`, `async`, ambient `console`/`process.env`, `Record<string, unknown>`, Stryker disable, or module-scope `let`; the grep hits were the English words "as itself" in comments. No TBD/FIXME/XXX introduced. Code review (`81-REVIEW.md`, final pass) has 0 critical and 0 warnings; `81-REVIEW-DISPOSITION.md` shows all 7 earlier findings fixed, 0 open.

### Other post-execution records

- `81-SECURITY.md`: `status: verified`, `threats_open: 0`.
- `81-VALIDATION.md`: `status: validated`, `nyquist_compliant: true`.

### Human Verification Required

None. The phase is a headless model; every transition and ordering invariant it asserts is covered by a named, passing behavioral test.

### Gaps Summary

No gaps. Residual notes, none of them blocking: `SimulationSession.ts` carries 6 surviving mutants, the same 6 as at the base (no regression, and outside this phase's changed lines); `REQUIREMENTS.md` WX-01 stays "Pending" until the milestone's other phases finish; the `check:pr` and `spec:package` results are the orchestrator's, not re-run here.

---

_Verified: 2026-11-25_
_Verifier: Claude (gsd-verifier)_
