---
phase: QD-41-one-guarded-value-to-text-function
plan: 04
subsystem: value-to-text
tags: [value-text, explain, remedies, filters, red-to-green]
plan_head_before: ca65c3e4a5059dbfb9e31dfcdf944e32f90e6b71
plan_head_after: 39bbd1554148b8710cf5447ff9bea5906880fffb
requires: [41-03]
provides:
  - "explain reads every literal through valueText: private NO_JSON_FORM and literalText in Explanation.ts"
  - "the remedy label reads through valueText: private NO_JSON_FORM and a block-bodied render in Remedies.ts"
  - "Filters' search text reads through valueText, its try/catch gone"
  - "both RED files (core NonJsonLiteral, devtools NonJsonWitness) pass as plain cases"
affects: [41-05, 41-06]
actuals:
  tokens: 2900
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: ["a consumer tells no-JSON-form from threw by typeof around valueText: object gets the fixed words, anything else the word undefined", "a bigint is its digits and n, ahead of valueText"]
key-files:
  created: []
  modified:
    - packages/core/src/Explanation.ts
    - packages/devtools/src/model/Remedies.ts
    - packages/devtools/src/model/Filters.ts
    - packages/core/test/NonJsonLiteral.test.ts
    - packages/core/test/Explanation.test.ts
    - packages/core/test/ValueText.test.ts
    - packages/devtools/test/model/NonJsonWitness.test.ts
    - packages/devtools/test/model/Remedies.test.ts
    - packages/devtools/test/model/ValueTextConsumers.test.ts
key-decisions:
  - "A literal with no JSON text is written as the fixed words `a value with no JSON form` when it is an object, and as the word `undefined` otherwise, in both explain and the remedy label; a list with no JSON text is written element by element in explain"
requirements-completed: [TEXT-01, TEXT-03, TEXT-04, WX-04, WX-06]
duration: ~12 min
completed: 2026-11-14
status: complete
commits: 3
---

# Phase 41 Plan 04: explain, the remedy label and Filters read through valueText Summary

`explain`, the remedy label and the search text no longer stringify an unknown value on their own: a bigint reads as its digits and `n`, any other value with no JSON form as the fixed words `a value with no JSON form` (or the word `undefined` for an undefined, function or symbol), and both RED files pass as plain cases.

## What changed

Explanation.ts (`f68e4565`): imports `valueText` from `./ValueText.ts`; private `NO_JSON_FORM` and `literalText` (a bigint as `${String(value)}n`, else `valueText(value) ?? (typeof value === "object" ? NO_JSON_FORM : "undefined")`) above `refText`. Three phrases:

- `LiteralRef: (r) => literalText(r.value)`
- `Contains: (m) => \`contains ${literalText(m.value)}\``
- `In: (m) => \`is one of ${valueText(m.values) ?? \`[${m.values.map(literalText).join(",")}]\`}\``

A list with JSON text keeps it byte for byte; only a list with none is written element by element. `verbatim` is unchanged.

Remedies.ts (`b9f2ef63`): `valueText` joins the `@qadi/core` import; private `NO_JSON_FORM`; `render` is now

```ts
const render = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (typeof v === "bigint") return `${String(v)}n`;
  return valueText(v) ?? (typeof v === "object" ? NO_JSON_FORM : "undefined");
};
```

The three callers are unchanged. Two remedies with no JSON form on one attribute share a label and `dedupeBy` keeps the first.

Filters.ts (`39bbd155`): `import { type Resource, valueText } from "@qadi/core"`; `render` is a string as `[value]`, else `valueText(value)` as `[]` or a one-element array. The `try`/`catch` is gone.

## Scoped grep (comment-stripped `JSON.stringify(` calls)

```
packages/core/src/ValueText.ts: JSON.stringify(value)
packages/core/src/Explanation.ts: JSON.stringify(value)
packages/devtools/src/model/Remedies.ts: none
packages/devtools/src/model/Filters.ts: none
packages/devtools/src/model/SimulationForm.ts: JSON.stringify(name)
```

`valueText` is named in exactly Explanation.ts, ValueText.ts, Filters.ts, Remedies.ts and SimulationForm.ts.

## The two characterisation lines that changed

- core `Explanation.test.ts`, case `an object whose toJSON gives nothing`: `` "requires attribute `the subject's x equals undefined`" `` became `` "requires attribute `the subject's x equals a value with no JSON form`" ``.
- devtools `Remedies.test.ts`, same case title: `"with subject attribute x = undefined"` became `"with subject attribute x = a value with no JSON form"`.

Every other existing pin passes unchanged. RED flips are the removal of `.fails` only (`NonJsonLiteral.test.ts` one site; `NonJsonWitness.test.ts` the reading describe in Task 1, the rest in Task 2). New cases: core `ValueText.test.ts` second explain case; `Remedies.test.ts` describe `a remedy label with no JSON form, deduplicated`; `ValueTextConsumers.test.ts` fourth row.

## Task Commits

1. **Task 1: explain** - `f68e4565` (fix)
2. **Task 2: the remedy label** - `b9f2ef63` (fix)
3. **Task 3: Filters** - `39bbd155` (refactor)

## Verification

- Task 1: verifies 1 (git-shape, vitest report: 14 core RED cases, explain mapping describe) exit 0; verify 2 (Explanation.ts grep) exit 0; `pnpm exec vitest run --project core` 2273 passed.
- Task 2: verify 1 (21 RED cases, dedupe case, consumer describe) exit 0; verify 2 (Remedies.ts grep) exit 0; Remedies, WhatIf, both session suites and the consumer rows 217 passed.
- Task 3: scoped grep exit 0; core 2273 and devtools 1437 passed; `pnpm typecheck`, `pnpm lint` (house-style: 503 files clean) and `pnpm circular` exit 0; commit-order verify exit 0 (ten content commits since `phase_base`, each with its Co-Authored-By trailer; Inspect.ts and the devtools react layer unchanged).
- Mutation was not re-run in this plan; the plan records the planning-time Stryker read (Explanation.ts 237/240, Remedies.ts 309/309, Filters.ts 75/75), and 41-06 owns the phase mutation check.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. oxlint reports pre-existing warnings in `.codex/` and a few test files that this plan does not own.

## Known Stubs

None.

## Self-Check: PASSED

- Commits `f68e4565`, `b9f2ef63`, `39bbd155` are ancestors of HEAD.
- Modified files exist and carry the stated changes; scoped grep and order verifies exit 0.
