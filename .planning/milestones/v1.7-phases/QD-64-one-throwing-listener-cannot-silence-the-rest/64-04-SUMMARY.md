---
phase: QD-64-one-throwing-listener-cannot-silence-the-rest
plan: 04
subsystem: spec
tags: [spec, adr, behaviours, invariants, traceability, devtools, listeners]
phase_base: 8f3cb792c3a92acefadcd32be0f38b0df8f46641
plan_head_before: 18d3568f39d0c9e628d8c0fee3503e094d2f9bb6
plan_head_after: 18afe3bf076bd756aecf3c04737951f6738b1aaa
commits: 2
requires:
  - phase: QD-64-one-throwing-listener-cannot-silence-the-rest
    provides: "plans 02 and 03: the seam and the feeds' texts that the spec now states"
provides:
  - "ADR-QD-177 (Rev 1.0, amends ADR-QD-173), indexed, traced in section 3 and registered as CCR-QD-455"
  - "BEH-QD-656 and INV-QD-373, the BEH-QD-638 rule amended, the ADR-QD-173 amendment, and the traceability rows"
affects: [QD-64-05]
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns:
    - "a register check shown red with only the ADR file present, then green once the index, trace and register rows exist"
key-files:
  created:
    - spec/decisions/177-one-throwing-listener-cannot-silence-the-rest.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md
    - spec/behaviors/28-devtools-screens.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "The begin-to-fork window is stated as out of scope in the ADR, BEH-QD-656 and the register row; no spec text claims it is closed."
requirements-completed: [LSTN-03, WX-02, WX-03]
duration: 12 min
completed: 2026-11-20
status: complete
---

# Phase QD-64 Plan 04: The contract recorded in the spec Summary

**ADR-QD-177, BEH-QD-656, INV-QD-373, the amended BEH-QD-638 rule, the ADR-QD-173 amendment and the CCR-QD-455 register row state the every-listener-is-called contract the code holds since plan 02, with the begin-to-fork window left as out of scope.**

## Accomplishments

- Task 1 (tracer), `f348c2ea`: ADR-QD-177, its `index.yaml` entry, the section 3 trace row and the CCR-QD-455 row. The RED run with only the ADR file present is `<S>/trace-red.log`; its three FAIL rows and last line:
  - `| FAIL | decisions/ disk -> index.yaml | orphaned: 177-one-throwing-listener-cannot-silence-the-rest.md`
  - `| FAIL | decisions -> traceability | untraced: ADR-QD-177`
  - `| FAIL | CCR register coverage | drift from KNOWN_GAPS (backfill the register or update the script's list): got [078 ...` (names 455)
  - `PASS: 18   FAIL: 3   SKIP: 0 (strict: skips count as failures)`
- Task 2, `18afe3bf`: BEH-QD-656 (last section of spec 28), BEH-QD-638's feed-`subscribe` rule rewritten with the dated note, INV-QD-373 (last invariant), the ADR-QD-173 amendment, status and Related line (doc and index), and the traceability section 1, 2, 3 and 4 edits.
- The `@qadi/react` registry sentence in spec 28, `spec/overview.md`, the DoD table and `package.json` are unchanged.

## Verification

- `records t1`: `records t1: 11 of 11 check(s) green` (verify-traceability `PASS: 21   FAIL: 0   SKIP: 0`, 138 ADRs traced, 138 entries resolve, 114 agree; spec-revise `--check`; the RED log; the single old-contract hit at `spec/behaviors/28-devtools-screens.md:2548`; no leaked id; unused ids only in the CCR row).
- `records t2`: `records t2: 22 of 22 check(s) green` (adds `all 150 invariant(s) traced`, the anchors, the cited Revisions, `doc-examples: 117 block(s) compile`, `dod-table: 25 step(s) match pnpm check, 151 reference(s) resolve`, `api-surface: 939 export(s) documented across 9 package(s)`, `devtools-claims: 8 claim(s) registered across 6 file(s)`, house-style line unchanged).
- Both task verify blocks exited 0. The old-contract regex finds nothing in `packages spec apps/website/src AGENTS.md README.md`. `git diff --name-only phase_base -- spec` lists exactly the seven spec files in `files_modified`.

| Document | Revision before | Revision after |
| --- | --- | --- |
| `spec/decisions/177-one-throwing-listener-cannot-silence-the-rest.md` | new | 1.0 |
| `spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md` | 1.0 | 1.1 |
| `spec/behaviors/28-devtools-screens.md` | 1.36 | 1.37 |
| `spec/invariants.md` | 1.160 | 1.161 |
| `spec/traceability.md` | 1.225 | 1.227 |
| `spec/README.md` | 1.262 | 1.263 |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Next Phase Readiness

Plan 64-05 closes the phase and ticks LSTN-01..04. No WX-* requirement was ticked here.
