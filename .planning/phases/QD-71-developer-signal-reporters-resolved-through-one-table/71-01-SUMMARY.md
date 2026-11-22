---
phase: QD-71-developer-signal-reporters-resolved-through-one-table
plan: 01
subsystem: react-developer-signals
tags: [mutation-record, characterisation, developer-signals, reporters]
phase_base: d147287a94a3bb3cad176e4f99bad7a0b76d8939
requires: []
provides:
  - "71-mutation.mjs: the phase scorer, five groups, --restart on a close, self-test 32 passed"
  - "71-mutation-base.json: the five source files the phase edits, measured on phase_base"
  - "DeveloperSignalReporters.test.tsx: 35-row characterisation of every developer-signal reporter through its entry point"
  - "71-RED-EVIDENCE.md: opened with the characterisation green on the base"
affects: [71-02, 71-03, 71-04, 71-05, 71-08]
tech-stack:
  added: []
  patterns: ["a characterisation through the entry points with the environment switched by NODE_ENV and the console compared whole"]
key-files:
  created:
    - .planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-mutation.mjs
    - .planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-mutation-base.json
    - .planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-RED-EVIDENCE.md
    - packages/react/test/DeveloperSignalReporters.test.tsx
  modified: []
key-decisions:
  - "Decided autonomously: rows 12 and 18 of the plan's table carry one title, so row 12 (the dehydrating one) is titled 'a returning onDropped is told the left-out entry once in production, and nothing is written to the console'; the plan's own check needs 35 distinct titles."
  - "Decided autonomously: both Claude trailers on every commit, the plan's Opus 5.5 line (which its verify greps for) and the harness's Sonnet 5.5 line."
requirements-completed: [SIGR-04, WX-05, WX-06, WX-07]
duration: 9 min
completed: 2026-11-22
status: complete
commits: 3
plan_head_before: d147287a94a3bb3cad176e4f99bad7a0b76d8939
plan_head_after: aab8dd2303dc43fe2956cde374dd94f6f2d7484b
actuals:
  tokens: 15500
  tasks: 2
  commits: 3
---

# Phase 71 Plan 01: Mutation base and developer-signal characterisation Summary

The phase base is measured (gate lines plus a Stryker record of the five source files the phase edits) by a committed
scorer, and every developer-signal reporter's console line, hook, throw name and resolution time is pinned by a 35-row
characterisation that is green on the untouched source.

## Accomplishments

- `71-mutation.mjs`: a copy of Phase 70's scorer with five groups (`signals`, `registry`, `writer`, `atoms`, `engine`),
  none close-only; `heldFor` makes `record close <group> --restart` start a fresh close record at the new head naming
  what it dropped, and refuses `--restart` on a base; `--self-test` ends `self-test: 32 passed`; oxlint clean.
- `71-mutation-base.json`: `phase: "71"`, the five groups, every `head` equal to `phase_base`, each by
  `pnpm exec stryker run stryker.react.mjs --mutate packages/react/src/<file>`:

  | group | file | detected/valid | survived | no coverage | ignored |
  | --- | --- | --- | --- | --- | --- |
  | `signals` | `DeveloperSignals.ts` | 96/99 | 3 | 0 | 23 |
  | `registry` | `GateRegistry.ts` | 54/56 | 2 | 0 | 0 |
  | `writer` | `GateWriter.ts` | 48/49 | 1 | 0 | 3 |
  | `atoms` | `QadiAtoms.ts` | 36/40 | 4 | 0 | 1 |
  | `engine` | `HydrationEngine.ts` | 126/126 | 0 | 0 | 42 |

- `packages/react/test/DeveloperSignalReporters.test.tsx`: the 35 rows of the plan's table in six `describe` blocks,
  driving only `makeQadiAtoms`, `makeGateRegistry` (registering through `gateWriterFor`), `dehydrateDecisions`,
  `hydrateDecisions` and `QadiProvider`; every console assertion is the whole array of lines. The whole react project
  (613 tests), `tsc -p tsconfig.test.json` and oxlint pass; no `packages/*/src` file changed; the file holds no `as`,
  `!`, `any`, `switch`, `Record<string, unknown>`, `"qadi_…"` literal, decision number, plan id, requirement id or phase
  number.
- `71-RED-EVIDENCE.md` opened with `## The characterisation on the base`: command, phase base, `35 passed, 0 failed`.

## Base facts

