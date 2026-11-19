---
phase: QD-61-decisioncache-is-asked-only-the-question
reviewed: 2026-11-19T21:09:06Z
depth: standard
iteration: 2
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
  info: 3
  total: 3
  necessity: 0
status: issues_found
---

# Phase 61: Code Review Report (iteration 2)

**Reviewed:** 2026-11-19T21:09:06Z
**Depth:** standard
**Files Reviewed:** 18. These are the files in `git diff 7d2d281d HEAD` that the brief scoped. Callees I read for behaviour: `Handover.ts` (`verdictOf`, `resourceFree`, `decidedOn`), `Qadi.ts` (`admittedOrDenied` and its five call sites), `Evaluate.ts:34` and `Lifecycle.ts` (`ask`).
**Status:** issues_found (Info only)

## Summary

**Iteration 1's eight findings.** All eight are fixed correctly. IN-03 was fixed through its comment only, which the finding allowed.

| Finding | Verdict | Evidence |
| ------- | ------- | -------- |
| WR-01 | Fixed | `DecisionCache.ts:43-45` now names `decisionCacheLayer`, and `Lifecycle.ts:86-91` says a host cache must answer for the question it is handed (BEH-QD-645). |
| WR-02 | Fixed | The cited title matches `DecisionCache.test.ts:805` verbatim. |
| WR-03 | Fixed | The ADR, the CCR-QD-452 row and the upgrade note now tell the implementer (TS2345/TS2322) apart from the caller (TS2559/TS2554). My probes confirm all four codes (below). IN-02 below records one implementer form the list leaves out. |
| IN-01 | Fixed, with an inaccuracy | `DecisionCache.ts:56-60`. See IN-01 below. |
| IN-02 | Fixed | See point 1 below. |
| IN-03 | Fixed in the comment only | `DecisionCache.test.ts:1249` now names `Walk.ts` changes. The bound is still 48, so a future `Walk.ts` change can still turn the test red on `oneSided` with no cache bug present. This was accepted, so it is not a new finding. |
| IN-04 | Fixed | `Question.ts:68-69`. |
| IN-05 | Fixed | See point 5 below. |

**The brief's points:**

1. **The IN-02 test** (`Lifecycle.test.ts:64-88`).
   - It pins identity. `ask` hands the same object to `questionOf` and to `decideQuestion` (`Lifecycle.ts:203-204`), and `decideQuestion` hands it to `getOrCompute` (`:123`).
   - The test holds that object and asserts `strictEqual(seen[0], options)`.
   - It catches every mutant that breaks the pass-through:
     - `{ concurrency: options?.concurrency }`, or any spread, is a new reference, so the test goes red;
     - dropping the argument gives `undefined`, which also fails;
     - a second lookup is caught by `seen.length === 1`.
   - It is deterministic: one fiber, no clock, no race. I ran it three times in isolation, and it passed each time.
   - It pins `ask` and `decideQuestion`, not `evaluate`. `Evaluate.ts:34` is a pass-through that this phase did not touch, so that is fine.
2. **The TS codes**, probed with `tsc` in `scratchpad/r2/p.ts` against the real `src`:
   - The upgrade note's "Before", verbatim, gives TS2345 (`p.ts:11`).
   - `compute` annotated as an `Effect` inside `Layer.succeed` gives TS2322 (`:17`).
   - The same inside `DecisionCache.of` gives TS2345 (`:24`).
   - A class that `implements DecisionCacheShape` gives **TS2416** (`:30`), a code no document names (IN-02).
   - A caller passing a `compute` gives TS2559 (`:39`), and so does a thunk (`:40`). A third argument gives TS2554 (`:41`).
   - Every code the documents cite is real and attributed to the right party.
3. **The IN-01 doc.** Its rule is right: an implementation reads only `concurrency`. Nothing contradicts it: BEH-QD-644 and ADR-QD-174 decision 4 say the same pass-through, and INV-QD-367 and BEH-QD-641 are statements about the type. Its facts are incomplete, though (IN-01).
4. **Leftover over-promises.** I found none. Every "walks the question it is given" is now scoped to `decisionCacheLayer`:
   - the changeset, the upgrade note, the ADR-QD-031 amendment, INV-QD-368, BEH-QD-642 and the interface doc;
   - BEH-QD-166's note, which is about `decisionCacheLayer`'s capacity;
   - BEH-QD-190's note, about `clear`, which holds for a host cache that wraps core's.

   "No caller can …" is a claim about callers, as D-02 requires. A repo-wide grep finds no stale `getOrCompute(question, compute)` outside CHANGELOG history and the untracked `coverage/` HTML.
5. **`EvaluationMetrics.ts`.**
   - `git diff -U0` shows only lines 178-179 changed, and both are inside the JSDoc.
   - `description: "DecisionCache.getOrCompute lookups, by outcome (hit / coalesced / miss)."` (`:187`) is unchanged, and it still matches `EvaluationMetrics.test.ts:91,210`.
