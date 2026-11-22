---
phase: QD-69-one-total-thrown-value-to-message-module
plan: 04
subsystem: core
tags: [thrown-value, total-functions, cause, refusals]
phase_base: 19fe6244bc8b3494823732b1fbf87f3947852fd8
plan_head_before: 00abfb2395bd9b2f9afaab497967052f8b25ed81
plan_head_after: e0a86d8114b4010c7032c0808cee3e196727857c
requires: [69-03]
provides:
  - "thrownMessage and causeMessage: the one total rule from a caught value or an Effect Cause to text, public from @qadi/core"
  - "all six core sites read through it; describeThrown and renderReason deleted"
affects: [69-05, 69-06]
actuals:
  tokens: 40000
  tasks: 3
  commits: 4
tech-stack:
  added: []
  patterns: ["one guarded read per try, fixed words as a module constant", "point-free catch: thrownMessage"]
key-files:
  created:
    - packages/core/src/ThrownMessage.ts
    - packages/core/test/ThrownMessage.test.ts
  modified:
    - packages/core/src/index.ts
    - packages/core/src/JsonHazard.ts
    - packages/core/src/PortKey.ts
    - packages/core/src/PortDerivation.ts
    - packages/core/src/PortWireEncode.ts
    - packages/core/src/SinkCodec.ts
    - packages/core/src/CustomPredicate.ts
    - packages/core/test/PortConformance.test.ts
    - spec/overview.md
key-decisions:
  - "causeMessage lives beside thrownMessage: one rule, what a reader sees of something that went wrong; Cause.pretty is called in a try and falls back to thrownMessage of Cause.squash"
  - "describeThrown and renderReason deleted, not aliased: one name for one rule"
  - "PortWireEncode's catches take thrownMessage point-free, so a wire conversion's Error is now its message without its name (D-02)"
requirements-completed: [THRW-02, THRW-03, THRW-04, WX-03, WX-04, WX-06, WX-07]
status: complete
duration: ~25 min
completed: 2026-11-22
---

# Phase 69 Plan 04: the one total rule and core Summary

`thrownMessage` and `causeMessage` live in `packages/core/src/ThrownMessage.ts`, are public, never throw, and every core site that turns a caught value or a cause into text now reads through them; the nine core RED cases pass. (Requirement checkboxes stay untouched on purpose: 69-09 marks THRW-01..05 complete.)

## Results

- Red table: `<S>/red-thrown.status` = `1`, log line `Error: Cannot find module '../src/ThrownMessage.ts' imported from .../packages/core/test/ThrownMessage.test.ts`; the test commit (90188394) precedes the function commit and holds only the table.
- Green: `ThrownMessage.test.ts` runs 29 rows (22 `thrownMessage`, 7 `causeMessage`), all passing; `PortWire.test.ts` passes whole (R1). Task 2's four suites: `red-check: 0 failed as named, 277 passed` (R2 to R6). Task 3's two suites: `0 failed as named, 334 passed` (R7 to R9), and the whole core project passes.
- `node scripts/check-api-surface.mjs`: `api-surface: 941 export(s) documented across 9 package(s)` (939 at the base). `spec/overview.md` is Revision 1.131; `spec-revise --check`, house-style, `pnpm typecheck` and oxlint are clean.
- Negative gates over `packages/core/src`: inline Error-or-String ternaries 4 at `phase_base`, 0 now; `Cause.pretty` calls 1 in `CustomPredicate.ts` at `phase_base`, 1 in `ThrownMessage.ts` now; no `describeThrown`, `renderReason`, `renderDefect` or old angle-bracketed placeholder in `packages/core`. The one placeholder pin (`is a placeholder for a value that cannot be rendered`) moved to `a value that could not be described`; no other expected value changed.

## Task commits

| Task | Commit | What |
| --- | --- | --- |
| 1 (tracer) | 90188394 | `test(69-04)`: the 29-row table, red before the module exists |
| 1 (tracer) | 53950861 | `feat(69-04)`: `ThrownMessage.ts`, barrel line, `toJson`'s refusal, overview rows |
| 2 | 96de4caf | `fix(69-04)`: `PortKey`, `PortDerivation`, `PortWireEncode`, `SinkCodec` |
| 3 | e0a86d81 | `fix(69-04)`: `CustomPredicate` failure and defect, the placeholder pin |

Tracer gate: Task 1's verify was re-run end to end after its commit and passed before Task 2 started.

## Deviations from Plan

**1. [Rule 3 - Blocking] Task 1's verify flags the namespace import as an `as` assertion**
- **Found during:** Task 1 verify
- **Issue:** the plan's own `ThrownMessage.ts` scan matches `\bas\s+[A-Za-z{(]` after stripping comments, so the required `import * as Cause from "effect/Cause"` reads as an `as` and fails the check on a correct file.
- **Fix:** ran the same verify with import lines stripped before that scan (and `LC_ALL=C` for the plan's `sort`-order comparisons, which the default locale reorders); everything else unchanged, it passed. The source has no `as` assertion. The plan file was not edited.
- **Commit:** none (verification only)

Otherwise the plan executed as written.

## Known Stubs

None.

## Threat Flags

None. T-69-10 and T-69-11 are mitigated as planned; T-69-12 accepted (the one wording change, dropping `Error: ` from a wire refusal, carries less).

## Self-Check: PASSED

- `packages/core/src/ThrownMessage.ts`, `packages/core/test/ThrownMessage.test.ts` exist; commits 90188394, 53950861, 96de4caf, e0a86d81 are ancestors of HEAD.
