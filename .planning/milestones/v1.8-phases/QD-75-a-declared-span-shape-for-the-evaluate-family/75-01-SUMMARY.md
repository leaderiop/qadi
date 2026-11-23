---
phase: QD-75-a-declared-span-shape-for-the-evaluate-family
plan: 01
subsystem: testing
tags: [mutation-base, stryker, adr, spans, traceability]
phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314
plan_head_before: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314
plan_head_after: ab9a822ed147e893e0d46390aaec2e1593cab48c

requires: []
provides:
  - "the phase scorer 75-mutation.mjs with the core group and the close-only span group; its self-test ends 36 passed"
  - "75-mutation-base.json: the core group measured on phase_base, 363/365 over the four span writers"
  - "ADR-QD-188 Rev 1.0: one outcome key qadi.outcome (Allow, Deny, Failed), no dual write, the declared span family"
affects: [75-02, 75-03, 75-04, 75-05, 75-06, 75-07, 75-08, 75-09]

actuals:
  tokens: 35900
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a close-only mutation group: every valid mutant killed, every Ignored mutant admitted through EXAMINED"
    - "the checkpoint recorded as an ADR before the first source change"

key-files:
  created:
    - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-mutation.mjs
    - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-mutation-base.json
    - spec/decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md
  modified:
    - spec/decisions/index.yaml
    - spec/traceability.md

key-decisions:
  - "qadi.outcome with the closed values Allow, Deny and Failed is the one outcome key of qadi.evaluate; qadi.decision is removed with no release writing both keys (decided autonomously, recorded in ADR-QD-188 before any source change)"
  - "The mutation base was measured with no phase test or source file in the tree, and committed first after phase_base"

patterns-established:
  - "An ADR that cites a CCR id before its README register row exists leaves the CCR register coverage row of verify-traceability red until the CCR row is written"

requirements-completed: []  # ESPN-01, WX-02, WX-05, WX-07 are held by this plan but stay Pending: only 75-09 marks ESPN rows, and no plan marks a WX row

duration: 6 min
completed: 2026-11-23
status: complete
---

# Phase 75 Plan 01: Phase base measured and the outcome-key checkpoint recorded Summary

The phase base (gate lines, the proving grep and the Stryker base of the four span writers, 363/365) is measured and
committed before any phase file exists, and ADR-QD-188 Rev 1.0 records the one-outcome-key and no-dual-write decisions
with their reasons before any change under `packages/`. No file under `packages/` changed.

phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314

## Performance

- **Duration:** 6 min
- **Tasks:** 2 (1 tracer, 1 auto)
- **Files:** 5 (3 created, 2 modified)

## Accomplishments

- `75-mutation.mjs` is `74-mutation.mjs` with the `core` group (`Lifecycle.ts`, `Predicate.ts`, `SubjectSet.ts`,
  `GuardHealthCheck.ts`) and the close-only `span` group (`EvaluationSpan.ts`), both through `stryker.config.mjs`;
  `EXAMINED` and `MOVED` are empty; `--self-test` ends `self-test: 36 passed`; oxlint is clean.
- `75-mutation-base.json` holds the `core` group measured on `phase_base` (head equals `phase_base`): `Lifecycle.ts`
  42/42, `Predicate.ts` 280/280, `SubjectSet.ts` 34/34, `GuardHealthCheck.ts` 7/9. The two open mutants are both on
  `GuardHealthCheck.ts:105` (`BooleanLiteral -> false`, `ObjectLiteral -> {}`, the `qadi.healthy` annotation, which no
  test pinned at the base). Ignored: 2, 22, 8 and 1.
- ADR-QD-188 Rev 1.0 states the context, eight decisions (one outcome key, no dual write with the autonomous-decision
  sentence, the `EvaluationSpan.ts` declaration, the field table, the question first on every path, one key per fact,
  names read from the declaration, the guarding rule), the rejected alternatives, the consequences and the related
  records; its index entry is the last of `spec/decisions/index.yaml`, and its row follows ADR-QD-187's in
  `spec/traceability.md` section 3 (traceability revised 1.263 to 1.264 through `spec-revise.mjs`).

## Task Commits

1. **Task 1 (tracer): the mutation base** - `8e603823` (docs) - the scorer and its base record, the first commit after
   `phase_base`.
2. **Task 2: ADR-QD-188** - `ab9a822e` (docs) - the ADR, its index entry and its traceability row.

The tracer gate ran: Task 1's verify was re-run end to end and passed ("base measured and recorded"), so expansion went
ahead.

## Base facts

Copied from `<S>/base-facts.txt` (`<S>` = `$TMPDIR/qd75`), each the last line of its command, run from the root with
stdin closed. Every line equals the plan-time evidence.

