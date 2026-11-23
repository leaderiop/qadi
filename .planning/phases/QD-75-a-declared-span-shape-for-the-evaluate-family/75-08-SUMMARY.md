---
phase: QD-75-a-declared-span-shape-for-the-evaluate-family
plan: 08
subsystem: spec
tags: [spec, traceability, adr, changeset, upgrade-guide, span-declaration]
phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314
plan_head_before: a81a7db509a1afa1d7ba15958487212c6657cc1f
plan_head_after: c4a5462d3efe0821621564027b45c5606a6113d6

requires:
  - phase: QD-75
    provides: "75-01..75-07: the declaration, the writers, the span-key rule, the mutation close and the measured cost"
provides:
  - "BEH-QD-711 to BEH-QD-715 in spec/behaviors/30-port-calls.md and INV-QD-395, INV-QD-396 in spec/invariants.md, traced in all four sections of the matrix"
  - "ADR-QD-188 Rev 1.1 with What enforces it and The cost, measured; ADR-QD-051 and ADR-QD-109 amended"
  - ".changeset/core-evaluate-span-declared.md (@qadi/core minor, breaking), the upgrade guide's 0.13 section, the CCR-QD-467 row"
affects: [75-09]

actuals:
  tokens: 21000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a Pinned by / Enforcement citation is a full path plus quoted titles, each title looked up in the named test file by the verify"
    - "a change record's file list compared with git as a sorted set, each cited spec revision equal to its header"

key-files:
  created:
    - .changeset/core-evaluate-span-declared.md
    - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-08-SUMMARY.md
  modified:
    - spec/behaviors/30-port-calls.md
    - spec/behaviors/05-evaluator.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md
    - spec/decisions/051-a-span-says-what-was-asked.md
    - spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md
    - spec/README.md
    - apps/website/src/content/docs/docs/reference/upgrading.md

key-decisions:
  # superseded 2026-11-23 (code review): see the superseded key below
  - "The cost section of ADR-QD-188 and the CCR row give both measured runs (+7.83% and +6.79% geometric mean, 0.4 to 1.1 us per call) as a record and not a gate, with the reference arm's spread beside the three named workloads; nothing is rounded in the plan's favour"
  - "INV-QD-395's Enforcement says the position of each annotation inside its writer is kept by review and no gate checks it, and cites the seven failed-span contract rows; INV-QD-396 names the compiler, the two house-style rules and the tests"
  - "The ADR-QD-188 Related list gains its new line as a separate paragraph ('Added in revision 1.1') so no existing line changes"

requirements-completed: []  # ESPN-05, WX-02, WX-03, WX-07 are held by this plan but stay Pending: no plan marks a WX row, and 75-09 closes the requirements

duration: 9 min
completed: 2026-11-23
status: complete
superseded: "2026-11-23 (code review): the close and the cost here describe a61a47c4; the close was re-recorded at 24ca9e2a (core 362/362, the span group with PortSpanEncode.ts by its GROUPS ranges) and the cost re-measured at +9.17% geometric mean, about 0.3 to 0.9 us per evaluate call; see 75-RED-EVIDENCE.md, 2026-11-23: The close after code review"
---

# Phase 75 Plan 08: The span change stated, traced, announced and recorded Summary

The evaluate family's span change is now one reading each for a tracer's owner: five behaviours and two invariants with every cited
test title resolving, ADR-QD-188 with what enforces it and what it costs, a breaking `@qadi/core` changeset with its upgrade-guide
section, and the CCR-QD-467 row listing exactly the files the phase changed.

phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314

## Accomplishments