HEAD at start and `phase_base`: `d147287a94a3bb3cad176e4f99bad7a0b76d8939`. The plan-time evidence names `77052ea4`;
`git diff --quiet 77052ea4 HEAD -- packages spec scripts .changeset AGENTS.md` held (confirmed by the orchestrator;
the two differ by planning-only commits 07872e96, c94352a7 and d147287a). Every plan-time line was reproduced on the
base, so no plan-time base fact differs. `<S>/base-facts.txt` (`<S>` is `$(cd "${TMPDIR:-/tmp}" && pwd -P)/qd71`),
verbatim:

```
house-style: 566 file(s) clean (3 declared switch(es), 67 type-test file(s))
api-surface: 941 export(s) documented across 9 package(s)
dod-table: 26 step(s) match pnpm check, 154 reference(s) resolve
PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
devtools-claims: 8 claim(s) registered across 6 file(s)
doc-examples: 118 block(s) compile
spec-revise: every Revision matches its newest Change History entry
| PASS   | decisions -> traceability                  | 140 ADR(s) traced
| PASS   | invariants -> traceability                 | all 158 invariant(s) traced
| PASS   | ADR Document ID = file number              | 116 ADR(s) agree
| PASS   | §4 test files -> disk                     | 310 file(s) exist
reservation-sha256: 07a779c95ed6f98639077d67dedd68179830521c7aeb5adf925ad6b21749836f
```

After Task 2 the house-style line reads `567 file(s) clean` (the 566 above plus the characterisation file), as expected;
no later plan's check should read 566 once this file exists.

## Verification

- Task 1 verify (`base measured and recorded`): exit 0, run after the base-record commit.
- Task 2 verify (`characterisation green on the base`): exit 0 on the final commits. Its first run failed with `wanted 35
  distinct passing titles, got 35 passed of 35, 34 distinct`; see the deviation below. The test and evidence commits were
  then rebuilt (a soft reset of this plan's own unpushed commits, no file lost) so the characterisation is touched by
  exactly one commit.
- Plan-level: `git status --porcelain -- packages spec scripts .changeset` is empty.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Two rows of the plan's table share one title**
- **Found during:** Task 2 verify
- **Issue:** Rows 12 (`dehydrateDecisions: onDropped`) and 18 (`hydrateDecisions: onDropped`) are both titled "a returning
  onDropped is told the entry once in production, and nothing is written to the console". The verify's
  `titles.size !== 35` is on `title` alone, so 35 tests give 34 distinct titles and the check cannot pass.
- **Fix:** row 12's title now reads "a returning onDropped is told the left-out entry once in production, and nothing is
  written to the console" (its entry is one the payload left out); row 18 keeps the plan's title. No expectation changed.
  Recorded in `71-RED-EVIDENCE.md`. No later plan's check reads either title.
- **Files modified:** `packages/react/test/DeveloperSignalReporters.test.tsx`, `71-RED-EVIDENCE.md`
- **Commit:** 3597f8e7, aab8dd23

**2. [Rule 3 - Blocking] A clean base-facts capture lost one line**
- **Found during:** Task 1 step 2
- **Issue:** `verify-traceability.sh --strict` ends on a blank line, so taking its last line recorded an empty one in
  place of `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)`.
- **Fix:** replaced the empty line with the `PASS:` line the run printed at line 27 of its log; the other lines are
  verbatim. Verification-only; no gate weakened.

**Characterisation rows corrected to the base:** none. All 35 expectations, including every exact console line,
matched the base on the first run.

**Total deviations:** 2 (1 plan defect in a title, 1 capture slip). **Impact:** none on scope; the characterisation
and the base record are as planned.

## Known Stubs

None.

## Threat Flags

None. The rows compare whole lines that name a reason and a count only, never an entry (T-71-03); the base was measured
before any phase test existed and is the first commit after `phase_base` (T-71-01); the characterisation sits in its own
commit (T-71-02).

## Commits

- `67b2a143` docs(71-01): record the mutation base of the developer-signal reporters
- `3597f8e7` test(71-01): characterise every developer-signal reporter through its entry point
- `aab8dd23` docs(71-01): record the characterisation green on the base

## Self-Check: PASSED

Created files exist (`71-mutation.mjs`, `71-mutation-base.json`, `71-RED-EVIDENCE.md`, `DeveloperSignalReporters.test.tsx`),
the three commits are ancestors of HEAD, and both task verifies exit 0.
