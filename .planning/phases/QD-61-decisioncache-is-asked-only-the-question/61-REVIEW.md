---
phase: QD-61-decisioncache-is-asked-only-the-question
reviewed: 2026-11-19T19:32:39Z
depth: standard
iteration: 1
files_reviewed: 15
files_reviewed_list:
  - packages/core/src/DecisionCache.ts
  - packages/core/src/Lifecycle.ts
  - packages/core/src/Question.ts
  - packages/core/test/DecisionCache.test.ts
  - packages/core/test/DecisionCache.tst.ts
  - packages/core/test/Lifecycle.test.ts
  - .changeset/core-decision-cache-asked-the-question.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - spec/decisions/174-a-decision-cache-is-asked-the-question.md
  - spec/decisions/031-decision-cache.md
  - spec/decisions/132-a-shared-computation-is-joinable-only-while-awaited.md
  - spec/behaviors/21-decision-cache.md
  - spec/behaviors/25-inspection.md
  - spec/invariants.md
  - spec/README.md
findings:
  critical: 0
  warning: 3
  info: 5
  total: 8
  necessity: 0
status: issues_found
---

# Phase 61: Code Review Report (iteration 1)

**Reviewed:** 2026-11-19T19:32:39Z
**Depth:** standard
**Files Reviewed:** 15. That is the 14 in scope, plus the CCR-QD-452 row in `spec/README.md`, because it repeats the claim WR-03 corrects. Callees read for behaviour: `Walk.ts` (`walk`), `SharedComputation.ts` (`run`), `Evaluate.ts` and `Lifecycle.ts` `ask`, and `test/helpers.ts` (`forkAllAndSettle`).
**Status:** issues_found

## Summary

I reviewed `git diff 7d2d281d HEAD` for each file in scope.

**Checks I ran:**
- `vitest --project core` on `DecisionCache.test.ts` and `Lifecycle.test.ts`: 44 of 44 pass.
- `tstyche` on `DecisionCache.tst.ts`: 4 tests and 9 assertions pass, and 1 suppression matches.
- `madge --circular` on `packages/core/src`: no cycle. `DecisionCache.ts` → `Walk.ts` is one-way, and nothing `Walk.ts` imports reaches `DecisionCache.ts`.
- Three `tsc` probes in the scratchpad against the real `src`:
  - **Callers.** An `Effect` gives TS2559. A thunk gives TS2559. A third argument gives TS2554. A literal with an extra key gives TS2353. A non-literal object carrying `compute` is accepted, which is UF-2 and harmless.
  - **The `Params<F>` control.** An old-shape `(question, compute)` signature, read through `Params<F>`, accepts `(q, compute)`. So the negatives would fail on a revert, and they bite.
  - **Implementers.** The upgrade note's own "Before" implementation gives TS2345, not TS2559 (WR-03).
- A weak-type probe: a function is refused by a `{ name?: string }` options type (TS2559), so `Function`'s apparent members cannot weaken the thunk refusal. Only an option named like an `Effect` member, such as `pipe`, would. The ADR's caveat is exact.

**I did not run** Stryker, `check:pr`, `pnpm check`, `check-website-doc-examples.mjs` or the spec gates. For those, I rely on the 61-03 to 61-07 SUMMARYs.

**Clean on the brief's points:**
- **The interface.**
  - No caller can hand the cache a computation through the types (the probes above).
  - `Pick<EvaluateOptions, "concurrency">` has no TS2883 risk: `EvaluateOptions` is exported through `export * from "./Question.ts"` (`index.ts:46`), and the annotation is written out. `index.ts` is untouched, so there is no new export.
  - `decisionCacheLayer`'s adapter is `shared.run(key, walk(key, options?.concurrency))` (`DecisionCache.ts:284-288`). It runs one key, and the claimant's walk is of exactly that key.
  - `options` is passed through by reference, with no per-lookup literal (`Lifecycle.ts:121`). The one `Effect.suspend` per lookup has only moved from `Lifecycle` into the adapter, so D-14 holds.
- **`decideQuestion`.**
  - With a cache, it hands over the same `options` object it would otherwise read `concurrency` from.
  - Without one, it is `Effect.map(walk(question, options?.concurrency), …)` (`:122`), as before.
  - `lookupEffect` keeps its annotated type. The `tapError` metric, the span annotation and the `Failed` record are unchanged.
- **The tests.**
  - The D-03 test would split into two entries and two misses if `concurrency` joined the key.
  - The D-12 test sees `["u-1:a","u-1:a","u-1:b"]` and `miss: 2` if a joiner walked on its own. It asserts `coalesced: 1`, so a settle that fails turns red instead of passing vacuously.
  - The I5 test keeps `kWalks === 1` and the FIFO `miss,miss,miss,hit` follow-on. It now also asserts both sides at every budget. 61-02 showed that the old `gap <= 12` sweep fails that check.
  - No assertion was lost. The old test's trace labels were never asserted.
  - `Lifecycle.test.ts`'s wrapper (`Layer.effect` + `DecisionCache.of({ ...inner, getOrCompute })` + `Layer.provide(decisionCacheLayer())`) is the same pattern as the upgrade note's compiled example, so it is a faithful pattern for hosts.
  - The `.tst.ts` pins use `Params<F>` and have positive controls. The `@ts-expect-error` on `export { walk }` is message-matched (`Suppressed: 1 matched`).
