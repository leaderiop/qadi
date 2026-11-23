---
phase: QD-76-remedies-uses-core-s-signature-match
plan: 01
subsystem: testing
tags: [mutation-base, stryker, adr, remedies, fixtures, traceability]
phase_base: bf339146723bd1eabd1f08dd94f489d8480027ef
plan_head_before: bf339146723bd1eabd1f08dd94f489d8480027ef
plan_head_after: 0fc9f17f77b4dec5952b004cd908c84eaafaa92c

requires: []
provides:
  - "the phase scorer 76-mutation.mjs with three based groups, core, devtools and http; its self-test ends 38 passed"
  - "76-mutation-base.json: core 164/165, devtools 487/487 and http 26/26, each measured on phase_base"
  - "ADR-QD-189 Rev 1.0: a change, not a rejection; two fixture judgements in core; a total refusal; the three removed Acted exports"
affects: [76-02, 76-03, 76-04, 76-05, 76-06, 76-07, 76-08]

actuals:
  tokens: 23100
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "three based mutation groups, none close-only, over one phase's core, devtools and http files"
    - "the owner decision recorded as an ADR, autonomously, before the first source change"

key-files:
  created:
    - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-mutation.mjs
    - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-mutation-base.json
    - spec/decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md
  modified:
    - spec/decisions/index.yaml
    - spec/traceability.md

key-decisions:
  - "A change, not a rejection: core answers whether a fixture row meets a signature or acted leaf (signatureAnswerFromSignatures, actedAnswerFromEvents), decided autonomously and recorded in ADR-QD-189 before any source change"
  - "Both fixture refusals fail typed for any value; SignatureHistoryUnavailable.subjectId and DecisionHistoryUnavailable.event become optional, set only when the member's own schema admits the request's value"
  - "ActedEvent, ActedAnywhere and ActedAnywhereInput are removed (no reader once the fixture is keyed); ActedEventInput stays for its readers"
  - "The mutation base was measured with no phase test or source file in the tree, and committed first after phase_base"

patterns-established:
  - "An ADR that cites a CCR id before its README register row exists leaves the CCR register coverage row of verify-traceability red until the CCR row is written (as in the previous phase)"

requirements-completed: []  # SIGM-05, WX-02, WX-05, WX-07 are held by this plan but stay Pending: only 76-08 marks SIGM rows, and no plan marks a WX row

duration: 30 min
completed: 2026-11-23
status: complete
---

# Phase 76 Plan 01: Phase base measured and the fixture-judgement decision recorded Summary

The phase base (gate lines, the two counting greps and the Stryker base of the core, devtools and http groups) is
measured and committed before any phase file exists, and ADR-QD-189 Rev 1.0 records that Remedies asks core whether a
fixture row meets a signature or acted leaf, its shape, its total refusal and the removal of three Acted exports,
before any change under `packages/`. No file under `packages/` changed.

phase_base: bf339146723bd1eabd1f08dd94f489d8480027ef

## Performance

- **Duration:** about 30 min (two Stryker runs of 34 s and 64 s, one of 9 s, and the gate run)
- **Tasks:** 2 of 2
- **Files:** 5 (3 created, 2 modified)

## Accomplishments

- `phase_base` is `bf339146`, which equals `bbaecd1d` on every path outside `.planning/` (checked with `git diff --quiet`
  over `packages spec scripts AGENTS.md stryker*.mjs .changeset apps package.json pnpm-lock.yaml`).
- `76-mutation.mjs` is `75-mutation.mjs` with the three groups of the plan, `EXAMINED` and `MOVED` empty and no close-only
  group declared (the close-only code path stays, reached by its seven self-test cases). `--self-test` ends
  `self-test: 38 passed`; oxlint is clean.
- `76-mutation-base.json` holds the three groups measured on `phase_base` (see Mutation base).
- ADR-QD-189 Rev 1.0 (decisions 1 to 8, alternatives, consequences), its index entry last in `spec/decisions/index.yaml`,
  and its section 3 row right after ADR-QD-188's (traceability revised 1.276 to 1.277 through `spec-revise.mjs`).

## Base facts

Copied from `<S>/base-facts.txt` (`<S>` = `$TMPDIR/qd76`, the resolved `/private/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/qd76`).
Every line equals the plan-time evidence.

```
house-style: 581 file(s) clean (3 declared switch(es), 72 type-test file(s))
api-surface: 941 export(s) documented across 9 package(s)
dod-table: 26 step(s) match pnpm check, 154 reference(s) resolve
PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
  with: 145 ADR(s) traced, all 168 invariant(s) traced, 121 ADR(s) agree, 322 file(s) exist
devtools-claims: 8 claim(s) registered across 6 file(s)
doc-examples: 118 block(s) compile
spec-revise: every Revision matches its newest Change History entry
package-install: 9 package(s) pack, resolve and authorize (526 runtime export(s))
reservation-sha256: 07a779c95ed6f98639077d67dedd68179830521c7aeb5adf925ad6b21749836f
custom-sentence: 4
inline-match: 4
```

