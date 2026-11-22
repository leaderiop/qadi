# Phase 71 — RED and characterisation evidence

phase_base: d147287a94a3bb3cad176e4f99bad7a0b76d8939

This file records the evidence that the phase's tests were red where they had to be and green where they had to stay.
Each plan appends its own section: the characterisation on the base (here), the regression pair and the type pins red
before the table exists, both green after it with each type guarantee gutted, and the module-state budget failing on a
planted `let`. Logs and exit statuses are kept in the scratch directory `qd71` beside the system temp directory.

## The characterisation on the base

Command, from the repository root, with stdin closed, on the phase base with no `packages/*/src` file changed
(`git diff --quiet d147287a94a3bb3cad176e4f99bad7a0b76d8939 -- packages/react/src packages/core/src` holds):

```
$ pnpm exec vitest run --project react packages/react/test/DeveloperSignalReporters.test.tsx --reporter=json --outputFile=<S>/char-01.json < /dev/null
```

Phase base: `d147287a94a3bb3cad176e4f99bad7a0b76d8939`.

Result: `35 passed, 0 failed`. The report holds exactly the 35 titles of the plan's table. The whole react project
(`pnpm exec vitest run --project react`) then passed with 613 tests, `pnpm exec tsc -p tsconfig.test.json` exited 0 with
the file in its program, oxlint was clean on the file, and `node scripts/check-house-style.mjs` read
`house-style: 567 file(s) clean (3 declared switch(es), 67 type-test file(s))` (the plan-time 566 plus this file).

No row's expectation was corrected. Every expectation of the plan's table, including the exact lines for each signal,
matched what the base emits on the first run.

One title was changed, not an expectation: rows 12 and 18 of the plan's table carry the identical title "a returning
onDropped is told the entry once in production, and nothing is written to the console" (one under `dehydrateDecisions:
onDropped`, one under `hydrateDecisions: onDropped`), so the report holds 34 distinct titles for 35 tests and the
plan's own check (35 distinct titles) cannot pass. Row 12, the dehydrating one, is titled "a returning onDropped is told
the left-out entry once in production, and nothing is written to the console", which is what its entry is (an entry
the payload left out); row 18 keeps the plan's title.

## The regression pair on the base

Command, from the repository root, with stdin closed, on the phase base with no `packages/*/src` file changed
(`git diff --quiet d147287a94a3bb3cad176e4f99bad7a0b76d8939 -- packages/react/src` holds):

```
$ pnpm exec vitest run --project react packages/react/test/GateRegistry.store.test.ts --reporter=json --outputFile=<S>/red-01.json < /dev/null
```

Exit status: `1` (`26` tests, `24` passed, `2` failed). The failing titles, and only these:

- `a throwing onIdCollision on makeGateRegistry is named onIdCollision in development`
- `a throwing onIdCollision on makeGateRegistry is named onIdCollision in production`

The two rows through `makeQadiAtoms({ onGateIdCollision })` pass, development and production. The line a failing row
received, verbatim (both rows received the same):

```
the console received ["[qadi] the onGateIdCollision reporter you supplied threw (Error: boom). The outcome it was told about stands — nothing was skipped, seeded differently or left uncounted. Fix the reporter."]: expected '[qadi] the onGateIdCollision reporter…' to be '[qadi] the onIdCollision reporter you…' // Object.is equality
```

A direct `makeGateRegistry` caller is told about an option they never passed, while the atom set's own option is named
correctly. The rows compare the whole line as one string and carry the received lines in the assertion message, because
vitest's JSON report elides a whole-array diff to `[ Array(1) ]` and the received line would not be recorded.

## The type pins on the base

Command, from the repository root, with stdin closed, on the phase base with no `packages/*/src` file changed
(`git diff --quiet d147287a94a3bb3cad176e4f99bad7a0b76d8939 -- packages/react/src` holds):

```
$ pnpm test:tstyche DeveloperSignals < /dev/null > <S>/tst-red.log 2>&1
```

Exit status: `1`. Both passes (`tstyche.json` with `floatingEffect` off, then `tsconfig.test.json` with it on) report
`fail ./packages/react/test/DeveloperSignals.tst.ts`, `Test files: 1 failed, 1 total`, for the same five errors each:
`reporterFor`, `SIGNALS`, `SignalTable` and `SignalTag` are not exported from `../src/DeveloperSignals.ts`, and
`ReporterName` is declared there locally but not exported. The first ten lines of the log, verbatim (colour codes
removed):

```

