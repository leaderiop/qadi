# Phase 61: DecisionCache is asked only the question - Pattern Map

**Mapped:** 2026-11-19
**Files analyzed:** 19 (7 source/test/script, 12 records and docs)
**Analogs found:** 18 / 19 (the only file with no in-repo analog is `61-VALIDATION`-style nothing: all have one; `DecisionCache.tst.ts` is partial, see below)

Every analog path below was checked with `git ls-files` (tracked). No gitignored mirror is named. Line numbers are at HEAD `914d508f`.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/core/src/DecisionCache.ts` | service (port-shaped cache) | request-response, single-flight | itself (edit), plus `Walk.ts:871-881` for the callee | exact (self) |
| `packages/core/src/Lifecycle.ts` | service (lifecycle) | request-response | itself (edit) | exact (self) |
| `packages/core/src/Question.ts` | model (doc only) | n/a | itself | exact (self) |
| `packages/core/test/DecisionCache.test.ts` | test | request-response, concurrency | itself, `:484-506`, `:1113-1171`, `:1173-1232` | exact (self) |
| `packages/core/test/DecisionCache.tst.ts` (new) | test (type-level) | n/a | `packages/core/test/PortAccess.tst.ts:31-60` | role-match |
| `packages/core/test/Lifecycle.test.ts` | test | request-response | itself `:24-31`, wrapper pattern per research Q3 | exact (self) |
| `61-mutation.mjs` (new) | script (evidence harness) | batch | `.planning/phases/QD-60-*/60-mutation.mjs` (newest, no receiver), derived from `QD-59-*/59-mutation.mjs` | exact |
| `61-scan.mjs` (new) | script (close scan) | batch | `.planning/phases/QD-60-*/60-scan.mjs` | exact |
| `spec/decisions/174-a-decision-cache-is-asked-the-question.md` (new) | ADR | n/a | `spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md` | exact |
| `spec/decisions/031-decision-cache.md`, `132-*.md` | ADR amendment | n/a | `spec/decisions/099-entry-points-are-a-closed-list.md:89-97`, `047-*.md:513-521`, and `031:75` | exact |
| `spec/decisions/index.yaml` | index | n/a | `index.yaml:541-545` | exact |
| `spec/behaviors/21-decision-cache.md` (BEH-QD-641..645) | spec | n/a | `spec/behaviors/28-devtools-screens.md:2587-2606` (BEH-QD-640) | exact |
| `spec/invariants.md` (INV-QD-367..368) | spec | n/a | `spec/invariants.md:4261-4271` (INV-QD-366) | exact |
| `spec/README.md` CCR-QD-452 row and header | spec | n/a | `spec/README.md:388` (CCR-QD-451) | exact |
| `spec/traceability.md` rows | spec | n/a | `:198`, `:364`, `:460-461`, `:595-596` | exact |
| `spec/overview.md` (optional row text) | spec | n/a | rows `:311,344,362` | exact |
| `.changeset/core-decision-cache-asked-the-question.md` (new) | changeset | n/a | `.changeset/core-handover-options.md` | exact |
| `apps/website/.../upgrading.md` 0.13 section | docs | n/a | `upgrading.md:1021-1063` | exact |
| `packages/react/test/DevtoolsFeed.test.tsx` | test | n/a | no edit (research Q3: names the type, reads `.size` only) | n/a |

## Pattern Assignments

### `packages/core/src/DecisionCache.ts` (service, single-flight request-response)

**Analog:** itself. The callee analog is `Walk.ts:871-881` (`walk`), already read by research.

**Imports to add** (current block `DecisionCache.ts:15-29`; add in the same alphabetical, `.ts`, `import type` style):
```ts
import type { EvaluateOptions, Question } from "./Question.ts";   // replaces :25 `import type { Question }`
import { walk } from "./Walk.ts";                                   // after :26 SharedComputation, alphabetical -> place after "./SharedComputation.ts"
```
`Trace` (`:20`), `EvaluationError` (`:21`) and `PortServices` (`:24`) stay used (CacheLookup, `makeSharedComputation<Question, Trace, EvaluationError>` at `:228`, the return type). `Effect` stays used.

**Signature to replace** (`DecisionCache.ts:73-76`, today):
```ts
  readonly getOrCompute: (
    question: Question,
    compute: Effect.Effect<Trace, EvaluationError, PortServices>,
  ) => Effect.Effect<CacheLookup, EvaluationError, PortServices>;
```
New (research Pattern 1, D-11):
```ts
  readonly getOrCompute: (
    question: Question,
    options?: Pick<EvaluateOptions, "concurrency">,
  ) => Effect.Effect<CacheLookup, EvaluationError, PortServices>;
```

**The layer's call into `walk`** (replace `DecisionCache.ts:267-268`, today):
```ts
      const getOrCompute: DecisionCacheShape["getOrCompute"] = (key, compute) =>
        Effect.map(shared.run(key, compute), (found) => ({ trace: found.value, outcome: found.outcome }));
```
New:
```ts
      const getOrCompute: DecisionCacheShape["getOrCompute"] = (key, options) =>
        Effect.map(shared.run(key, walk(key, options?.concurrency)), (found) => ({
          trace: found.value,
          outcome: found.outcome,
        }));
