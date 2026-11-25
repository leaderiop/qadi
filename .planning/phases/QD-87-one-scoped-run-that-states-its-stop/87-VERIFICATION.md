---
phase: QD-87-one-scoped-run-that-states-its-stop
verified: 2026-11-25T22:30:00Z
status: passed
score: 12/12 must-haves verified
covered_files:
  - .changeset/core-cause-text-doc.md
  - .changeset/devtools-one-stated-run.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-01-PLAN.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-01-SUMMARY.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-02-PLAN.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-02-SUMMARY.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-03-PLAN.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-03-SUMMARY.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-04-PLAN.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-04-SUMMARY.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-05-PLAN.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-05-SUMMARY.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-06-PLAN.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-06-SUMMARY.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-07-PLAN.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-07-SUMMARY.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-08-PLAN.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-08-SUMMARY.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-09-PLAN.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-09-SUMMARY.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-10-PLAN.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-10-SUMMARY.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-11-PLAN.md
  - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-11-SUMMARY.md
  - packages/core/src/ThrownMessage.ts
  - packages/devtools/src/model/ConfigurePrologue.ts
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/GatesFeed.ts
  - packages/devtools/src/model/SimulationSession.ts
  - packages/devtools/src/model/StatedRun.ts
  - packages/devtools/src/model/SupersedingRun.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - packages/devtools/src/react/Simulator.tsx
  - packages/devtools/src/react/StoppedBox.tsx
  - packages/devtools/src/react/theme.ts
  - spec/decisions/200-one-scoped-run-that-states-its-stop.md
covered_digest: "v4:sha256:258fc8cc8da1dc94c15c6e48491c2b8689c0ac2ed23692bd35f1b673dd463b1a"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 87: One scoped run that states its stop — Verification Report

