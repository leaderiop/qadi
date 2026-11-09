---
phase: 04-gate-instrumentation-hook
plan: 03
subsystem: spec
tags: [spec, adr, ccr, traceability, changeset, ARCH-49]

requires:
  - phase: 04-01
    provides: "useGates, GateScopeContext and the leaf MissingQadiProviderError.ts"
  - phase: 04-02
    provides: "The D-07 finding, the D-03 reasoning and the two new React test files"
provides:
  - "ADR-QD-111 (QADI-ADR-111) with its index entry, traceability row and D-49-a to D-49-h table"
  - "CCR-QD-388 register row and README change history"
  - "ADR-QD-053 and ADR-QD-080 amendments, BEH-QD-233 and INV-QD-046 naming useGates"
  - "The overview row for the relocated MissingQadiProviderError"
  - ".changeset/gate-hook.md, a patch for @qadi/react"
affects: [04-04]

plan_head_before: e6b262b9a99f2c8adf89e950815774ce04f1da13
plan_head_after: d17626ff17dc36b46a71f9e9b004725a1da15bcd

actuals:
  tokens: 9000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A predicted spec-revise revision can be written into a CCR Files column before the bump, then checked against what spec-revise prints"

key-files:
  created:
    - spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md
    - .changeset/gate-hook.md
  modified:
    - spec/decisions/index.yaml
    - spec/README.md
    - spec/traceability.md
    - spec/decisions/053-a-gate-can-be-found.md
    - spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md
    - spec/behaviors/28-devtools-screens.md
    - spec/invariants.md
    - spec/overview.md

key-decisions:
  - "ADR-QD-111 is written rather than a CCR-only note, because ADR-QD-080's 2026-10-08 amendment names the writer lookup as serving every guard, which makes the resolution point a documented contract (D-09)"
  - "INV-QD-064 is left unchanged: its Source names the handle and the private slot, not useGate or the writer lookup as current behaviour"

requirements-completed: [XC-02, XC-03]

coverage:
  - id: D1
    description: "ADR-QD-111, its index entry, traceability row, the CCR-QD-388 row and README history exist and gate 10 is green"
    requirement: "XC-02"
    verification:
      - kind: command
        ref: "pnpm spec:verify:strict (PASS: 21 FAIL: 0 SKIP: 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "ADR-QD-053, ADR-QD-080, BEH-QD-233 and INV-QD-046 describe useGates and the once-resolved writer, with every REQUIREMENT block unchanged"
    requirement: "XC-02"
    verification:
      - kind: command
        ref: "pnpm spec:verify:strict && pnpm spec:examples (101 blocks compile); git show -U0 3958927 -- spec/behaviors/28-devtools-screens.md | grep -c '^[-+] *\\(REQUIREMENT\\|MUST\\)' prints 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "The overview names where MissingQadiProviderError is declared, no export changed, and the changeset is a patch for @qadi/react only"
    requirement: "XC-03"
    verification:
      - kind: command
        ref: "pnpm spec:api (862 exports documented) && pnpm spec:gates (25 steps match pnpm check); grep -c '\"@qadi/' .changeset/gate-hook.md prints 1"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-11-08
status: complete
---

# Phase 04 Plan 03: ARCH-49 spec records Summary

**ADR-QD-111, the CCR-QD-388 row, four amended documents, the overview row and a patch changeset now record that a gate's writer is resolved once by `QadiProvider` and that one `useGates` hook serves every gate kind.**

## Performance

- **Duration:** about 10 min (wall clock)
- **Completed:** 2026-11-08T04:57:16Z
- **Tasks:** 3
- **Files:** 10 (2 created, 8 modified)

## Numbers used

- **ADR-QD-111** and **CCR-QD-388**, as reserved. At execution both greps (`grep -rn "ADR-QD-111\|CCR-QD-388\|ARCH-49" spec/`, `ls spec/decisions | grep -E '^11[0-9]-'`) showed only ADR 110 and nothing for the reserved numbers, so `next-id.mjs` was not run and no substitute was needed.

