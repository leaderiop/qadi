---
phase: QD-75-a-declared-span-shape-for-the-evaluate-family
plan: 02
subsystem: testing
tags: [contract-test, spans, tracer, red-evidence]
phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314
plan_head_before: 236dcfcd29df655204f59dbd88621cb9ecdcc824
plan_head_after: aa9d0397fa06698684c632288b257178df98100f

requires:
  - phase: QD-75
    provides: "75-01: the phase base, the mutation base and ADR-QD-188"
provides:
  - "packages/core/test/EvaluationSpan.contract.test.ts: 33 rows, every span key a literal, 15 kept green and 18 changed red on the base"
  - "75-RED-EVIDENCE.md: the contract on the base, three runs, the 18 changed rows with their first failure line, the regression quoted"
affects: [75-03, 75-04, 75-05, 75-06, 75-07, 75-08, 75-09]

actuals:
  tokens: 6950
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a contract written on the base with literal keys: it never reads a key through the declaration it guards"
    - "changed rows compare the whole attribute record, so an unnamed key fails them"

key-files:
  created:
    - packages/core/test/EvaluationSpan.contract.test.ts
    - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-RED-EVIDENCE.md
  modified: []

key-decisions:
  - "Rows whose title does not fit an it.effect line are wrapped (title on its own line) rather than shortened, so every title equals the plan's Title cell and no added line exceeds 90 columns"

requirements-completed: []  # ESPN-02, WX-06, WX-07 are held by this plan but stay Pending: only 75-09 marks ESPN rows, and no plan marks a WX row

duration: 2 min
completed: 2026-11-23
status: complete
---

# Phase 75 Plan 02: The evaluate span family contract, red on the base Summary

A 33-row contract pins, with literal keys, what a tracer sees on every span of the evaluate family and on the denial log
line; on `phase_base` the 15 kept rows pass and the 18 changed rows fail, in each of three runs, and the regression of
ESPN-02 (a failed `qadi.evaluate` span with no question) is seen red and recorded. No file under `packages/core/src`
changed.

phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314

## Performance

- **Duration:** 2 min
- **Tasks:** 2 (1 tracer, 1 auto)
- **Files:** 2 created

## Accomplishments

- `EvaluationSpan.contract.test.ts` holds 33 `it.effect` rows in five describes (`qadi.evaluate` 13, `qadi.toPredicate`
  7, `qadi.guardHealthCheck` 5, `qadi.decideSubjects and qadi.decideSubjectsStream` 6, `the denial log line` 2), in the
  plan table's order, titles character for character. It imports nothing from `EvaluationSpan.ts` and reads every key
  as a literal; two local helpers, `attributesOf` and `allAttributesOf`, find spans by their literal name.
- Changed rows compare the whole record with `assert.deepStrictEqual`; absence rows use `assert.notProperty`. The two
  batch rows over per-subject spans (K13, C18) compare in span order. K2 and C1 evaluate the same input: K2 reads three
  keys and passes on the base, C1 compares the whole record and fails there, so the base difference is the outcome key
  alone.
- Each of the three base runs (`contract-base-1.json` to `contract-base-3.json`) reads 33 tests, 15 passed, 18 failed;
  every failure is the expected reason (`qadi.decision` where the contract names `qadi.outcome`, a failed evaluation or
  translation span with no question, a probe span with no subject or policy tag, a batch span with no action).
- `75-RED-EVIDENCE.md` records the base sha, the command, the counts, the 18 changed rows with their first failure
  line, and `### The regression`: row C3's failure with the expected and received records in full.

## Task Commits

1. **Task 1 (tracer): the contract** - `ecb0256f` (test) - only the contract file; the first `packages/` change after
   `phase_base`, after the ADR-QD-188 commit.
2. **Task 2: the evidence** - `aa9d0397` (docs) - only `75-RED-EVIDENCE.md`.

The tracer gate ran: Task 1's verify was re-run end to end and passed ("the contract is on the base"), so Task 2 went
ahead. The contract has exactly one commit and is held unchanged to the end of the phase.

## Verifications run

| Verify | Result |
| ------ | ------ |
| Task 1 `<automated>` (run from a script file with the same body, after the commit) | pass: `the contract is on the base` |
| Task 1 `<automated>` re-run after Task 2 | pass |
| Task 2 `<automated>` | pass: `the contract red on the base is recorded` |
| three vitest runs on the contract, one at a time, stdin closed | each `15 passed, 18 failed`, exit 1 as expected |
| `perl` width check on the contract | no line over 90 columns |
| `pnpm exec oxlint packages/core/test/EvaluationSpan.contract.test.ts` | clean |
| `node scripts/check-house-style.mjs` | `house-style: 579 file(s) clean (3 declared switch(es), 71 type-test file(s))` |
| `pnpm exec tsc -p tsconfig.test.json --noEmit` | clean |
| `git diff --quiet phase_base HEAD -- packages/core/src` | holds |

## Deviations from Plan

None - plan executed exactly as written.

Two verification-only notes, neither weakening a gate: the plan's `<automated>` bodies were extracted from the plan
file into `$TMPDIR/qd75/v75-02-t1.sh` and `v75-02-t2.sh` and run with `bash` (the `bash -c '...'` wrapper cannot carry
the apostrophes of a heredoc commit); and the evidence's full C3 diff was taken from one extra single-test vitest run
(`-t`), because the JSON report truncates each record to `...(4)`.

## Known Stubs

None.

## Threat Flags

None. No file under `packages/core/src` changed and no endpoint, auth path or schema was added. T-75-03 is held by the
changed rows comparing whole records.

## Next Phase Readiness

Ready for 75-03 (the source change). The contract's 18 changed rows are red on the base and turn green by source
changes alone; none of them is edited again.

## Self-Check: PASSED

- FOUND: `packages/core/test/EvaluationSpan.contract.test.ts`, `75-RED-EVIDENCE.md`
- FOUND commits: `ecb0256f`, `aa9d0397` (both ancestors of HEAD)
