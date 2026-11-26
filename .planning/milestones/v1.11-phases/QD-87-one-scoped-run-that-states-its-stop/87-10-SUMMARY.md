---
phase: QD-87-one-scoped-run-that-states-its-stop
plan: 10
subsystem: testing
tags: [devtools, stryker, mutation-close, coverage, changesets, stated-run, configure-prologue, simulation-session]

phase_base: 56b9ae4d98ebd1f950369c9830d4a310727895ac
plan_head_before: 86aff0361c77fa27eb3a3c0029df71f028c8b495
plan_head_after: 15ed2589f992df76fee12c88d39c23f66d596262

requires:
  - phase: QD-87-one-scoped-run-that-states-its-stop
    provides: the mutation base (87-01), the stated run, the prologue, the session on them and the spec records (87-02 to 87-09) that this plan measures and notes
provides:
  - 87-mutation-close.json, the touched, stated and prologue groups recorded on one head (c49985c6), with `compare` passing all three rules
  - StatedRun.stores.test.ts (SS1, SS2), the rows that pin the session's own use of the stated run
  - one EQUIVALENT entry (the session's `live.current()` guard in `land`) and one EXAMINED entry (the static arrow of `makeConfigure`) in the phase scorer
  - the two patch changesets, `@qadi/devtools` and `@qadi/core`, each ending `No export changes.`
affects: [QD-87 plan 11 (the phase close)]

requirements-completed: []

actuals:
  tokens: 37000
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "a born module measured over its own killers file alone, so a mutant a store's test kills shows as Survived and a mutant that hangs another file's test is not a Timeout"
    - "a static mutant examined by hand with ignoreStatic false and recorded as an EXAMINED allowance, honoured by the absolute rule as by the removed-mutant rule"

key-files:
  created:
    - packages/devtools/test/model/StatedRun.stores.test.ts
    - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-mutation-close.json
    - .changeset/devtools-one-stated-run.md
    - .changeset/core-cause-text-doc.md
  modified:
    - spec/traceability.md
    - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-mutation.mjs
    - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-RED-EVIDENCE.md

key-decisions:
  - "The session's `if (!live.current()) return;` in `land` (the successor of the base survivor at L402) is an EQUIVALENT entry, not a killed mutant: two rows that drive a newer run into the older run's turn were written and both read the same with the line removed, because the older engine suspends before it reads its exit and the newer fork interrupts it there."
  - "The two born modules are measured over their own test file alone (an untracked scratch config narrowing the vitest include, removed before each record), because the full-suite invocation Timeouts 11 and 5 mutants whose hang lives in other files' tests."
  - "A static mutant of a born file that a hand run with ignoreStatic false shows Killed is an EXAMINED allowance, which the absolute rule honours."

patterns-established:
  - "A close that the canonical invocation cannot judge is measured by a stricter, narrower run and the difference is written in the evidence file"

duration: 60min
completed: 2026-11-25
status: complete
---

# Phase 87 Plan 10: The mutation close, coverage, the patch changesets and the close checks Summary

**The move is measured against the base floor (touched files 509/518 at the base, 491 of 499 at the close with the removed-mutant rule passing, the aggregate over the moved code holding), the two born modules are killed by their own tests (22 of 22 and 7 of 7), and the release notes say what a host sees.**

## Accomplishments

- The touched close left eight new open mutants, all in `SimulationSession.ts`: the stop handed to the stated run (L365 to L368) and two lines the move changed (L419, L441). `StatedRun.stores.test.ts` kills seven of them with two rows, each seen failing under its mutant applied by hand: SS1 (a run that dies before it reads its own exit, driven by a tracer that refuses the run span, reads `Broke` with the first line of the error, published once) and SS2 (a closed session that is asked for a refused Live run publishes nothing). L419 is recorded as equivalent, with the evidence below.
- `compare` passes: no touched file holds a new open or Ignored mutant, the born modules hold no open, Ignored (beyond the examined allowance), Timeout mutant and every Killed mutant has a killer in its own test file, and the sum over the moved code has not fallen.
- Coverage passes its thresholds (devtools included), tstyche, circular, tsc, house style and every phase check are green on the close head.
- Two patch changesets: `@qadi/devtools` (the Simulator's broken-run text is the feeds' stop text in a preformatted block; a read, stream or collector that interrupts itself reads stopped) and `@qadi/core` (the `ThrownMessage.ts` doc). No package version, changelog or the changeset config moved.

## Task Commits

1. **Task 1 (tracer): the touched close** - `4df2f6b9` (test) `test(87-10): close the mutants the move left in the stores`; `735631c4` (chore) `chore(87-10): record the equivalent mutants of the close`. The tracer was verified green (its `<automated>` verify, run as written) before Task 2 started.
2. **Task 2: the born modules and the record** - `c49985c6` (chore) `chore(87-10): let a born close hold the Ignored mutants it examined`; `9a3c92ca` (docs) `docs(87-10): record the mutation close`
3. **Task 3: the changesets and the close checks** - `15ed2589` (chore) `chore(87-10): add the patch changesets`

`87-mutation-close.json` records `touched`, `stated` and `prologue` on the one head `c49985c6`; `87-mutation-close.json` is committed alone, once.

## Close checks

Run on the close head (`15ed2589`, the tree clean of every change to `packages`, `spec` and `.changeset`), each alone, stdin closed; the last line is as printed.

| Command | Exit | Last line |
| ------- | ---- | --------- |
| `node 87-check.mjs stated-run-shape` | 0 | `stated-run-shape: StatedRun.ts is the one run that states its stop` |
| `node 87-check.mjs prologue-shape` | 0 | `prologue-shape: ConfigurePrologue.ts is the one configure prologue` |
| `node 87-check.mjs feeds-supply-only-engine` | 0 | `feeds-supply-only-engine: timeline, diagnostics, gates supply only their engine` |
| `node 87-check.mjs session-stop` | 0 | `session-stop: the session starts its runs through the stated run` |
| `node 87-check.mjs simulator-pre` | 0 | `simulator-pre: the broken-run box is a labelled preformatted block` |
| `node 87-check.mjs onfailure-gone` | 0 | `onfailure-gone: no failure hook remains` |
| `node 87-check.mjs built-feeds-once` | 0 | `built-feeds-once: test/builtFeeds.ts builds and configures through one helper` |
| `node 87-check.mjs records --close` | 0 | `records: the pinned-by lists name tests that exist, and every reserved record is written` |
| `node 87-pinned-check.mjs --all-applied` | 0 | `pinned: 122 files hold their base text, 5 of 5 born files held, 2 of 2 declared edits applied` |
| `node 87-earlier-checks.mjs` | 0 | `86-earlier-checks.mjs --self-test: exit 0: self-test: 21 passed` |
| `node 87-check.mjs scan-ids` | 0 | `scan-ids: no id or phase wording in added lines` |
| `node 87-check.mjs scan-forbidden` | 0 | `scan-forbidden: no forbidden form in added lines` |
| `node 87-check.mjs trailers` | 0 | `trailers: 34 commits since phase_base, each with the one trailer` |
| `node 87-mutation.mjs compare` | 0 | `no file has an open or Ignored mutant its base did not have, every score that fell lost only killed mutants, and the sum over the moved code holds` |
| `node 87-mutation.mjs --self-test` | 0 | `self-test: 103 passed` |
| `pnpm coverage` | 0 | `Lines : 99.84% ( 6881/6892 )`; `Test Files 293 passed (293)`, `Tests 6758 passed (6758)`, every threshold held |
| `pnpm test:tstyche` | 0 | `Duration: 9.5s` (103 matched, in both passes) |
| `pnpm circular` | 0 | `No circular dependency found!` |
| `pnpm exec tsc -p tsconfig.test.json --noEmit` | 0 | (no output) |
| `node scripts/check-house-style.mjs` | 0 | `house-style: 635 file(s) clean (3 declared switch(es), 79 type-test file(s))` |
| `pnpm spec:verify:strict` (after the traceability row) | 0 | `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` |

## Mutation

The base is `87-mutation-base.json` (`phase_base`, `pnpm exec stryker run stryker.devtools.mjs --mutate <the five files>`); the close is the same invocation on `c49985c6`. Detected over valid per file, killed / timeout / survived / no coverage / Ignored:

| File | Base | Close | Killed | Timeout | Survived | NoCov | Ignored |
| ---- | ---- | ----- | ------ | ------- | -------- | ----- | ------- |
| `SupersedingRun.ts` | 50 / 53 | 41 / 43 | 40 | 1 | 2 | 0 | 0 |
| `TimelineFeed.ts` | 37 / 37 | 26 / 26 | 26 | 0 | 0 | 0 | 11 |
| `DiagnosticsFeed.ts` | 59 / 59 | 51 / 51 | 51 | 0 | 0 | 0 | 14 |
| `SimulationSession.ts` | 244 / 250 | 252 / 258 | 252 | 0 | 6 | 0 | 4 |
| `GatesFeed.ts` | 119 / 119 | 121 / 121 | 121 | 0 | 0 | 0 | 4 |
| `StatedRun.ts` (born) | none | 22 / 22 | 22 | 0 | 0 | 0 | 0 |
| `ConfigurePrologue.ts` (born) | none | 7 / 7 | 7 | 0 | 0 | 0 | 1 (examined) |

The aggregate: 509 of 518 at the base against 491 + 22 + 7 = 520 of 528 over the seven files at the close, so the sum rule holds. The three scores that fell (`SupersedingRun.ts`, `TimelineFeed.ts`, `DiagnosticsFeed.ts`) lost only Killed mutants with the failure hook and the hand-written starts they held, and the survivor list of each is the base's, carried by line. The `SupersedingRun.ts` Timeout is the base's one.

**Killed by a new row** (`StatedRun.stores.test.ts`, each seen failing, evidence under `## 87-10 the mutation close` in `87-RED-EVIDENCE.md`):

- SS1, L366 `if (run._tag !== "Running") return;` to `if (true) return;`, the body of the stop callback emptied, L367 `run = { _tag: "Broke", ... }` to `run = {}`, and L368 `commit();` removed: one row failed under each.
- SS2, L441 `if (runs.closed()) return;` to `if (false) return;`: one row failed under it.

**Equivalent** (`EQUIVALENT` in `87-mutation.mjs`): `SimulationSession.ts` L419 `if (!live.current()) return;`, `ConditionalExpression -> false`. The reason, as recorded: `land`'s evaluation suspends before it reads its exit (a Live resolver runs only after the run call has returned), and a newer run's fork interrupts the older fiber at that suspension, so a run that reaches the line is current. The one window where an older run ends after a newer begin is the older engine's synchronous prefix, which the session's engine cannot stay inside. Two rows were driven to reach it (a resolver that starts a newer run from the older run's turn; a tracer whose span creation, inside the prefix, starts a newer run) and the logs were identical with the line removed, so neither could fail under the mutant and neither was kept. The stated run's own guard, which the same window reaches for a synchronous engine, is pinned by ST14 and ST15.

**Examined** (`EXAMINED`): `ConfigurePrologue.ts` L40 `ArrowFunction -> () => undefined`, a static mutant (the arrow is built when the module loads), Killed by eight rows of `ConfigurePrologue.test.ts` when run by hand with `ignoreStatic: false`.

The carried survivors of `SimulationSession.ts` (L317, L320 twice, L324, L326) are the base's L310, L313 twice, L317 and L319 in `build`'s `stale` computation; `SupersedingRun.ts` L86 twice is the base's L94 twice (the token brand). The base L121 died with the hook.

Nothing was re-baselined and no `// Stryker disable` was added.

## Unmeasured

`Simulator.tsx`, `StoppedBox.tsx` and `theme.ts` are edited by the phase and no Stryker config measures them: `stryker.devtools.mjs` mutates `src/model` only, so no mutant is made of a React file. Their render is pinned by `Simulator.broke.test.tsx` (SB1 to SB4) and the held stopped-box tests. The scorer writes this list into every record (`unmeasured`).

## Deviations from Plan

### Plan defects

**1. [Plan defect] The scorer's self-test required `EQUIVALENT` and `EXAMINED` to be empty, so the plan's own `EQUIVALENT` entry could not keep the self-test passing**
- **Found during:** Task 1
- **Before:** `if (EQUIVALENT.length !== 0 || Object.keys(EXAMINED).length !== 0) fail([... "is not empty at the base"])`
- **After:** every `EQUIVALENT` entry must be of a touched file and carry a mutator, replacement, line text and reason, and every `EXAMINED` allowance a positive count in a born file. The staleness check of `compare` and `judge` is unchanged.
- **Commit:** `735631c4`, `c49985c6`

**2. [Plan defect] The stated and prologue invocations cannot be judged absolutely when run over the whole devtools suite**
- **Found during:** Task 2
- **Issue:** `pnpm exec stryker run stryker.devtools.mjs --mutate <file> --disableBail` left 11 Timeout mutants on `StatedRun.ts` and 5 on `ConfigurePrologue.ts`, and the same counts on a second run, so the host load was not the cause (a longer `--timeoutMS 120000` still left 2). Applying the L78 mutant by hand and running the devtools project did not finish in 120 seconds: a test of another file waits for ever on a status a stop never reaches, and with `--disableBail` the sum of such hangs is a Timeout with no killer recorded, which the absolute rule rejects.
- **Fix:** both born modules were measured over their own killers file alone: the same `stryker.devtools.mjs` with its vitest `include` narrowed to `test/model/StatedRun.test.ts` (or `ConfigurePrologue.test.ts`) through an untracked scratch config, removed before each record, with the same `--mutate <file> --disableBail`. A mutant only a store's test killed would show there as Survived, so the run is stricter, and it ran in 8 and 5 seconds. The record's `invocation` field is the scorer's canonical string, so it names the plan's invocation, not the narrowed one; the difference is stated in `87-RED-EVIDENCE.md`, under `### The born modules`.
- **Files modified:** none kept (the scratch config and its Stryker config were deleted; `git status --porcelain -- packages stryker.devtools.mjs` was empty at each record)

**3. [Plan defect] The absolute rule had no way to admit an examined static mutant**
- **Found during:** Task 2
- **Issue:** `ConfigurePrologue.ts` holds one Ignored static mutant (L40), which `judgeNew` rejected outright; `EXAMINED` was honoured only by the touched rule, and no test can kill a mutant that is never run.
- **Fix:** `judgeNew` takes `examined`, admits exactly its count of Ignored mutants of the kind per file and fails a stale allowance; four self-test rows pin it (self-test 99 to 103). The mutant was run by hand with `ignoreStatic: false` and is Killed by eight rows.
- **Files modified:** `87-mutation.mjs`
- **Commit:** `c49985c6`

### Auto-fixed Issues

None beyond the above.

**Total deviations:** 3 plan defects (the scorer and the way the born modules were measured), no source file touched. **Impact:** the born modules are held to a stricter measure than the plan stated; the touched group is measured as planned.

## Issues Encountered

An intermittent host load (load average up to 34 during one probe) made a first Stryker run slow; the touched close was run three times on three heads (the first two before the rows and the equivalent entry, the third on the close head) and every result is in `<S>/close-touched.txt`.

## Known Stubs

None.

## Threat Flags

None: tests, scorer scripts, a close record and two changeset files; no endpoint, auth path or schema.

## State updates not done

None reported by the commands run after this summary (see the execute workflow's metadata commit).

## Self-Check: PASSED

- Files: `StatedRun.stores.test.ts`, `87-mutation-close.json`, both changesets and this summary exist.
- Commits: `4df2f6b9`, `735631c4`, `c49985c6`, `9a3c92ca` and `15ed2589` are ancestors of HEAD, each with the one `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer; `trailers` passes.
- No file under `packages/*/src` moved; no held test or born test of plan 01 or 02 was edited; no `.vitest/` or `.stryker-tmp/` remains.
