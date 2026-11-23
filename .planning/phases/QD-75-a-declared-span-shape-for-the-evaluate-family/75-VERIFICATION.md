---
phase: QD-75-a-declared-span-shape-for-the-evaluate-family
verified: 2026-11-23T12:00:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-01-PLAN.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-01-SUMMARY.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-02-PLAN.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-02-SUMMARY.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-03-PLAN.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-03-SUMMARY.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-04-PLAN.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-04-SUMMARY.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-05-PLAN.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-05-SUMMARY.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-06-PLAN.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-06-SUMMARY.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-07-PLAN.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-07-SUMMARY.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-08-PLAN.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-08-SUMMARY.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-09-PLAN.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-09-SUMMARY.md
  - packages/core/src/EvaluationSpan.ts
  - packages/core/src/GuardHealthCheck.ts
  - packages/core/src/Lifecycle.ts
  - packages/core/src/PortSpanEncode.ts
  - packages/core/src/Predicate.ts
  - packages/core/src/SubjectSet.ts
  - packages/core/test/EvaluationSpan.contract.test.ts
covered_digest: "v4:sha256:f5a9b58a8eb273949c77d36aac10b83597828a7ba50ace1f199233cb9572b811"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 75: A declared span shape for the evaluate family Verification Report

**Phase Goal:** The `qadi.evaluate` span family states its question and answer once, so a failed span carries the question and the outcome sits under one key on every path, and a tracer filtering by evaluation id or by outcome no longer misses half the evaluations.
**Verified:** 2026-11-23
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth (roadmap criterion) | Status | Evidence |
|---|---------------------------|--------|----------|
| 1 | ADR-QD-188 records one outcome key `qadi.outcome` and no dual write, before any source change | VERIFIED | `spec/decisions/188-*.md` decisions 1 and 2: `qadi.outcome` with `Allow`/`Deny`/`Failed`, `qadi.decision` removed, no release writes both, decided autonomously in place of the human checkpoint. Commit `ab9a822e` precedes the first `packages/` commit `ecb0256f` (`git log --reverse c054c2b1..HEAD -- packages`). |
| 2 | Contract red on the base for the failed-span rows, green now; a failed span carries its question annotated before the lookup; `qadi.outcome` on Allow, Deny and Failed; `qadi.decision` written nowhere | VERIFIED | `75-RED-EVIDENCE.md`: 15 kept rows pass and 18 changed rows fail on the base in three runs; row C3 is the regression (received record has neither `qadi.subject_id` nor `qadi.evaluation_id`). Now: `EvaluationSpan.contract.test.ts` + `EvaluationSpan.test.ts` 46/46 pass; full `--project core` run 85 files / 2760 tests pass. `Lifecycle.ts` `decideQuestion` calls `annotateAsked(evaluateSpan.question, {...asked, evaluationId})` before the lookup; `tapError` writes `outcome: "Failed"` and `errorTag`; the success path writes `outcome: decision._tag`. Grep for `qadi.decision` in `packages`, `features`, `examples`, `apps`, `website` code: no hits (only spec, changeset and upgrade prose saying it is removed). `75-contract-check.mjs` exit 0 ("33 rows and 20 statements as at ecb0256f; 15 helpers kept, 2 moved"); `--self-test` 28 passed. The contract's diff since `ecb0256f` is two imports and the two moved helpers only. |
| 3 | One `spanStruct`-built declaration; the four writers write keys only through it; tests read keys from it; remaining literals are the budgeted ones | VERIFIED | `EvaluationSpan.ts` declares `evaluateSpan`, `toPredicateSpan`, `guardHealthCheckSpan`, `decideSubjectsSpan`, `decideSubjectsStreamSpan`, `decideSubjectSpan` with `spanStruct`, and `denialEvent` with `logEventStruct`; `qadi.subject_id` comes from `sharedQuestionKeys`. A grep for `"qadi.*"` literals in `Lifecycle.ts`, `Predicate.ts`, `SubjectSet.ts`, `GuardHealthCheck.ts`: zero. Span names come from the declaration (`Effect.fn(xSpan.name)`, `Stream.withSpan(xSpan.name, ...)`). `SPAN_KEY_LITERAL_BUDGET` and its AGENTS.md table agree; `node scripts/check-house-style.mjs`: "581 file(s) clean"; `pnpm test:tstyche`: 72 files pass. |
| 4 | BEH-QD-711..715, INV-QD-395/396, traceability, changeset (Breaking) and 0.13 upgrade section consistent with the code; ADR-QD-188 extends ADR-QD-051 and ADR-QD-109 by dated amendments; CCR-QD-467 matches | VERIFIED | BEH-QD-711..715 in `30-port-calls.md` (rev 1.21) state the same keys and rules as the code (outcome on decided/typed-failure paths only, interrupted/defected carry the question and no outcome, `decideSubjectSpan` keyless). INV-QD-395/396 in `invariants.md` (rev 1.201); traceability rows present. `.changeset/core-evaluate-span-declared.md` is `@qadi/core` minor with "**Breaking.**". `upgrading.md` has "0.13: the evaluate spans answer under `qadi.outcome` and a failed span says what was asked". ADR-QD-051 (rev 1.6) and ADR-QD-109 (rev 1.8) each carry an "Amendment (2026-11-23, ADR-QD-188, CCR-QD-467)" block, not a rewrite. CCR-QD-467's file list equals `git diff --name-only c054c2b1..HEAD` outside `.planning`, name by name, and its revisions (188 1.10, 051 1.6, 109 1.8, 30-port-calls 1.21, 05-evaluator 1.23, invariants 1.201, traceability 1.276, README 1.342) match the document headers. |