6. **House rules.** I scanned every added line under `packages/`.
   - The only `as` hits are `as const` (`DecisionCache.test.ts`, exempt).
   - Every `any` and `await` hit is in a comment, or is `Deferred.await`.
   - There is no `!`, `switch`, `fnUntraced`, `async` or `Record<string, unknown>`.
   - Every relative import carries `.ts`.

**What I ran:**
- `vitest --project core` on `DecisionCache.test.ts` and `Lifecycle.test.ts`: 45 of 45 pass.
- `tstyche DecisionCache.tst.ts`: 4 tests, 9 assertions, and 1 suppression matched.
- The `tsc` probe above.

**What I did not run:** Stryker, `check:pr`, `pnpm check`, and the website and spec gates.

I read `necessity-review.md`. No finding qualifies.

## Narrative Findings (AI reviewer)

## Info

### IN-01: The IN-01 doc's list of extra keys is incomplete, and on the value-handing entry points the object is not literally "the caller's own"

**File:** `packages/core/src/DecisionCache.ts:56-60`; also `apps/website/src/content/docs/docs/reference/upgrading.md:1067`

**Issue:**
- The doc says `options` "may carry more keys than this type names: `resource`, `action`, `maxDepth`, `evaluationId`".
- Every enforcing entry point decides through `verdictOf` (`Handover.ts:201-210`), which calls `ask(policy, options)` with an `EnforceOptions`. So the cache also receives **`onObligations`**, the host's obligation handler (`Handover.ts:92`). `Qadi.ts:101,123,155,187,211` all take this route.
- On `guard`/`filter`-style entry points, the object is `decidedOn(options, value)` (`Handover.ts:240-243`, used at `:288` and `Qadi.ts:187,211`). That is a fresh spread core builds per call, with `resource` replaced by the handed-over value. It is not "the caller's own options object". It is still built once per call and never per lookup, so D-11 and D-14 hold, and ADR-QD-174 decision 4 and BEH-QD-644 are about `decideQuestion` and stay true.
- The upgrade note is the page a host implementer actually migrates from. It describes `options` only as `{ concurrency? }` and omits the runtime caveat.
- The rule ("reads only `concurrency`, does not log or retain the rest") already covers every case, so this is Info, not a doc that lies about behaviour.

**Fix:**
```ts
   * At runtime `options` is whatever options object `decideQuestion` was handed,
   * passed through by reference with no copy (ADR-QD-174 decision 4): it may carry
   * more keys than this type names, among them `resource`, `action`, `maxDepth`,
   * `evaluationId` and, from an enforcing entry point, `onObligations`.
   * An implementation reads only `concurrency`, and does not log or retain the rest.
```
Add one sentence to the 0.13 upgrade note: "At runtime `options` may carry the rest of the caller's options; read only `concurrency`."

### IN-02: A class that `implements DecisionCacheShape` breaks with TS2416, which the "an implementer gets TS2345 or TS2322" summary does not name

**File:**
- `spec/decisions/174-a-decision-cache-is-asked-the-question.md:13` (Change History: "an implementer gets TS2345 or TS2322")
- the same file, `:71-73`
- `spec/README.md:389` (the CCR-QD-452 row)
- `apps/website/src/content/docs/docs/reference/upgrading.md:1073`

**Issue:**
- The probe `scratchpad/r2/p.ts:28-33` declares `class I4 implements DecisionCacheShape { getOrCompute = (_q, compute: Effect.Effect<Trace, EvaluationError, PortServices>) => Effect.map(compute, …) … }`.
- It reports `error TS2416` (property not assignable to the same property in the base type), not TS2345 or TS2322.
- The ADR body ties each code to a form ("running it … TS2345, annotating it … TS2322"), so it is not false. But the Change History row reads as the complete set, and a migrator whose cache is a class searches for an error code no document gives.

**Fix:** In ADR-QD-174 Consequences, the CCR-QD-452 row and the upgrade note, add: "and a class that `implements DecisionCacheShape` gets TS2416." In the Change History row, write "TS2345, TS2322 or TS2416".

### IN-03: The CCR-QD-452 row's file list omits the two files the iteration-1 fixes touched

**File:** `spec/README.md:389`

**Issue:**
- The row lists "the phase's source and tests: `packages/core/src/{DecisionCache,Lifecycle,Question}.ts`, `packages/core/test/{DecisionCache,Lifecycle}.test.ts` and `packages/core/test/DecisionCache.tst.ts`".
- Commit `d0ca3df6` (IN-05) also changed `packages/core/src/EvaluationMetrics.ts`, a shipped source file, and `packages/devtools/test/react/Simulator.test.tsx`. Both changes are comment-only.
- Rev 1.257 updated the row for the review round, but only for BEH-QD-644 and ADR-QD-174. The row is the change record for this CCR, and it no longer names every file the change touched.

**Fix:** Append to the file list: "and, comments only, `packages/core/src/EvaluationMetrics.ts` (`decisionCacheLookupsTotal`'s JSDoc) and `packages/devtools/test/react/Simulator.test.tsx`". Bump the README revision with a matching Change History entry.

---

_Reviewed: 2026-11-19T21:09:06Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
