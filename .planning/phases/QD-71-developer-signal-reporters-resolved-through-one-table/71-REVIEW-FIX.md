---
phase: QD-71-developer-signal-reporters-resolved-through-one-table
fixed_at: 2026-11-22T19:05:00Z
review_path: .planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-REVIEW.md
iteration: 1
findings_in_scope: 13
fixed: 13
skipped: 0
status: all_fixed
---

# Phase QD-71: Code Review Fix Report

**Fixed at:** 2026-11-22T19:05:00Z
**Source review:** `.planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 13 (7 warnings, 6 info, `fix_scope: all`; IN-05 is the necessity finding)
- Fixed: 13
- Skipped: 0

**Where verification ran:** the main checkout. `workflow.use_worktrees` is `false` in
`.planning/config.json`, so no worktree, temp branch or recovery sentinel was created and the
commits are on `arch-wave-13` directly.

**Gates after the last commit (`9fd8b58b`), all green:** `vitest run --project react` (625
passed), `pnpm typecheck`, `pnpm test:tstyche` (68 files, 366 passed, 2 skipped),
`node scripts/check-house-style.mjs` (568 files clean), `node scripts/check-doc-examples.mjs`
(118 blocks), `node scripts/check-api-surface.mjs` (941 exports, barrel unchanged),
`node scripts/spec-revise.mjs --check`, `bash spec/scripts/verify-traceability.sh --strict`
(PASS 21, FAIL 0, SKIP 0, run after the spec edits and before the last two style commits,
which touch no spec file), and `pnpm exec oxlint` on every touched file. The one oxlint
warning is `QadiAtoms.ts:325` (`no-unused-vars` on `_`), which is not in any line this loop
touched.

Mutation was not run (the orchestrator re-closes it). Every change in `DeveloperSignals.ts`,
`GateRegistry.ts`, `GateWriter.ts`, `QadiAtoms.ts` and `HydrationEngine.ts` was checked for a
mutant no test can kill; see WR-01 and IN-02. `71-mutation-base.json`,
`71-mutation-close.json` and `71-mutation.mjs` are untouched.

## Fixed Issues

### WR-01: The environment gate for `InstrumentedInProduction` was written twice

**Status:** fixed: requires human verification (a condition, not syntax)
**Files modified:** `packages/react/src/DeveloperSignals.ts`, `packages/react/src/QadiProvider.tsx`,
`packages/react/test/DeveloperSignals.tst.ts`, `packages/react/test/DeveloperSignals.test.ts`
**Commits:** `6c22f886` (source and type pins), `fa0807d5` (run-time tests)
**Applied fix:** one function reads a row's environment condition, `holdsHere(row)`, exported
from `DeveloperSignals.ts` (the module stays out of the barrel). `reporterFor` asks it whether a
default speaks, and `QadiProvider` asks it of `SIGNALS.InstrumentedInProduction`, so the
provider no longer imports `isDevelopment` or writes `!isDevelopment()`. `isDevelopment` is
un-exported. Behaviour is as the characterisation pins it: raised only in production, a supplied
`onDeveloperSignal` told once per mount and only then, the console default latched once per
process.

**Design choice (no second condition in the table).** The table did not need a second field to
separate "where the signal is raised" from "where the default speaks": for this row they are one
condition, because the situation (instrumentation reaching a production bundle) exists only
where the default speaks. Two fields would have been the rule written twice again, so the
`speaks` doc now says that `QadiProvider` also reads it for this row.

**New run-time pins:** "InstrumentedInProduction's default is silent in development, whoever
asks" and "a row's condition holds in the environment it names and in no other", both in
`DeveloperSignals.test.ts`. The provider-level "does not call InstrumentedInProduction in
development" already existed in `QadiProvider.signals.test.tsx`.

**The row changed to `Everywhere` on a scratch edit, then reverted** (`git status` clean after):
- `pnpm exec vitest run --project react`: 63 failed, 562 passed, 9 test files failed. Cause:
  `TypeError: CONDITIONS[row.speaks] is not a function`. Failing tests include
  `DeveloperSignalReporters.test.tsx` > "an instrumented provider in development with no
  reporter writes nothing to the console", `QadiProvider.production.test.tsx` > "warns once
  when instrument is true outside development (ticket 153)" and `QadiProvider.signals.test.tsx`
  > "is told InstrumentedInProduction once per mount, and the console stays quiet".
- `pnpm typecheck`: `DeveloperSignals.ts(555,17): error TS2345` and
  `QadiProvider.tsx(274,17): error TS2345`, because `holdsHere` and `reporterFor` take only a
  row that has a condition.

### WR-02: INV-QD-064's Source and its traceability row located the registry closure in `GateRegistry.ts`

**Files modified:** `spec/invariants.md`, `spec/traceability.md`
**Commit:** `f1626bdc`
**Applied fix:** INV-QD-064's Source names `buildGateRegistry` in `GateWriter.ts` and says
`makeGateRegistry` and the atom set both build through it. Traceability row 240 matches. Revisions
bumped through `scripts/spec-revise.mjs --date 2026-11-22`.

### WR-03: INV-QD-251 and its traceability row said "every resolver" and omitted `onIdCollision`

**Files modified:** `spec/invariants.md`, `spec/traceability.md`
**Commit:** `f1626bdc`
**Applied fix:** the Source and the traceability row say the one resolver `reporterFor` wraps a
supplied reporter once (`contain`); the list of reporters includes `onIdCollision`; the Enforcement
says "every entry point of every row". Because IN-06 removed the older re-check probe from
`DeveloperSignals.test.ts`, the Enforcement now points the probe at
`DeveloperSignalReporters.test.tsx`, with its two exact titles.

### WR-04: `MODULE_STATE_BUDGET` read module scope as column 0

**Status:** fixed: requires human verification (new scan logic, checked by the plants below)
**Files modified:** `scripts/check-house-style.mjs`, `scripts/lib/module-state-scan.mjs` (new),
`AGENTS.md`, `spec/decisions/184-...md`, `spec/invariants.md` (INV-QD-388),
`spec/traceability.md`
**Commits:** `45f60628` (scan and AGENTS.md), `9fd8b58b` (wrapping), `f1626bdc` (spec)
**Applied fix:** the line scan is gone. Every `packages/*/src` file is parsed and each `let` or
`var` binding declared outside a function or class body is counted: `export let`, an indented
declaration, one inside a top-level block, a loop's own `let`, and each name of `let a, b` or of a
destructuring pattern. A `const`, a `static` field and anything a function or method declares are
not counted, and neither is a `declare`d binding. Checked in both directions as before;
`[module-state-names]` now requires the budgeted name to be one of the counted bindings (a latch
turned into a `const` fails it), `[module-state-table]` is unchanged, and a file in no
`packages/*/tsconfig.src.json` project fails `[module-state-scan]`. The script header, AGENTS.md
section 6, ADR-QD-184 and INV-QD-388 say exactly what is counted and that `const`-held mutable
objects are outside it.

**A deviation from the review's snippet, and why.** The review used `ts.createSourceFile`. The
repository's `typescript` is 7.0.2 (the native port): the in-process `createSourceFile` does not
exist, and the only JS parse is `typescript/unstable/sync`'s `API`, which starts a server and has
no timeout of its own. The scan therefore follows `scripts/lib/probe-guard-parse.mjs`'s
precedent: a child process under a 120 s timeout, started by `execFileSync`. It opens the nine
`packages/*/tsconfig.src.json` projects and parses the listed files. The gate now takes about
3.6 s instead of 0.6 s. If TypeScript later brings a standalone parser back, only
`module-state-scan.mjs` changes.

**Plants, each run against a scratch edit of `packages/core/src/Errors.ts` or
`packages/react/src/DeveloperSignals.ts`, reverted with `git checkout --` and never committed
(`git status` clean after each):**

| Plant | Exit | First stderr line |
| ----- | ---- | ----------------- |
| indented module-scope `  let planted = 0;` | 1 | `packages/core/src/Errors.ts  [module-state] A module-scope let or var in library source: planted (line 627).` |
| `let planted = 0;` inside a top-level `{ }` block | 1 | same, `planted (line 628)` |
| `let planted = 0, other = 1;` (two bindings) | 1 | `... in library source: planted (line 627), other (line 627).` |
| `export var planted = 0;` | 1 | `... in library source: planted (line 627).` |
| column-0 `let planted = 0;` (the old plant) | 1 | `... in library source: planted (line 627).` |
| `let [first, second] = [1, 2];` | 1 | `... in library source: first (line 627), second (line 627).` |
| `const planted = new Map<string, number>();` (must not count) | 0 | `house-style: 568 file(s) clean ...` |
| a `let` inside an exported arrow function (must not count) | 0 | `house-style: 568 file(s) clean ...` |
| budgeted file gains `  let planted = 0, other = 1;` (1 becomes 3) | 1 | `packages/react/src/DeveloperSignals.ts  [module-state] declares 1 module-scope let/var binding(s), found 3: warnedInstrumentedInProduction (line 379), planted (line 557), other (line 557).` |
| budgeted latch changed to `const` (count drops to 0) | 1 | `packages/react/src/DeveloperSignals.ts  [module-state] declares 1 module-scope let/var binding(s), found 0.`, then `[module-state-names]` |
| budgeted latch renamed | 1 | `packages/react/src/DeveloperSignals.ts  [module-state-names] MODULE_STATE_BUDGET's reason names \`warnedInstrumentedInProduction\`, but the scan counts no such let or var binding ...` |

### WR-05: INV-QD-388 contradicted itself and claimed more than the gate or the code supports

**Files modified:** `spec/invariants.md`, `spec/traceability.md`, `spec/behaviors/09-react.md`
**Commit:** `f1626bdc`
**Applied fix:** INV-QD-388 now says the latch is the one rebindable (`let` or `var`) module-scope
binding in library source, that it is process-wide on purpose (two providers in one process do share
it, and it holds whether the line has been printed and no tenant or render data), and plainly that a
module-scope `const` holding mutable state (`Policy.ts`'s depth memo, a `Metric`) is outside the
budget's scope and outside the invariant. It is retitled to "The library holds one rebindable
module-scope binding, the production-instrumentation latch", so its anchor changed:
`spec/invariants.md` (INV-QD-387's Related), `spec/traceability.md` (row 211 and ADR-QD-184's row)
and `spec/behaviors/09-react.md` (BEH-QD-694) follow it. ADR-QD-041's and ADR-QD-184's "the one
piece of module-scope state", and AGENTS.md section 13's, say "rebindable module-scope binding" too.

### WR-06: Phase-relative claims ("never edited after", "written before the table existed")

**Files modified:** `packages/react/test/DeveloperSignalReporters.test.tsx`,
`spec/decisions/184-...md`, `spec/invariants.md` (INV-QD-387), `spec/traceability.md` (row 650)
**Commits:** `375ef883` (the test file, in its own commit), `f1626bdc` (spec)
**Applied fix:** the test header now says what the file pins ("Pins every reporter through its
public entry point ... its expected values do not depend on how the resolvers are built") and that
its rows are unchanged by ARCH-118. ADR-QD-184, INV-QD-387 and traceability row 650 say the same,
following ADR-QD-183's "unchanged, not unedited". ADR-QD-184's Context keeps the history, where it
belongs. In `DeveloperSignalReporters.test.tsx` no expected value changed: 33 `it(` blocks and 60
`expect(` calls before and after, and all 35 tests pass.

### WR-07: Three tests per environment shared one title

**Files modified:** `packages/react/test/DeveloperSignals.test.ts`
**Commit:** `fa0807d5`
**Applied fix:** the title is `${row} through ${entry}'s ${option}: the throw does not propagate and
ReporterThrew names the hook and the error only`, so `InstrumentedInProduction`, `AtomsReplaced`
and `UnwritableGateRegistry` each have their own in both environments.

### IN-01: `isDevelopment`'s doc comment described a mechanism that no longer exists

**Files modified:** `packages/react/src/DeveloperSignals.ts`
**Commit:** `6c22f886`
**Applied fix:** the `define`-substitution reasoning for the literal `process.env.NODE_ENV` text
and the `typeof` guard stay; the elimination claim is replaced by the fact that the condition is
read at run time by the table, so the sentences stay in a production bundle.

### IN-02: `defaultOf`'s first overload was a trusted promise; `speaksHere` was cryptic

**Status:** fixed: requires human verification
**Files modified:** `packages/react/src/DeveloperSignals.ts`, `packages/react/test/DeveloperSignals.tst.ts`
**Commit:** `6c22f886`
**Applied fix:** no overload remains, so nothing is trusted. The sound link the review asked for did
not exist for an overload (an implementation returning `boolean` satisfies a `true` overload), so
the condition and the "no condition" case are separated by type instead. `Speaks` is `Gated |
"Everywhere"`. `holdsHere` and the resolver take only a `Gated` row, read through a table with
three explicit meanings (`Development: isDevelopment`, `Production: () => !isDevelopment()`), and
`ReporterThrew`'s default is read through `unconditionally`, whose parameter type demands
`speaks: "Everywhere"`. A row changed to speak under a condition fails to compile in `contain`; a
row with a condition given to `unconditionally`, or a row that speaks everywhere given to
`holdsHere`, fails likewise.

**Pin:** `DeveloperSignals.tst.ts` > "only a row with a condition is asked whether it holds":
`@ts-expect-error holdsHere(SIGNALS.ReporterThrew)`, the positive twins on
`InstrumentedInProduction` and `AtomsReplaced`, and the written-out `speaks` of `ReporterThrew`
(`"Everywhere"`) and `InstrumentedInProduction` (`"Production"`). Seen failing once by editing
`ReporterThrew`'s row to `speaks: "Development"` on a scratch edit (`Unused '@ts-expect-error'
directive`, file `fail`), then reverted. No negative `toBeCallableWith` pin was added, so
`NOT_CALLABLE_PIN_BUDGET` and AGENTS.md section 6's pin table are unchanged.

**Mutation:** the `Everywhere` meaning is no longer a run-time arm no test reaches. A row's
`speaks` string is read by `holdsHere` (killed by the condition tests) or compared by the
written-out table test (`ReporterThrew`'s, which `unconditionally` does not read).

### IN-03: The registry's contract paragraphs did not move with the code

**Files modified:** `packages/react/src/GateRegistry.ts`, `packages/react/src/GateWriter.ts`
**Commit:** `e6212874`
**Applied fix:** the ordering and synchrony paragraphs are `buildGateRegistry`'s doc, where a
yield point would be introduced; `GateWriter.ts`'s header names the builder; `GateRegistry.ts` keeps
what documents `makeGateRegistry` and the public types, and says where the rest lives. A doubled
blank line in `GateWriter.ts` is gone. Comments only; no code token changed.

### IN-04: Lines well past the codebase's hand-wrapped width

**Files modified:** `packages/react/src/DeveloperSignals.ts`, `GateRegistry.ts`, `QadiAtoms.ts`,
`HydrationEngine.ts`, `packages/react/test/DeveloperSignalReporters.test.tsx`,
`DeveloperSignals.test.ts`, `GateRegistry.store.test.ts`, `scripts/check-house-style.mjs`,
`scripts/lib/module-state-scan.mjs`
**Commits:** `6c22f886`, `fa0807d5`, `375ef883`, `e6212874`, `42396c33`, `9fd8b58b`
**Applied fix:** every line the phase added past 100 columns, outside a test or a string title that
cannot be wrapped, is wrapped. The characterisation was laid out with `oxfmt` at a 90-column
`printWidth` from a scratch config (nothing under the repository changed), then its prose
comments and header were wrapped by hand; only layout moved, in its own commit.

### IN-05: The table-facts test compares the table with a verbatim copy, and `resolved` has no reader

**Category:** necessity
**Files modified:** `packages/react/test/DeveloperSignals.test.ts`, `spec/decisions/184-...md`,
`spec/invariants.md`, `spec/behaviors/09-react.md`, `spec/behaviors/19-hydration.md`
**Commits:** `fa0807d5`, `f1626bdc`
**Applied fix:** `resolved` stays (locked by D-02). The test is titled "agrees with a written-out
statement of it, row by row", and a comment on the written-out table says it is a change detector
and that `resolved` proves nothing about timing, which "when each reporter is resolved" pins. BEH-QD-691
and BEH-QD-695, INV-QD-387 and ADR-QD-184 say the same and quote the new titles.

### IN-06: The same probe and the `threw` sentence written in more than one test file

**Files modified:** `packages/react/test/support/reporterThrew.ts` (new),
`packages/react/test/DeveloperSignals.test.ts`, `GateRegistry.store.test.ts`,
`DeveloperSignalReporters.test.tsx`
**Commits:** `fa0807d5`, `375ef883`
**Applied fix:** `threw(reporter, error)` is written once, in `test/support/reporterThrew.ts`
beside `hostile.ts`, and the three files import it (the characterisation and the store test wrap it
as `threwBoom`/with `"Error: boom"`). The older "a throwing onHydrationMismatch on makeQadiAtoms
still settles the re-check and counts it" probe is removed from `DeveloperSignals.test.ts`: the
characterisation pins it in both environments, so one definition of the probe remains.
INV-QD-251's Enforcement and traceability follow.

## Notes for the orchestrator

- Commits that group more than one finding, because the edits share a file: `fa0807d5` (WR-07,
  IN-05, IN-06 and the WR-01 run-time tests in `DeveloperSignals.test.ts`) and `f1626bdc` (every
  spec edit, which share `invariants.md` and `traceability.md`).
- `QadiProvider.tsx` is not among the five mutation-scored files. In the five that are, the only
  non-comment changes are `DeveloperSignals.ts` (WR-01, IN-02) and whitespace in `QadiAtoms.ts`,
  `HydrationEngine.ts` and `GateRegistry.ts`; `GateWriter.ts` is comments only.
- The mutation re-close should expect new mutants in `DeveloperSignals.ts` from `CONDITIONS`,
  `holdsHere`, `unconditionally` and `defaultOf`. Each is read by a test that fails without it
  (production silence and development silence of the defaults, the `holdsHere` truth table,
  `ReporterThrew` announced in both environments).
- Files not staged, per the instructions: `.planning/config.json`, `.agents/`, `.codex/`,
  `.planning/state.json`, `*.iter*.md`. `71-REVIEW-FIX.md` is not committed.

---

_Fixed: 2026-11-22T19:05:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