The packed-install runtime export count is **526** (76-03 and 76-04 each add one, per the plan).
`<S>/custom-sentence-base.txt` and `<S>/inline-match-base.txt` hold the four matching lines each
(`Remedies.ts:427`, `SimulationFields.ts:576`, `Remedies.test.ts:579`, `SimulationFields.test.ts:139`; and
`Remedies.ts:540-543`).

## Mutation base

Measured on `bf339146`, `ignoreStatic: true`, one group at a time, stdin closed, nothing beside it. Score = detected /
valid; every Ignored count is a static mutant the base admits (nothing is admitted through `EXAMINED`).

| Group | File | Score | Survived | NoCoverage | Ignored |
| ----- | ---- | ----- | -------- | ---------- | ------- |
| core | `SignatureHistory.ts` | 71/72 | 1 | 0 | 36 |
| core | `SignatureMatch.ts` | 13/13 | 0 | 0 | 1 |
| core | `PortAccess.ts` | 47/47 | 0 | 0 | 17 |
| core | `DecisionHistory.ts` | 32/32 | 0 | 0 | 41 |
| core | `Errors.ts` | 1/1 | 0 | 0 | 35 |
| core | group | 164/165 (99.39) | 1 | 0 | 130 |
| devtools | `Remedies.ts` | 297/297 | 0 | 0 | 48 |
| devtools | `SimulationFields.ts` | 190/190 | 0 | 0 | 108 |
| devtools | group | 487/487 (100.00) | 0 | 0 | 156 |
| http | `QadiHttpError.ts` | 26/26 | 0 | 0 | 45 |

The only base survivor is `SignatureHistory.ts:366` `ConditionalExpression -> false`. Any survivor a later plan finds in
these files beyond it is new and fails `compare`. Logs: `<S>/stryker-base-{core,devtools,http}.log`.

## Task Commits

1. **Task 1 (tracer): mutation base** - `94ad4da6` (docs) - the scorer and its base record; first commit after `phase_base`.
2. **Task 2: ADR-QD-189** - `0fc9f17f` (docs) - the ADR, its index entry and its traceability row.

## Verification

| Check | Result |
| ----- | ------ |
| Task 1 `<automated>` (run on HEAD after the commit, and again as the tracer gate) | `base measured and recorded` |
| Task 2 `<automated>` | passes every clause except the `PASS: 21` line of vt-01.log (see Deviations); with that one clause replaced by the known single failure, `the owner decision is recorded first` |
| `node 76-mutation.mjs --self-test` | `self-test: 38 passed` |
| verify-traceability after Task 2 | `PASS: 20   FAIL: 1`, `146 ADR(s) traced`, `122 ADR(s) agree`; the one failure is CCR register coverage |
| `spec-revise.mjs --check` | every Revision matches its newest Change History entry |
| `git diff --quiet phase_base HEAD -- packages` | holds |

## Deviations from Plan

### Plan gap

**1. [Plan gap] verify-traceability reads `PASS: 20   FAIL: 1`, not `PASS: 21`, after Task 2**
- **Found during:** Task 2
- **Issue:** the plan requires ADR-QD-189's Change History and the traceability revision text to cite CCR-QD-468, and forbids
  any other file in the ADR commit. `verify-traceability.sh`'s `CCR register coverage` row fails for any CCR id cited in
  `spec/` with no row in `spec/README.md`'s Document history (`KNOWN_GAPS` is a closed list in the script): it reports
  `got [... 137 468]`. The CCR-QD-468 row is 76-07's (it names every revision), and adding 468 to `KNOWN_GAPS` would weaken a
  gate. The previous phase hit the same row with CCR-QD-467.
- **Fix:** none to the files; Task 2's verify was run with the `PASS: 21` clause replaced by a check that the log is exactly
  `PASS: 20   FAIL: 1` (and the one failing row is CCR register coverage); every other clause passed. The row turns green
  when 76-07 writes the CCR-QD-468 row. Only 76-01 and the plan that adds the row run verify-traceability strict.
- **Commit:** `0fc9f17f`

**Total deviations:** 1 (a plan gap in a verify clause). **Impact:** none on the base, the scorer or the ADR; the red CCR
register row is the one item for later plans: any strict verify-traceability run before 76-07 reads `PASS: 20   FAIL: 1`
for that row alone.

## Known Stubs

None.

## Threat Flags

None. No file outside `.planning/` and `spec/` changed.

## Issues Encountered

None beyond the deviation above.

## Next Phase Readiness

76-02 can write the agreement tests and `76-agreement-check.mjs` against `phase_base` `bf339146723bd1eabd1f08dd94f489d8480027ef`,
and may read `<S>/base-facts.txt`. `76-mutation.mjs` is ready for `record close <group>` in 76-06.

## Self-Check: PASSED

Created files exist (`76-mutation.mjs`, `76-mutation-base.json`, ADR-QD-189); commits `94ad4da6` and `0fc9f17f` are
ancestors of HEAD; no file under `packages/` differs from `phase_base`.