```
Keep it a plain arrow, not `Effect.fn` / `fnUntraced` (`SharedComputation.ts:253-255` says why; `UNTRACED_BUDGET`). `walk` signature to match: `Walk.ts:871-875` `(question: Question, concurrency: Concurrency | undefined) => Effect<Trace, EvaluationError, PortServices>`; its `Effect.suspend` (`:876`) keeps `admit` off the hit path.

**Doc rewording (Pitfall 6)**, "compute" becomes "the walk" at exactly these places:
- method doc `:38-72`: "from a prior call's completed `compute`", "another fiber's currently-running `compute`", "freshly computed by running `compute` here", "share one `compute` run", "`compute` failing does not poison", "`compute` runs on a fiber of its own", "the shared `compute` itself". State once, here, that the cache walks the question it is given, so a stored trace answers its own key (INV-QD-368), and that a joiner's `concurrency` is unused: the claimant's governs (D-12, BEH-QD-643). Keep the doc-comment shape rule (one-line summary first, why after) from AGENTS.md.
- `clear` doc `:92-98`: "A `compute` already in flight".
- `capacity` doc `:191-192`: "never an entry with a `compute` still in flight, since eviction only ever runs after a `compute` settles".
- inline comment `:283-285` ("every compute already running", "a compute that started before the flush") optional.
- module doc `:1-14` needs no change.

Do NOT rename `getOrCompute` (metric description in `EvaluationMetrics.ts:186` is part of the registry key, ADR-QD-123). Do not export `walk`. No `as`, no `switch`.

---

### `packages/core/src/Lifecycle.ts` (`decideQuestion`)

**Analog:** itself, `Lifecycle.ts:86-121`.

**Delete** `:86-88`:
```ts
  // The question was built once by the caller: the cache key, the walk's input
  // and the record's request half all read it, never `options` again.
  const answer = walk(question, options?.concurrency);
```
Keep the comment's first sentence (reworded: "the cache key, the walk's input and the record's request half all read it") above the `lookupEffect`.

**Replace** `:117-121` (today):
```ts
  const lookupEffect: Effect.Effect<EvaluationLookup, EvaluationError, PortServices> = Option.isSome(
    cache,
  )
    ? cache.value.getOrCompute(question, answer)
    : Effect.map(answer, (trace) => ({ trace, outcome: undefined }));
```
with (research Pattern 2; pass `options` itself, never `{ concurrency: options?.concurrency }`, D-11/D-14/Pitfall 2):
```ts
  const lookupEffect: Effect.Effect<EvaluationLookup, EvaluationError, PortServices> = Option.isSome(
    cache,
  )
    ? cache.value.getOrCompute(question, options)
    : Effect.map(walk(question, options?.concurrency), (trace) => ({ trace, outcome: undefined }));
```
`options` type is `Omit<EvaluateOptions, keyof QuestionOptions> | undefined` (`:64-67`), assignable to `Pick<EvaluateOptions, "concurrency">`. Keep the annotation comment at `:113-116` (it explains why the const is annotated; still true). The import `walk` at the top stays (the no-cache branch uses it). `Trace` import (`:20` `import type { Decision, Trace }`) must still be used elsewhere in the file or `noUnusedLocals` fails; check after the edit.

Reword the comment block `:90-112` ("`getOrCompute` also coalesces concurrent identical asks into one walk ... The key is the `Question`"): the cache now walks the question itself, so "this trace answers this key" lives in `DecisionCache.ts`. Leave the "TRACE is cached, never the Decision" paragraph and the `tapError` paragraph unchanged.

---

### `packages/core/src/Question.ts` (doc only)

**Analog:** itself, `Question.ts:3-5`:
```ts
 * Public because a hand-written `DecisionCacheShape` receives it; everything
 * that builds one goes through {@link questionOf}, so the defaults live in
 * one place.
