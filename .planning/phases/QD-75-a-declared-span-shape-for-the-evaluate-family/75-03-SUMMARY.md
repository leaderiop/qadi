---
phase: QD-75-a-declared-span-shape-for-the-evaluate-family
plan: 03
subsystem: core
tags: [spans, tracer, evaluate, declaration, red-evidence]
phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314
plan_head_before: 491293087cb18da69303510be07a14e551467a42
plan_head_after: 83f3556c749874751f71f0d750d544e1e37cf2ea

requires:
  - phase: QD-75
    provides: "75-02: the 33-row contract, red on the base"
provides:
  - "packages/core/src/EvaluationSpan.ts: evaluateSpan, denialEvent, annotateSpan and SpanOutcome, package-private, every key spelled once"
  - "decideQuestion writes the evaluate span only through the declaration: question before the lookup, outcome under one key on Allow, Deny and Failed"
  - "75-RED-EVIDENCE.md: the question-before-lookup rule and the one-outcome-key rule each seen red once"
affects: [75-04, 75-05, 75-06, 75-07, 75-08, 75-09]

actuals:
  tokens: 5700
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a span family declared in one module with spanStruct, written through annotateSpan so a writer spells no key"
    - "the outcome tied to Decision[\"_tag\"] | \"Failed\" by a satisfies list, so a new decision tag is a compile error at the writer"

key-files:
  created:
    - packages/core/src/EvaluationSpan.ts
  modified:
    - packages/core/src/Lifecycle.ts
    - packages/core/src/PortSpanEncode.ts
    - packages/core/test/Evaluate.test.ts
    - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-RED-EVIDENCE.md

key-decisions:
  - "The one long retitled row in Evaluate.test.ts wraps its title onto its own line (as the contract does) rather than shortening the title the plan names"
  - "The outcome list is written one literal per line so no added line passes 90 columns"

requirements-completed: []  # ESPN-02, ESPN-03, ESPN-04, WX-04, WX-06, WX-07 are held by this plan but stay Pending: only 75-09 marks ESPN rows, and no plan marks a WX row

duration: 12 min
completed: 2026-11-23
status: complete
---

# Phase 75 Plan 03: The evaluate span declared once, written through on every path Summary

A failed `qadi.evaluate` span now says who asked what, and the outcome sits under `qadi.outcome` on Allow, Deny and
Failed: `EvaluationSpan.ts` declares the span and the denial event once, and `decideQuestion` writes only through that
declaration.

phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314

## Performance

- **Duration:** 12 min
- **Completed:** 2026-11-23T08:38Z
- **Tasks:** 2 (1 tracer, 1 auto)
- **Files modified:** 5 (1 created)

## Accomplishments

- `packages/core/src/EvaluationSpan.ts` (not in the barrel) declares `evaluateSpan` (`name` typed `SpanKey`, question
  `{ subjectId, policyTag, action, evaluationId }`, answer `{ outcome, errorTag, obligations }`), `denialEvent`, the
  plain `annotateSpan`, and `SpanOutcome = Decision["_tag"] | "Failed"`. Each of its seven key literals appears once;
  `qadi.subject_id` is read from `sharedQuestionKeys.subjectId` and never spelled there.
- `decideQuestion` opens `Effect.fn(evaluateSpan.name)`, annotates the question right after the evaluation id and
  before the lookup, writes `{ outcome: "Failed", errorTag }` in the failure tap and `{ outcome, obligations }` after
  the walk. `qadi.decision` is written and read nowhere in `packages/` outside the contract that pins its absence; both
  conditional spreads are gone. The denial log keeps `qadi: policy denied` and its three annotations, built with
  `encodeSpan(denialEvent, …)`.
- Contract rows C1 to C7 and C18 turn green by this source change alone, every kept row stays green, and C8 to C17 are
  the only failures of the core suite (2744 tests, 2734 passed, 10 failed, all contract rows).
- `Evaluate.test.ts`'s observability and denial-log rows read keys and the span name through the declaration; the
  failed row is retitled `a failed evaluation annotates qadi.evaluate with its question and error tag`. The proving
  grep matches exactly 12 lines of the file, all port-span assertions; `Lifecycle.ts` holds none.
- Both rules were gutted once and recorded: moving the question after the lookup fails C3 and C4; writing the old key
  beside the new one fails C1, C2, C5, C6, C7 and C18. Neither gut is in a commit.

## Task Commits

1. **Task 1 (tracer): the declaration and the writer** - `81410a1d` (feat) - the four files the plan names.
2. **Task 2: both rules seen red** - `83f3556c` (docs) - only `75-RED-EVIDENCE.md`.

The tracer gate ran: Task 1's verify was re-run end to end after Task 2 and passes, so expansion (75-04) is clear.

## Verifications run

| Verify | Result |
| ------ | ------ |
| Task 1 `<automated>` (with the contract-unchanged comparison taken from the contract's own commit, see below) | pass: `the evaluate span is declared and written through` |
| Task 1 `<automated>` re-run after Task 2 | pass |
| Task 2 `<automated>` | pass: `each evaluate span rule seen red` |
| `pnpm typecheck` | clean |
| `pnpm circular` | `No circular dependency found` |
| `node scripts/check-house-style.mjs` | `house-style: 580 file(s) clean (3 declared switch(es), 71 type-test file(s))` |
| `node scripts/check-api-surface.mjs` | `api-surface: 941 export(s) documented across 9 package(s)` |
| `pnpm exec vitest run --project core` | 2744 tests, 10 failed: contract rows C8 to C17 exactly |
| added-line width, forbidden-token and plan-local-word scans (inside the Task 1 verify) | pass |

## Deviations from Plan

None - plan executed exactly as written.

One verification-only note, no gate weakened: Task 1's verify compares the contract against `$B` (`phase_base`) with
`git diff --quiet "$B" HEAD -- "$C"`, but the contract does not exist on the base (it was added by 75-02's `ecb0256f`),
so that comparison always reports an edit. The equivalent check, `git diff --quiet ecb0256f HEAD -- "$C"` (the
contract's only commit), was run in its place, and `git log -- <contract>` lists that one commit. The plan's two
`<automated>` bodies were extracted to `$TMPDIR/qd75/v75-03-t1.sh` and `v75-03-t2.sh` and run with `bash`, as in 75-02,
because the `bash -c '…'` wrapper cannot carry the commit heredocs. Under the first gut, C8 to C17 also fail (they are
still red on `81410a1d`); the verify and the evidence name only the rows the gut is responsible for.

## Known Stubs

None.

## Threat Flags

None. The new span fields are `SpanValue` leaves naming the subject id, policy tag, action, outcome, error tag and
obligation ids (T-75-05); the question is annotated before the lookup (T-75-06, gut `question-after-lookup`). No
endpoint, auth path or schema was added.

## Next Phase Readiness

Ready for 75-04: `EvaluationSpan.ts` takes the other three spans (`toPredicate`, `guardHealthCheck`, the batch spans)
through the same `declareSpan`/`annotateSpan`, turning C8 to C17 green. The header already names no span that does not
exist yet.

## Self-Check: PASSED

- FOUND: `packages/core/src/EvaluationSpan.ts`, `75-RED-EVIDENCE.md`, `75-03-SUMMARY.md`
- FOUND commits: `81410a1d`, `83f3556c` (both ancestors of HEAD)