- **Every cited test title is real except one.** BEH-QD-642, BEH-QD-643 and BEH-QD-644 name seven titles, and each exists in `DecisionCache`, `Lifecycle`, `DecisionSink` or `Evaluate.test.ts`. The exception is UF-1 (WR-02).
- **House rules.** The phase adds no `as` (only `as const`, which the house-style checker exempts), no `!`, `any`, `switch`, `fnUntraced`, `async`/`await`, `Record<string, unknown>` or `effect` barrel import. Every relative import carries `.ts`.

**Security observations:**
- **UF-1** is WR-02. It is a Warning, because the paragraph around it was rewritten in this phase and the citation names a test that does not exist.
- **UF-3** is WR-01, together with the same sentence in `Lifecycle.ts`.
- **UF-2 and UF-4** need no finding. IN-01 records a runtime corollary of UF-2's reasoning that UF-2 does not cover.

I read `necessity-review.md`. No finding qualifies.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: The interface doc tells a host implementer that "the cache walks the question it is given", which holds only for `decisionCacheLayer` (D-02)

**File:** `packages/core/src/DecisionCache.ts:43-45`, and the same claim at `packages/core/src/Lifecycle.ts:87-89`

**Issue:**
- `DecisionCacheShape.getOrCompute`'s doc opens its rationale with "The cache walks the question it is given, so a trace it stores answers its own key". This doc sits on the public interface that a host implements.
- D-02 and BEH-QD-645 say the opposite for a host-written cache: nothing in core makes it walk anything, and it is outside the guarantee. The qualification arrives 40 lines later (`:85-88`).
- `Lifecycle.ts:87-89` repeats the claim: "The cache is handed the question and `options` and walks the question itself (ADR-QD-174), so the key and the walk's input are one value". Under a host cache, which `decideQuestion` reads through the same `serviceOption`, neither half is guaranteed.
- This is the over-promise D-02 rules out, and it is the first thing a host implementer reads.

**Fix:** Scope both sentences to core's layer:
```ts
   * `decisionCacheLayer` walks the question it is given, so a trace it stores
   * answers its own key, and no caller can pair a key with an unrelated
   * computation, since this signature takes none (ADR-QD-174).
```
In `Lifecycle.ts:87-89`, write: "The cache is handed the question and `options`, never a computation (ADR-QD-174). Core's `decisionCacheLayer` walks that question itself, and a host cache must answer for it (BEH-QD-645)."

### WR-02: `getOrCompute`'s doc cites a test title that does not exist (UF-1)

**File:** `packages/core/src/DecisionCache.ts:82-83`

**Issue:**
- The doc reads: "`DecisionCache.test.ts`'s "one caller interrupted, the other still gets a result" pins this."
- `grep -rF "one caller interrupted" packages spec apps` matches only this comment and its stale `lib/` copy.
- The test that pins the rule is "a coalesced waiter's interruption does not interrupt the shared compute — the other waiter still gets a result" (`DecisionCache.test.ts:804-805`).
- The phase rewrote both sentences on either side of the citation (`:76-81`) and left the false citation between them. A reader who follows it finds nothing.

**Fix:**
```ts
   * `DecisionCache.test.ts`'s "a coalesced waiter's interruption does not
   * interrupt the shared compute — the other waiter still gets a result"
   * pins this.
```

### WR-03: The ADR and CCR-QD-452 say implementers are broken with TS2559, but an implementer gets TS2345 or TS2322. TS2559 is what a caller gets.

**File:**
- `spec/decisions/174-a-decision-cache-is-asked-the-question.md:71-72`
- `spec/README.md:389` (CCR-QD-452: "**Breaking** for `DecisionCacheShape` implementers: a `compute` or a function returning one is a compile error (TS2559), and so is a third argument (TS2554)")
- `apps/website/src/content/docs/docs/reference/upgrading.md:1067`, whose "(TS2559)" sits directly above the implementer Before/After

**Issue:**
- TS2559 and TS2554 are the errors at a **call site** (probe: `c.getOrCompute(q, compute)` gives TS2559, and a third argument gives TS2554).
- The party this change breaks is the **implementer**. Compiled against HEAD, the upgrade note's own "Before" cache reports:
  `TS2345: Argument of type 'Pick<EvaluateOptions, "concurrency"> | undefined' is not assignable to parameter of type 'Effect<unknown, EvaluationError, PortServices>'`.
  The error is at `Effect.map(compute, …)`, not at the signature. An implementer who annotated `compute: Effect.Effect<…>` explicitly gets a TS2322 assignability error on the property instead.
