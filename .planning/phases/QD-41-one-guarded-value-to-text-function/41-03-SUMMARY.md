---
phase: QD-41-one-guarded-value-to-text-function
plan: 03
subsystem: value-to-text
tags: [value-text, core-export, simulation-form, tracer]
plan_head_before: 6bea23345339914f8a5577eb63196e001e36a763
plan_head_after: b428e4002b0bc25856ed1f7b829b00607f0b3513
requires: [41-02]
provides:
  - "valueText: (value: unknown) => string | undefined, public in @qadi/core (packages/core/src/ValueText.ts, last line of the barrel)"
  - "spec/overview.md row for valueText, directly after the Explanation types row (Revision 1.104)"
  - "SimulationForm reads through valueText; its private stringify is gone"
  - "core ValueText.test.ts (22 rule rows plus explain's reading) and devtools ValueTextConsumers.test.ts (3 consumer rows)"
affects: [41-04, 41-05, 41-06]
tech-stack:
  added: []
  patterns: ["bare catch holding only a comment, the GateRegistry precedent", "rules in one table, each consumer's reading of no text pinned through the consumer"]
key-files:
  created:
    - packages/core/src/ValueText.ts
    - packages/core/test/ValueText.test.ts
    - packages/devtools/test/model/ValueTextConsumers.test.ts
  modified:
    - packages/core/src/index.ts
    - packages/devtools/src/model/SimulationForm.ts
    - spec/overview.md
key-decisions:
  - "valueText keeps SimulationForm's guarded body unchanged (one try, one JSON.stringify, a bare catch holding only a comment, then return undefined), so the form's refusal pins prove the module with no behaviour change"
requirements-completed: [TEXT-02]
requirements-advanced: [TEXT-03, WX-03, WX-04]
duration: ~15 min
completed: 2026-11-14
status: complete
commits: 2
---

# Phase 41 Plan 03: valueText in core, the form reads through it Summary

The one guarded value-to-text function is a public `@qadi/core` export, named in the overview, with SimulationForm as its first consumer and every form refusal pin unchanged; its rules are asserted in one 22-row table in core and each devtools consumer's reading of no text is pinned once through the consumer.

## The module

```ts
export const valueText = (value: unknown): string | undefined => {
  try {
    const text: string | undefined = JSON.stringify(value);
    return text;
  } catch {
    // A bigint, a cycle, a throwing `toJSON` or getter, a revoked proxy: no text.
  }
  return undefined;
};
```

Imports nothing, exports only `valueText`; core's barrel gains exactly `export * from "./ValueText.ts";` as its last line.

## Overview row

Directly after the `Explanation`, `RenderOptions`, `RequirementKind` row: `| \`valueText\` | function | \`ValueText.ts\` — the JSON text of a value, or \`undefined\` when it has none (...); never throws. The one guarded value-to-text function: ... (ADR-QD-154) |`. Revision 1.103 to 1.104 by `spec-revise` ("@qadi/core: valueText added (ARCH-88, CCR-QD-432)").

## Verifies (all exit 0)

- Task 1: structural check of ValueText.ts, barrel diff, SimulationForm.ts and the overview row; vitest on SimulationForm, SimulationFields, SimulationSession, NonJsonWitness (217 passed, 21 expected fail) and core NonJsonLiteral, Explanation (62 passed, 14 expected fail); `pnpm typecheck`, `pnpm lint` (house-style 503 files clean), `pnpm circular`, `pnpm spec:api` (926 exports), `spec-revise --check`, `pnpm spec:verify:strict` (21 PASS, 0 FAIL).
- Task 2: case-by-case vitest JSON report check (22 + 1 core rows, 3 devtools rows, 23 and 3 cases, no other test file names valueText); commit order, file sets and trailer check (seven content commits since phase_base); typecheck and lint after the test files.

## Commits

- `192b70c1` refactor(41-03): one guarded value-to-text function in core, the form reads through it (ValueText.ts, barrel, SimulationForm.ts, overview)
- `b428e400` test(41-03): valueText's rules in one table, one row per consumer

## Deviations from Plan

**1. [Trailer] Commit trailer names the executing model** — both commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, which the plan's trailer check accepts (same as 41-01).

**Total deviations:** 1 (documentation only). **Impact:** none.

## Known Stubs

None.

## Threat Flags

None. T-41-05, T-41-06 and T-41-07 are mitigated as planned: thrower rows call `valueText` directly, the catch binds no error and holds no statement, and the overview row shipped in the same commit as the export.

## Self-Check: PASSED

- ValueText.ts, ValueText.test.ts and ValueTextConsumers.test.ts exist; `192b70c1` and `b428e400` are ancestors of HEAD; Explanation.ts, Remedies.ts and Filters.ts unchanged since phase_base.