- **Task 1 (tracer), `98cadb08`:** BEH-QD-711 to BEH-QD-715 sit between BEH-QD-227 and BEH-QD-445 (intro widened to the spans around
  a question), each with its ADR, invariant, a `ts` listing and a Pinned by list whose every quoted title exists in the named test file
  (the three `EvaluationSpan.*` files, plus one title each in `Evaluate.test.ts` and `GuardHealthCheck.test.ts`); INV-QD-395 and
  INV-QD-396 end `spec/invariants.md` with Source, Implication, Enforcement and Related; INV-QD-044 and BEH-QD-317 carry a dated
  note. Traceability: the §1 row of document 30, the §2 rows after INV-QD-394's, INV-QD-044's test column, the ADR-QD-188 row's
  invariants and three new §4 rows (each with exactly its own path), plus `BEH-QD-711` and `BEH-QD-714` on the existing
  `Evaluate.test.ts` and `GuardHealthCheck.test.ts` rows. Revisions 1.11, 1.23, 1.190, 1.265.
- **Task 2, `1580707f`:** ADR-QD-188 Rev 1.1 gains `## What enforces it` (the compiler, `[span-key-source]` and `[span-key-literal]`
  in `scripts/check-house-style.mjs`, the three test files, review alone for the position of each question) and `## The cost,
  measured` (the command, six rounds, the three workloads for both runs with the reference spread, the geometric means, and that it
  is a record and not a gate), and relates INV-QD-395, INV-QD-396 and BEH-QD-711 to BEH-QD-715. ADR-QD-051 (1.5) and ADR-QD-109
  (1.6) each gain a dated amendment; their Status is unchanged; their §3 rows say they were extended. Traceability 1.266.
- **Task 3, `c4a5462d`:** `.changeset/core-evaluate-span-declared.md` (`"@qadi/core": minor`, opens **Breaking.**, the rename
  `qadi.decision` to `qadi.outcome`, the failed-span keys, the new keys, nothing written under both); the upgrade guide's last
  section `## 0.13: the evaluate spans answer under qadi.outcome and a failed span says what was asked` with a `Span | Before |
  After` table and the ADR-QD-188 link, no compiled fence; the CCR-QD-467 row after CCR-QD-466's (README 1.323) listing the 23 files
  outside `.planning/` that `git diff --name-only` names at that point plus the three it adds, each spec document with its revision, ending
  `Ids used: ADR-QD-188, BEH-QD-711 to BEH-QD-715, INV-QD-395, INV-QD-396. Unused: none.`
- **The transient traceability red is closed:** `bash spec/scripts/verify-traceability.sh --strict` reads `PASS: 21 FAIL: 0 SKIP: 0`
  with `all 168 invariant(s) traced` and `145 ADR(s) traced` (log `vt-08c.log`); `check-api-surface` reads 941; `spec/overview.md` is
  unchanged.

## Task Commits

1. **Task 1 (tracer): BEH-QD-711 to BEH-QD-715 and INV-QD-395/396 stated and traced** - `98cadb08` (docs)
2. **Task 2: ADR-QD-188 says what enforces it and what it costs, and extends ADR-QD-051 and ADR-QD-109** - `1580707f` (docs)
3. **Task 3: the changeset, the upgrade note and the change record** - `c4a5462d` (docs)

## Verification

- Task 1 verify: prints `the span family is stated and traced` (exit 0) with the one check noted in Deviation 1 widened. The tracer
  gate (re-run end to end on the committed head before Task 2 began) passed.
- Task 2 verify: prints `the decisions are complete`, with the same one check widened for its own log (`vt-08b.log`); on HEAD after
  Task 3 the unmodified script, reading the final 21/0 log, also prints `the decisions are complete`.
- Task 3 verify: prints `the change record is complete`, unmodified, exit 0.
- Task 1's verify re-run on HEAD fails at `spec/traceability.md is not at 1.265`, which is its own post-commit state (Task 2 moved
  traceability to 1.266); that is by construction and not a finding.
