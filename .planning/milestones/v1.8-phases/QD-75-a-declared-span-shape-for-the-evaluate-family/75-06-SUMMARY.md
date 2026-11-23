---
phase: QD-75-a-declared-span-shape-for-the-evaluate-family
plan: 06
subsystem: tooling
tags: [house-style, span-keys, budget, agents-md, mutation-evidence]
phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314
plan_head_before: 5f6e31b4170224e856153603f304fa7f6ed2cca3
plan_head_after: 9b1df2aade8d7ce4262cfa84828255a11b222adc

requires:
  - phase: QD-75
    provides: "75-04/75-05: every span of the evaluate family declared in EvaluationSpan.ts, written and tested through it"
provides:
  - "[span-key-source]: the key set read from EvaluationSpan.ts (plus sharedQuestionKeys.subjectId), refused anywhere else in library source"
  - "[span-key-literal] with SPAN_KEY_LITERAL_BUDGET (nine rows) and [span-key-literal-table] against AGENTS.md section 6"
  - "75-RED-EVIDENCE.md: nineteen plants (M1 to M14 red, N1 to N5 clean) recorded"
affects: [75-07, 75-08, 75-09]

actuals:
  tokens: 28000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a rule's key set read from the declaration it guards, with a pinned minimum so a moved declaration fails instead of passing vacuously"
    - "a budget and its AGENTS.md table compared as maps, in both directions, in one commit"

key-files:
  created: []
  modified:
    - scripts/check-house-style.mjs
    - AGENTS.md
    - packages/core/src/EvaluationSpan.ts
    - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-RED-EVIDENCE.md

key-decisions:
  - "The shared key is tolerated once in PortSpanEncode.ts (its own declaration line) and every other family key is refused there; the plan sentence about that file was ambiguous, and this reading holds both the 'any other key' and the 'shared one spelled once' meanings"
  - "A literal rule with an unreadable or undersized key set is skipped rather than run, because an empty alternation would match the empty string; the source rule already fails in that case (plant M11)"
  - "The contract's budget row is 96, measured at execution with the rule's own regex"

requirements-completed: []  # ESPN-04, WX-04, WX-06, WX-07 are held by this plan but stay Pending: only 75-09 marks ESPN rows, and no plan marks a WX row

duration: 25 min
completed: 2026-11-23
status: complete
---

# Phase 75 Plan 06: The span-key house-style rule and its table Summary

A span key of the evaluate family is now declared once and read through its declaration, and the lint says so: the key set
is read from `EvaluationSpan.ts` (never listed in the script), any other library file that mentions a key fails, and a
quoted key in a test outside a title is a counted golden row held to AGENTS.md section 6's table.

phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314

## Accomplishments

- `scripts/check-house-style.mjs` gains one block after the ADR-QD-123 metric block: `SPAN_KEY_DECLARATION`,
  `SPAN_KEY_SHARED`, `SPAN_KEY_MIN = 11`, `SPAN_KEY_LITERAL_BUDGET` and the three rules. The key set is every quoted
  `qadi.<snake_case>` on a non-comment, non-`name:` line of the declaration plus `sharedQuestionKeys.subjectId`; it holds 11
  keys today. No key is written in the script. The header list gains the thirteenth budget.
- `[span-key-source]` fails on: an unreadable shared key, a key set under 11, a key spelled on more than one line of the
  declaration, the shared key spelled in the declaration, and a bounded mention (comments included) of any key in a
  `packages/*/src` or `features/step-definitions` file other than the two. `PortSpanEncode.ts` may hold the shared key once.
- `[span-key-literal]` counts exact quoted keys (`"`, `'`, backtick) outside whole comment lines and outside a
  `describe`/`it`/`test` title, per `packages/*/test` and `packages/*/bench` file, against nine budget rows: the contract
  (96, measured), `Evaluate.test.ts` 12, `PortAccess.test.ts` 3, `PortServe.test.ts` 5, `PortSpan.test.ts` 9,
  `Predicate.test.ts` 3, devtools `PortCalls.test.ts` 1, devtools `Source.test.ts` 2, testing `CollectingTracer.test.ts` 2.
- AGENTS.md section 6 gains the paragraph and the `| Test file | Span-key literals | Why |` table after the
  `METRIC_ID_LITERAL_BUDGET` paragraph; `[span-key-literal-table]` compares it with the budget as a map (missing table,
  malformed row, repeated row, missing or extra row all fail).
- `EvaluationSpan.ts`'s header gains one comment sentence naming the two rules. No other line under `packages/` changed.
- Plants: M1 to M14 each fail with exactly one violation, the named rule on the named file; N1 to N5 are clean. Recorded
  in `75-RED-EVIDENCE.md`, none committed, tree restored with `git checkout -- <file>` after each.

## Task Commits

1. **Task 1 (tracer): the span-key rule, budget and AGENTS.md table** - `6980ba12` (feat) - the script, AGENTS.md and the
   header sentence.
2. **Task 2: every span-key check planted once** - `9b1df2aa` (docs) - `75-RED-EVIDENCE.md` only.

## Verification

- Task 1 verify (`verify-06-1.sh`, extracted from the plan): `the span-key rule holds and agrees with its table`, exit 0
  (run after the commit; it also checks the commit shape, trailer, packages scope and plan-local words).
- Task 2 verify: `every span-key check seen red`, exit 0.
- `node scripts/check-house-style.mjs`: `house-style: 581 file(s) clean (3 declared switch(es), 72 type-test file(s))`.
- `pnpm exec oxlint scripts/check-house-style.mjs`: exit 0 (one pre-existing `prefer-string-starts-ends-with` warning at
  line 1093, not touched). `node scripts/check-dod-table.mjs`: 26 steps match, 154 references resolve. `pnpm typecheck`:
  exit 0. `check-api-surface` and `check-devtools-claims` still pass.
- No line added to the script or `EvaluationSpan.ts` is longer than 90 columns; the contract test is unchanged since its
  one commit `ecb0256f`.

## Deviations from Plan

None - plan executed exactly as written.

Notes, not deviations: the plan's sentence on `PortSpanEncode.ts` ("mentions any family key other than the shared one
once") is ambiguous; the implemented reading is recorded under key-decisions and holds both meanings. The commit trailer is
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, as the run notes and the task verify require.

## Known Stubs

None.

## Threat Flags

None. T-75-12 is mitigated by the pinned `SPAN_KEY_MIN` (plant M11 fails); T-75-13 by the two-direction budget and table
check (plants M4, M5, M13, M14 fail).

## Issues Encountered

None.

## Next Phase Readiness

Ready for 75-07. `verify-traceability --strict` still reads PASS 20 / FAIL 1 by design (the CCR-QD-467 README row arrives
in 75-08).

## Self-Check: PASSED

- `6980ba12` and `9b1df2aa` are ancestors of HEAD; `git rev-list --count 5f6e31b4..HEAD` is 2 before this summary.
- `scripts/check-house-style.mjs`, `AGENTS.md`, `packages/core/src/EvaluationSpan.ts` and `75-RED-EVIDENCE.md` exist and
  hold the changes above; `git status --porcelain -- packages scripts spec .changeset` is empty.
