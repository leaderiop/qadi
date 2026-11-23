---
phase: QD-75-a-declared-span-shape-for-the-evaluate-family
plan: 04
subsystem: core
tags: [spans, tracer, translation, health-check, batch, declaration]
phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314
plan_head_before: ac000585ae9453e5fe322cfbf101952a9942e921
plan_head_after: 8aae92e2ac1a4ca7d81420f7dc2977ad7c2508c0

requires:
  - phase: QD-75
    provides: "75-03: EvaluationSpan.ts with evaluateSpan, annotateSpan, the shared asked/failed fields"
provides:
  - "toPredicateSpan, guardHealthCheckSpan, decideSubjectsSpan, decideSubjectsStreamSpan and the private answersNothing, declared in EvaluationSpan.ts"
  - "toPredicate states its question before admission and its error tag on every failure through one Effect.tapError inside the span"
  - "createGuardHealthCheck states its question before the walk; decideSubjects and decideSubjectsStream write through their structs"
  - "all 33 contract rows green in three runs, with the contract untouched since its one commit"
affects: [75-05, 75-06, 75-07, 75-08, 75-09]

actuals:
  tokens: 4900
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a failure tag annotated by one Effect.tapError passed as an Effect.fn pipeable, so it runs inside the span"
    - "a batch span answering one shared empty struct: each subject's decision is its own qadi.evaluate span"

key-files:
  created: []
  modified:
    - packages/core/src/EvaluationSpan.ts
    - packages/core/src/Predicate.ts
    - packages/core/src/GuardHealthCheck.ts
    - packages/core/src/SubjectSet.ts
    - packages/core/test/Predicate.test.ts
    - packages/core/test/GuardHealthCheck.test.ts
    - packages/core/test/SubjectSet.test.ts

key-decisions:
  - "The predicate tag is a Schema.String field, not a closed list, because the predicate's tags live in Predicate.ts, which reads EvaluationSpan.ts"
  - "toPredicate's failure tap is passed as an Effect.fn pipeable (it runs inside the span) rather than reindenting the whole body into a pipe"

requirements-completed: []  # ESPN-03, ESPN-04, WX-04, WX-07 are held by this plan but stay Pending: only 75-09 marks ESPN rows, and no plan marks a WX row

duration: 16 min
completed: 2026-11-23
status: complete
---

# Phase 75 Plan 04: The remaining spans written through the declaration Summary

A failed translation now says what was asked and why it failed, a probe says what it asked, and the two batch spans are
written from their declarations: every span of the evaluate family is declared once in `EvaluationSpan.ts`, and all 33
contract rows pass.

phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314

## Performance

- **Duration:** 16 min
- **Completed:** 2026-11-23T08:41Z
- **Tasks:** 2 (1 tracer, 1 auto)
- **Files modified:** 7

## Accomplishments

