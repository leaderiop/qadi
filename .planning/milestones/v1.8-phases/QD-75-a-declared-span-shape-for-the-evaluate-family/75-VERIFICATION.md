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
covered_digest: "v4:sha256:a64a38e6adf00ec7d8d557364453b66f216f86d6438d2ace5b5520ad206731f4"
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

## Re-verification (2026-11-23, milestone close sweep)

**Staleness:** `75: stale, verification 447fad5d, 25 covered, 1 changed since` (`v18-stale.mjs`, run at `8752a052`).

| Cited file | Changed since `447fad5d` by |
| --- | --- |
| `.planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-09-SUMMARY.md` | `7499603b` docs(75): name the five requirements the close plan completed in its summary (the milestone audit, after Phase 76) |

**What the change did to the truths:** `7499603b` changes one frontmatter line of the close plan's summary, `requirements-completed: []` to `[ESPN-01, ESPN-02, ESPN-03, ESPN-04, ESPN-05]`, so the milestone audit's cross-check reads the five ids the plan marked complete (they were marked by hand in `b957a155`, as the summary's `key-decisions` says). It touches no source and no spec. `.planning/REQUIREMENTS.md` still shows ESPN-01 to ESPN-05 as `[x]` and `Complete` against Phase 75. Every other covered file, the six source files and the contract test among them (`packages/core/src/{EvaluationSpan,GuardHealthCheck,Lifecycle,PortSpanEncode,Predicate,SubjectSet}.ts`, `packages/core/test/EvaluationSpan.contract.test.ts`), has an empty `git diff 447fad5d HEAD`, so truths 1 to 4 stand as verified. Phase 76's source changes to `packages/core` (`PortKey.ts`, `PortDerivation.ts`, `PortAccess.ts`, the history ports) are outside what the report covers; the span suites below still pass over them, and `qadi.decision` is written nowhere in `packages/*/src`.

**One finding, not a gap.** `75-contract-check.mjs` (truth 2's evidence, "exit 0") no longer exits 0 at HEAD. It reports `1 problem(s)`: `alice in the helpers file runs code as the module loads, and no first commit's text pins it`. The cause is Phase 76's `42eaa5ee` (fix(76): IN-03 the core test helpers stated once), which added `export const alice = makeSubject({...})` and four sibling helpers to `packages/core/test/helpers.ts` for the fixture-judgement tests. The check's rule for new helpers-file statements admits only an initialiser that is a function, a literal, a name, or an array or object literal of those, and a call to `makeSubject` is none of them. Every other rule of the check (the contract's 33 rows, its 20 top-level statements, the moved helpers, the helpers the contract reads, the imports) passes: it names no other problem, `--self-test` passes (28 of 28), and the contract test file has no diff since `447fad5d`. `makeSubject` (`packages/core/src/AuthSubject.ts:69`) is a pure object builder, the contract file imports none of the five new helpers, and no helper the contract reads changed, so the property the truth states (the contract holds the rows it was first committed with, only imports and two helpers moved) holds. What fails is the check's stricter, separate guard against load-time code in the shared helpers file, which Phase 76 legitimately tripped. It is a phase-local `.planning` script, not part of `pnpm check`, so no gate fails. Left as is here (this sweep edits no other file); to make the check exit 0 again, the rule would admit a call to a pure builder, or the helpers would move to a file the contract does not read.

### Spot-checks re-run (Re-verification (2026-11-23, milestone close sweep))

Run on the tree at `8752a052`, one command at a time, in the foreground, with stdin closed. `pnpm check:pr` exited 0 at `a4741601` (17 of 18 steps, mutation skipped by design, `pnpm test:tstyche` and the span-key gates included); `git diff a4741601 HEAD -- . ':!.planning'` is empty.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| The span contract, the span tests and the evaluator | `pnpm exec vitest run packages/core/test/{EvaluationSpan.contract,EvaluationSpan,Evaluate}.test.ts --project core` | 3 files, 271 tests passed | PASS |
| The contract holds its first-commit rows | `node .planning/phases/QD-75-*/75-contract-check.mjs` | exit 1, one problem: the helpers-file load rule named above; no row, statement, moved-helper or import problem | PASS for the truth, finding recorded above |
| The check's own self-test | `node .planning/phases/QD-75-*/75-contract-check.mjs --self-test` | exit 0, `28 passed` | PASS |
| The six covered source files and the contract test are unchanged | `git diff --stat 447fad5d HEAD -- packages/core/src/{EvaluationSpan,GuardHealthCheck,Lifecycle,PortSpanEncode,Predicate,SubjectSet}.ts packages/core/test/EvaluationSpan.contract.test.ts` | empty | PASS |
| `qadi.decision` is written nowhere | `grep -rn "qadi\.decision\b" packages/*/src` | no hit | PASS |
| The span-key rules and the budget | `node scripts/check-house-style.mjs` | `585 file(s) clean (3 declared switch(es), 74 type-test file(s))` | PASS |
| Gate 13 | `node scripts/check-api-surface.mjs` | exit 0, `940 export(s) documented across 9 package(s)` (941 when verified; Phase 76 removed `ActedEvent`, `ActedAnywhere`, `ActedAnywhereInput` from `@qadi/core` and added `actedAnswerFromEvents`, `signatureAnswerFromSignatures`; Phase 75 added or removed none) | PASS |
| The five requirements | `grep -n "ESPN-0" .planning/REQUIREMENTS.md`; `grep -n "requirements-completed" .planning/phases/QD-75-*/75-09-SUMMARY.md` | ESPN-01 to ESPN-05 `[x]` and `Complete`; the summary lists all five | PASS |

**Digest:** `covered_digest: "v4:sha256:f5a9b58a8eb273949c77d36aac10b83597828a7ba50ace1f199233cb9572b811"` becomes `covered_digest: "v4:sha256:a64a38e6adf00ec7d8d557364453b66f216f86d6438d2ace5b5520ad206731f4"`, over the same 25 covered files.

**Resolved (2026-11-23, 5640572d).** The helpers moved to a file the contract does not read: `alice`, `SITES` and the other fixture-judgement helpers left `packages/core/test/helpers.ts` unchanged for `packages/core/test/fixtureJudgement.ts`, and `76-agreement-check.mjs` names that module as where those two test files' helpers moved. The check's rule is unchanged. On 5640572d: `75-contract-check.mjs` exits 0 (`33 rows and 20 statements as at ecb0256f; 15 helpers kept, 2 moved (attributesOf, allAttributesOf)`) and its `--self-test` passes 28; `76-agreement-check.mjs` exits 0 and its self-test passes 28; the four affected test files pass (138 tests), typecheck and house-style are clean (586 files).

**Verdict:** passed
