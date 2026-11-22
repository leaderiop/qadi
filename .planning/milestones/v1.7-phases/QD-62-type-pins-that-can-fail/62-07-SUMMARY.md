---
phase: QD-62-type-pins-that-can-fail
plan: 07
subsystem: spec
tags: [adr, ccr, traceability, tstyche, definition-of-done]
phase_base: 4cab2e74afd9487e19d9f025dd7a6436e459ba5c
plan_head_before: b54a51ea
plan_head_after: fbe0d4df
requires: [62-06]
provides:
  - "ADR-QD-175 (new, Rev 1.0), indexed, traced and registered as CCR-QD-453"
  - "ADR-QD-037 Rev 1.7 amended; DoD Rev 1.16 links ADR-QD-175"
affects: [62-08]
tech-stack:
  added: []
  patterns: ["spec-revise.mjs for every revision bump"]
key-files:
  created:
    - spec/decisions/175-a-negative-type-pin-can-fail.md
  modified:
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
    - spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md
    - spec/process/definitions-of-done.md
decisions:
  - "ADR-QD-175 written as planned; the checks landed as the plan described, so no wording changed beyond the timing figure and the overload bullet"
requirements: [WX-02, WX-03]
metrics:
  duration: ~15min
  completed: 2026-11-20
status: complete
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
---

# Phase QD-62 Plan 07: ADR-QD-175 and CCR-QD-453 Summary

ADR-QD-175 records tstyche's own tsconfig, the pin rule, the budget and the two passes; the CCR-QD-453 row, traceability, ADR-QD-037's amendment and the DoD link make every register name it. Requirement ids are left for the 62-08 close sweep.

## Revisions written

- `spec/decisions/175-a-negative-type-pin-can-fail.md` Rev 1.0 (2026-11-20), `spec/decisions/index.yaml` entry.
- `spec/traceability.md` 1.223 to 1.224 (section 3 ADR-QD-175 row and ADR-QD-037 amendment; section 4 `FloatingEffectPins.tst.ts` row and DecisionLog's ADR-QD-175).
- `spec/README.md` 1.258 to 1.259 (CCR-QD-453, `Ids used: ADR-QD-175. Unused: BEH-QD-646–650, INV-QD-369–370.`).
- ADR-QD-037 1.6 to 1.7; DoD 1.15 to 1.16.

## RED evidence

Before the CCR-QD-453 row existed (ADR, index and traceability in place), `bash spec/scripts/verify-traceability.sh --strict`:

```
| FAIL   | CCR register coverage | drift from KNOWN_GAPS (backfill the register or update the script's list): got [078 079 080 081 123 124 125 126 127 128 129 130 131 132 134 136 137 453], expected [078 079 080 081 123 124 125 126 127 128 129 130 131 132 134 136 137]
PASS: 20   FAIL: 1   SKIP: 0 (strict: skips count as failures)
```

After the row: `PASS: 21   FAIL: 0   SKIP: 0`.

## Results

- `spec-revise.mjs --check`, gate 11 (`dod-table: 25 step(s) match pnpm check, 151 reference(s) resolve`), `pnpm -s spec:api` (`api-surface: 939 export(s) documented across 9 package(s)`), `spec:examples` and `spec:claims` all exit 0.
- `git diff --quiet 4cab2e74 -- 'packages/*/src'` is clean. BEH-QD-646–650 and INV-QD-369–370 appear only in the CCR row.

## Deviations from Plan

**1. [Rule 1 - Bug] Timing figure.** Plan text said each tstyche pass takes "about eight seconds". Measured `node scripts/run-tstyche.mjs`: about 17 s wall (warm) to 35 s (a loaded run) for both passes; 62-06 saw about 20 s. Both the DoD paragraph and ADR-QD-175's Consequences now say "about ten seconds" per pass, as the orchestrator directed.
- Files: `spec/process/definitions-of-done.md`, `spec/decisions/175-a-negative-type-pin-can-fail.md`. Commits: `fbe0d4df`, `0c9114c1`.

**2. [Plan's own contingency] Overloaded subject.** 62-03 found `askActed` overloaded, so the last Consequences bullet names it and the `ActedLeaf` signature its `Params<…>` pin reads, as the plan's trailing note prescribes.

Step 0 check: every sentence of "The gate holds it", "tstyche runs twice", "The characterisation is the one exception" and the Consequences matched the committed `[not-callable-control]`, `[tstyche-plugin-drift]` blocks and `scripts/run-tstyche.mjs`; nothing landed differently.

Tooling note (not fixed, out of scope): `scripts/spec-revise.mjs` drops its first positional argument unless `--date` is given (`index !== dateFlag + 1` is `index !== 0` when no flag), so it prints usage; every call here passed `--date 2026-11-20`.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- ADR file FOUND; commits 0c9114c1 and fbe0d4df are ancestors of HEAD.