- `node scripts/spec-revise.mjs --check`, `check-doc-examples` (118 blocks), `check-website-doc-examples` (71 blocks) and
  `check-dod-table` (26 steps, 154 references) pass. `git status --porcelain -- packages scripts spec .changeset apps` is empty
  after each commit; `git diff --quiet <start> HEAD -- packages scripts AGENTS.md spec/overview.md` is clean; no `changeset
  version` or `publish` ran, no requirement was marked complete, no id outside the reserved set was used.

## Deviations from Plan

**1. [Verification-only] Tasks 1 and 2 cannot read `PASS: 21 FAIL: 0` before Task 3 writes the CCR-QD-467 row**
- **Found during:** Task 1 (and again at Task 2)
- **Issue:** both task verifies grep their log for `PASS: 21   FAIL: 0   SKIP: 0`, but the one check that fails until the README
  row exists is `CCR register coverage` (`got [... 137 467]`), and that row is Task 3's. The run notes name this as the known,
  accepted transient. Task 1's and Task 2's logs (`vt-08.log`, `vt-08b.log`) read `PASS: 20 FAIL: 1`.
- **Fix:** none to any record or gate. The verify was run with that one grep replaced by an equivalent: exactly one `| FAIL` line,
  it is `CCR register coverage` and its drift list ends in `467` and names nothing else; the `168 invariant(s)` and `145 ADR(s)`
  lines are still required. Every other check ran unchanged. Task 3 reads `PASS: 21 FAIL: 0 SKIP: 0`.
- **Files modified:** none.

**2. [Verification-only] No `PLAN_START` record**
The duration below is measured from the `start-75-08` ledger file's time (10:15) to the last commit's, not from a recorded start.

Notes, not deviations: the commit trailer is `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, as the run notes and the task
verifies require (a verify greps for exactly one such line). A vitest process of another repository may have been running and was
ignored.

**Total deviations:** 1 verification-only, 1 recording note. **Impact:** none on any record or threshold.

## Known Stubs

None.

## Threat Flags

None. T-75-16 is mitigated: every title cited in a Pinned by or Enforcement list is looked up in the named test file by the verify,
and each BEH and its §4 row agree on which file pins which record. T-75-17: the changeset and the upgrade note name keys and values
only. T-75-18: the CCR file list was compared with `git diff --name-only` outside `.planning/` as a set, each spec revision with its
header. T-75-SC: nothing was installed or upgraded.

## Issues Encountered

> **Superseded 2026-11-23 (code review).** The close and the cost in this section describe `a61a47c4`. Code review
> then changed `packages/core/src`, so both were measured again on the tree that ships: the close at `24ca9e2a` holds
> `core` 362/362 killed and the `span` group (`EvaluationSpan.ts` 3/3 valid with 38 Ignored, and `PortSpanEncode.ts` over
> the line ranges `75-mutation.mjs`'s `GROUPS` gives it, 6 Ignored), every Ignored mutant run by hand; the cost is +9.17%
> geometric mean, about 0.3 to 0.9 µs per `evaluate` call. See `75-RED-EVIDENCE.md`, "2026-11-23: The close after code
> review", and ADR-QD-188, The cost, measured. The figures in it are left as they were written.

None. Honest numbers carried into the records: the cost is +7.83% (first run, load falling) and +6.79% (settled), 14 or 15 of 17
workloads over the 5% band, about 0.4 to 1.1 us per call, recorded as a result and not a gate. ESPN-05 and WX-07 have no edge class
(`unclassified`); they are held by the records and the forbidden-token scan over every added line, as the plan flags.

## Next Phase Readiness

Ready for 75-09 (the close). Nothing under `packages/` or `scripts/` changed in this plan.

## Self-Check: PASSED

- `98cadb08`, `1580707f` and `c4a5462d` are ancestors of HEAD; `git rev-list --count a81a7db5..c4a5462d` is 3.
- `.changeset/core-evaluate-span-declared.md` exists; the nine files above hold the changes described;
  `git status --porcelain -- packages scripts spec .changeset apps` is empty.
