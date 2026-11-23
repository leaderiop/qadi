---
phase: QD-69-one-total-thrown-value-to-message-module
plan: 09
subsystem: verification
tags: [mutation, close, check-pr, requirements]
phase_base: 19fe6244bc8b3494823732b1fbf87f3947852fd8
plan_head_before: d93fe83de1a7e76def7f57dd8954de6af3f7a23c
plan_head_after: df5fc4969670ac5978383f4616da746eae683fc3
requires: [69-08]
provides:
  - "69-mutation-close.json: the five groups measured on one commit (2d57f922), judged against the base with compare exit 0"
  - "pnpm check:pr green on 81678a58, no code changed after it"
  - "THRW-01 to THRW-05 complete"
affects: []
actuals:
  tokens: 9000
  tasks: 2
  commits: 4
tech-stack:
  added: []
  patterns: ["an Ignored (static) mutant is judged by kind per file, plus an explicit examined allowance run by hand"]
key-files:
  created:
    - .planning/phases/QD-69-one-total-thrown-value-to-message-module/69-mutation-close.json
  modified:
    - packages/core/test/PortDescription.test.ts
    - .planning/phases/QD-69-one-total-thrown-value-to-message-module/69-mutation.mjs
    - .planning/REQUIREMENTS.md
key-decisions:
  - "Autonomously decided: a new Ignored mutant cannot be closed with a test (Stryker never runs a static mutant), so the scorer judges Ignored mutants by kind per file instead of by line, and admits one examined allowance run by hand; the base record is untouched"
requirements-completed: [THRW-01, THRW-02, THRW-03, THRW-04, THRW-05]
status: complete
duration: ~75 min
completed: 2026-11-22
---

# Phase 69 Plan 09: The close Summary

The mutation close of the fourteen touched files and the new module holds against the base, `pnpm check:pr` passes alone on the final code commit, and THRW-01 to THRW-05 are complete.

## Mutation close

`node 69-mutation.mjs compare` exits 0; its last line is `no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed mutants`. All five groups were measured on `2d57f922` by the base's invocations (the `thrown` group by `pnpm exec stryker run stryker.config.mjs --mutate packages/core/src/ThrownMessage.ts`); the record commit `81678a58` follows it.

| File | Score (base -> close) | Survived | No coverage | Ignored |
| --- | --- | --- | --- | --- |
| `CustomPredicate.ts` | 36/37 -> 30/31, killed mutants removed | 1 -> 1 | 0 -> 0 | 34 -> 34 |
| `JsonHazard.ts` | 192/213 -> 193/213 | 19 -> 18 | 2 -> 2 | 46 -> 46 |
| `PortDerivation.ts` | 49/50 -> 49/50 | 1 -> 1 | 0 -> 0 | 14 -> 14 |
| `PortKey.ts` | 168/168 -> 168/168 | 0 -> 0 | 0 -> 0 | 4 -> 4 |
| `PortWireEncode.ts` | 25/29 -> 35/37 | 4 -> 2 | 0 -> 0 | 19 -> 9 |
| `SinkCodec.ts` | 123/127 -> 120/124, killed mutants removed | 4 -> 4 | 0 -> 0 | 45 -> 44 |
| `RemotePorts.ts` | 5/6 -> 6/6 | 1 -> 0 | 0 -> 0 | 2 -> 2 |
| `Capture.ts` | 51/51 -> 47/47 | 0 -> 0 | 0 -> 0 | 5 -> 6 |
| `DiagnosticsFeed.ts` | 73/73 -> 73/73 | 0 -> 0 | 0 -> 0 | 13 -> 13 |
| `DiagnosticsStore.ts` | 57/57 -> 57/57 | 0 -> 0 | 0 -> 0 | 6 -> 6 |
| `ExplorerSession.ts` | 167/175 -> 167/175 | 8 -> 8 | 0 -> 0 | 4 -> 4 |
| `GatesFeed.ts` | 118/118 -> 117/117 | 0 -> 0 | 0 -> 0 | 4 -> 4 |
| `TimelineFeed.ts` | 50/50 -> 50/50 | 0 -> 0 | 0 -> 0 | 10 -> 10 |
| `DeveloperSignals.ts` | 86/89 -> 96/99 | 3 -> 3 | 0 -> 0 | 23 -> 23 |
| `ThrownMessage.ts` (new) | 12/12 | 0 | 0 | 1 |

Two scores fell as ratios, `CustomPredicate.ts` and `SinkCodec.ts`, and `compare` logs `killed mutants removed` for each: they lost only killed mutants with the deleted `renderReason` and `describeThrown`, and gained no Survived or NoCoverage mutant. `Capture.ts` and `GatesFeed.ts` stayed at 100% with fewer mutants (Capture's old branches and `GatesFeed`'s own guard went). No file has a new Survived or NoCoverage mutant.

### Closed first-measure reasons

