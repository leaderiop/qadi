---
phase: QD-67-no-equivalent-mutants-no-magic-race-bound
plan: 06
subsystem: spec
tags: [spec, records, invariant, ccr, traceability, decision-cache]
phase_base: eacf89b4b3ab9ef6189312ab904f7d4943714550
status: complete

requires:
  - phase: QD-67-no-equivalent-mutants-no-magic-race-bound
    provides: 67-03's split eviction, 67-04's table dispatch (choice table), 67-05's bench of record (pass)
provides:
  - INV-QD-379, the bound and the order the split eviction keeps, traced and registered
  - BEH-QD-166's reasons for validating capacity rewritten for the split eviction, under an amendment note
  - CCR-QD-458, recording the dispatch choice the rule took and naming ADR-QD-180, BEH-QD-671-675 and INV-QD-380 Unused
  - AGENTS.md section 5a's one paragraph on a table indexed by a tag its own code wrote
affects: [67-07]

actuals:
  tokens: 9000
  tasks: 2
  commits: 1
plan_head_before: d88231fce1efe05709fa373ee9f97bb8621d4ea2
plan_head_after: dea2afb4d1ef98d05de8fb49c354b843c400811d

tech-stack:
  added: []
  patterns:
    - "the register shown red for the rows not yet written, then green; a CCR row's cited revisions checked by a script that was shown failing on a later revision"

key-files:
  created: []
  modified:
    - spec/behaviors/21-decision-cache.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
    - AGENTS.md

key-decisions:
  - "The records follow 67-DISPATCH.md's choice: table, so the CCR-QD-458 row records that the Match form failed the gate and the arm table passed, and AGENTS.md 5a gains exactly one 5-line paragraph"
  - "No ADR and no new BEH id: ADR-QD-180, BEH-QD-671-675 and INV-QD-380 appear only in the CCR-QD-458 row, named Unused"

requirements-completed: [WX-02, WX-03, WX-07]

coverage:
  - id: D1
    description: "INV-QD-379, BEH-QD-166's reasons, the traceability rows and CCR-QD-458 are recorded with reserved ids only, and the register is seen red then green"
    verification:
      - kind: command
        ref: "bash spec/scripts/verify-traceability.sh --strict (red PASS: 19 FAIL: 2, then green PASS: 21 FAIL: 0 SKIP: 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "No export changes and gate 13 is unchanged; no changeset, version, publish, tag or push"
    verification:
      - kind: command
        ref: "node scripts/check-api-surface.mjs (api-surface: 939 export(s) documented across 9 package(s))"
        status: pass
    human_judgment: false

duration: 20 min
completed: 2026-11-21
---

# Phase QD-67 Plan 06: Records Summary

**INV-QD-379 for the bound and the FIFO order of the split eviction, BEH-QD-166's reasons rewritten for it, and CCR-QD-458 recording the arm-table dispatch choice, all under reserved ids and traced.**

## What was done

- Task 1 (tracer): the first edit list rewrote BEH-QD-166's reasons (`Chunk.splitAt` reads a negative or `NaN` count as zero: a negative capacity would evict every entry as it settled, a `NaN` one none), added the amendment note `> **Amended 2026-11-21 (ARCH-114, CCR-QD-458).**`, linked INV-QD-379 from the FIFO paragraph and appended INV-QD-379. Two `spec-revise` calls bumped the two documents. The register was then shown red.
- Task 2: the table edit list (4 edits, 3 files) added the INV-QD-379 traceability row after INV-QD-377's, named INV-QD-379 in the `DecisionCache.test.ts` row, added the CCR-QD-458 row after CCR-QD-457's, and added AGENTS.md section 5a's paragraph after the `Match.type<T>()` paragraph. Two more `spec-revise` calls bumped the other two documents. The register was shown green and the CCR row's cited revisions checked.

## Revisions bumped

| Document | Before | After |
| --- | --- | --- |
| `spec/behaviors/21-decision-cache.md` | 1.11 | 1.12 |
| `spec/invariants.md` | 1.165 | 1.166 |
| `spec/traceability.md` | 1.232 | 1.233 |
| `spec/README.md` | 1.268 | 1.269 |

All four calls passed `--date 2026-11-21`. `scripts/next-id.mjs` was never run.

## Register

- Red, before the second list: `PASS: 19   FAIL: 2   SKIP: 0 (strict: skips count as failures)`, with `| FAIL | invariants -> traceability | untraced: INV-QD-379` and `| FAIL | CCR register coverage` naming 458 as drift from KNOWN_GAPS.
- Green, after it: `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)`.
- `spec-revise --check`: exit 0.

## Doc gates

```
doc-examples: 117 block(s) compile
api-surface: 939 export(s) documented across 9 package(s)
dod-table: 25 step(s) match pnpm check, 151 reference(s) resolve
devtools-claims: 8 claim(s) registered across 6 file(s)
house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))
```

## ccr-row.mjs

```
spec/README.md Rev 1.269
spec/behaviors/21-decision-cache.md Rev 1.12
spec/invariants.md Rev 1.166
spec/traceability.md Rev 1.233
ccr-row: 4 document(s) cited at their current Revision
```

Shown failing once: after a planted `spec-revise` of `spec/invariants.md` to 1.167 it exited 1 with `the CCR-QD-458 row does not cite spec/invariants.md at Rev 1.167`; the saved file was copied back and it passed again (`spec/invariants.md` is at 1.166 in the commit).

## Choice recorded

`67-DISPATCH.md` says `choice: table` (the `Match` form failed the gate, the arm table passed). The CCR-QD-458 row says so, and AGENTS.md gained exactly the one 5-line paragraph (5 added, 0 removed); no AGENTS.md table or budget changed. The bench of record (67-BENCH.md, verdict pass) is the last executable change: `git diff --quiet 0e3f9cbd HEAD` over `packages/*/src`, `packages/*/bench`, `scripts` and `package.json` is clean.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Note for 67-07

Any later fix to a spec document must re-run the matching `node scripts/spec-revise.mjs <file> "<why>" --date 2026-11-21` call and re-align the CCR-QD-458 row's cited revisions; 67-07's close scan runs `ccr-row.mjs` again. The row states the mutation close's required result (no mutant open, both survivors gone, no file below its base) before 67-07 measures it, so it is true at the close or the phase does not close.

## Commits

- dea2afb4: docs(67-06): BEH-QD-166's reasons and INV-QD-379, traced and registered as CCR-QD-458

## Self-Check: PASSED

Both task verifies exit 0; the five files in the records commit exist and the commit is an ancestor of HEAD.
