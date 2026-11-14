---
phase: "42"
status: clean
iterations: 2
created: "2026-11-14"
---

# Phase 42 — Code Review Disposition

| Iteration | Critical | Warning | Info | Outcome |
|---|---|---|---|---|
| 1 (`0f96d8a1`) | 0 | 2 | 2 | all four fixed (`74067e6e`, `3dd1c88e`, `187354ea`, `ccf659e6`; report `7863c63d`) |
| 2 (`1dff2909`) | 0 | 0 | 1 | the IN-01 fix had dropped a space (`const isMismatch =(`); restored by the orchestrator (`b004b9ab`), whitespace only, no third review needed |

## Findings

- **WR-01** (fixed): ADR-QD-093 and ADR-QD-041 got dated 2026-11-14 amendments, and BEH-QD-151 got a dated blockquote, each naming `SeededQuestion.ts`. ADR-QD-149:43 needed no change, because its 42-04 amendment already covers it. No history was rewritten.
- **WR-02** (fixed): the late-seed test asserts the pairs exist and the grant atom is writable before it sets the grant.
- **IN-01** (fixed): `isMismatch` is package-private inside `SeededQuestion.ts`. `pnpm spec:api` stays at 927 exports.
- **IN-02** (fixed): the test imports `HydrationMismatch` from `DeveloperSignals.ts`.

## Mutation after the review fixes

The same invocation as 42-01 and 42-05, `stryker.react.mjs --mutate 'packages/react/src/QadiAtoms.ts,packages/react/src/HydrationEngine.ts,packages/react/src/SeededQuestion.ts'`, run on the tree after `187354ea`/`ccf659e6`. The whitespace fix does not change any mutant.

| File | Base (42-01) | After (42-05) | After the review fixes |
|---|---|---|---|
| `HydrationEngine.ts` | 0.9784 (226/231) | 1 (183/183) | 1 (183/183) |
| `QadiAtoms.ts` | 0.8966 (52/58) | 0.9 (36/40) | 0.9 (36/40) |
| `SeededQuestion.ts` (moved) | 5 base survivors | 57/62, the same five | 57/62, the same five |
