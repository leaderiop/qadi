---
phase: QD-75-a-declared-span-shape-for-the-evaluate-family
plan: 07
subsystem: tooling
tags: [mutation, stryker, coverage, benchmark, span-declaration]
phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314
plan_head_before: a61a47c4778f3fa0ce43ec3cc3987a091a135be7
plan_head_after: 2c917b6b43b898a0d17433a28b63106d36ebfb61

requires:
  - phase: QD-75
    provides: "75-01 scorer and base record; 75-04/75-05 writers and tests; 75-06 span-key rule"
provides:
  - "75-mutation-close.json: groups core and span measured on one head, compare agrees with the base"
  # superseded 2026-11-23 (code review): see the superseded key below
  - "EXAMINED in 75-mutation.mjs: EvaluationSpan.ts (35 static mutants) and Predicate.ts (1), each run by hand"
  - "75-RED-EVIDENCE.md: Static mutants run by hand, The cost, measured, Coverage on the close tree"
affects: [75-08, 75-09]

actuals:
  tokens: 6300
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a close-only declaration file closed by running its static mutants by hand and admitting them by kind"
    - "an interleaved A/B repeated once on a settled host when the first started under a falling load"

key-files:
  created:
    - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-mutation-close.json
  modified:
    - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-mutation.mjs
    - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-RED-EVIDENCE.md

key-decisions:
  - "The by-hand run covers EvaluationSpan.ts and Predicate.ts in one Stryker run into one report, so the single report the task verify reads holds every EXAMINED file"
  - "Two static mutants of EvaluationSpan.ts that crash the module at import (Stryker RuntimeError, not Killed) are admitted, because every test file fails to load under them; recorded as a finding and a verification-only deviation, not hidden"
  # superseded 2026-11-23 (code review): see the superseded key below
  - "The cost is reported as measured (geometric mean +7.83% then +6.79%, analyzer verdict fail) as a record and not a gate, and the run was repeated on a settled host"

requirements-completed: []  # WX-04 and WX-05 are held by this plan but stay Pending: no plan marks a WX row

duration: 20 min
completed: 2026-11-23
status: complete
superseded: "2026-11-23 (code review): the close and the cost here describe a61a47c4; the close was re-recorded at 24ca9e2a (core 362/362, the span group with PortSpanEncode.ts by its GROUPS ranges) and the cost re-measured at +9.17% geometric mean, about 0.3 to 0.9 us per evaluate call; see 75-RED-EVIDENCE.md, 2026-11-23: The close after code review"
---

# Phase 75 Plan 07: The mutation close, coverage and the cost of the declared spans Summary

The four writers and the declaration close at 100% of valid mutants killed with no open and no unexamined Ignored mutant
against the base, `pnpm coverage` holds, and the second span annotation costs a measured +6.8% to +7.8% geometric mean
per `evaluate` (about 0.4 to 1.1 microseconds), recorded and not gated.

