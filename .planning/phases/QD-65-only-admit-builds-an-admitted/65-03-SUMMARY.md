---
phase: QD-65-only-admit-builds-an-admitted
plan: 03
subsystem: core
tags: [admission, matcher-context, supplied-flags, mutation-evidence]
phase_base: d1ac1df0629e95797f406c5c46da364e6542dce2

requires:
  - phase: QD-65-only-admit-builds-an-admitted
    provides: 65-01's getter cases E7 to E10 (red on the base) and 65-02's private-constructor `Admitted`
provides:
  - the `SUPPLIED` rows read the matcher context `admit` builds, not the question
  - `admit` reads the question's resource and action once, into the one `context` that is also the stored matcher context
  - the getter cases shown to fail when either read is restored
affects: [QD-65-04, QD-65-05, QD-65-06]

actuals:
  tokens: 6000
  tasks: 2
  commits: 2
plan_head_before: b443e5804fe4c2d8f1f66f3aa7940a17f295aea6
plan_head_after: 3a772eea6a2cd2f477a354568a00aadf1e967b58
commits: 2

tech-stack:
  added: []
  patterns:
    - "a derived flag reads the value it describes from one object built once, so the two cannot disagree"

key-files:
  created: []
  modified:
    - packages/core/src/Admission.ts
    - .planning/phases/QD-65-only-admit-builds-an-admitted/65-RED-EVIDENCE.md

key-decisions:
  - "None beyond the plan; Admission.ts is the probed file, byte for byte (SHA-256 0d15bd14...)"

requirements-completed: [ADMT-03, WX-04, WX-06]

duration: 6min
completed: 2026-11-20
status: complete
---

# Phase 65 Plan 03: The supplied flags read the matcher context Summary

**`Admitted.admit` builds one `MatcherContext` after the depth check and passes it to `SUPPLIED[rowSource](context)`, which stores the same object as the matcher context, so the question's resource and action are each read once and the `"asked"` flags cannot disagree with what the matchers see.**

## Accomplishments

- `Admission.ts` is the planned file, SHA-256 `0d15bd143b5d32dd8ff763a8525f0408db756ce487b0c413aaf8467d001e6059`; lines 1 to 53 are unchanged. `SUPPLIED` keeps its `{ readonly [Source in RowSource]: ... }` shape, now `(context: MatcherContext) => SuppliedBy[Source]`; the `"row"` row stays `resource: true`. The doc comments claim no compile-time guarantee for the `"asked"` flags and say that `admit` reads the question's resource and action once, not that it reads every field once (`policy`, `maxDepth` and `subject` are still read more than once).
- `Admission.test.ts` and `LeafMatrix.test.ts`: 22 of 22 passed, E1 to E10 among them, with no test file edited (E7 to E9 were red after 65-02).
- Core project: 82 files, 2653 tests, 0 failed (the base's 2649 plus 4).
- `pnpm typecheck` exit 0; `node scripts/run-tstyche.mjs`: `349 passed, 1 skipped, 350 total` then `348 passed, 2 skipped, 350 total`; oxlint clean on `Admission.ts`; `house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))`; `api-surface: 939 export(s) documented across 9 package(s)`.
- `node <S>/derive-variants.mjs <S>` (scratch) exits 0 and prints exactly:

  ```text
  the action read again from the question: E8 E9 of 17
  the resource read again from the question: E7 E10 of 17
  ```

  The file was restored byte for byte after each; the resource variant fails E10 because its spread reads the resource a second time even for the row source, whose flag ignores it. Recorded in `65-RED-EVIDENCE.md` under `## The derivation's variants`.
- The old-contract regex finds no line under `packages/`; the one line left in the live tree is `spec/decisions/172-admission-produces-the-one-walk-environment.md:55`, which 65-05 rewrites (other hits are phase planning records and the v1.6 archive).
- `git diff phase_base --stat -- packages` lists `Admission.ts`, `Admission.test.ts` and `WalkEnvironment.tst.ts` only; `Walk.ts` and `Predicate.ts` are byte-identical to `phase_base`.

## Task Commits

1. **Task 1 (tracer): the derivation, the getter cases green and the whole core project** - `96771886` (fix)
2. **Task 2: the derivation undone one fact at a time, and the evidence recorded** - `3a772eea` (docs)

The tracer gate was the task's own `<verify>`, run end to end after the commit: it passed. Task 2's `<verify>` passed whole.

## Files Created/Modified

- `packages/core/src/Admission.ts` - `SUPPLIED` reads the context; `admit` builds `const context: MatcherContext` once
- `.planning/phases/QD-65-only-admit-builds-an-admitted/65-RED-EVIDENCE.md` - `## The derivation's variants`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. T-65-06 (a question that answers differently on a second read) is mitigated by the single read and shown by E7 to E10 failing when either read is restored; T-65-07 (the `"row"` row's resource) is mitigated by `resource: true` staying in that row, which the mapped type enforces, and by E9, E10 and `LeafMatrix.test.ts`.

## Next Phase Readiness

Ready for 65-04 (the bench). 65-05 rewrites the one remaining old-contract sentence, ADR-QD-172 line 55.

## Self-Check: PASSED

`packages/core/src/Admission.ts` and `65-RED-EVIDENCE.md` exist; commits `96771886` and `3a772eea` are on `arch-wave-12` after `phase_base`; both task verifies exited 0.