> qadi-monorepo@0.4.0 test:tstyche /Users/mohammadalmechkor/Projects/Perso/qadi
> node scripts/run-tstyche.mjs DeveloperSignals

run-tstyche: pass 1 of 2, tstyche.json (tsconfig.tstyche.json, floatingEffect off), skipping "under tsconfig.test.json"
Error: Module '"../src/DeveloperSignals.ts"' has no exported member 'reporterFor'. ts(2305)

  14 | import { expect, test } from "tstyche";
  15 | import type { DehydrationDropReason } from "@qadi/core";
  16 | import { reporterFor, SIGNALS } from "../src/DeveloperSignals.ts";
```

`node scripts/check-house-style.mjs` passes on the file: `house-style: 567 file(s) clean (3 declared switch(es), 68
type-test file(s))`, the 67 type-test files of the base plus this one. The file holds no negative `toBeCallableWith` or
`toBeConstructableWith` pin, so the budget table in `AGENTS.md` is unchanged.

The table does not exist, `ReporterName` is a hand-kept list that lacks `onIdCollision`, and each resolver pairs its
default and its name by hand. Because the exports are absent on the base, no pin is evaluated there: the failure is the
missing API, and each pin is shown failing for the reason it names by being gutted once the table exists.

## The regression pair and the type pins after the change

The fix is commit `9b8645ee721b37b989caf4a678d998c6cc559bf5` (`fix(71-03): name a throwing collision reporter by the
option it was passed through`). On it, from the repository root with stdin closed:

```
$ pnpm exec vitest run --project react packages/react/test/GateRegistry.store.test.ts < /dev/null
$ pnpm test:tstyche DeveloperSignals < /dev/null
```

Both exit `0`. The first reports `Tests 26 passed (26)`, the two `makeGateRegistry` rows that were red on the base
included; the second passes both passes (`tstyche.json`, then `tsconfig.test.json` with `floatingEffect` on), `Tests: 6
passed, 6 total`, `Assertions: 11 passed, 11 total`. The whole react project reads `617 passed, 0 failed`, the 35
characterisation rows among them. Each `makeGateRegistry` row now asserts the whole line, with the option the caller
passed:

```
[qadi] the onIdCollision reporter you supplied threw (Error: boom). The outcome it was told about stands — nothing was skipped, seeded differently or left uncounted. Fix the reporter.
```

and the two `makeQadiAtoms` rows still assert `the onGateIdCollision reporter you supplied threw`.

## Each type guarantee gutted once

Each gut is a working-tree edit of `packages/react/src/DeveloperSignals.ts` only, run, then reverted with `git checkout --
packages/react/src/DeveloperSignals.ts` and confirmed by `git diff --quiet -- packages` before the next. None is
committed. Command for the five: `pnpm test:tstyche DeveloperSignals < /dev/null > <S>/gut-<n>.log 2>&1`; each exits
`1` in both passes, with `Tests: 1 failed, 5 passed, 6 total`, and marks exactly the pin named for it with `×`. The
statuses and logs are `<S>/gut-<n>.status` and `<S>/gut-<n>.log`.

### 1. The table made optional

`SignalTable`'s mapped key was made optional (`[T in SignalTag]?:`), so a table with a row left out is accepted. Status
`1`. Failing pin: `× a table missing a row is refused`, with `Error: Unused '@ts-expect-error' directive. ts(2578)` on
the `takeTable(withoutAtomsReplaced)` statement.

### 2. `OftenOf` made `Often` for every tag

`OftenOf<T>` was replaced by `T extends SignalTag ? Often : Often`, so any row may speak once per process. Status `1`.
Failing pin: `× only InstrumentedInProduction may speak once per process`, with `Unused '@ts-expect-error' directive`
on `takeTable(latchedTwice)`.

### 3. `ReporterName` made `string`

`ReporterName` was replaced by `string`. Status `1`. Failing pin: `× ReporterName is every option an entry point reports
under, written out`, with `Error: Type 'string' is not the same as type '"onHydrationMismatch" | "onGateIdCollision" |
"onIdCollision" | "onDropped" | "onDeveloperSignal"'.`

