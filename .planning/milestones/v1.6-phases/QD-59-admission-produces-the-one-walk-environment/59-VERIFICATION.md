---
phase: QD-59-admission-produces-the-one-walk-environment
verified: 2026-11-19T07:30:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-01-PLAN.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-01-SUMMARY.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-02-PLAN.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-02-SUMMARY.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-03-PLAN.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-03-SUMMARY.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-04-PLAN.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-04-SUMMARY.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-05-PLAN.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-05-SUMMARY.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-06-PLAN.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-06-SUMMARY.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-07-PLAN.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-07-SUMMARY.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-08-PLAN.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-08-SUMMARY.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-09-PLAN.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-09-SUMMARY.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-10-PLAN.md
  - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-10-SUMMARY.md
  - packages/core/src/Admission.ts
  - packages/core/src/Predicate.ts
  - packages/core/src/Walk.ts
  - packages/core/test/Admission.test.ts
  - packages/core/test/WalkEnvironment.tst.ts
covered_digest: "v4:sha256:ea4c1f2e1f7d43c117bd7a5e4dc0e8308e1b519acd3119a7f91e68c555e6f715"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 59: Admission produces the one walk environment Verification Report

**Phase Goal:** Admission produces the one walk environment (subject, resource, action, `supplied`, matcher context, `maxDepth`) that both interpreters read, so recursion passes `(policy, env, depth)`, each fact is carried once and `depth` and `maxDepth` can no longer be swapped and still compile; or a measured rejection recorded in ADR-QD-172.
**Verified:** 2026-11-19
**Status:** passed
**Re-verification:** No, initial verification. Verified against the CURRENT tree (HEAD `4ee838a2`), including the three review rounds, not the plan summaries' snapshots.

## Goal Achievement

### Observable Truths

| # | Truth (roadmap SC) | Status | Evidence |
|---|---|---|---|
| 1 | SC1: bench numbers for the prototype vs the phase base, per workload, with the noise band, are in ADR-QD-172, and the outcome follows from them | VERIFIED | `bench/gate/analysis.tsv` ends `# gate: pass` (3+3, slower 0/35, geomean -1.15%, worst +6.7% inside the 10% band); `bench/gate-r2/analysis.tsv` (5+5) also `# gate: pass`. ADR-QD-172 `## Benchmark` carries the full 35-row table with base min, candidate min, delta, spread and band, and states pursue because the gate passed. Source changed, so the rejection path (D-05) correctly was not taken. The gate measured `e9b98bb8`; ADR states its `packages/core/src` is byte-identical to the phase base `83cbd5c5`. |
| 2 | SC2: admission produces the one environment, each interpreter states only what differs, `admit(question)` gives the environment with each interpreter's `supplied` checked | VERIFIED | `Admission.ts`: `Admitted<Source>` holds `source, policy, subject, supplied, matcherContext, maxDepth`. `admit(question, rowSource)` is one generic signature, no overload. `supplied` comes from the closed `SUPPLIED` table, one row per `RowSource`, typed `{ [S in RowSource]: (q) => SuppliedBy[S] }`. `Walk.ts:878` calls `admit(question, "asked")` and `Predicate.ts:664` calls `admit(question, "row")`: each interpreter states only its row source. No hand-built `supplied` literal remains in `Walk.ts` or `Predicate.ts`. `compileTree(admitted: Admitted<"row">)` reads `supplied` from the environment. Tests E1..E6 in `Admission.test.ts` pass. |
| 3 | SC3: subject, resource, action each carried once; `depth` and `maxDepth` cannot be swapped and still compile (tstyche negative) | VERIFIED | `evaluateNode(policy, request: Evaluation, depth)` has 3 parameters; `maxDepth` is read from `admitted.maxDepth`. `Evaluation` is `{ admitted: Admitted<"asked">, concurrency }`, so there is no separate resource/action/subject copy in the bundle. Resource and action are read from `matcherContext` only. `WalkEnvironment.tst.ts` (run: 4 tests, 18 assertions pass) pins `Parameters<typeof evaluateNode>` as `[policy, request, depth]`, `number` not assignable to the environment, `Recursion["length"]` is 3, and that `Admitted<"row">` is not assignable to the walk's `Admitted<"asked">`. Caveat accepted by D-02: `matcherContext.subject` and `.subjectId` are a projection of `Admitted.subject` that `admit` builds, documented in ADR-QD-172 item 2. |
| 4 | SC4: `RolesAndDepth.test.ts` green, three `fnUntraced` and `SWITCH_BUDGET` unchanged, no workload regressed beyond noise vs base | VERIFIED | `git diff 83cbd5c5 HEAD -- RolesAndDepth.test.ts` is empty and `git log 83cbd5c5..HEAD` on it is empty (unedited); the core suite passes. Exactly three `Effect.fnUntraced` in `Walk.ts` (`evaluateAllOf`, `evaluateAnyOf`, `evaluateRules`); three real `switch` statements (`Walk.ts:328` `evaluateNode`, `Matcher.ts:378` `resolveRef`, `Matcher.ts:669` `judgeMatcher`; the other `Walk.ts` hit is a comment); `node scripts/check-house-style.mjs` reports `560 file(s) clean (3 declared switch(es))`; `AGENTS.md` and `check-house-style.mjs` have no diff since the base. After-benches: `after`, `after-fix`, `after-fix-2` all end `# gate: pass` (geomeans +1.60%, +0.90%, -0.75%; worst +7.3%, +7.5%, +9.0%, all inside their 10% bands). |

