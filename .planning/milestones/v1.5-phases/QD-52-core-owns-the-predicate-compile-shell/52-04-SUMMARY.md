---
phase: QD-52-core-owns-the-predicate-compile-shell
plan: 04
subsystem: spec
tags: [adr, spec, changeset, compile-shell, ARCH-99, CCR-QD-443]
requires: [52-03]
provides:
  - "ADR-QD-165 and its index entry"
  - "BEH-QD-596..600, INV-QD-349 and their traceability rows"
  - "the CCR-QD-443 row (INV-QD-350 named unused)"
  - "three changesets: core minor, sql patch, prisma patch"
affects: [52-05]
key-files:
  created:
    - spec/decisions/165-core-owns-the-predicate-compile-shell.md
    - .changeset/core-compile-predicate.md
    - .changeset/predicate-sql-compile-shell-in-core.md
    - .changeset/predicate-prisma-compile-shell-in-core.md
  modified:
    - spec/decisions/index.yaml
    - spec/behaviors/31-predicate-compilation.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
decisions:
  - "INV-QD-350 stays unused: 'a defect counts neither outcome' is part of INV-QD-349's statement"
status: complete
plan_head_before: 6787602aceadb0fab99386d98564dc7c47d037f0
plan_head_after: b0118b2449e56c5960e1b69c4256576461d34a4b
commits: 3
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
completed: 2026-11-16
requirements-completed: [WX-02, WX-07]
---

# Phase 52 Plan 04: Records for the compile shell

ADR-QD-165, BEH-QD-596..600, INV-QD-349, the traceability and CCR-QD-443 rows and three changesets record that core owns the predicate compile shell, using only the reserved numbers.

## New Revs

| File | Rev |
| --- | --- |
| `spec/decisions/165-core-owns-the-predicate-compile-shell.md` | 1.0 (new) |
| `spec/behaviors/31-predicate-compilation.md` | 1.10 |
| `spec/invariants.md` | 1.150 |
| `spec/traceability.md` | 1.213 |
| `spec/README.md` | 1.244 |
| `spec/overview.md` (52-03, cited by the CCR row) | 1.120 |

## Changesets

- `.changeset/core-compile-predicate.md`: `"@qadi/core": minor`
- `.changeset/predicate-sql-compile-shell-in-core.md`: `"@qadi/predicate-sql": patch`
- `.changeset/predicate-prisma-compile-shell-in-core.md`: `"@qadi/predicate-prisma": patch`, states that `compiled` is now counted after the render (D-06a)

None says Breaking; `pnpm changeset version` was not run; nothing released.

## Results

- `node scripts/spec-revise.mjs --check`: every Revision matches its newest Change History entry
- `pnpm spec:examples`: `doc-examples: 116 block(s) compile`
- `pnpm spec:verify:strict` (after the CCR row): `PASS: 21 FAIL: 0 SKIP: 0`
- `pnpm check:pr < /dev/null`: exit 0, `run-check: ran 16 of 17 steps; "pnpm mutation" was skipped` (output kept at `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/bf083921-e7cd-4930-bcad-a3ef483d2ac8/scratchpad/checkpr-52-04.txt`)
- `git diff phase_base -- AGENTS.md spec/behaviors/25-inspection.md apps/website/src/content/docs/docs/reference/upgrading.md scripts/check-house-style.mjs`: empty

## Commits

- `3974ddaf` docs(52-04): ADR-QD-165, core owns the predicate compile shell
- `ee707a5f` docs(52-04): BEH-QD-596..600, INV-QD-349 and traceability for the compile shell
- `b0118b24` docs(52-04): CCR-QD-443 and the compile-shell changesets

## Deviations from Plan

None - plan executed exactly as written. Two cosmetic details: the ADR links ADR-QD-054 and ADR-QD-123 from the BEH sections by their real file names (`054-a-companion-package-may-compile-a-dialect.md`, `123-a-metric-is-declared-once.md`), and the CCR-QD-443 row cites `spec/overview.md` Rev 1.120 as 52-03 left it.

## Known Stubs

None.

## Threat Flags

None. Records only; no `packages/*/src` edit and no dependency change.

## Self-Check: PASSED

All nine plan files exist; commits 3974ddaf, ee707a5f and b0118b24 are ancestors of HEAD; COMP-01..04 were not ticked (52-05 does that).