The first measurement named seven reasons, all closed before the recorded one:

- `PortWireEncode.ts:141` and `:157`, new Survived `() => undefined` on `decodeQuestion` and `decodeAnswer`. Real: `portWire` is called inside a test (`throwingWire`), which covers both arrows but only calls the encoders. Closed with a test, `be6f04f7` (`a port wire built from a spec decodes what it is given`, two tests in `PortDescription.test.ts`: a question and an answer decode, and a malformed one is refused with a sentence).
- `CustomPredicate.ts:226` and `:227`, `SinkCodec.ts:362`, `Capture.ts:181`, `DeveloperSignals.ts:137`, new Ignored `() => undefined`. These are module-scope arrows (`failure`, `defect`, `encodeFailed`, `renderError`, `errorLine`) the phase rewrote: Stryker's `ignoreStatic` never runs a static mutant, so no test can kill one, and the scorer read a rewritten line as a new mutant. See the deviation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The scorer's Ignored rule could not be satisfied by a test**
- **Found during:** Task 1 (first `compare`).
- **Issue:** the plan closes "a new open or Ignored mutant" with a test that kills it. An Ignored mutant is static (created at import) and is never run under `ignoreStatic: true`, so no test changes it; and the scorer keyed it by line and column, so every module-scope arrow on a line the phase rewrote counted as new although the base held its twin one line earlier. D-17 names only Survived and NoCoverage.
- **Fix:** `judge` compares Ignored mutants by kind (mutator and replacement) per file, not by line: a file holds no more of a kind than its base did. The one genuine growth, `Capture.ts`'s new module-scope helper `fieldOf` (5 -> 6 ArrowFunction), is an explicit `EXAMINED` allowance, backed by a by-hand run of the whole file with the devtools config spread with `ignoreStatic: false` (a temporary config, removed): all 53 mutants Killed. An allowance the close no longer needs fails (stale), and `--self-test` gained four cases (27 pass). `69-mutation-base.json` is untouched (one commit since `phase_base`, 69-01's). Survived and NoCoverage rules are unchanged.
- **Files modified:** `.planning/phases/QD-69-one-total-thrown-value-to-message-module/69-mutation.mjs`
- **Commit:** `2d57f922` (the close was then re-measured whole at that commit)

**2. [Rule 3 - Verification-only] BSD `grep` read the verify's `- [x] **THRW-0n**` patterns as options**
- **Found during:** Task 2 verify.
- **Fix:** ran the same verify with `grep -qF -e` for those two patterns; every check it makes is the same. Nothing weakened.

Otherwise the plan ran as written.

## Close scan (added lines of `git diff 19fe6244..HEAD`, run by the task's verify)

| Scan | Count |
| --- | --- |
| forbidden construct in `packages/*/src` (` as ` cast, non-null `!`, `any`, `switch (`, `Effect.fnUntraced`, `async`, `await`, `console.`, `process.env`, `Date.now`, `new Date(`, `performance.now`, `Record<string, unknown>`) | 0 |
| `Stryker disable` anywhere in `packages`, `features`, `.changeset`, `scripts` | 0 |
| decision number, `69-0n` plan id, `Phase 69`, or plan-local label in a test title (`packages/*/src`, `packages/*/test`, `features`, `.changeset`) | 0 |
| `Cause.pretty(` in `packages/*/src` outside `ThrownMessage.ts` | 0 (the one call is `causeMessage`'s) |
| reservation file differs from `phase_base` hash | 0 (`07a779c9...836f`, `next-id.mjs` never run) |

## pnpm check:pr

`run-check: ran 17 of 18 steps; "pnpm mutation" was skipped (release PRs run it).` on `81678a58`, status 0, run alone; no file under `packages spec scripts .changeset features apps AGENTS.md package.json` changed between that commit and HEAD. It includes coverage at its thresholds, the spec gates and gate 14.

## Requirements

THRW-01 to THRW-05 are `- [x]` and `Complete` (`df5fc496`, holding only `REQUIREMENTS.md`). WX-01 to WX-07 stay Pending; none was marked.

## Decisions D-01 to D-17

Each is met by the plan that owns it (see the plan's must_have); D-17 is met by this plan: the close distinguishes removed killed mutants from weakened tests, `compare` records `killed mutants removed`, and no file has a new Survived or NoCoverage mutant.

## Commits

- `be6f04f7` test(69-09): close the mutation drop in PortWireEncode
- `2d57f922` docs(69-09): judge an Ignored mutant by kind, not by line
- `81678a58` docs(69-09): record the mutation close of the touched files
- `df5fc496` docs(69-09): THRW-01 to THRW-05 complete

## Known Stubs

None.

## Threat Flags

None: no endpoint, auth path, file access or schema was added.

## Self-Check: PASSED

`69-mutation-close.json` exists; the four commits above are ancestors of HEAD; both task verifies exit 0.