**Score:** 4/4 truths verified.

### Currency of the after-bench against the final source

`after-fix-2` was measured at head `89dfaaab`, after the iteration-2 fix (`1ac8bccc`). `git diff 89dfaaab HEAD -- packages scripts` is one change: a doc-comment rewording in `Admission.ts` (iteration 3, WR-01/WR-02). `git diff 1ac8bccc HEAD -- packages` shows the same comment-only change. So the last bench covers the executable code at HEAD.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/core/src/Admission.ts` | `Admitted<Source>`, `SUPPLIED`, generic `admit` | VERIFIED | Substantive, wired from `Walk.ts` and `Predicate.ts`; the only `admit(` callers in `packages/*/src` are those two (the `@qadi/react` `admit` is an unrelated `QuestionBook` method). |
| `packages/core/src/Walk.ts` | `evaluateNode(policy, request, depth)`, Walk-private `Evaluation` | VERIFIED | 13 recursive/hand-off call sites all use `(x, request, depth + 1)` or the root `(policy, {admitted, concurrency}, 0)`. |
| `packages/core/src/Predicate.ts` | `compileTree` over `Admitted<"row">` | VERIFIED | Reads `subject, supplied, matcherContext` from the environment. |
| `packages/core/test/WalkEnvironment.tst.ts` | tstyche pins | VERIFIED | Passes. |
| `packages/core/test/Admission.test.ts` | E1..E6 | VERIFIED | Present and green. |
| `spec/decisions/172-*.md` | ADR with numbers, decisions, amendments | VERIFIED | Present, contains gate table, after-run table, review-round runs. |
| Records (ARCH-106, CCR-QD-450, BEH-QD-631..635, INV-QD-363..364) | Present in spec | VERIFIED | Each id found in `spec/`, including `traceability.md`. |

### Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| `walk` (Walk.ts:878) | `admit` | `admit(question, "asked")`, failure mapped to `PolicyTooDeep`, success passed as `Evaluation.admitted` | WIRED |
| `toPredicate` (Predicate.ts:664) | `admit` | `admit(question, "row")`, then `compileTree(admitted.success)`, `run(..., admitted.success.matcherContext)` | WIRED |
| `evaluateNode` | environment | reads `maxDepth`, `subject`, `supplied`, `matcherContext` from `request.admitted` | WIRED |
| `Evaluation.admitted: Admitted<"asked">` | type wall | `Admitted<"row">` is not assignable (tstyche) | WIRED |

### Data-Flow Trace (Level 4)

| Value | Source | Real data | Status |
|---|---|---|---|
| `supplied` (asked) | `question.action/resource !== undefined` | yes | FLOWING |
| `supplied` (row) | `resource: true`, `action` from question | yes | FLOWING |
| `matcherContext.resource/action` | `question.resource/action` | yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Core suite | `pnpm exec vitest run --project core` | 82 files, 2645 tests passed | PASS |
| Type pins | `pnpm exec tstyche packages/core/test/WalkEnvironment.tst.ts` | 4 tests, 18 assertions passed | PASS |
| House style / budgets | `node scripts/check-house-style.mjs` | 560 files clean, 3 declared switches | PASS |
| API surface | `node scripts/check-api-surface.mjs` | 933 exports (unchanged) | PASS |
| Phase scan | `node 59-scan.mjs` | `phase scan clean` | PASS |
| Mutation compare (D-15) | `node 59-mutation.mjs compare 59-mutation-static.json` | `Admission.ts` detects 6 -> 18; 0 detected mutants left fallen files; `WX-05 holds (D-15)` | PASS |

The mutation compare lists "moved survivors" (`depth - 1` on the `depth + 1` recursion sites); these are survivors that moved with their call sites from the base, accepted by D-15's moved-with-receiver rule, not new ones. Stryker, the bench and `check:pr` were not re-run, per instruction; `check:pr` is reported green on HEAD.

### Probe Execution

SKIPPED: the phase declares no `probe-*.sh` scripts.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| WENV-01 | Bench prototype vs base, numbers in ADR-QD-172 | SATISFIED | SC1 |
| WENV-02 | Admission produces the one environment; interpreters state only what differs | SATISFIED | SC2 |
| WENV-03 | Subject, resource, action carried once; depth/maxDepth swap fails to compile | SATISFIED | SC3 (D-02 projection accepted and documented) |
| WENV-04 | `RolesAndDepth.test.ts` green; `fnUntraced` and `SWITCH_BUDGET` unchanged | SATISFIED | SC4 |

`REQUIREMENTS.md` marks all four `[x]` / Complete. WX-01..07 are milestone-wide and out of scope by design. No orphaned requirements.

### Anti-Patterns Found

No TBD/FIXME/XXX debt markers flagged by the phase scan. No blockers.

### Human Verification Required

None.

### Findings that are not gaps (informational)

1. **The `"asked"` row's truth is pinned by tests, not by the type.** `SuppliedBy.asked` is `Supplied` (`boolean` flags), so an `"asked"` row that over-claims a resource would still compile; `Admission.test.ts` E1..E5 and `LeafMatrix.test.ts` pin it at run time. The comment on `SUPPLIED` and ADR-QD-172 item 3 now state this honestly. The REVIEW-DISPOSITION records the optional derivation from the matcher context as a deferred owner follow-up (not required by any success criterion).
2. **`Admitted` has a public constructor** (pre-existing); "only `admit` builds one" holds by convention, and the class is package-private and outside the barrel (ADR-QD-099). Deferred as an owner follow-up (iteration 3, IN-01). Not a must-have.
3. The environment keeps a derived `matcherContext.subject`/`subjectId` projection (D-02), so "subject carried once" holds for stored facts, as the ADR says. Accepted by the owner in D-02.
4. The benchmark gate ran on a shared host (load average 6 to 126, per ADR). The verdicts rest on the median-of-minima statistic and the 10% band, and three independent after-runs plus a 5+5 confirmation all passed, so this does not weaken the conclusion.

### Gaps Summary

None. The phase was pursued after a passing gate, the environment exists and is wired into both interpreters, the depth/maxDepth swap is closed by type and pinned by tstyche, budgets and the unedited `RolesAndDepth.test.ts` hold, and every after-bench passed.

---

_Verified: 2026-11-19_
_Verifier: Claude (gsd-verifier)_