## Revisions `spec-revise` assigned

| Document | Revision |
| -------- | -------- |
| `spec/README.md` | 1.120 to 1.121 |
| `spec/traceability.md` | 1.123 to 1.124 |
| `spec/decisions/053-a-gate-can-be-found.md` | 1.4 to 1.5 |
| `spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md` | 1.2 to 1.3 |
| `spec/behaviors/28-devtools-screens.md` | 1.10 to 1.11 |
| `spec/invariants.md` | 1.81 to 1.82 |
| `spec/overview.md` | 1.72 to 1.73 |
| `spec/decisions/111-...md` | 1.0 (new) |

The CCR-QD-388 Files column was written in Task 1, before the other revisions existed, using the next minor of each document. Every prediction matched what `spec-revise` printed.

## `pnpm spec:verify:strict` tail

```
| PASS   | Revision = newest history entry            | every header agrees

PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
```

Also green at the end: `pnpm spec:examples` (101 blocks compile), `pnpm spec:api` (862 exports documented across 9 packages), `pnpm spec:gates` (25 steps match `pnpm check`, 139 references resolve).

## Accomplishments

- ADR-QD-111 follows ADR-QD-103's shape: Context, Decision, a D-49-a to D-49-h table that maps one-to-one to D-01 to D-08, Consequences (the D-07 counts, the D-03 reasoning, the fail-closed `Pending` for an absent entry, the weakly held group of one) and Alternatives considered. It states the import rule (ADR-QD-037) that forced the structural `GateAtoms` scope and the `MissingQadiProviderError` leaf. No checkpoint was raised in 04-01, so the group-of-one paragraph stands.
- ADR-QD-053 and ADR-QD-080 each carry a dated pointer to ADR-QD-111, and both Status rows and the index name it. ADR-QD-080's amendment says the 2026-10-08 "serves every guard" now reads as "serves the provider, which serves every guard".
- BEH-QD-233's prose names `useGates`; no REQUIREMENT block changed and no code fence was added.
- INV-QD-046's Source, its "not a feature switch" paragraph and its Enforcement name `useGates` and the two new test files, and say ARCH-49 left every pre-existing React test file unedited. The historical "127 tests" sentence is kept.
- Traceability: document 09 gains `MissingQadiProviderError.ts`, INV-QD-046's enforcement cell names the new tests, §3 has the ADR-QD-111 row, §4 has rows for the three React test files. Document 28 already named `GateWriter.ts`.

## Task Commits

1. **Task 1: ADR-QD-111 and its registers** - `8c0f143` (docs)
2. **Task 2: amend ADR-QD-053, ADR-QD-080, BEH-QD-233 and INV-QD-046** - `3958927` (docs)
3. **Task 3: overview row and changeset** - `d17626f` (docs)

## Deviations from Plan

None - plan executed exactly as written.

Two things the plan left open, for the record. INV-QD-064 was read and left unchanged, because its Source names the handle and the private slot and not `useGate` or the writer lookup. The `index.yaml` status for ADR-QD-053 still omits ADR-QD-103, as it did before; it gains only ADR-QD-111. ADR-QD-053's own Status row already named ADR-QD-103.

## Known Stubs

None.

## Threat Flags

None. T-04-08 is mitigated by gate 10 and gate 13, both green. The prose was written from the two earlier SUMMARYs, not from this plan's expectations.

## Issues Encountered

None. `.planning/config.json` (modified) and `.planning/state.json` (untracked) were already dirty before this plan began and are not part of its commits.

## Next Phase Readiness

Ready for 04-04: the ADR, CCR row, changeset and overview are in place. The coverage threshold and the full `pnpm check` are 04-04's.

## Self-Check: PASSED

- FOUND: spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md
- FOUND: .changeset/gate-hook.md
- FOUND commits: 8c0f143, 3958927, d17626f