- `EvaluationSpan.ts` declares `toPredicateSpan` (question: subject, policy tag, action; answer: predicate tag as a
  string, or the error tag), `guardHealthCheckSpan` (answer: healthy, error tag when unhealthy), the module-private
  `answersNothing`, `decideSubjectsSpan` (question: subject count, policy tag, action) and `decideSubjectsStreamSpan`
  (question: policy tag, action; no count, because a stream's length is not known in advance). Each of its ten key
  literals is spelled once on a non-comment line; nothing is exported through the barrel.
- `toPredicate` opens `Effect.fn(toPredicateSpan.name)`, annotates its question right after building it (before
  admission), annotates `predicateTag` on success, and one `Effect.tapError` passed as the `Effect.fn` pipeable annotates
  `errorTag` on every failure: too deep, fields, untranslatable and a port failure.
- `createGuardHealthCheck` opens the declared span and annotates its question before the clock read and the walk; the
  answer is `{ healthy: true }` or `{ healthy: false, errorTag }`. `decideSubjects` annotates its question first;
  `decideSubjectsStream` opens its span with `encodeSpan(decideSubjectsStreamSpan.question, …)` as attributes.
  `decideSubject` keeps its keyless `Effect.fn("qadi.decideSubject")`.
- Under `packages/*/src` only `EvaluationSpan.ts` and `PortSpanEncode.ts` hold a span key of the family, and
  `qadi.subject_id` is spelled once, in `PortSpanEncode.ts`. The three rewritten test files read names and keys through
  the declaration; the proving grep matches 3 lines of `Predicate.test.ts` (port spans) and none of the other two.
- The contract passes whole (33 of 33) in each of three runs, the core suite passes (2744 tests, 0 failed), and the
  contract still has exactly one commit.

## Task Commits

1. **Task 1 (tracer): a translation states its question first and its error tag when it fails** - `cb42f939` (feat) -
   `EvaluationSpan.ts`, `Predicate.ts`, `Predicate.test.ts`. At this commit the kept rows and C1 to C12 and C18 pass,
   C13 to C17 fail, and every `Predicate.test.ts` row passes.
2. **Task 2: the probe and the batches write their spans through the declaration** - `8aae92e2` (feat) - the five files
   the plan names.

The tracer gate ran: Task 1's verify passes, and was re-run end to end after Task 2 and passes, so the expansion was
clear.

## Verifications run

| Verify | Result |
| ------ | ------ |
| Task 1 `<automated>` | pass: `the translation writes through the declaration` (re-run after Task 2: pass) |
| Task 2 `<automated>` | pass: `the whole family writes through the declaration` |
| `pnpm typecheck` | clean |
| `pnpm circular` | clean |
| `node scripts/check-house-style.mjs` | `house-style: 580 file(s) clean (3 declared switch(es), 71 type-test file(s))` |
| `node scripts/check-api-surface.mjs` | `api-surface: 941 export(s) documented across 9 package(s)` |
| contract, three runs | 33 of 33 pass each time |
| `pnpm exec vitest run --project core` | 2744 tests, 0 failed |
| added-line width, forbidden-token and plan-local-word scans (inside the Task 2 verify) | pass |

## Deviations from Plan

None to the code. One sequencing correction and one verification-only note, no gate weakened:

- **Commit boundary.** The five new spans were first written into `EvaluationSpan.ts` in Task 1's commit, which made
  Task 2's "exactly five files" check impossible (`EvaluationSpan.ts` would not change in Task 2). Before anything was
  published, the two local commits were rebuilt with `git reset --soft` and re-committed so Task 1's commit holds only
  `toPredicateSpan` and Task 2's holds the other four spans, as the plan states. The final tree is unchanged.
- **Verification-only.** The plan's two `<automated>` bodies were extracted to `$TMPDIR/qd75/v75-04-t1.sh` and
  `v75-04-t2.sh` and run with `bash`, as in 75-02 and 75-03. Task 2's verify counts the contract's commits since
  `phase_base` (`git log "$B"..HEAD -- "$C"`) and checks the tree is unedited, which holds (one commit, `ecb0256f`).

## Known Stubs

None.

## Threat Flags

None. The new span fields are `SpanValue` leaves: the subject id, policy tag, action, predicate tag, healthy flag, error
`_tag` and subject count (T-75-08); one `Effect.tapError` inside the span covers every translation failure kind
(T-75-09). No resource is carried by any span, and no endpoint, auth path or schema was added.

## Next Phase Readiness

Ready for 75-05: every span of the family is declared and written through the declaration, and the contract passes
whole, so the remaining plans mutate and pin it (the translation's `tapError` and the probe's and batches' ordering are
the rules a gut should turn red).

## Self-Check: PASSED

- FOUND: `packages/core/src/EvaluationSpan.ts`, `Predicate.ts`, `GuardHealthCheck.ts`, `SubjectSet.ts` and the three
  test files; `75-04-SUMMARY.md`
- FOUND commits: `cb42f939`, `8aae92e2` (both ancestors of HEAD)