> **Superseded 2026-11-23 (code review).** The close and the cost in this section describe `a61a47c4`. Code review
> then changed `packages/core/src`, so both were measured again on the tree that ships: the close at `24ca9e2a` holds
> `core` 362/362 killed and the `span` group (`EvaluationSpan.ts` 3/3 valid with 38 Ignored, and `PortSpanEncode.ts` over
> the line ranges `75-mutation.mjs`'s `GROUPS` gives it, 6 Ignored), every Ignored mutant run by hand; the cost is +9.17%
> geometric mean, about 0.3 to 0.9 µs per `evaluate` call. See `75-RED-EVIDENCE.md`, "2026-11-23: The close after code
> review", and ADR-QD-188, The cost, measured. The figures in it are left as they were written.

phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314

## Accomplishments

> **Superseded 2026-11-23 (code review).** The close and the cost in this section describe `a61a47c4`. Code review
> then changed `packages/core/src`, so both were measured again on the tree that ships: the close at `24ca9e2a` holds
> `core` 362/362 killed and the `span` group (`EvaluationSpan.ts` 3/3 valid with 38 Ignored, and `PortSpanEncode.ts` over
> the line ranges `75-mutation.mjs`'s `GROUPS` gives it, 6 Ignored), every Ignored mutant run by hand; the cost is +9.17%
> geometric mean, about 0.3 to 0.9 µs per `evaluate` call. See `75-RED-EVIDENCE.md`, "2026-11-23: The close after code
> review", and ADR-QD-188, The cost, measured. The figures in it are left as they were written.

- Close measured on one head (`a61a47c4`, nothing under `packages/` changed afterwards [Superseded 2026-11-23: code review later changed `packages/core/src`; see the note above.]): `core` 365/365 killed
  (`Lifecycle.ts` 38/38, `Predicate.ts` 282/282, `SubjectSet.ts` 35/35, `GuardHealthCheck.ts` 10/10, base survivors at
  `GuardHealthCheck.ts` closed: 7/9 to 10/10), with the base's invocation; `span` (`EvaluationSpan.ts`, close-only) holds 0
  valid mutants and 35 Ignored (all static), the Stryker score reading NaN.
- `compare` printed `no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed
  mutants`; the scorer self-test ends `self-test: 36 passed`. No test or refactor drop-closing commit was needed.
- By-hand static run (`ignoreStatic: false`, one run over `EvaluationSpan.ts` and `Predicate.ts`, final score 100.00):
  `Predicate.ts` 304/304 Killed (its one new static arrow, the `tapError` callback at line 698, which `compare` had refused
  as a new Ignored mutant, is among them); `EvaluationSpan.ts` 33 Killed and 2 RuntimeError. `EXAMINED` admits
  `EvaluationSpan.ts` `ArrowFunction () => undefined` 2, `ObjectLiteral {}` 21, `StringLiteral ""` 12 and `Predicate.ts`
  `ArrowFunction () => undefined` 1, with a table of every static mutant under `## Static mutants run by hand`.
- `pnpm coverage < /dev/null` exits 0: statements 99.64%, branches 98.68%, functions 99.55%, lines 99.81%.
- Cost, interleaved with `scripts/bench/ab.sh` (6 rounds, close tree against a patch back to the base's `packages/core/src`
  writers, 17 workloads analysed): first run geometric mean +7.83% (15 of 17 over 5%), second run on a settled host +6.79%
  (14 of 17); `one node` +12.1% / +11.1%, `resolver miss — one port call` +8.3% / +3.2%, `wide — allOf of 8` +8.8% / +8.9%.
  The analyzer exited 1 on both: a record, not a gate (D-16). The spread of the reference arm is 9% to 14% on the three named
  workloads, recorded beside each figure.

## Task Commits

1. **Task 1 (tracer): the mutation close of the writers and the declaration, compared with the base** - `e0176f19` (docs) -
   `75-mutation-close.json`, `75-mutation.mjs` (EXAMINED and its comment), `75-RED-EVIDENCE.md`.
2. **Task 2: coverage on the close tree and the cost measured interleaved** - `2c917b6b` (docs) - `75-RED-EVIDENCE.md` only.

## Verification

- Task 1 verify (`verify-07-1.sh`, extracted from the plan): exit 1 at one check only, `a ArrowFunction mutant of
  packages/core/src/EvaluationSpan.ts is not killed by hand`; every check before it passed. With that one status test
  accepting `RuntimeError` whose reason is `outside of a test run` (see Deviations), the whole verify prints `mutation close
  compared`, exit 0, both after the commit and again on HEAD after Task 2.
- Task 2 verify (`verify-07-2.sh`): `coverage holds and the cost is recorded`, exit 0.
- `node 75-mutation.mjs compare`: the success line above. `--self-test`: `self-test: 36 passed`.
- `git status --porcelain -- packages scripts spec .changeset` empty after every run (the bench patch was reversed by
  `ab.sh` each time); the base record and the contract each have exactly one commit (`8e603823`, `ecb0256f`).
- Tracer gate: the verify was re-run end to end on the committed head and passed before Task 2 began.

## Deviations from Plan

**1. [Verification-only] The task verify's "killed by hand" test cannot pass for two static mutants**
- **Found during:** Task 1
- **Issue:** two of the 35 static mutants of `EvaluationSpan.ts` (line 48 `declareSpan`'s arrow to `() => undefined`, line 55
  `askedFields` to `{}`) crash the module at import: Stryker reports `RuntimeError`, "An error occurred outside of a test
  run", with 44 test files failing to load. They are detected by every test in the suite but are not `Killed` in Stryker's
  vocabulary, and the plan's check requires every mutant of an admitted kind to be `Killed`. The check's key regex also
  stops at the first `}`, so it reads only the `ArrowFunction` entry of the three on that file.
- **Fix:** none to the code or the gate. `EXAMINED` admits the kinds with their counts, the evidence says plainly that two
  are `RuntimeError`, and the verify was run with that one status test widened to `RuntimeError` with that exact reason
  (`verify-07-1-equiv.sh`); a full-parse check over all three kinds of both files showed every admitted mutant `Killed`
  except those two. A source change to make them `Killed` was not made: it would reshape a declaration to satisfy a
  classification, and `refactor(75-07)` is for a condition redundant at run time.
- **Files modified:** none beyond the evidence and `EXAMINED`.

**2. [Plan step, not a deviation] The by-hand run covers two files in one report**
`compare` refused one unexamined Ignored mutant in a `core` file (`Predicate.ts:698`), which the plan's third bullet
provides for. The task verify reads one report, `<S>/examined/mutation.json`, so the run was repeated once over both
files together (the span-only report is kept as `examined-span-only`); every entry of `EXAMINED` is in the one report.

**3. [Measurement] The cost was measured twice**
The first `ab.sh` was refused as busy (load 14.5 on 12 CPUs, left by the coverage run), then admitted at 7.0 with the load
still falling (peak 10.8 before `close-2`, 3.8 at the end). It is a valid run, but the figures went into an ADR sentence's
evidence, so it was repeated at load 2.8 to 6.9; both are recorded and agree. The plan's verify reads the first.

Notes, not deviations: the commit trailer is `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, as the run notes and
the task verifies require. A vitest process of another repository (`dawa-erp`) was running at the start and was ignored.

**Total deviations:** 1 verification-only, 2 recorded plan-step and measurement notes. **Impact:** none on the code or on any
gate's threshold; the finding in deviation 1 is carried by the evidence.

## Known Stubs

None.

## Threat Flags

None. T-75-14 is mitigated: one head for every group, nothing under `packages/` after it, each `EXAMINED` entry backed by a
by-hand report (the two `RuntimeError` mutants named as such). [Superseded 2026-11-23: code review later changed `packages/core/src`; see the note above.] T-75-15: `ab.sh` alternated arm order over six rounds, refused
a busy host and restored `packages/`; the reference spread is recorded beside each figure.

## Issues Encountered

> **Superseded 2026-11-23 (code review).** The close and the cost in this section describe `a61a47c4`. Code review
> then changed `packages/core/src`, so both were measured again on the tree that ships: the close at `24ca9e2a` holds
> `core` 362/362 killed and the `span` group (`EvaluationSpan.ts` 3/3 valid with 38 Ignored, and `PortSpanEncode.ts` over
> the line ranges `75-mutation.mjs`'s `GROUPS` gives it, 6 Ignored), every Ignored mutant run by hand; the cost is +9.17%
> geometric mean, about 0.3 to 0.9 µs per `evaluate` call. See `75-RED-EVIDENCE.md`, "2026-11-23: The close after code
> review", and ADR-QD-188, The cost, measured. The figures in it are left as they were written.

None beyond the above. The cost is a real +6.8% to +7.8% geometric mean (about 0.4 to 1.1 microseconds per `evaluate`); 75-08
and 75-09 should state it with that figure and its two runs rather than as "negligible".

## Next Phase Readiness

Ready for 75-08. Nothing under `packages/` changes after this plan. [Superseded 2026-11-23: code review later changed `packages/core/src`; see the note above.] `verify-traceability --strict` still reads PASS 20 /
FAIL 1 by design (the CCR-QD-467 README row arrives in 75-08).

## Self-Check: PASSED

- `e0176f19` and `2c917b6b` are ancestors of HEAD; `git rev-list --count a61a47c4..2c917b6b` is 2.
- `75-mutation-close.json`, `75-mutation.mjs` and `75-RED-EVIDENCE.md` exist and hold the changes above;
  `git status --porcelain -- packages scripts spec .changeset` is empty.
