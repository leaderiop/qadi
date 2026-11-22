---
phase: QD-61-decisioncache-is-asked-only-the-question
reviewed: 2026-11-19T21:18:37Z
depth: standard
iteration: 3
files_reviewed: 18
files_reviewed_list:
  - packages/core/src/DecisionCache.ts
  - packages/core/src/Lifecycle.ts
  - packages/core/src/Question.ts
  - packages/core/src/EvaluationMetrics.ts
  - packages/core/test/DecisionCache.test.ts
  - packages/core/test/DecisionCache.tst.ts
  - packages/core/test/Lifecycle.test.ts
  - packages/devtools/test/react/Simulator.test.tsx
  - .changeset/core-decision-cache-asked-the-question.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - spec/decisions/174-a-decision-cache-is-asked-the-question.md
  - spec/decisions/031-decision-cache.md
  - spec/decisions/132-a-shared-computation-is-joinable-only-while-awaited.md
  - spec/behaviors/21-decision-cache.md
  - spec/behaviors/25-inspection.md
  - spec/invariants.md
  - spec/README.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
  necessity: 0
status: clean
---

# Phase 61: Code Review Report (iteration 3)

**Reviewed:** 2026-11-19T21:18:37Z
**Depth:** standard
**Files Reviewed:** 18. This is the same scope as `61-REVIEW.iter2.md`, from `git diff 7d2d281d HEAD`. Callees I read for behaviour: `Handover.ts` (`EnforceOptions`, `HandoverOptions`, `verdictOf`, `resourceFree`, `decidedOn`, `handOver`), `Qadi.ts` (`admittedOrDenied` and its `decidedOn` call sites at `:187,211,277`), `Evaluate.ts:34`, `Lifecycle.ts` (`decideQuestion`, `ask`) and `Question.ts` (`QuestionOptions`, `EvaluateOptions`).
**Status:** clean

## Summary

**Iteration 2's three findings.** `b2a808fd` fixes all three correctly and adds no new problem. The two commits after it (`3b9dff38`, `a63599c1`) touch only planning artifacts.

| Finding | Verdict | Evidence |
| ------- | ------- | -------- |
| IN-01 | Fixed | `DecisionCache.ts:56-62` now reads "the options object the decision was asked with, passed through by reference with no copy per lookup", and names `onObligations` on the enforcing entry points. This is accurate on both routes. On `evaluate`/`decide`, `ask` receives the caller's object and hands it to `decideQuestion`, which hands it to `getOrCompute` (`Lifecycle.ts:123,204`). On `verdictOf`, `ask(policy, options)` receives an `EnforceOptions`, which carries `onObligations` (`Handover.ts:92,210`). On the value-handing entry points, that object is `decidedOn`'s spread (`Handover.ts:240-243`). It is built once per call, before `ask`, so it is "the options object the decision was asked with" and not a copy per lookup. The upgrade note (`upgrading.md:1071`) gained the matching sentence. |
| IN-02 | Fixed | ADR-QD-174 Consequences (`:72-73`), its Rev 1.2 Change History, the CCR-QD-452 row and the upgrade note (`:1073`) all name TS2416 for a class-based implementer. I re-probed it in `scratchpad/r3/p.ts` with `tsc`. A class with a method-shorthand `getOrCompute(_q, compute: Effect…)` and a class with an arrow-property `getOrCompute = (…) =>` **both** give `TS2416` at the member. "At the method" therefore holds for either form. |
| IN-03 | Fixed | The CCR-QD-452 row ends with "with comment-only edits to `packages/core/src/EvaluationMetrics.ts` and `packages/devtools/test/react/Simulator.test.tsx`". `git diff 7d2d281d HEAD` on both files shows only JSDoc and comment lines changed. |

**The brief's focus.**

1. **Do the four documents agree with each other and with the code?** Yes.
   - **The rule.** All four say `options` is `Pick<EvaluateOptions, "concurrency">`, and that it reaches the walk, never the key:
     - the cache's options doc (`DecisionCache.ts:43-62`);
     - the 0.13 upgrade note;
     - ADR-QD-174 decisions 1, 3 and 4 and its Consequences;
     - the CCR-QD-452 row.

     The code matches: `shared.run(key, walk(key, options?.concurrency))` (`DecisionCache.ts:294-298`), and with no cache wired, `walk(question, options?.concurrency)` (`Lifecycle.ts:124`).
   - **The pass-through.** The documents describe it in three ways, and none contradicts the others or the code:
     - ADR decision 4: "passes its own options object through … never builds an options value per lookup";
     - the doc: "no copy per lookup";
     - the note: "the options object the decision was asked with, passed through without a copy".
   - **The extra keys.** The doc lists `resource`, `action`, `maxDepth`, `evaluationId` and `onObligations`. These are every key in `QuestionOptions`, `EvaluateOptions` and `EnforceOptions` except `concurrency` (`Question.ts:29-75`, `Handover.ts:87-93`). `HandoverOptions` only removes `resource` from that set, and `decidedOn` writes it back.
   - **The TS codes.** All four documents give the same codes:
     - for an implementer: TS2345 (runs `compute`), TS2322 (annotates it) and TS2416 (a class);
     - for a caller: TS2559 (passes a `compute` or a thunk) and TS2554 (passes a third argument).

     The changeset names no codes, which is consistent.
   - **BEH-QD-644's test title.** It still reads "the caller's own options object". That is `ask`'s caller, and the test calls `ask` directly. It agrees with the reworded doc.
2. **Are the CCR row's cited revisions current?** Yes. Each matches its document's `| Revision` header today:

   | Document | Revision |
   | -------- | -------- |
   | ADR-QD-174 | 1.2 |
   | ADR-QD-031 | 1.3 |
   | ADR-QD-132 | 1.2 |
   | `21-decision-cache.md` | 1.11 |
   | `25-inspection.md` | 1.40 |
   | `invariants.md` | 1.160 |
   | `traceability.md` | 1.223 |
   | `spec/README.md` | 1.258 |

   `b2a808fd` bumped only ADR-QD-174 (1.1 to 1.2) and README (1.257 to 1.258). The row and both Change History entries were updated together.
3. **The whole phase diff.** No Critical or Warning issue remains.
   - The only code change in shipped source is still the signature and adapter in `DecisionCache.ts`, plus the `getOrCompute(question, options)` call site in `Lifecycle.ts`.
   - Every other `src` delta is a comment.
   - D-01..D-15 hold:
     - the name stays;
     - `walk` stays out of the barrel;
     - `concurrency` stays out of the key;
     - no options literal is built per lookup;
     - none of the house-style tokens that D-09 forbids appear in added lines.

**What I ran:**
- `vitest --project core` on `DecisionCache.test.ts`, `Lifecycle.test.ts` and `Question.test.ts`: 55 of 55 pass.
- `tstyche DecisionCache.tst.ts`: 4 tests, 9 assertions, and 1 suppression matched.
- The `tsc` probe above (`scratchpad/r3/p.ts`): TS2416 for both class forms.

**What I did not run:** Stryker, `check:pr`, `pnpm check`, and the website and spec gates.

**Not counted as a finding.** `b2a808fd` lengthened the hand-wrapped ADR-QD-174 Consequences line 73 to 189 columns. That is cosmetic, and AGENTS.md §17 keeps formatting out of the gate.

I read `necessity-review.md`. No finding qualifies.

## Narrative Findings (AI reviewer)

All reviewed files meet quality standards. No issues found.

---

_Reviewed: 2026-11-19T21:18:37Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
