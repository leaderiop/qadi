---
phase: QD-74-the-simulation-session-s-policy-choice-split-from-its-runs
plan: 06
subsystem: spec
tags: [spec, behaviours, invariants, traceability, change-record, seeded-choice]
phase_base: b22d97f9af293734787b3f771400d6f5f6e87065
plan_head_before: 1a3de2f55a2b6910f98bf18ab35e5633d305150b
plan_head_after: b2948daddf7b024ee8c6e1099301f3e132cc543d

requires: ["74-05"]
provides:
  - "BEH-QD-706 to BEH-QD-710 in spec/behaviors/29-devtools-simulator.md, each with its invariant, ADR-QD-187, a REQUIREMENT block, its rule sentence verbatim and a Pinned by list whose every title exists in the file it names"
  - "INV-QD-393 and INV-QD-394 ending spec/invariants.md, each saying what tests hold and what only review keeps"
  - "the traceability rows of the new records and of SeededChoice.test.ts, SeededChoice.tst.ts and the characterisation"
  - "the CCR-QD-466 row listing exactly the files the phase changed in packages and spec, each revision equal to its header"
affects: [74-07]

actuals:
  tokens: 72500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a spec record copies the code's rule sentence verbatim and cites only test titles it can find in the named file"

key-files:
  created: []
  modified:
    - spec/behaviors/29-devtools-simulator.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md

key-decisions:
  - "Decided autonomously: the INV-QD-393 Enforcement cites eleven SeededChoice.test.ts titles (the union of the titles BEH-QD-706 to BEH-QD-709 cite, narrowed to the ones that state the pin rule, the orphan rule, the menu list and the no-op) rather than every title in the file, so the row lists the two files it cites and no title is cited that no BEH also holds"
  - "Decided autonomously: the CCR-QD-466 prose gained one sentence naming BEH-QD-706 to BEH-QD-710, INV-QD-393 and INV-QD-394 and the three dated amendments, since the files cell alone did not say which records the amendments belong to"

requirements-completed: []  # CHSE-05, WX-02, WX-03, WX-07 are held by this plan but stay Pending: only 74-07 marks requirements

duration: 25 min
completed: 2026-11-23
status: complete
---

# Phase 74 Plan 06: The split's behaviours and invariants stated and traced Summary

BEH-QD-706 to BEH-QD-710 and INV-QD-393/394 state the seeded choice and the session's one draft write and one run clear,
each copying ADR-QD-187's rule sentence word for word and citing only tests that exist; the traceability rows list
exactly the files each record cites, and the CCR-QD-466 row lists exactly the files the phase changed.

## Task Commits

1. Task 1 (tracer): `ea7492fc` `docs(74-06): state the seeded choice behaviours and invariants and trace them`
   (`29-devtools-simulator.md`, `invariants.md`, `traceability.md` only)
2. Task 2: `b2948dad` `docs(74-06): list every revision and file of the seeded choice change` (`spec/README.md` only)

## Revisions reached (through `spec-revise.mjs --date 2026-11-23`)

| Document | From | To |
| -------- | ---- | -- |
| `spec/behaviors/29-devtools-simulator.md` | 1.24 | 1.25 |
| `spec/invariants.md` | 1.187 | 1.188 |
| `spec/traceability.md` | 1.261 | 1.262 |
| `spec/README.md` | 1.315 | 1.316 |

`spec/overview.md` stays at 1.133 and `spec/behaviors/28-devtools-screens.md` at 1.52 (both moved earlier in the phase).

## Verification

| Check | Result |
| ----- | ------ |
| Task 1 verify (headings, order, rule sentences, cited titles, anchors, traceability rows, revisions, forbidden tokens, commit shape) | prints `behaviours and invariants stated and traced`; run again on HEAD after Task 2, same result |
| Task 2 verify (revision, one CCR row, literals, file set, cited revisions, README diff scope, DoD table, commit shape) | prints `the change record is complete` |
| `spec-revise.mjs --check` | every Revision matches its newest Change History entry |
| `check-doc-examples.mjs` | 118 block(s) compile |
| `check-api-surface.mjs` | 941 export(s) documented across 9 package(s) |
| `verify-traceability.sh --strict` | PASS 21, FAIL 0, SKIP 0; `144 ADR(s) traced`; `all 166 invariant(s) traced`; `120 ADR(s) agree`; `319 file(s) exist` |

### Traceability counts

| Count | Value |
| ----- | ----- |
| Checks passing | 21 |
| ADRs traced | 144 |
| Invariants traced | 166 |
| ADRs agreeing across registers | 120 |
| Files that exist (every backticked `packages/` path in section 4 and the rows) | 319 |

### CCR-QD-466 file list

The row's files cell (brace groups expanded) equals `git diff --name-only <phase_base> HEAD -- packages spec` as a set:
18 files, none missing, none extra, none twice (10 under `packages/devtools`, 8 under `spec`). Each cited revision equals
its document header: ADR-QD-187 1.0, 28-devtools-screens 1.52, 29-devtools-simulator 1.25, invariants 1.188,
overview 1.133, traceability 1.262, README 1.316.

## What each record says holds it

| Record | Tests | Compiler | Review alone |
| ------ | ----- | -------- | ------------ |
| BEH-QD-706, 707, 709 | yes | | |
| BEH-QD-708 | order and lookup | `PolicyChoice`'s first three arms, the menu option shape | |
| BEH-QD-710 | behaviour of each command | | one assignment of the draft, one clear of the run |
| INV-QD-393 | the rules as plain values | arms and transitions | the pin rule living only inside the transitions |
| INV-QD-394 | the characterisation | | the draft, its text and an `Idle` run assigned only in `writeDraft` and `clearRun` |

## Deviations from Plan

None - plan executed exactly as written. Both task verifies ran unmodified (extracted from the plan and run as written)
and passed on the first attempt; no gate was weakened.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `ea7492fc` and `b2948dad` are ancestors of HEAD; `git rev-list --count 1a3de2f5..HEAD` before the SUMMARY is 2.
- `git status --porcelain -- packages scripts spec .changeset` is empty.
- `packages/`, `spec/overview.md`, AGENTS.md and the DoD table are unchanged by this plan; ADR-QD-047, ADR-QD-137,
  ADR-QD-150 and ADR-QD-187 are untouched.
- No requirement was marked complete; WX-01 to WX-07 and CHSE-01 to CHSE-05 stay as they were.