**Phase Goal:** One package-private "scoped run that states its stop" sits above `SupersedingRun` and owns publish-then-fork through a callback, failure to `Stopped(causeMessage)`, `restart`, the closed guard and the token-guarded sink; `TimelineFeed`, `DiagnosticsFeed` and `SimulationSession` supply only their engine and states, and `GatesFeed` shares the configure prologue.
**Verified:** 2026-11-25 at HEAD `13962ed7` (phase base `56b9ae4d`)
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 / STOP-01: a session run that dies reports `Broke.message === causeMessage(cause)`, with a hostile-value case; written RED on the base | ✓ VERIFIED | `SimulationSession.ts:435` is `message: causeMessage(exit.cause)` (the `String(exit.cause)` is gone: `/usr/bin/grep` finds no `String(` in the file). Rows SX1 (`test/model/SimulationSession.stop.test.ts:45`), SX2 hostile value gives the placeholder (`:57`), SX3 self-interrupt (`:67`). `87-RED-EVIDENCE.md:17` records SX1 "red on the base", SB2 at `:23`. All green in my full devtools run (106 files, 2064 tests). |
| 2 | SC1: a characterisation pins each feed's status sequence, including the self-interrupt, green on the base | ✓ VERIFIED | `test/model/StatedRun.characterisation.test.ts` (472 lines, born); the pinned check holds every other devtools test byte for byte (`87-pinned-check.mjs --all-applied`: "122 files hold their base text, 5 of 5 born files held, 2 of 2 declared edits applied"). The feeds' self-interrupt rows TX1, TX2 (`TimelineFeed.stop.test.ts:62,75`) and DX1, DX2 (`DiagnosticsFeed.stop.test.ts:59,73`) are RED on the base per `87-RED-EVIDENCE.md:64,68`; TX3 to TX7, DX3 to DX7 pin the outside interruptions as no stop. |
| 3 | SC2 / STOP-02: one package-private module above `SupersedingRun` owns publish-then-fork through a callback, stop to `causeMessage`, `restart`, the closed guard and the token-guarded sink | ✓ VERIFIED | `src/model/StatedRun.ts` (106 lines). `start` (`:70-93`): closed guard `:71`, `runs.begin()`, `try { plan.starting() } finally { runs.fork(...) }` (ADR-QD-194 order), token-guarded `guard` (`:74-77`), stop `if (runs.isCurrent(token) && Exit.isFailure(exit)) stopped(causeMessage(exit.cause))` (`:88-90`). Composes `makeSupersedingRun` (`:66`). Factory is an unnamed `Effect.fn`, no `fnUntraced`. Not in any barrel (`87-check.mjs stated-run-shape` passes, which includes the barrel check). `restart` is each store's `reads.start(plan())` (`TimelineFeed.ts` `restart`) and `runs.start(plan(held))` (`DiagnosticsFeed.ts`), the closed guard being the module's, as D-07a decided. |
| 4 | SC2: `TimelineFeed` and `DiagnosticsFeed` supply only their engine and states | ✓ VERIFIED | `TimelineFeed.ts` builds `makeStatedRun((reason) => status.set(Stopped({reason})))` and a `plan()` of `{starting, engine}`; `DiagnosticsFeed.ts` likewise, with `sampled` the feed's own. Neither imports `makeSupersedingRun` or holds a token, a `try/finally` fork or a rethrow paragraph. `87-check.mjs feeds-supply-only-engine` passes for timeline, diagnostics and gates. |
| 5 | SC3 / STOP-03: the configure prologue (closed guard, normaliser, identity gate, hold, steps) stated once with a parameterised gate, used by timeline (`sameFields`), diagnostics (`sameFieldsOrAbsent`) and gates (`watchFailure` retry) | ✓ VERIFIED | `src/model/ConfigurePrologue.ts:41-49`: `closed` first, `complete`, `held`, `same`, `hold`, then `steps(wanted, before)`. Timeline passes `same: sameFields`; diagnostics `same: sameFieldsOrAbsent` (`DiagnosticsFeed.ts` configure rule); gates `same: (a, b) => sameFields(a, b) && watchFailure === undefined` (`GatesFeed.ts:~286`). `87-check.mjs prologue-shape` passes. Rows CP1 to CP8 in `test/model/ConfigurePrologue.test.ts`. |
| 6 | SC3: `GatesFeed` still forks before it publishes (INV-QD-408) and gains no status | ✓ VERIFIED | `GatesFeed.ts` configure steps call `cadence()` (a bare `runs.fork(runs.begin(), …)`, `:268-276`) before `publish(readRegistry(), asked)` (`:302`); it imports `makeConfigure` only (`:31`), not `makeStatedRun`. `GatesSnapshot` untouched. The unedited gates tests F28-31 and F33 pass (held byte for byte). |
| 7 | SC4 / STOP-04: the session shares publish-then-fork and the stop rule, keeps its own exit read, and a self-interrupted run still reads `Broke` | ✓ VERIFIED | `SimulationSession.ts:365-369` builds `makeStatedRun` whose `stopped` writes `Broke` only while `run._tag === "Running"` (so a landed `Ran` is never overwritten); `start` calls `runs.start({ starting, engine: (live) => land(...) })` (`:462`); `land` keeps `Effect.fn("qadi.devtools.simulationSession.run", { root: true })` and its own `Effect.exit` and `live.current()` read (`:~411-436`); SR1 and SR5-6 are held unedited and pass; SX3 pins the interrupt text. `87-check.mjs session-stop` passes. |
| 8 | SC4: the feeds' self-interrupt behaviour is decided and pinned (changed, with its own test and ADR line) | ✓ VERIFIED | `StatedRun.ts` header and stop rule: a current run's interrupt-only exit is stated; the spike (`87-RESEARCH.md` Q1, recorded in the Addendum of `87-CONTEXT.md` as D-08 holds) found no outside interruption still current at exit read. Pinned by TX1/TX2/DX1/DX2 (RED on base, green now) and TX3-TX7/DX3-DX7 (outside interruptions state no stop). ADR-QD-200 carries the decision. |
| 9 | `ForkHooks.onFailure` is gone with an audited protocol (D-09) | ✓ VERIFIED | `/usr/bin/grep -rn "ForkHooks" packages/*/src` is empty; the remaining `onFailure` matches in `src` are unrelated `Result.match`/codec hooks. `SupersedingRun.ts` is 126 lines (143 before). `SupersedingRun.test.ts` is the one audited held-set edit (R9 removed, R3/R5/R6/R7 edited); ADR-QD-200's audit table closes with `Tests removed: 1.` (`:96`); `87-check.mjs onfailure-gone` and `records --close` pass. |
| 10 | SC1 tail / D-13: the Simulator's broken-run box renders `Broke.message` in a labelled focusable `<pre>` using `reasonStyle` from `theme.ts` | ✓ VERIFIED | `Simulator.tsx:106-113`: `<pre role="group" aria-label="Why the simulation failed" tabIndex={0} style={reasonStyle}>{broke.message}</pre>`, heading `role="alert"` (review fix IN-03), `data-testid="qadi-simulator-broke"` kept. `theme.ts:170` exports `reasonStyle`; `StoppedBox.tsx:17,140` imports it, render byte-identical (SB1). SB2 to SB4 (`Simulator.broke.test.tsx:99,108,119`) and SA1 pass. `87-check.mjs simulator-pre` passes. |
| 11 | SC5 / STOP-05: ADR-QD-200 applies (not reopens) ADR-QD-150 point 2, extends ADR-QD-182 decision 10 to the session; ADR-QD-192/194, the `ThrownMessage.ts` doc amended; per-feed tests unedited; BEH-QD-771 to 775, INV-QD-419/420, CCR-QD-479 | ✓ VERIFIED | `spec/decisions/200-one-scoped-run-that-states-its-stop.md` (181 lines: Context, Decision, Alternatives, Consequences, What enforces it, Related) with `index.yaml:629`; dated amendments in `index.yaml` at `:452` (150), `:560` (182), `:600` (192), `:608` (194) and ADR-047/196 text; BEH-QD-771 to 773 at `spec/behaviors/28-devtools-screens.md:4303,4341,4380`, 774 and 775 at `29-devtools-simulator.md:1059,1090`; INV-QD-419/420 at `spec/invariants.md:4891,4903`; traceability rows at `spec/traceability.md:99-103,299-300`; CCR-QD-479 row `spec/README.md:416`; `packages/core/src/ThrownMessage.ts` doc amended (doc-only diff, no code). `87-check.mjs records --close` passes. TF21-23, TF28, F28-31, F33, SR5-6 are in the byte-for-byte held set. |
| 12 | Changesets, no release, WX-01 to WX-07 | ✓ VERIFIED | Two patch changesets: `.changeset/devtools-one-stated-run.md` (`"@qadi/devtools": patch`, names the Simulator text change, the feed self-interrupt change and the session's outside-read death, ends "No export changes.") and `.changeset/core-cause-text-doc.md` (`"@qadi/core": patch`, "No export changes."). `git tag --contains 56b9ae4d` is empty; `git diff 56b9ae4d HEAD -- packages/*/package.json packages/*/CHANGELOG.md package.json CHANGELOG.md` is empty. `87-check.mjs trailers`: 45 commits, each with the one trailer. `scan-ids` and `scan-forbidden` (no `as`, `!`, `any`, `switch`, `fnUntraced`, `Stryker disable`, module-scope `let`, budget moves): clean. Only reserved records used (ADR-QD-200, CCR-QD-479, BEH-QD-771..775, INV-QD-419..420). |

**Score:** 12/12 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/devtools/src/model/StatedRun.ts` | the stated run | ✓ VERIFIED | 106 lines, real logic, wired into three stores, out of every barrel |
| `packages/devtools/src/model/ConfigurePrologue.ts` | the one prologue | ✓ VERIFIED | 49 lines, wired into three feeds |
| `packages/devtools/src/model/SupersedingRun.ts` | loses only `ForkHooks.onFailure` | ✓ VERIFIED | 126 lines; protocol unchanged |
| `packages/devtools/src/model/{Timeline,Diagnostics,Gates}Feed.ts`, `SimulationSession.ts` | engine and states only | ✓ VERIFIED | see truths 4 to 7 |
| `packages/devtools/src/react/Simulator.tsx`, `StoppedBox.tsx`, `theme.ts` | `<pre>` and shared `reasonStyle` | ✓ VERIFIED | truth 10 |
| `packages/devtools/test/builtFeeds.ts` | one build-then-configure helper | ✓ VERIFIED | `87-check.mjs built-feeds-once` passes |
| New tests | ST/CP/SX/SB/TX/DX/SC rows | ✓ VERIFIED | `StatedRun.test.ts` 654 lines, `StatedRun.characterisation.test.ts` 472, `ConfigurePrologue.test.ts` 161, the three `*.stop.test.ts`, `StatedRun.stores.test.ts`, `Simulator.broke.test.tsx`, `Simulator.announce.test.tsx` |
| `spec/` records, two changesets | ADR-QD-200 and the rest | ✓ VERIFIED | truths 11, 12 |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `TimelineFeed`, `DiagnosticsFeed`, `SimulationSession` | `makeStatedRun` | `import { makeStatedRun }`, `runs.start(plan)` | WIRED |
| `TimelineFeed`, `DiagnosticsFeed`, `GatesFeed` | `makeConfigure` | `import { makeConfigure } from "./ConfigurePrologue.ts"` | WIRED |
| `makeStatedRun` | `makeSupersedingRun`, `causeMessage` | `StatedRun.ts:66`, `:90` | WIRED |
| `SimulationSession` stop | `Broke.message` | `stopped` hook `:365-369` and `land` `:435` | WIRED |
| `Simulator` | `reasonStyle` | `import … reasonStyle from "./theme.ts"` (`:43`), used `:111` | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| Simulator `<pre>` | `broke.message` | `causeMessage(exit.cause)` of the run's real cause | Yes (SB3 pins the text exactly, first line the error) | ✓ FLOWING |
| `Stopped.reason` in feeds | `reason` | `stopped(causeMessage(exit.cause))` | Yes (TX1, DX1) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full devtools suite | `bash -c 'pnpm exec vitest run --project devtools < /dev/null'` | 106 files, 2064 tests passed | ✓ PASS |
| Type check of tests | `pnpm exec tsc -p tsconfig.test.json --noEmit` | exit 0 | ✓ PASS |
| Phase check modes | `87-check.mjs` base, trailers, scan-ids, scan-forbidden, stated-run-shape, prologue-shape, feeds-supply-only-engine, session-stop, simulator-pre, onfailure-gone, built-feeds-once, `records --close` | all exit 0 with their pass lines | ✓ PASS |
| Pinned tests byte for byte | `87-pinned-check.mjs --all-applied` | 122 files hold base text, 5/5 born held, 2/2 declared edits applied | ✓ PASS |
| Earlier-phase checks | `87-earlier-checks.mjs` | Phase 85 and 86 checks and their self-tests all exit 0 | ✓ PASS |
| Mutation not fallen | `87-mutation.mjs compare` (committed records; Stryker not run) | SupersedingRun 50/53 to 41/43; Timeline 37/37 to 26/26; Diagnostics 59/59 to 51/51; Session 244/250 to 252/258 (survived 6 to 6); Gates 119/119 to 121/121; StatedRun 23/23; ConfigurePrologue 7/7; no new open or Ignored mutant, every fall lost only killed mutants, moved-code sum holds | ✓ PASS |
| No change since the fixer's `check:pr` | `git diff --stat f3d933fa HEAD` | 2 files, both `.planning/phases/QD-87-…/87-REVIEW*.md`; zero non-`.planning` files | ✓ PASS |
| `.vitest/` | `ls -d .vitest` | absent | ✓ PASS |

`pnpm check:pr` was not re-run: it exited 0 on `f3d933fa` (17 of 18 steps, mutation skipped by design on a non-release PR, per `87-REVIEW-DISPOSITION.md` and `87-11-SUMMARY.md`), and the tree outside `.planning/` is identical at HEAD.

### Probe Execution

SKIPPED: the phase declares no `probe-*.sh`.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| STOP-01 | 87-01, 87-02, 87-07 | ✓ SATISFIED | truths 1, 2 |
| STOP-02 | 87-05, 87-06 | ✓ SATISFIED | truths 3, 4 |
| STOP-03 | 87-05, 87-06 | ✓ SATISFIED | truths 5, 6 |
| STOP-04 | 87-01, 87-07 | ✓ SATISFIED | truths 7, 8 |
| STOP-05 | 87-08, 87-09, 87-10 | ✓ SATISFIED | truths 9, 11, 12 |
| WX-01 | 87-11 | ✓ SATISFIED (this phase's share) | `check:pr` exit 0 on `f3d933fa`; unchanged outside `.planning/` since |
| WX-02 | 87-09 | ✓ SATISFIED | only reserved ids; `records --close`, `scan-ids` pass |
| WX-03 | 87-09 | ✓ SATISFIED | `StatedRun` and `ConfigurePrologue` are package-private, in no barrel, so `spec/overview.md` needs no export row (it changed only to carry the amended text); gate 13/14 passed in `check:pr` |
| WX-04 | 87-03, 87-10 | ✓ SATISFIED | `scan-forbidden` clean; no budget file moved |
| WX-05 | 87-10 | ✓ SATISFIED | `87-mutation.mjs compare` green; coverage thresholds part of `check:pr` |
| WX-06 | 87-01, 87-02 | ✓ SATISFIED | `87-RED-EVIDENCE.md` (285 lines): RED rows SX1-3, SB2-4, TX1-2, DX1-2 seen red on the base, new checks seen failing |
| WX-07 | 87-11 | ✓ SATISFIED | no tag, no version or CHANGELOG move, one trailer on 45 commits, nothing staged |

No orphaned requirement: REQUIREMENTS.md maps STOP-01..05 and WX-01..07 to this phase and all are claimed by plans. The checkboxes and the traceability table in `REQUIREMENTS.md` still read Pending; ticking them is the orchestrator's close step, not a code gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/devtools/test/react/Simulator.broke.test.tsx` | SB1, SB4 | palette hex values hard-coded in a test | Info | Deferred in `87-REVIEW-DISPOSITION.md` (IN-04): the file is a born file held byte for byte; revisit when next edited |
| `SimulationSession.ts` | `:419` | landed-run guard held by argument, not a killing row | Info | Accepted (SEC-OBS-1): mutant recorded EQUIVALENT with reason; stale-write property pinned at ST14/ST15 |

No `TBD`, `FIXME`, `XXX` or `TODO` marker in the phase's source files; no `Stryker disable`; no stub or hollow wiring.

### Human Verification Required

None. The Simulator's `<pre>` has no markup or style change beyond the reuse of an existing treatment (UI hint: no), and its accessible shape and text are pinned by SB2 to SB4 and SA1.

### Gaps Summary

None. Every success criterion and requirement is delivered in the code at HEAD, the behavior-dependent truths (stop for a current run only, outside interruption never stated, publish-then-fork order, fork-before-publish for gates) each have a named test that passes, and the evidence reproduces in my own process.

Residual notes, not gaps: REQUIREMENTS.md still shows STOP-01..05 and WX rows as Pending (the close step ticks them); IN-04 (hex values in two born test rows) is deferred with a stated trigger; `pnpm check:pr` was not re-run, resting on the fixer's exit 0 at `f3d933fa` plus a planning-only diff since.

---

_Verified: 2026-11-25_
_Verifier: Claude (gsd-verifier)_