```
Add one sentence (D-02): such a cache is handed the question and must answer it with its own trace for exactly that question (wrapping `decisionCacheLayer()` is the supported route, ADR-QD-174). The `concurrency` doc at `:47-66` already ends "Not part of the `Question`: it does not change the answer (ADR-QD-026)"; optionally append "It reaches the walk through `getOrCompute`'s second parameter, never the key." Nothing else changes.

---

### `packages/core/test/DecisionCache.test.ts` (test, request-response + concurrency)

**Analog:** itself. Imports header `:1-27`; helpers `counting` (`:34-41`), `needsLookup` (`:32`), `alice`/`bob` (`:43-44`). `Trace` import (`:15`) and `questionOf` (`:16`) must be kept or dropped by actual use after the race test rewrite (`noUnusedLocals`). `PORT_DOUBLE_BUDGET`: the file's one budgeted `new AttributeResolveError` (`:589`) stays the only one; the new resolver SUCCEEDS.

**D-03 test 1, one entry for two concurrencies.** Extend or sit beside `:484-506` (existing, shown in full above):
```ts
  it.effect("concurrency and the cache compose without either changing the answer", () =>
    Effect.gen(function* () {
      const policy = P.allOf([needsLookup, P.hasAttribute("other", M.gte(1))]);
      const calls: Array<string> = [];
      const [sequential, concurrent] = yield* Effect.gen(function* () {
        const a = yield* evaluate(policy);
        const b = yield* evaluate(policy, { concurrency: "unbounded" });
        return [a, b] as const;
      }).pipe(Effect.provide(Layer.mergeAll(
        testLayer(alice, { AttributeResolver: counting(calls) }), decisionCacheLayer())));
```
Add `const size = yield* DecisionCache.use((c) => c.size)` inside the provided effect (DecisionCache.test.ts reads it this way elsewhere; `DecisionCache` has no static accessors, see `DecisionCache.ts:103-113` doc) and assert `1`. Read the outcome through the metric the way `:1173-1232` does (`describe("qadi_decision_cache_lookups_total"`, `isolatedMetrics` from `./helpers.ts`, `Metric.value(decisionCacheLookupsTotal.Hit)` style; never an id literal, `METRIC_ID_LITERAL_BUDGET`). Run both orders (unbounded then sequential, sequential then unbounded).

**D-03 test 2, concurrency reaches the walk through the cache** (new; research Q2 item 2): `P.allOf([P.hasAttribute("a", M.gte(1)), P.hasAttribute("b", M.gte(1))])` with `counting(calls, 0)` so the first child denies. `evaluate(policy, { concurrency: "unbounded" })` on a fresh `decisionCacheLayer()` must record `["u-1:a", "u-1:b"]` (a sequential run records only `["u-1:a"]`, INV-QD-005); a following sequential ask is a hit, `calls` unchanged, `size` 1. Copy the harness shape from `:484-506` above.

**D-12 test, a coalesced joiner's concurrency is ignored.** Copy the latch pattern of the existing coalescing test at `:508` ("N concurrent identical asks coalesce into one compute"): two forked `evaluate(policy, ...)`, one `{ concurrency: "unbounded" }`, one sequential, a `Deferred` latched resolver, one walk; assert the lookups match the claimant's concurrency only. Order the claimant deterministically (fork it first, yield until it has claimed, then fork the joiner), as `:508-580` do. Use `forkAllAndSettle` from `./helpers.ts` if the existing test does.

**D-15, the I5 FIFO race test, rewritten** (existing `:1113-1171`, whose shape to keep: nested `for (const budget of [3, 4, 5, 6]) for (let gap = 0; gap <= 12; gap++)`, `Effect.provideService(Scheduler.MaxOpsBeforeYield, budget)`, `Layer.mergeAll(testLayer(subject), decisionCacheLayer({ capacity: 2 }))`, the `raced` array and `assert.deepStrictEqual(raced, [])`). Current direct calls to replace:
```ts
const owner = yield* Effect.forkChild(cache.getOrCompute(K, compute("K", 3)));
...
const joiner = yield* Effect.forkChild(cache.getOrCompute(K, compute("K", 0)));
...
(yield* cache.getOrCompute(X, compute("X", 0))).outcome,
```
New (research Q3, "The race test ... driven through a question alone"): questions `questionOf(subject, P.hasAttribute("k", M.gte(1)))` (and x, y), `cache.getOrCompute(K)`, and a spinning, recording resolver provided via `testLayer(subject, { AttributeResolver: spinning })` where `spinning` is `Layer.succeed(AttributeResolver, { resolve: (_id, attribute) => Effect.gen(function* () { computes.push(attribute); const spin = attribute === "k" ? ownerSpin : 0; ownerSpin = 0; for (...) yield* Effect.yieldNow; return 5; }) })` (same `Layer.succeed(AttributeResolver, { resolve })` form as `counting` at `:34-41`). Widen the sweep (`gap` up to 24, Pitfall 3) and add the both-sides assertion: at least one iteration's joiner outcome was `coalesced` and at least one `hit` (read via the `CacheLookup.outcome` the joiner fiber returns). Drop the `trace(label)` helper and the `Trace` import if unused. Keep the docblock above `:1105` (ARCH-45 I5), reword "compute" to "walk", keep its "the red is scheduler-dependent" paragraph.

---

### `packages/core/test/DecisionCache.tst.ts` (new, type-level)

**Analog:** `packages/core/test/PortAccess.tst.ts:31-60` (the `Params<F>` form), header `:1-10`, imports `:11-20`.

Copy verbatim (`PortAccess.tst.ts:31-38`):
```ts
/**
 * A read's parameters with its result dropped. The reads return an `Effect`, and
 * the Effect language service reports a call to one as a floating effect, which
 * tstyche then reads as "not callable": a bare `toBeCallableWith` would fail on
 * the read itself whatever its parameters were, and `not.toBeCallableWith` would
 * pass.
 */
type Params<F> = F extends (...args: infer A) => unknown ? (...args: A) => void : never;
```
and the test shape (`:40-42`):
```ts
test("a signature read cannot be called with loose strings", () => {
  expect<Params<typeof askSignature>>().type.not.toBeCallableWith(...);
});
test("a signature read is called with its leaf and the resource", () => {
  expect<Params<typeof askSignature>>().type.toBeCallableWith(...);
});
```
Body: research Q6's file in full (positive controls with `question`, `undefined`, `{ concurrency: "unbounded" }`; negatives `compute`, `() => compute`, a third argument; the `Pick<EvaluateOptions, "concurrency"> | undefined` and `ReturnType` pins). Imports are `import type` for everything except `expect, test` from `"tstyche"`, `.ts` extensions, as at `PortAccess.tst.ts:11-20`. Header comment: state that no deliberate compile error lives here because `tsconfig.test.json` compiles every `*.tst.ts` (`PortAccess.tst.ts:4-6`). `Params<DecisionCacheShape["getOrCompute"]>` works because the property is a function type, not a method overload.

---

### `packages/core/test/Lifecycle.test.ts` (wrapper double)

**Analog:** itself, `:24-31`, replaced by the delegating wrapper (research Q3). Today:
```ts
      const cache = Layer.succeed(DecisionCache, {
        getOrCompute: (key, compute) => {
          keys.push(key);
          return Effect.map(compute, (trace) => ({ trace, outcome: "miss" as const }));
        },
        size: Effect.succeed(0),
        clear: Effect.void,
      });
```
New:
```ts
      const cache = Layer.effect(
        DecisionCache,
        Effect.gen(function* () {
          const inner = yield* DecisionCache;
          return DecisionCache.of({
            ...inner,
            getOrCompute: (key, options) => {
              keys.push(key);
              return inner.getOrCompute(key, options);
            },
          });
        }),
      ).pipe(Layer.provide(decisionCacheLayer()));
```
Import line becomes `import { DecisionCache, decisionCacheLayer } from "../src/DecisionCache.ts";`. `"miss" as const` disappears (D-09: net `as` must not rise). The line `Effect.provide(Layer.mergeAll(cache, sink))` at `:36-38` stays. All assertions `:40-57` hold. `DecisionCache.of` is the house `Context.Service` constructor (AGENTS.md section 2; `upgrading.md:810` uses `AttributeResolver.of`).

`packages/react/test/DevtoolsFeed.test.tsx` and `packages/core/bench/DecisionCache.bench.ts` need no edit (research Q3, D-10).

---

### `61-mutation.mjs` (new, evidence harness)

**Analog:** `.planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-mutation.mjs` is the newest form of `59-mutation.mjs` and is the right copy base: it already has no receiver (`LN`/`MOVED` are gone; header says "Phase 59's identity mechanics, with no receiver"), so research Q7's "drop the receiver clause" is already done. `59-mutation.mjs` still has `LN = AD` (`:23`), `MOVED = [PR, WK]` (`:25`) and the `a.measured[f] >= b.measured[f]` receiver tail (about `:176-188`), which Phase 60 removed. Copy 60's file, not 59's, then change only the constants. The rest of the file (`reportOf`, `write`, `evidence`, `compare`, `keyOf`/`anchorOf`/`minus`, static credit) is copied unchanged.

Constants to set (60 shows the shape at `60-mutation.mjs:15-37`; 59's at `:15-40`):
```js
const D = ".planning/phases/QD-61-decisioncache-is-asked-only-the-question/";
const CF = "stryker.config.mjs";                       // core, as 59 (`59-mutation.mjs:16`), not stryker.devtools.mjs
const RP = "reports/mutation/mutation.json";           // as 59 (`:17`)
const DIRS = ["packages/core/src", "packages/core/test"];  // as 59 (`:18`)
const DC = "packages/core/src/DecisionCache.ts";
const LC = "packages/core/src/Lifecycle.ts";
const SC = "packages/core/src/SharedComputation.ts";
const FILES = [DC, LC, SC];                            // sorted
const DELETED = {
  [DC]: ["(key, compute) =>"],
  [LC]: ["const answer = walk(question, options?.concurrency);", "getOrCompute(question, answer)"],
};
```
Search/replace every `60-` file name with `61-` (header usage lines, `60-mutation-base.json`, `60-mutation-after.json`, `60-mutation-static.json`, the usage strings). `SC` has no `DELETED` entry (no source change); the `DELETED[f] || []` loop already tolerates that. Note `code(f)` strips comments before the deletion check, so the doc words "compute" do not trip `(key, compute) =>`.

Command and order (D-05): base is the first commit, nothing outside `.planning/` before it (60-scan.mjs `:171-176` enforces that for 60; copy that for 61).

---

### `61-scan.mjs` (new, close scan)

**Analog:** `.planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-scan.mjs` (343 lines; 59-scan.mjs is the older form). Structure to keep, section by section, and what to change:

- **Header and phase base** (`:1-13`): `D` to the 61 dir; `B` read from `61-01-SUMMARY.md`'s `phase_base:` line (`:8`, same regex); `g`, `lines`, `bad`, `SRC`, `CODE`, `TRAILER` (`:13-18`) verbatim. Keep `TRAILER` as is (`Claude (Opus|Sonnet) 5.5`); the attribution line for this session is `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, which matches.
- **Section 1, scope** (`:77-84`): `ALLOWED` is the set of files this phase may touch outside `.planning/`: `DecisionCache.ts`, `Lifecycle.ts`, `Question.ts` (src); `DecisionCache.test.ts`, `DecisionCache.tst.ts`, `Lifecycle.test.ts` (test); the spec list (ADR 174, `031-*`, `132-*`, `index.yaml`, `21-decision-cache.md`, `25-inspection.md` if reworded, `invariants.md`, `overview.md` if edited, `traceability.md`, `README.md`); `.changeset/core-decision-cache-asked-the-question.md`; `upgrading.md`; optionally `Simulator.test.tsx` (comment, research Q3). Drop the 60-specific `test(60-05)` gap-commit allowance or adapt its regex to `test\(61-0N\)`.
- **Section 2, banned constructs** (`:99-135`): `strip`, `skip`, `RULES` (the ten regexes), the net-per-file diff loop, verbatim. This is the "review-round rules": net added minus removed per file, so the Lifecycle double's removed `"miss" as const` offsets.
- **Section 3, budgets** (`:137-146`): `switch (` and `Effect.fnUntraced` counts across `packages/*/src`, verbatim.
- **Section 4, frozen files** (`:148-160`): `packages/*/package.json`, CHANGELOGs, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.oxlintrc.json`, `tsconfig*.json`, `stryker*.mjs` (core's `stryker.config.mjs` must be untouched, research Q7), `AGENTS.md`; add `SharedComputation.ts`, `Walk.ts`, `EvaluationMetrics.ts` (metric description, Pitfall 1), `SharedComputation.test.ts`, `DecisionCache.bench.ts`, `DevtoolsFeed.test.tsx` (research says no edit). Changeset check `:159-160`: exactly one added, `A\t.changeset/core-decision-cache-asked-the-question.md`.
- **Section 5, order** (`:162-221`), the part to preserve exactly:
  - `FIX = /^fix\(60(-\d\d)?\): /` (`:165`) becomes `/^fix\(61(-\d\d)?\): /`, so a review round's fix may re-touch a file after its plan commit.
  - first plan commit is `chore(61-01)` with exactly `61-mutation-base.json` and `61-mutation.mjs` (`:170-176`); no re-baseline or edit of those two after it (`:177-178`).
  - first src commit is the interface commit (`feat(61-0N)!:`), exactly one such GREEN commit whose src files equal the promised set (`:179-189`, `:182-189`); RED commits (`test(61-0N): RED `) precede the first src commit and touch only the RED list (`:191-197`). Here RED = `DecisionCache.tst.ts`; the two characterisation tests and the race-test rewrite are green on base and are committed before the interface commit too.
  - **Either-file evidence dating** (`:207-217`, the form to copy):
    ```js
    const lastAfter = lines(g("log", "--format=%H", "-1", B + "..HEAD", "--", D + "60-mutation-after.json", D + "60-mutation-static.json"))[0];
    const ev = lastAfter === undefined ? -1 : at(lastAfter);
    if (ev < 0 || !/^chore\(60(-05)?\): /.test(L[ev].s)) bad.push(...);
    else {
      const late = commentOnly(L[ev].h, CODE);
      if (late.length) bad.push("60-mutation-after.json does not follow the last code change: " + late[0].slice(0, 120));
      if (greens.length === 1 && ev < greens[0]) bad.push("the mutation evidence precedes feat(60-03)");
    }
    ```
    Rename 60 to 61 and the plan number in the regex. The comment at `:209` explains why: one run writes both files and a re-run with byte-identical after-scores leaves only `*-static.json` in its commit, so dating must follow the newest touch of EITHER file. `commentOnly` (`:205-206`) lets doc-only edits follow the evidence.
  - trailer check on every plan commit (`:218-221`).
- **Section 6, numbers** (`:223-247`): reservation file must read `{ CCR: 452, ADR: 174, BEH: 645, INV: 368 }` (already the value at `:225`; it is unchanged since Phase 60 reserved it, and it is the same object because Phase 60 used ids at or below those maxima: confirm it still reads that at HEAD, research Q9). `BEHS = ["BEH-QD-641".."BEH-QD-645"]`, `INVS = ["INV-QD-367","INV-QD-368"]`, `RESERVED = new Set(["ARCH-108","ADR-QD-174","CCR-QD-452", ...BEHS, ...INVS])`. Heading checks: `^## BEH-QD-641: ` etc. exactly once (`:239-242`), `# ADR-QD-174 — ` once (`:243`), the `| CCR-QD-452 |` row once, naming `ARCH-108.` and `Unused: none.` (`:244-247`; look at the actual row text for the phrase; research's CCR row should include "Unused: none." if used).
- **Section 7, promised source** (`:249-337`), replaced by 61's promises with the same `read`/`code`/`flatOf` helpers (`:250-256`) and `has`/`not` table (`PROMISE`, `:294-319`):
  - `DecisionCache.ts` has `options?: Pick<EvaluateOptions, "concurrency">,`, `walk(key, options?.concurrency)`, `import { walk } from "./Walk.ts";`; not `compute:`/`(key, compute)`.
  - `Lifecycle.ts` has `getOrCompute(question, options)`; not `const answer =`, not `{ concurrency: options?.concurrency }` (Pitfall 2).
  - `index.ts` of core unchanged; `walk` not exported from the barrel (`not: /Walk\.ts/` in `packages/core/src/index.ts`; D-13).
  - `Lifecycle.test.ts` has `decisionCacheLayer()`, not `compute`.
  - `DecisionCache.test.ts` has no remaining `getOrCompute(K, compute(`.
  - Docs (`:329-337`): `upgrading.md` has exactly one line `## 0.13: a DecisionCache is asked only the question` (`:335` form); the changeset matches `/^---\n"@qadi\/core": minor\n---\n/` and includes `**Breaking.**` (`:336-337` form).

---

### ADR-QD-174 and its brushes of ADR-QD-031 and ADR-QD-132

**ADR file analog:** `spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md` (all of it, 104 lines). Copy the skeleton:
- Title `# ADR-QD-173 — The devtools headless interface is its feeds` (`:1`); the Document Control table (`:3-13`) with `Document ID | QADI-ADR-173`, `Revision | 1.0`, `Effective Date`, `Status | Accepted — amends ADR-QD-047, ADR-QD-099, ADR-QD-169; applies ADR-QD-137`, `Change History | 1.0 (2026-11-19): Initial release (ARCH-107, CCR-QD-451)`.
- Sections in order: `## Context`, `## The checkpoint` ("The owner decided (HDLS-01, ...) to **pursue** ... There is no rejection record."; for 61: CASK-01, D-01, D-02), `## Decision` (numbered), `## Alternatives considered`, `## Consequences`, `## Related`.
- 174 content (research Q9): file `spec/decisions/174-a-decision-cache-is-asked-the-question.md`; Status `Accepted — amends ADR-QD-031; reads ADR-QD-132, ADR-QD-100` (the 173 line `:8` uses "amends ..., applies ...", and `index.yaml` 132 uses "reads ADR-QD-031", so "reads" is house vocabulary for an unchanged-rules relationship). Alternatives: A question only (chosen), B keep `compute` and pin the call site, C seal the service (rejected by owner, D-02), plus the two Q1 parameter alternatives (`WalkOptions`, positional). Consequences: Breaking for implementers; guarantee covers callers, not host implementations; a coalesced joiner shares the claimant's `concurrency`; no added work per lookup (research Q8); the mutation floor result is filled in at close (as 173's Consequences cites `DiagnosticsFeed.ts` 0.9540 to 0.9863). Cite gate scripts by name (D-07): `check-api-surface.mjs`, not "gate 13" alone (173 writes "Gate 13 (`check-api-surface.mjs`)").

**Index entry** (`spec/decisions/index.yaml:541-544`, the last entry; append after it):
```yaml
  - id: "ADR-QD-173"
    file: "173-the-devtools-headless-interface-is-its-feeds.md"
    title: "The devtools headless interface is its feeds"
    status: "Accepted — amends ADR-QD-047, ADR-QD-099, ADR-QD-169; applies ADR-QD-137"
```
Also update the `status:` of ADR-QD-031 (`index.yaml:125-128`, currently `"Accepted"`) and ADR-QD-132 (`:409-412`, `"Accepted — reads ADR-QD-031"`) to append `; amended 2026-11-19 (ADR-QD-174: ...)`, in the style of `index.yaml:324` (`"...; amended 2026-11-19 (ADR-QD-173: the devtools root's named list carries ..."`).

**Brush of ADR-QD-031** (current Rev 1.2; becomes Rev 1.3): analog is its own `:75`, `> **Amended in CCR-QD-189 (ADR-QD-100).** ...`, combined with the dated-paragraph form at `047-a-headless-devtools-model.md:513-521`:
```
> **Amended 2026-11-19 (CCR-QD-451): the headless interface is the feeds.**
> ... This narrows the 2026-10-08 root list ... and rewrites neither ...
> ([ADR-QD-173](./173-the-devtools-headless-interface-is-its-feeds.md)).
```
For 031: `> **Amended 2026-11-19 (CCR-QD-452): the cache is asked the question.** The interface is \`getOrCompute(question, options?)\`; the key and its security reasoning are unchanged ...([ADR-QD-174](./174-a-decision-cache-is-asked-the-question.md)).` Put it after `:75`'s paragraph (the Decision section, where the listing it amends lives). Also bump the Document Control Revision, Effective Date and Change History line (format at `173:13`, `047` line 13 `1.19 (2026-11-19): amendment — ... (ARCH-107, ADR-QD-173, CCR-QD-451)`).

**Brush of ADR-QD-132** (Rev 1.1 to 1.2): same dated-paragraph form, placed at the end before `Related` or after Consequences; for the `## Amendment (date, CCR): title` heading form see `099-entry-points-are-a-closed-list.md:89-97`:
```
## Amendment (2026-11-19, CCR-QD-451): the devtools root's named list carries the feeds
...
([ADR-QD-173](./173-the-devtools-headless-interface-is-its-feeds.md)).
```
For 132: `## Amendment (2026-11-19, CCR-QD-452): the adapter passes the walk of its own key`; text: the rules (coalescing, a shared failure, one waiter's interruption, last-waiter interruption, reset) are unchanged; `decisionCacheLayer` now passes `walk(key, ...)` as `compute`. Rewrite neither the 031 nor 132 text, per 173's last consequence bullet.

---

### BEH-QD-641..645 (new section in `spec/behaviors/21-decision-cache.md`, Rev 1.9 to 1.10)

**Analog:** `spec/behaviors/28-devtools-screens.md:2587-2606` (BEH-QD-640) for the layout, and `21-decision-cache.md:352-375` (BEH-QD-491) for the same file's own style.

Layout to copy exactly:
```
## BEH-QD-640: The runners are the feeds' engines, not the interface

> **Decision:** [ADR-QD-173](../decisions/173-the-devtools-headless-interface-is-its-feeds.md) ·
> **Scope:** [ADR-QD-099](../decisions/099-entry-points-are-a-closed-list.md) ·
> **Invariant:** [INV-QD-365](../invariants.md#inv-qd-365-every-read-the-dock-runs-is-reachable-headless-and-none-the-root-exports-goes-unwatched)

```
REQUIREMENT: `makeTimelineStore`, ... MUST NOT be importable from ...
```

Their modules stay, package-private, because ...

Pinned by `packages/devtools/test/surface.test.ts`, ... 
```
For 21-decision-cache.md use that file's own header form (`BEH-QD-491`, `:352-355`): `> **Invariant:** [INV-QD-307](../invariants.md#...)` then `> **See:** [ADR-QD-132](...)`, and its `**Enforcement**:` paragraph (`:362-375`: names the test file and the test titles). Anchors are the lowercase-hyphenated heading (`#beh-qd-641-the-cache-is-asked-the-question-and-how-the-walk-runs`). The five REQUIREMENT texts are research Q9's table. BEH-QD-641 and 645's code listing, if any, is a ```` ```ts ```` fence (listing, not compiled, AGENTS.md section 12; `check-doc-examples.mjs`). BEH-QD-643 states D-12 (joiner's concurrency ignored). Also: Document Control Revision `1.10`, Effective Date, and a Change History row prepended (format at `21-decision-cache.md:13`: `1.9 (2026-11-12): BEH-QD-491 — ... (ARCH-79, ADR-QD-132, CCR-QD-422)`), e.g. `1.10 (2026-11-19): BEH-QD-641..645 — the cache is asked the question (ARCH-108, ADR-QD-174, CCR-QD-452)`. Optional "compute" to "walk" rewording in BEH-QD-166 (`:177`), 439, 491 and `25-inspection.md:35,43,61,65` (research Q3 table); if `25-inspection.md` is edited, bump its revision and add it to the CCR row and the scan's `ALLOWED`.

Traceability section index row: `traceability.md:63` currently `BEH-QD-161–168, BEH-QD-439, BEH-QD-491`; extend with `, BEH-QD-641–645`.

---

### INV-QD-367..368 (`spec/invariants.md`, Rev 1.159 to 1.160)

**Analog:** `spec/invariants.md:4261-4271` (INV-QD-366). Exact field order:
```
## INV-QD-366: The diagnostics poll has one option shape, read without translation

<statement paragraph with a [BEH-QD-639](behaviors/28-devtools-screens.md#beh-...) link>

**Source**: `packages/devtools/src/model/DiagnosticsStore.ts` (...)

**Implication**: ... (ADR-QD-173).

**Enforcement**: `packages/devtools/test/model/DiagnosticsStore.tst.ts`, ...

**Related**: [INV-QD-365](#inv-qd-365-...), [BEH-QD-639](behaviors/28-devtools-screens.md#beh-...), ..., [ADR-QD-173](decisions/173-the-devtools-headless-interface-is-its-feeds.md).
```
Append after INV-QD-366 (ends `:4271`). Statements are research Q9's two rows. 367: Source `packages/core/src/DecisionCache.ts` (`DecisionCacheShape.getOrCompute`), Enforcement `packages/core/test/DecisionCache.tst.ts`. 368: Source `DecisionCache.ts` (`decisionCacheLayer`) and `Lifecycle.ts` (`decideQuestion`), Enforcement `DecisionCache.test.ts`, `Lifecycle.test.ts` and the mutation of `DecisionCache.ts`. Related per research: INV-QD-025, INV-QD-030, INV-QD-033, INV-QD-020, INV-QD-307. Header revision and change history row (`invariants.md:13`: `1.159 (2026-11-19): INV-QD-365 and INV-QD-366 (ARCH-107, CCR-QD-451)`). Relative link depth differs from the BEH files: invariants links to `behaviors/21-decision-cache.md#...`, BEH links to `../invariants.md#...`.

---

### CCR-QD-452 row and the traceability rows

**CCR row analog:** `spec/README.md:388` (one long table row): `| CCR-QD-451 | 2026-11-19 | \`spec/decisions/173-...md\` Rev 1.0 (new: ADR-QD-173) and \`spec/decisions/index.yaml\`, \`047-...md\` Rev 1.19 ..., \`spec/behaviors/28-devtools-screens.md\` Rev 1.33 (BEH-QD-636..640 new; ... amended), ..., \`spec/traceability.md\` Rev 1.222, \`spec/README.md\` Rev 1.254, the new changeset ..., the 0.13 note in \`.../upgrading.md\`, ... and the phase's source and tests: ...`. Append directly below it. Content per research Q9: ARCH-108, `21-decision-cache.md` Rev 1.10, ADR-QD-174 (new), ADR-QD-031 Rev 1.3 and ADR-QD-132 Rev 1.2 (amendments), `invariants.md` Rev 1.160, `traceability.md` Rev 1.223, `overview.md` (only if edited, with its Rev), `README.md` Rev 1.255, the changeset, the upgrading note, the phase's source and tests, the Breaking change, and the literal `Unused: none.` ending if the 60-scan check form (`60-scan.mjs:246-247`) is reused (it expects `ARCH-107.` and `Unused: none.`; check the tail of the actual 451 row and keep the same endings with `ARCH-108.`). Header: `spec/README.md:13` Change History prepends `1.255 (2026-11-19): CCR-QD-452: a decision cache is asked the question`.

**Traceability rows:**
- INV rows (analog `:198`, 4 columns: link, title, statement summary, test files): add `INV-QD-367`, `INV-QD-368` rows next to INV-QD-366, test files `DecisionCache.tst.ts` and `DecisionCache.test.ts`, `Lifecycle.test.ts`.
- ADR row (analog `:364`, columns: link, title with `amends/applies` clause, BEH links, and the rest): add after `:364` an ADR-QD-174 row listing BEH-QD-641..645, INV-QD-367..368. Update the ADR-QD-031 and ADR-QD-132 rows (`:331` for 132, whose cell already carries "amended (CCR-QD-422): ..."; same style) with `; amended (CCR-QD-452): ...`.
- Test file rows (analog `:595-596` for a `.tst.ts` row, and `:460-461` for the two existing rows to extend): `:460` `DecisionCache.test.ts` row: append `BEH-QD-641, BEH-QD-643, BEH-QD-644, INV-QD-367?` no: append `BEH-QD-642, BEH-QD-643, INV-QD-368, ADR-QD-174`. New row for `packages/core/test/DecisionCache.tst.ts`: `| \`packages/core/test/DecisionCache.tst.ts\` | ADR-QD-174, BEH-QD-641, INV-QD-367 (\`tstyche\`: ...) |` in `:596`'s format. `Lifecycle.test.ts` has a row somewhere (grep `Lifecycle.test.ts` in `traceability.md`); append `BEH-QD-644, INV-QD-368, ADR-QD-174`.
- Header Revision and change history row (`traceability.md:13`: `1.222 (2026-11-19): ADR-QD-173, INV-QD-365 and INV-QD-366 traced; BEH-QD-636..640 mapped; ... (ARCH-107, CCR-QD-451)`).

`spec/overview.md`: no export added or removed (research Q5), so no row is required. Optional extension of the `DecisionCacheShape` row (`:344`) and its Rev bump; if edited, the scan's `ALLOWED` must list it.

---

### `.changeset/core-decision-cache-asked-the-question.md`

**Analog:** `.changeset/core-handover-options.md` (frontmatter `"@qadi/core": minor`, `**Breaking.**` paragraphs, a closing line `See the 0.13 section of the upgrade guide, \`/docs/reference/upgrading/\`.`). Text is research Q10's block verbatim. Exactly one added changeset (scan check); nothing is released or versioned.

---

### `apps/website/src/content/docs/docs/reference/upgrading.md`, new `## 0.13: a DecisionCache is asked only the question`

**Analog:** the Phase 60 section `upgrading.md:1021-1063`, the last section in the file (1063 lines), so the new one appends after `:1063`. Layout to copy:
1. `## 0.13: the feeds are devtools' headless interface` heading (`:1021`).
2. One or two paragraphs naming what changed in backticks (`:1023-1025`).
3. `Before:` then a ```` ```ts ```` fence (does not compile after; not extracted) (`:1027-1036`).
4. `After:` then a ```` ```typescript ```` fence, which `check-website-doc-examples.mjs` compiles, with all imports spelled out in house style (`import * as Effect from "effect/Effect";` namespace imports, named imports from `@qadi/core`, `export const ...`) (`:1039-1057`).
5. A trust/behaviour note paragraph (`:1059-1061`).
6. Closing line: `The decision is [ADR-QD-173](https://github.com/leaderiop/qadi/blob/main/spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md).` (`:1063`), i.e. an absolute GitHub URL to `.../spec/decisions/174-a-decision-cache-is-asked-the-question.md`.

For 61, the After fence is research Pattern 3 (`loggedCache`), with the namespace imports for `Effect` and `Layer` and `import { DecisionCache, decisionCacheLayer } from "@qadi/core";` (named root import, AGENTS.md section 1). That fence is [ASSUMED] to compile (research A1): the plan should include a task that runs `check-website-doc-examples.mjs` (not a "gate N" without the script name, D-07). `DecisionCache.of` precedent: `AttributeResolver.of` at `upgrading.md:810`. State the TS2559 compile error for a `compute` argument and that a wholly separate cache cannot produce a correct trace, so delegation is the route (D-13). Add `**Breaking.**`-equivalent wording consistent with the neighbouring 0.13 sections (they do not use a bold lead, they state the break in the first paragraph).

## Shared Patterns

### Commit and evidence order (D-05)
**Source:** `60-scan.mjs:162-221`, restated for 61 above. First plan commit `chore(61-01)` touches only `61-mutation.mjs` and `61-mutation-base.json`; the test and RED commits (`test(61-0N): ...`) precede the one `feat(61-0N)!:` src commit; the mutation `after`/`static` evidence commit is `chore(61-0N)` after the last code change; every plan commit ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
**Apply to:** the plan's wave structure (research "Plan Shape" steps 1-6).

### Banned constructs, net per file
**Source:** `60-scan.mjs:99-135` (RULES). **Apply to:** every src, test, bench, feature and example file. No `as`, `!`, `any`, `switch (`, `Effect.fnUntraced`, `async`/`await`, `console.`, `Date.now()`, `Record<string, unknown>` added. The removed `"miss" as const` in `Lifecycle.test.ts:27` is a net -1.

### Doc comment shape
**Source:** AGENTS.md preamble. One-line summary first, the why after. **Apply to:** the reworded `DecisionCacheShape.getOrCompute` doc and `Question.ts`'s header.

### Imports
**Source:** `DecisionCache.ts:15-29`. `.ts` relative extensions, `import type` for type-only, effect submodule namespace imports; `walk` is a named import from `./Walk.ts`, and `DecisionCache.ts` to `Walk.ts` is acyclic (research Q1, `pnpm circular`).

### "gate N" in spec text names its script (D-07)
**Source:** `173:` consequences ("Gate 13 (`check-api-surface.mjs`)", "Gate 14 (`check-package-install.mjs`)") and `BEH-QD-640` ("gate 13 (`check-api-surface.mjs`)"). **Apply to:** ADR-QD-174, BEH-QD-641..645, the CCR row, `upgrading.md`.

### No metric id literal in tests
**Source:** `DecisionCache.test.ts:1173-1232` reads `decisionCacheLookupsTotal` through `Metric.value`/`isolatedMetrics`. **Apply to:** the D-03 and D-12 tests (`METRIC_ID_LITERAL_BUDGET`).

## No Analog Found

None. Closest to it: `DecisionCache.tst.ts` is a role-match, not exact (no existing `.tst.ts` asserts a negative on a service-shape method; `PortAccess.tst.ts` asserts on plain functions via `Params<typeof fn>`, so the new file uses `Params<DecisionCacheShape["getOrCompute"]>` instead; `Lifecycle.tst.ts:26-35` pins `EvaluateOptions`' keys and is the secondary precedent for pinning `options` types with `.type.toBe`).

## Metadata

**Analog search scope:** `packages/core/src`, `packages/core/test`, `.planning/phases/QD-59-*`, `QD-60-*`, `spec/decisions`, `spec/behaviors`, `spec/invariants.md`, `spec/traceability.md`, `spec/README.md`, `.changeset`, `apps/website/.../upgrading.md`.
**Files read this pass:** `DecisionCache.ts` (1-110, 185-290), `Lifecycle.ts` (1-135), `Question.ts` (1-70), the four test files above (ranges), both mutation harnesses (59 whole, 60 by diff), `60-scan.mjs` (whole), ADR-173 (whole), spec rows and sections cited above, the changeset and `upgrading.md:1015-1063`.
**Pattern extraction date:** 2026-11-19