**Score:** 4/4. No truth is left behavior-unverified: the failed-span, per-path outcome, interrupted and defected rows are executed by the contract and `Evaluate.test.ts`.

### Public surface

`packages/core/src/index.ts` and `spec/overview.md`: no diff since `c054c2b1`. `node scripts/check-api-surface.mjs`: 941 exports documented.

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| ESPN-01 | SATISFIED | Truth 1 |
| ESPN-02 | SATISFIED | Truth 2 (RED on base, GREEN now) |
| ESPN-03 | SATISFIED | Truths 2 and 3 (question before the lookup, one outcome key, one declaration) |
| ESPN-04 | SATISFIED | Truth 3 |
| ESPN-05 | SATISFIED | Truth 4 |
| WX-01..07 | Phase contribution met; rows stay Pending milestone-wide | WX-01: `pnpm check:pr` exit 0 on `119acab6` is the recorded claim, not re-run here (I re-ran core tests, house-style, api-surface, tstyche, the contract check). WX-02: only reserved ids (ADR-QD-188, BEH-QD-711..715, INV-QD-395/396, CCR-QD-467). WX-03: no export added or removed. WX-04: the `packages` diff adds no `as`-casts, `!`, `any`, `switch`, `fnUntraced`, `console`, `process.env`, `Record<string, unknown>` or `Stryker disable`. WX-05: `75-mutation-close.json` is no lower than the base for every touched file (Lifecycle 38/38, Predicate 282/282, SubjectSet, GuardHealthCheck all killed); cost +9.17% geomean is recorded as a result. WX-06: each new rule/check shown failing once in `75-RED-EVIDENCE.md`. WX-07: no D-numbers, plan ids or phase numbers in the `packages` diff. |

### Anti-Patterns Found

None blocking. The only family-looking literal outside the declaration in `packages/*/src` is display text in `packages/devtools/src/react/Inspector.tsx` (a label, not a span write). Other `qadi.*` literals in src belong to port descriptions, non-family spans and log annotations.

### Human Verification Required

None. The roadmap's human checkpoint was decided autonomously under the owner's standing instruction and recorded in ADR-QD-188 before any source change; the ordering is verified in truth 1.

### Gaps Summary

No gaps. Notes that are not gaps:

- The Phase 75 checkbox line in `ROADMAP.md` (line 448) is still unchecked although 9/9 plans are done; the orchestrator closes it.
- Not re-run by me, per the brief: `pnpm check:pr`, Stryker, benchmarks. Their results are taken from the phase records.

---

_Verified: 2026-11-23_
_Verifier: Claude (gsd-verifier)_