### 4. A foreign entry point on the `GateIdCollision` row

An entry `dehydrateDecisions: { option: "onIdCollision", resolved: "OncePerCall" }` was added to the `GateIdCollision`
row, so the row names an entry point it should not. Status `1`. Failing pin: `× a row refuses an entry point it does not
name`, with `Unused '@ts-expect-error' directive` on `reporterFor(SIGNALS.GateIdCollision, "dehydrateDecisions",
onIdCollision)`.

### 5. The hydrate row told the dehydrate reason

The `HydrationDropped` row's `says` parameter was widened to `HydrationDrop<unknown, HydrationDropReason>`, its body
building the signal with `reason: "MalformedEntry"` so the file still compiled. Status `1`. Failing pin: `× the hydrate
row refuses the dehydrate reporter`, with `Unused '@ts-expect-error' directive` on
`reporterFor(SIGNALS.HydrationDropped, "hydrateDecisions", leftOut)`.

### The throwaway signal

A member `Throwaway: {};` was added to the developer-signal union and `pnpm typecheck < /dev/null >
<S>/gut-throwaway.log 2>&1` run. Status `2`. The first line of the error, shortened where it lists the table's rows:

```
packages/react/src/DeveloperSignals.ts(454,3): error TS2741: Property 'Throwaway' is missing in type '{ SeedSuperseded: { speaks: "Development"; ... }; ... }' but required in type 'SignalTable'.
```

A signal without a row is refused at the table, naming it. Reverted: `git diff --quiet -- packages` holds, and
`Throwaway` is in no commit.

## The module-state budget shown failing

The budget passes on the committed tree (`node scripts/check-house-style.mjs < /dev/null` ends
`house-style: 567 file(s) clean (3 declared switch(es), 68 type-test file(s))`). Each change below was made on that tree
alone, the gate run as `node scripts/check-house-style.mjs < /dev/null > <S>/plant-<name>.out 2> <S>/plant-<name>.log`, and
the file restored with `git checkout -- <file>` before the next; `git diff --quiet -- packages AGENTS.md scripts` held after
each, and none is in any commit. Every plant exits with status `1`; the first stderr line of each follows.

### 1. A `let` in another library file

A module-scope `let plantedState = 0;` was appended to `packages/react/src/QadiAtoms.ts`.

```
packages/react/src/QadiAtoms.ts:354  [module-state] A module-scope let or var in library source.
```

### 2. A second `let` in `DeveloperSignals.ts`

A second module-scope `let plantedSecond = 0;` was appended to `packages/react/src/DeveloperSignals.ts`, beside the latch.

```
packages/react/src/DeveloperSignals.ts  [module-state] declares 1 module-scope let/var declaration(s), found 2 at line(s) 339, 504.
```

### 3. The latch's `let` turned `const`

Text only: `let warnedInstrumentedInProduction = false;` became `const warnedInstrumentedInProduction = false;`.

```
packages/react/src/DeveloperSignals.ts  [module-state] declares 1 module-scope let/var declaration(s), found 0.
```

### 4. The latch renamed

Its declaration alone became `let warnedElsewhere = false;`, the uses left as they were.

```
packages/react/src/DeveloperSignals.ts  [module-state-names] MODULE_STATE_BUDGET's reason names `warnedInstrumentedInProduction`, but no such declaration appears in this file any more: renamed without updating the budget's names.
```

### 5. The AGENTS.md row's count changed

The section 6 row's count was changed from `1` to `2`.

```
AGENTS.md  [module-state-table] section 6 lists packages/react/src/DeveloperSignals.ts (2), which MODULE_STATE_BUDGET does not match.
```