- The ADR's Consequences bullet opens "Breaking for `DecisionCacheShape` implementers" and then gives the caller's code, and the CCR row says it outright. A migrator searching for TS2559 will not find their error.
- The caller claims are correct as written, in BEH-QD-641 (`21-decision-cache.md:400`), the `.tst.ts` header and INV-QD-367.

**Fix:** Name both parties. In ADR-QD-174 Consequences:
```
- **Breaking** for `DecisionCacheShape` implementers: an implementation that still takes and runs a `compute`
  no longer type-checks, because its second parameter is now the options (TS2345 where it runs it, TS2322 where it
  annotates it). For callers, passing a `compute` or a function returning one is TS2559 (the weak-type rule …),
  and a third argument is TS2554.
```
Make the same split in the CCR-QD-452 row. In `upgrading.md:1067`, say "passing one **as a caller** is a compile error (TS2559)", and add before the "Before" fence: "An implementation written as below now fails to compile where it runs `compute` (TS2345)."

## Info

### IN-01: The `options` a cache receives is, at runtime, the caller's whole `EvaluateOptions`, not just "how the walk runs"

**File:** `packages/core/src/DecisionCache.ts:49-50`, `packages/core/src/Lifecycle.ts:121` and `:202`, `packages/core/src/Evaluate.ts:34`

**Issue:**
- `evaluate` passes its `options` to `ask`, `ask` passes the same object to `decideQuestion` (`Lifecycle.ts:202`), and `decideQuestion` hands that object to `getOrCompute` (`:121`).
- So at runtime a host cache receives `resource`, `action`, `maxDepth` and `evaluationId` as well as `concurrency`, even though its static type is `Pick<…, "concurrency">`.
- D-11 chose the pass-through for zero allocation, which is fine, and `decisionCacheLayer` reads only `concurrency`. But the doc says "`options` says how the walk runs, never what it answers". A host wrapper that logs or serializes `options` would emit the resource body.

**Fix:** Add one sentence to the interface doc: "At runtime `options` is the caller's own options object, passed through without a copy (ADR-QD-174 decision 4), so it may carry more keys than this type names. Read only `concurrency`, and do not log or persist it."

### IN-02: BEH-QD-644's "its own options object" is not pinned by the test it cites

**File:** `spec/behaviors/21-decision-cache.md:448-466`; `packages/core/test/Lifecycle.test.ts:32-35`

**Issue:**
- The requirement is that `decideQuestion` "MUST hand it the question and its own options object". The cited enforcement is `Lifecycle.test.ts`'s wrapper, which records only `key`.
- A mutant `getOrCompute(question, { concurrency: options?.concurrency })` would pass every test. It breaks D-11/D-14's no-allocation rule silently, because the `.tst.ts` pins only the type.

**Fix:** Have the wrapper record `options` too, call `ask` with a held object (`const opts = { resource: doc, action: "read" }`), and assert `assert.strictEqual(seenOptions[0], opts)`.

### IN-03: The I5 race test's fixed sweep bound is coupled to `walk`'s step count

**File:** `packages/core/test/DecisionCache.test.ts:1249-1250`

**Issue:**
- `gap <= 48` is sized from the measured switch-over at budget 3 (gap 38).
- Any later change that adds Effect steps to `walk`, `admit` or the leaf read, unrelated to the cache, moves the switch-over. Past 48, the test fails on `oneSided` with no cache bug present.
- The comment blames only "an effect upgrade". The failure is loud, not silent, so this is Info.

**Fix:** Either widen the bound with margin (for example 96, with the timeout raised to match), or sweep each budget until a `hit` has been seen plus a few more gaps, with a hard cap. Name `Walk.ts` changes in the comment beside effect upgrades.

### IN-04: `EvaluateOptions.concurrency`'s doc says it reaches the walk "through `getOrCompute`'s second parameter", which is true only when a cache is wired

**File:** `packages/core/src/Question.ts:68-69`

**Issue:** With no cache, `decideQuestion` hands `concurrency` straight to `walk` (`Lifecycle.ts:122`). This is a public doc on the option every `evaluate` caller reads.

**Fix:** "With a `DecisionCache` wired, it reaches the walk through `getOrCompute`'s second parameter, never the key (ADR-QD-174)."

### IN-05: The public metric doc still describes the cache's paths in terms of a caller's `compute`

**File:** `packages/core/src/EvaluationMetrics.ts:176-178` (out of the listed scope, made stale by this phase); also the comment at `packages/devtools/test/react/Simulator.test.tsx:108`

**Issue:**
- `decisionCacheLookupsTotal`'s doc says "joined another fiber's in-flight `compute`" and "this fiber ran `compute` itself".
- The phase renamed `compute` to "walk" everywhere else on the cache, in the interface doc, BEH-QD-166 and BEH-QD-190, and gave the spec renames dated notes.
- The `description` string must not change (ADR-QD-123 registry key), but the JSDoc may.

**Fix:** "`coalesced` (joined another fiber's walk of the question still in flight), or `miss` (this fiber walked it)". Make the same wording change in the Simulator test comment.

---

_Reviewed: 2026-11-19T19:32:39Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