```
house-style: 578 file(s) clean (3 declared switch(es), 71 type-test file(s))
api-surface: 941 export(s) documented across 9 package(s)
dod-table: 26 step(s) match pnpm check, 154 reference(s) resolve
devtools-claims: 8 claim(s) registered across 6 file(s)
doc-examples: 118 block(s) compile
spec-revise: every Revision matches its newest Change History entry
reservation-sha256: 07a779c95ed6f98639077d67dedd68179830521c7aeb5adf925ad6b21749836f
proving-grep: 91
PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
```

verify-traceability on the base also reported `144 ADR(s) traced`, `all 166 invariant(s) traced`, `120 ADR(s) agree` and
`319 file(s) exist`. The proving grep saved 91 lines to `<S>/proving-grep-base.txt`.

## Verifications run

| Verify | Result |
| ------ | ------ |
| Task 1 `<automated>` (run from a script file with the same body) | pass: `base measured and recorded` |
| Task 1 tracer re-run | pass |
| `node 75-mutation.mjs --self-test` | `self-test: 36 passed` |
| `pnpm exec oxlint 75-mutation.mjs` | clean |
| Stryker core base run | 363/365 (99.45), `Final mutation score of 99.45` |
| Task 2 `<automated>` | passes every clause except the `PASS: 21` line of vt-01.log (see Deviations); with that one clause dropped, `the checkpoint is recorded first` |
| `node scripts/spec-revise.mjs --check` | pass |
| verify-traceability after Task 2 | `PASS: 20   FAIL: 1`, `145 ADR(s) traced`, `121 ADR(s) agree`; the one failure is CCR register coverage |
| `git diff --quiet phase_base HEAD -- packages` | holds |

## Deviations from Plan

### Verification-only and plan-gap items

**1. [Plan gap] verify-traceability reads `PASS: 20   FAIL: 1`, not `PASS: 21`, after Task 2**
- **Found during:** Task 2
- **Issue:** the plan requires ADR-QD-188's Change History and the traceability revision text to cite CCR-QD-467, and
  forbids any other file in the ADR commit. `verify-traceability.sh`'s `CCR register coverage` row fails for any CCR id
  cited in `spec/` with no row in `spec/README.md`'s Document history (`KNOWN_GAPS` is a closed list in the script):
  `got [... 467], expected [...]`. The plan's own plan-time evidence could not have shown this, because the id was not
  yet cited. Plan 75-08 writes the CCR-QD-467 row (README 1.322 to 1.323) and states that README revision, so it closes
  the gap.
- **Fix:** none. A stub row in `spec/README.md` now would break 75-08's expectation of README at 1.323 with one
  CCR-QD-467 row added there, and adding 467 to the script's `KNOWN_GAPS` would weaken a gate. The ADR, index and
  traceability checks all pass (`145 ADR(s) traced`, `121 ADR(s) agree`); only that one row is red, and only 75-01 and
  75-08 run verify-traceability. The rest of Task 2's verify was run with the `PASS: 21` clause removed and passed.
- **Decision for the orchestrator:** the gate is red between this commit and 75-08. If a green gate at every commit is
  wanted, register a CCR-QD-467 row in `spec/README.md` before 75-08 and adjust 75-08's README revision and row steps.
- **Files modified:** none. **Commit:** none.

**2. [Style] 116 lines of `75-mutation.mjs` are wider than 90 columns**
- **Found during:** Task 1
- **Issue:** the plan says to copy `74-mutation.mjs` whole with a short list of changes, and that file has 123 such
  lines; the plan's own verify does not check the width.
- **Fix:** only the lines this plan rewrote (the header, `GROUPS`) are wrapped within 90 columns; the copied lines are
  unchanged, as the plan directs.
- **Files modified:** `75-mutation.mjs`. **Commit:** `8e603823`.

**Total deviations:** 2 (one plan gap in a verify clause, one style note). **Impact:** none on the base, the scorer or
the ADR; the red CCR register row is the one item for the orchestrator.

## Known Stubs

None.

## Threat Flags

None. No file under `packages/` changed and no endpoint, auth path or schema was added.

## Next Phase Readiness

Ready for 75-02 (the contract file, still on the phase base). `<S>/phase_base`, `<S>/base-facts.txt` and
`<S>/proving-grep-base.txt` are in `$TMPDIR/qd75`.

## Self-Check: PASSED

- FOUND: `75-mutation.mjs`, `75-mutation-base.json`, the ADR file under `spec/decisions/`
- FOUND commits: `8e603823`, `ab9a822e` (both ancestors of HEAD)
