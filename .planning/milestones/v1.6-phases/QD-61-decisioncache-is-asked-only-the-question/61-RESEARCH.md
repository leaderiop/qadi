# Phase 61: DecisionCache is asked only the question - Research

**Researched:** 2026-11-19
**Domain:** `@qadi/core`'s `DecisionCache` interface, the walk it now runs itself, and the records and gates that pin both
**Confidence:** HIGH. Every in-repo fact below was read at HEAD `5df371e2` this session, and the source tree (`packages`, `spec`, `apps`, `scripts`) is clean there. On that base, `DecisionCache.test.ts`, `Lifecycle.test.ts` and `SharedComputation.test.ts` ran green (3 files, 59 tests, `pnpm exec vitest run --project core … < /dev/null`). The type-level refusal the negative relies on (TS2559, weak-type detection) was checked this session with the repo's `tsc` (`7.0.2+effect-tsgo.0.67.5`) against the installed `effect` types, in a scratch file outside the repo. madge's closure of `Walk.ts` was computed this session; it does not reach `DecisionCache.ts`. No package is installed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Owner choice (2026-11-19, the CASK-01 checkpoint)

- **D-01: pursue, question only.**
  - The cache's interface takes the question alone. Core's `decisionCacheLayer` runs the matching walk itself.
  - No caller can hand the cache an unrelated computation. A type-level negative shows an arbitrary `compute` is refused.
  - The roadmap's shape is `getOrCompute(question, { concurrency })`. The exact name of the second, non-key parameter is the planner's to settle from research, but it carries only how the walk runs, never what it answers.
- **D-02: not sealed.**
  - `DecisionCacheShape` stays public, so a host can still write its own cache. Such a cache must produce its own trace for the question it is given.
  - The guarantee is about callers: no caller can pair a key with an unrelated computation. It does not cover a host-written implementation.
  - **Breaking** for `DecisionCacheShape` implementers. Record it in the changeset and in `upgrading.md`.

#### Settled from the roadmap and the house rules

- **D-03:** `concurrency` reaches the walk and does not join the key. The same question asked with a different `concurrency` is one cache entry, and a test pins that.
- **D-04:** `DecisionCache.test.ts`'s coalescing and interruption tests are driven through a question alone and stay green. `SharedComputation`'s rules are unchanged.
- **D-05, RED first:**
  1. the mutation base for `DecisionCache.ts`, `Lifecycle.ts` and `SharedComputation.ts`;
  2. the coalescing and interruption tests characterised through a question alone;
  3. the type-level negative;
  4. then the interface;
  5. then the records.
- **D-06:** A touched file's mutation score must not fall. This uses the D-15/D-16 rule with the static-ignored credit (ADR-QD-167 Rev 1.1), under core's `stryker.config.mjs`.
- **D-07:** Every "gate N" in spec text names its script (`check-dod-table.mjs`).
- **D-08:** Never run `next-id.mjs`. The ids are reserved: ADR-QD-174, CCR-QD-452, BEH-QD-641..645 and INV-QD-367..368.
- **D-09:** No `as`, `!`, `any`, new `switch`, new `Effect.fnUntraced`, `async`/`await` or `Record<string, unknown>`. Unions stay closed.
- **D-10:** `DecisionCache.bench.ts` keeps its workloads. If the hit or miss path changes shape, research says whether a bench comparison is warranted (`Lifecycle` is on the hot path).

### Claude's Discretion
- The second parameter's name and shape, for example `{ concurrency }` or a `WalkOptions`.
- How `decisionCacheLayer` reaches `walk` without an import cycle.
- How the test doubles change (`Lifecycle.test.ts:24`, react's `DevtoolsFeed.test.tsx`).

### Deferred Ideas (OUT OF SCOPE)
- Sealing `DecisionCache` against host implementations (the owner chose not to).

**Scope (from CONTEXT `<domain>`):** in: core's `DecisionCache.ts`, `Lifecycle.ts`, `SharedComputation.ts` (only if its adapter must change; it does not, see Q4), `Question.ts`'s doc; the tests and bench that call `getOrCompute`; `@qadi/react`'s test that names the shape; the records. Out: `SharedComputation`'s rules; the key's contents (the whole `Question`, ADR-QD-031); sealing; releasing or versioning.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CASK-01 | Owner decides at a checkpoint whether to pursue | Settled: D-01 pursue, D-02 not sealed (CONTEXT). No rejection ADR. |
| CASK-02 | The interface takes the question alone; core supplies the matching walk | Q1 (signature, how the layer reaches `walk`, no cycle), Q6 (the type-level negative, verified to refuse with TS2559) |
| CASK-03 | `concurrency` reaches the walk without joining the key | Q2 (where it comes from, what `Question` holds, the one-entry test and the reaches-the-walk test) |
| CASK-04 | Coalescing and interruption tests driven through a question alone; `SharedComputation`'s rules unchanged | Q3 (every such test already goes through `evaluate` except one; its pattern), Q4 (the adapter's call into `SharedComputation` keeps its form) |
| WX-01 | `pnpm check:pr` green at the end | Q5 (no gate script names the cache; the budgets that could bite and why they do not) |
| WX-02 | Records use only the reserved ids; `next-id.mjs` never run | Q9 (all nine ids confirmed unused; BEH/INV proposals) |
| WX-03 | `spec/overview.md` names every added export and drops every removed one | Q5: no export is added or removed; `DecisionCacheShape` keeps its name and row (`spec/overview.md:344`) |
| WX-04 | Nothing new from the forbidden list | The change needs no `as`, `switch`, `fnUntraced` or budget edit (Pitfall 5) |
| WX-05 | Stryker score of touched files does not fall | Q7 (files, invocation, harness, predicted deletions, no MOVED pair) |
| WX-06 | Behaviour change preceded by a test on the base | Q3 and Q6: the RED tests are the `.tst.ts` (fails on base) and two characterisation tests (green on base and after) |
| WX-07 | Breaking in the changeset and `upgrading.md`; nothing released | Q10 (a 0.13 section series exists; the note and its compiled fence) |
</phase_requirements>

## Summary

This is an interface change with no behaviour change on any path a caller can reach through `evaluate`. Today `getOrCompute(question, compute)` takes any `Effect<Trace, EvaluationError, PortServices>` for any `Question` (`DecisionCache.ts:73-76`). The only reason the trace a cache stores answers its key is that `decideQuestion` builds `answer = walk(question, options?.concurrency)` and passes it with the same `question` (`Lifecycle.ts:88,120`). After the change the cache is asked `getOrCompute(question, options?)`. `options` carries only `concurrency`, and `decisionCacheLayer` calls `walk(question, options?.concurrency)` itself, inside its existing `shared.run` call.

Most of the work is small and mechanical:

1. **The interface.** The second parameter becomes `options?: Pick<EvaluateOptions, "concurrency">`. That derives from the one place `concurrency` is documented (`Question.ts:47-66`) and adds no export. An `Effect`, a thunk or a third argument is refused by the compiler (TS2559), checked this session.
2. **The layer reaches the walk by a plain import.** `DecisionCache.ts` imports `walk` from `Walk.ts`. madge's closure of `Walk.ts` (54 modules) contains neither `DecisionCache.ts`, `Lifecycle.ts`, `Evaluate.ts`, `EvaluationEnvironment.ts` nor the barrel, so no cycle forms. The walk needs nothing else: the depth admission runs inside `walk` (`Walk.ts:878`), and the ports come from the `PortServices` requirement that `getOrCompute` already carries.
3. **`decideQuestion` passes its own `options` object through.** Its type (`Omit<EvaluateOptions, keyof QuestionOptions>`) is assignable to `Pick<EvaluateOptions, "concurrency">`. That allocates nothing, so a lookup does exactly the work it does today, and no bench A/B is warranted (Q8).
4. **`SharedComputation.ts` does not change.** Its `run<R>(key, compute)` stays generic, and its own test keeps the latched plain-key computations (Q4).
5. **The tests mostly already comply.** Every coalescing and interruption test in `DecisionCache.test.ts` already drives the cache through `evaluate`, with latched resolvers. Only one test calls `getOrCompute` directly: the ARCH-45 I5 FIFO race (`:1113-1171`). Only one hand-written double exists (`Lifecycle.test.ts:24-31`). `DevtoolsFeed.test.tsx` only names the type and reads `.size`, so it needs no edit.

**Primary recommendation:** change `DecisionCacheShape.getOrCompute` to `(question: Question, options?: Pick<EvaluateOptions, "concurrency">) => Effect.Effect<CacheLookup, EvaluationError, PortServices>`. Keep the name `getOrCompute`, because the metric description `"DecisionCache.getOrCompute lookups, by outcome (hit / coalesced / miss)."` is part of the registry key (Pitfall 1). Implement it in `decisionCacheLayer` as `shared.run(key, walk(key, options?.concurrency))`. In `decideQuestion`, delete `answer`, pass `options` straight through to the cache, and walk directly only in the no-cache branch. Rewrite the one race test through a resolver that spins. Turn the Lifecycle double into a delegating wrapper over `decisionCacheLayer()`, which is also the upgrade note's pattern. Add `packages/core/test/DecisionCache.tst.ts` in `PortAccess.tst.ts`'s `Params<F>` form.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Build the question once | `Lifecycle.ts` `ask` (`questionOf`) | none | Unchanged (ADR-QD-100) |
| Decide whether a cache is consulted | `Lifecycle.ts` `decideQuestion` (`Effect.serviceOption`) | none | Unchanged; absence stays free (ADR-QD-031) |
| Pair a key with its computation | `DecisionCache.ts` `decisionCacheLayer` | `Walk.ts` `walk` | **Moves** here from `Lifecycle.ts:120`: the cache walks the question it was given |
| Walk a question (admit, then evaluate the nodes) | `Walk.ts` `walk` | `Admission.ts` `admit` | Unchanged; called from two sites: cache miss, and no cache |
| Single-flight, waiters, last-leaver interrupt, reset | `SharedComputation.ts` | none | Unchanged rules and interface (ADR-QD-132) |
| How the walk runs (`concurrency`) | `EvaluateOptions` (`Question.ts`) | the cache's `options` parameter, derived by `Pick` | Not a fact about the question, so never in the key |
| A host-written cache's trace | the host's implementation | `decisionCacheLayer` as an inner delegate | D-02: core does not export `walk`; delegation is the supported route |

## Standard Stack

Nothing new. Everything here is in-repo and reused as is.

| Piece | Where | Role here |
|-------|-------|-----------|
| `walk(question, concurrency)` | `Walk.ts:871-881` | Becomes the cache's computation |
| `makeSharedComputation` / `run<R>(key, compute)` | `SharedComputation.ts:59,128,256` | Unchanged; the adapter passes `walk(key, …)` as `compute` |
| `Pick<EvaluateOptions, "concurrency">` | `Question.ts:46-66` | The non-key parameter, derived and not restated |
| tstyche `Params<F>` | `packages/core/test/PortAccess.tst.ts:38` | The negative's form |
| `scriptedPort`, `PortReply`, `testLayer` | `PortDoubles.ts`, `PortDescription.ts`, `test/helpers.ts:36` | Already used by `DecisionCache.test.ts`; no new failing double is needed |
| vitest 5.1.0, `@effect/vitest`, tstyche (target `6.0.3`, `tstyche.json`), Stryker 10.1.1 | repo | Tests and mutation |

## Package Legitimacy Audit

This phase installs or adds no external package. **Packages removed due to [SLOP]:** none. **Flagged [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
 caller                         Lifecycle.ts (decideQuestion)                      DecisionCache.ts (decisionCacheLayer)
 ──────                         ─────────────────────────────                      ─────────────────────────────────────
 evaluate(p, opts) ─▶ ask ─▶ questionOf(subject, p, opts) = question
                              │
                              ├─ serviceOption(DecisionCache)
                              │      │
                              │      ├─ Some(cache) ── getOrCompute(question, opts) ──▶ shared.run(question, walk(question, opts?.concurrency))
                              │      │                                                     │  hit ─────▶ entries[question]
                              │      │                                                     │  joined ──▶ awaits the in-flight walk of the SAME key
                              │      │                                                     │  miss ────▶ forkDetach(walk) ─▶ Walk.ts: admit ─▶ evaluateNode ─▶ ports (PortServices)
                              │      │                                                     ▼  settle(question, exit) writes only the walk of question
                              │      │                                    ◀── CacheLookup { trace, outcome }
                              │      └─ None ──────── walk(question, opts?.concurrency) ─▶ { trace, outcome: undefined }
                              ▼
                     stamp id + duration, metrics, span, sink records ─▶ Decision
```

What changes is a single edge. The arrow labelled `walk(question, …)` used to start in `Lifecycle.ts` and travel *into* the cache as an argument. Now it starts inside the cache, from the cache's own key.

### Pattern 1: the new interface (`DecisionCache.ts`)

```ts
// Proposed. Every name below is quoted from files read this session (see Q1).
import type { EvaluateOptions, Question } from "./Question.ts";
import { walk } from "./Walk.ts";

export interface DecisionCacheShape {
  /** The trace for this exact question: cached, joined from the walk of it already in flight, or walked here. … */
  readonly getOrCompute: (
    question: Question,
    options?: Pick<EvaluateOptions, "concurrency">,
  ) => Effect.Effect<CacheLookup, EvaluationError, PortServices>;
  readonly size: Effect.Effect<number>;
  readonly clear: Effect.Effect<void>;
}

// inside decisionCacheLayer, replacing DecisionCache.ts:267-268
const getOrCompute: DecisionCacheShape["getOrCompute"] = (key, options) =>
  Effect.map(shared.run(key, walk(key, options?.concurrency)), (found) => ({ trace: found.value, outcome: found.outcome }));
```

### Pattern 2: `decideQuestion` after the change (`Lifecycle.ts:86-121`)

```ts
// `answer` (Lifecycle.ts:88) is deleted. The cache is handed the question and the
// options object decideQuestion already holds: no new object per lookup.
const lookupEffect: Effect.Effect<EvaluationLookup, EvaluationError, PortServices> = Option.isSome(
  cache,
)
  ? cache.value.getOrCompute(question, options)
  : Effect.map(walk(question, options?.concurrency), (trace) => ({ trace, outcome: undefined }));
```

The comment block at `:90-116` is reworded rather than dropped. The cache now walks the question itself, so "the key is the `Question`" and "this trace answers this key" are stated once, in `DecisionCache.ts`.

### Pattern 3: a host cache that wraps core's (the upgrade note and the Lifecycle double)

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { DecisionCache, decisionCacheLayer } from "@qadi/core";

export const loggedCache = Layer.effect(
  DecisionCache,
  Effect.gen(function* () {
    const inner = yield* DecisionCache;
    return DecisionCache.of({
      ...inner,
      getOrCompute: (question, options) =>
        inner.getOrCompute(question, options).pipe(
          Effect.tap((lookup) => Effect.logDebug(`cache ${lookup.outcome}`)),
        ),
    });
  }),
).pipe(Layer.provide(decisionCacheLayer()));
```

`DecisionCache.of` is the `Context.Service` constructor this repo already uses in docs (`AttributeResolver.of`, `upgrading.md:810`). [ASSUMED: this exact fence compiles after the change. It cannot compile today, because `getOrCompute` takes `compute`. `check-website-doc-examples.mjs` will check it in the after tree.]

### Anti-Patterns to Avoid

- **`{ concurrency: options?.concurrency }` at the call site.** It allocates an object on every lookup, where passing `options` allocates nothing (Q8).
- **Renaming `getOrCompute`.** The metric's description names it, and the description is part of the registry key (Pitfall 1).
- **Exporting `walk`, or adding a `compute` escape hatch** "for host caches". That reopens exactly the pairing D-01 closes. A host delegates to `decisionCacheLayer()` instead (Pattern 3).
- **A thunk parameter in `SharedComputation.run`** to skip the per-call `Effect.suspend` allocation on a hit. It is out of scope (the adapter does not have to change), and it would change a package-private interface that its own test pins.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| The non-key option's type | a new `WalkOptions` interface restating `concurrency`'s doc | `Pick<EvaluateOptions, "concurrency">` | One declaration; no new export and no overview row; `Lifecycle.tst.ts` already pins `EvaluateOptions`' keys |
| A cache double in a test | `Layer.succeed(DecisionCache, { getOrCompute: … })` with a hand-made trace | a wrapper over `decisionCacheLayer()` (Pattern 3) | It keeps real outcomes and real coalescing, and it shows the supported host pattern |
| A failing port in a migrated test | a hand-built `new AttributeResolveError(…)` layer | `scriptedPort(attributeResolverPort, () => PortReply.fail(…))` | `PORT_DOUBLE_BUDGET`; the one budgeted line in `DecisionCache.test.ts` stays the only one |
| A latch in a walk | a hand-made `compute` effect | a resolver that awaits a `Deferred` (the file's existing pattern, e.g. `:512-520`) | The walk reads the port, so the latch sits where the real wait sits |

## Q1. The new interface, and how the layer reaches the walk

**Today** [VERIFIED: `packages/core/src/DecisionCache.ts:73-76`]:
```ts
  readonly getOrCompute: (
    question: Question,
    compute: Effect.Effect<Trace, EvaluationError, PortServices>,
  ) => Effect.Effect<CacheLookup, EvaluationError, PortServices>;
```
and the adapter [VERIFIED: `DecisionCache.ts:267-268`]:
```ts
      const getOrCompute: DecisionCacheShape["getOrCompute"] = (key, compute) =>
        Effect.map(shared.run(key, compute), (found) => ({ trace: found.value, outcome: found.outcome }));
```

**The walk** [VERIFIED: `packages/core/src/Walk.ts:871-881`]:
```ts
export const walk = (
  question: Question,
  concurrency: Concurrency | undefined,
): Effect.Effect<Trace, EvaluationError, PortServices> =>
  Effect.suspend(() => {
    const admitted = admit(question, "asked");
    if (Result.isFailure(admitted)) return Effect.fail(admitted.failure);
    return evaluateNode(admitted.success.policy, { admitted: admitted.success, concurrency }, 0);
  });
```
Its error and requirement types are exactly `getOrCompute`'s, so **the result type does not change**: `Effect.Effect<CacheLookup, EvaluationError, PortServices>`. The walk needs nothing beyond `(question, concurrency)` and its `PortServices` requirement. Phase 59's `admit` runs inside it (`Walk.ts:878`), and its doc says a hit never runs `admit` (`Walk.ts:866-869`), which stays true because `Effect.suspend` defers the call.

**Cycle check.** Who imports `DecisionCache.ts` in `src` today [VERIFIED: `git grep`]: only `Lifecycle.ts:25`, `EvaluationEnvironment.ts:20` and `index.ts:7`. madge's closure of `Walk.ts` (run this session, `pnpm exec madge --extensions ts --json packages/core/src/Walk.ts`) has 54 modules and none of `DecisionCache`, `Lifecycle`, `SharedComputation`, `EvaluationEnvironment`, `Evaluate.ts` or `index`. So `DecisionCache.ts → Walk.ts` is acyclic, and `pnpm circular` (madge over `packages/*/src`, `package.json:30`) stays green. [VERIFIED: madge run this session] `DecisionCache.ts`'s own closure grows by `Walk.ts`'s modules (`Admission`, `PortAccess`, `LeafNeeds`, `ShortCircuit`, …). That is harmless, since `Lifecycle.ts` already pulls in both.

**The second parameter.** `exactOptionalPropertyTypes: true` [VERIFIED: `tsconfig.base.json`, read this session], and `EvaluateOptions.concurrency` is declared as `readonly concurrency?: Concurrency;` [VERIFIED: `Question.ts:66`]. `Pick<EvaluateOptions, "concurrency">` is therefore `{ readonly concurrency?: Concurrency }`. `decideQuestion`'s `options` is `Omit<EvaluateOptions, keyof QuestionOptions> | undefined` [VERIFIED: `Lifecycle.ts:64-67`; pinned as `{ readonly concurrency?: Concurrency; readonly evaluationId?: string } | undefined` by `Lifecycle.tst.ts:26-35`], which is assignable as is (checked in the scratch probe: `get(q, opts)` compiles). The name `options` matches `decideQuestion`'s own and the roadmap's `{ concurrency }` shape.

Alternatives considered:

| Option | Verdict |
|--------|---------|
| `options?: Pick<EvaluateOptions, "concurrency">` | **Recommended**: derived, adds no export, no allocation at the call site |
| A new exported `WalkOptions` in `Question.ts` | Workable. It costs a new export (an overview row and the `check-api-surface.mjs` gate) and restates `concurrency`'s doc, and it buys a name nobody else reads |
| Positional `concurrency?: Concurrency` (mirroring `walk`) | Allocation-free too, but it departs from the roadmap's `{ concurrency }` and cannot take a second "how" option without a break |

## Q2. `concurrency` (D-03)

**Where it comes from.** `evaluate(policy, options)` → `ask(policy, options)` [VERIFIED: `Lifecycle.ts:195-202`] → `decideQuestion(question, options)` → today `walk(question, options?.concurrency)` (`Lifecycle.ts:88`). After the change it is `getOrCompute(question, options)` → `walk(key, options?.concurrency)` inside the cache, or `walk(question, options?.concurrency)` in the no-cache branch. In the walk it lives on `Evaluation`, not on `Admitted` [VERIFIED: `Walk.ts:62-65`]:
```ts
interface Evaluation {
  readonly admitted: Admitted<"asked">;
  readonly concurrency: Concurrency | undefined;
}
```

**It is not in the key.** [VERIFIED: `Question.ts:159-165`]
```ts
export interface Question {
  readonly subject: AuthSubject;
  readonly policy: Policy;
  readonly resource: Resource | undefined;
  readonly action: string | undefined;
  readonly maxDepth: number;
}
```
`questionOf` takes `QuestionOptions` (`resource`, `action`, `maxDepth`; `Question.ts:26-40,175-185`). `concurrency` is only on `EvaluateOptions` (`Question.ts:66`), and the cache keys `HashMap<Question, Trace>` on the question alone (`DecisionCache.ts:208,227`). The change cannot move `concurrency` into the key, because the cache never builds a key: it receives one.

**The tests that pin D-03.** Both are characterisations, green on base and after (WX-06). Add them to `DecisionCache.test.ts`'s top `describe`.

1. *Same question, two concurrencies, one entry.* The existing test `"concurrency and the cache compose without either changing the answer"` (`:484-506`) asserts only that the second ask did no lookup. Extend it, or add a sibling, so that it also reads `yield* DecisionCache.use((c) => c.size)` → `1` and checks that the second decision's outcome was a hit. The `DecisionRecord`'s `cache` field is the outcome; read it through a sink double, or use `Metric.value(decisionCacheLookupsTotal)` under `isolatedMetrics`, as the `qadi_decision_cache_lookups_total` describe already does (`:1173-1232`). Run it in both orders: unbounded then sequential, and sequential then unbounded.
2. *`concurrency` reaches the walk through the cache.* This is new. Use `P.allOf([P.hasAttribute("a", M.gte(1)), P.hasAttribute("b", M.gte(1))])` with `counting(calls, 0)`, so the first child denies. Sequential `allOf` short-circuits and asks only `a`; `concurrency: "unbounded"` asks both (INV-QD-005, ADR-QD-026). On a fresh `decisionCacheLayer()`, `evaluate(policy, { concurrency: "unbounded" })` must record `["u-1:a", "u-1:b"]`. That proves the option crossed the cache into the walk. A follow-up sequential ask is then a hit, with `calls` unchanged and `size` 1. A version of the cache that dropped `options` would record only `["u-1:a"]`.

Optionally pin the coalescing nuance as well (BEH-QD-643, Q9): two concurrent asks of one question, one unbounded and one sequential, run one walk, governed by the claimant's `concurrency`. A joiner's `concurrency` is unused. That is safe because `concurrency` changes lookups, never answers (INV-QD-020).

## Q3. Every caller and implementer, and what each becomes

`git grep -n getOrCompute` / `git grep -n DecisionCacheShape` outside `.planning` [VERIFIED this session]:

| Site | Today | Becomes |
|------|-------|---------|
| `packages/core/src/DecisionCache.ts:37-101,267-268` | interface + adapter | Pattern 1; reword the method doc (`:38-72`), `clear`'s doc (`:92-98`, "A `compute` already in flight") and `capacity`'s doc (`:191-192`) from "compute" to "the walk" |
| `packages/core/src/Lifecycle.ts:88,96-121` | builds `answer`, passes it | Pattern 2 |
| `packages/core/src/Question.ts:4` | "Public because a hand-written `DecisionCacheShape` receives it" | Still true. Add that such a cache must answer it with its own trace (D-02) |
| `packages/core/src/SharedComputation.ts:14,253-255` | doc mentions `getOrCompute` | No edit needed; optionally "its one adapter, which passes the walk of the key" |
| `packages/core/src/EvaluationMetrics.ts:9,20,176,186` | metric doc and **description string** | **No edit** (Pitfall 1) |
| `packages/core/test/DecisionCache.test.ts:1113-1171` | the only direct `getOrCompute` calls, with hand-made `compute` | Rewritten (below) |
| `packages/core/test/Lifecycle.test.ts:20-58` (double at `:24-31`) | `Layer.succeed(DecisionCache, { getOrCompute: (key, compute) => … })` | A delegating wrapper (below) |
| `packages/react/test/DevtoolsFeed.test.tsx:20,66` | `import type { DecisionCacheShape }`; reads `.size` only (`:99,213,221`) | **No edit**: the type keeps its name, and `size` is unchanged |
| `packages/core/bench/DecisionCache.bench.ts` | every workload goes through `evaluate` (`:69,72,81,84,112,115,128`); `getOrCompute` appears only in titles and comments | **No edit** (D-10 holds trivially) |
| `packages/devtools/test/react/Simulator.test.tsx:108` | comment "forks `compute` onto a detached fiber" | Optional rewording ("forks the walk") |
| `packages/core/test/GuardHealthCheck.test.ts:85`, `EvaluationMetrics.test.ts:91,210` | comment / the pinned description | No edit |
| `spec/behaviors/21-decision-cache.md` | `compute` in BEH-QD-166 (`:177`), BEH-QD-439/491 prose | New BEH-QD-641..645 section; Rev 1.10; optional "compute" → "walk" in requirement text |
| `spec/behaviors/25-inspection.md:35,43,61,65` | BEH-QD-189/190 | No requirement changes; `:65` "MUST NOT cancel a `compute`" may become "a walk" |
| `spec/decisions/031-decision-cache.md` | Rev 1.2 | An amendment note pointing at ADR-QD-174 (the interface is the question, and the key is unchanged) |
| `spec/decisions/132-*.md` | Rev 1.1 | An amendment note: the adapter passes the walk of its key; the rules are unchanged |
| `spec/decisions/100-a-question-is-asked-once.md:39` | "`getOrCompute` takes a `Question`" | Historical; no edit |
| `spec/invariants.md:3205`, `spec/overview.md:321,344,362` | mention by name only | No edit is required. Optionally extend the `DecisionCacheShape` row with "asked the question and how the walk runs" |
| Website docs | none call `getOrCompute` or name `DecisionCacheShape` (`git grep` over `apps/website/src/content`) | Only the `upgrading.md` section (Q10) |
| `CHANGELOG.md`s | history | Never edited by hand (changesets) |

**The race test (`DecisionCache.test.ts:1113-1171`), driven through a question alone.** Its subject is ARCH-45 I5: "a joiner racing its owner's completion never recomputes the key, and FIFO stays exact". It needs (a) an owner whose computation finishes after a few yields, (b) a count of computations per key, and (c) a cheap computation for X, Y and the follow-on K. The walk reads a port, so put the spin and the count in the resolver:

```ts
// Per (budget, gap) iteration, inside the loop as today:
const K = questionOf(subject, P.hasAttribute("k", M.gte(1)));
const X = questionOf(subject, P.hasAttribute("x", M.gte(1)));
const Y = questionOf(subject, P.hasAttribute("y", M.gte(1)));
const computes: Array<string> = [];
let ownerSpin = 3; // only the first walk of K spins, as compute("K", 3) did
const spinning = Layer.succeed(AttributeResolver, {
  resolve: (_id: string, attribute: string) =>
    Effect.gen(function* () {
      computes.push(attribute);
      const spin = attribute === "k" ? ownerSpin : 0;
      ownerSpin = 0;
      for (let i = 0; i < spin; i++) yield* Effect.yieldNow;
      return 5;
    }),
});
// owner:  Effect.forkChild(cache.getOrCompute(K))
// joiner: Effect.forkChild(cache.getOrCompute(K))
// follow-on: (yield* cache.getOrCompute(X)).outcome, … Y, K, K
// provide: Layer.mergeAll(testLayer(subject, { AttributeResolver: spinning }), decisionCacheLayer({ capacity: 2 }))
// assert as today: computes.filter((c) => c === "k").length === 1, followOn "miss,miss,miss,hit"
```

This keeps the test's determinism: `Scheduler.MaxOpsBeforeYield` is set per run, the spin count is fixed, and the resolver is synchronous apart from its `yieldNow`s. Two things move, and the plan should say so:
- The walk adds run-loop steps between claim and completion: `Effect.suspend`, `admit`, `readAttribute`'s `Effect.fn` span. So the window the joiner lands in shifts. Widen the `gap` sweep (for example `0..24`), so the joiner still lands both before and after the owner completes. The test's docblock already says the red is scheduler-dependent and the green is not. The red cannot be shown on today's tree in any case, because the fix is in.
- `Trace` and the `trace(label)` helper go, and `Trace` may become an unused import. `noUnusedLocals` would flag it.

`PORT_DOUBLE_BUDGET` is untouched. The spinning resolver succeeds, and the budget counts only hand-constructed port *errors* in a test (`check-house-style.mjs:702-711`; `DecisionCache.test.ts` holds its one budgeted `new AttributeResolveError`, `:589`).

**The other coalescing and interruption tests need no migration.** They already go through `evaluate` with latched resolvers [VERIFIED: read `:484-700`, titles `:508-1480`]: "N concurrent identical asks coalesce" (`:508`), "share a genuine failure" (`:580`), "an interrupted claimant still resolves" (`:625`), "a coalesced waiter's interruption…" (`:687`), the two at `:748` and `:821`, "never evicts a key with a compute still in flight" (`:1072`), the metric pair (`:1173-1232`), both "REGRESSION PIN for issue #64" (`:1234`, `:1346`) and "issue #64, uninterruptible regime" (`:1446`). D-04's "characterised through a question alone" is therefore already true for all of them, and the RED-first step for them is a no-op (green on base). Record that in the plan rather than inventing churn. `SharedComputation.test.ts` keeps its plain-key latched computes untouched, because `SharedComputation.run` keeps its `compute` parameter.

**The Lifecycle double (`Lifecycle.test.ts:24-31`).** It used the caller-supplied `compute` to produce its trace, and it can no longer get one. Replace it with a wrapper over the real cache that records the key:

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
The test's assertions (`keys.length === 1`, `Equal.equals(asked.question, keys[0])`, an `Allow` decision, the record's request half) all still hold, and the import becomes `{ DecisionCache, decisionCacheLayer }`. A double returning a canned `Trace` would also compile, but it would test less, and it is the shape D-02 asks hosts to avoid.

## Q4. `SharedComputation.ts`

The adapter does not change shape. `run` is `<R>(key: K, compute: Effect.Effect<A, E, R>) => Effect.Effect<Shared<A>, E, R>` [VERIFIED: `SharedComputation.ts:59`], and `decisionCacheLayer` still calls `shared.run(key, <an Effect>)`; only the argument's origin changes. Nothing in the file changes: not the claim step (`:297-320`), not `forkDetach` with its `onExit` settle (`:383-397`), not `awaitShared` (`:239-251`), not `reset` (`:411-416`). ADR-QD-132's rules are untouched. One property gets stronger: the walk is still built on every call, including a hit, but `Effect.suspend` means `admit`/`evaluateNode` never run on a hit (`Walk.ts:850-869`). That was already true, because `answer` was built eagerly in `Lifecycle.ts:88` too.

## Q5. Gates and budgets

| Gate (script) | Effect of this phase |
|---------------|----------------------|
| `scripts/check-house-style.mjs` `PORT_DOUBLE_BUDGET` | No change: the migrated race test uses a succeeding resolver (Q3) |
| `UNTRACED_BUDGET` | No change: no `Effect.fnUntraced`. `getOrCompute` stays a plain arrow, as `run`'s comment requires (`SharedComputation.ts:253-255`) |
| `METRIC_ID_LITERAL_BUDGET` | No change: no `"qadi_…"` literal added. The new D-03 test reads `Metric.value(decisionCacheLookupsTotal…)` or a sink record, never an id string |
| `SWITCH_BUDGET`, `ANY_BUDGET`, `SCHEMA_ERROR_BUDGET`, `UNTRUSTED_DECODE_BUDGET`, `HAS_CUSTOM_BUDGET` | Untouched |
| `scripts/check-api-surface.mjs` (gate 13) | No export added or removed; `DecisionCacheShape`, `CacheLookup`, `DecisionCache`, `decisionCacheLayer` keep their rows (`spec/overview.md:311,344,362`). `Pick<EvaluateOptions, …>` names an already-exported type |
| `scripts/check-doc-examples.mjs` (spec fences) | No compiled `typescript` fence in `spec/` calls `getOrCompute` (BEH-QD-165 calls `evaluate`; the listings in BEH-QD-161 and ADR-031 are `ts`). A new BEH fence showing the signature should be ```` ```ts ```` (a listing) |
| `scripts/check-website-doc-examples.mjs` | Only the new `upgrading.md` "After" fence, if written as ```` ```typescript ````: it must compile (Pattern 3) |
| `scripts/check-package-install.mjs` (gate 14) | Its consumer fixture does not name the cache (`/usr/bin/grep` this session: no hit in `scripts/*.mjs` except `check-house-style.mjs:711`) |
| `pnpm circular` (madge) | Green (Q1) |
| `pnpm test:tstyche` | Picks up the new `DecisionCache.tst.ts` |
| `scripts/check-dod-table.mjs` (gate 11) | Any "gate N" in new spec text must name its script (D-07) |
| `pnpm spec:verify:strict` / traceability | New BEH/INV ids need their `spec/traceability.md` rows and test-file rows (format: `traceability.md:364,595-596`) |

## Q6. The type-level negative (D-01)

**File:** `packages/core/test/DecisionCache.tst.ts` (new; none exists, `git grep` this session). **Form:** `PortAccess.tst.ts`'s `Params<F>` [VERIFIED: `packages/core/test/PortAccess.tst.ts:31-38`], because a bare `not.toBeCallableWith` on an Effect-returning function passes vacuously here (the Effect language service reports a floating effect).

```ts
import type * as Effect from "effect/Effect";
import { expect, test } from "tstyche";
import type { Trace } from "../src/Decision.ts";
import type { CacheLookup, DecisionCacheShape } from "../src/DecisionCache.ts";
import type { EvaluationError } from "../src/Errors.ts";
import type { PortServices } from "../src/Ports.ts";
import type { EvaluateOptions, Question } from "../src/Question.ts";

type Params<F> = F extends (...args: infer A) => unknown ? (...args: A) => void : never;
type GetOrCompute = Params<DecisionCacheShape["getOrCompute"]>;

declare const question: Question;
declare const compute: Effect.Effect<Trace, EvaluationError, PortServices>;

test("the cache is asked the question, and how the walk runs", () => {        // positive control
  expect<GetOrCompute>().type.toBeCallableWith(question);
  expect<GetOrCompute>().type.toBeCallableWith(question, undefined);
  expect<GetOrCompute>().type.toBeCallableWith(question, { concurrency: "unbounded" });
});

test("no caller can hand the cache a computation", () => {
  expect<GetOrCompute>().type.not.toBeCallableWith(question, compute);
  expect<GetOrCompute>().type.not.toBeCallableWith(question, () => compute);
  expect<GetOrCompute>().type.not.toBeCallableWith(question, { concurrency: "unbounded" }, compute);
});

test("the second parameter is evaluate's concurrency option, derived; the result is unchanged", () => {
  expect<Parameters<DecisionCacheShape["getOrCompute"]>[1]>().type.toBe<
    Pick<EvaluateOptions, "concurrency"> | undefined
  >();
  expect<ReturnType<DecisionCacheShape["getOrCompute"]>>().type.toBe<
    Effect.Effect<CacheLookup, EvaluationError, PortServices>
  >();
});
```

**Why the negative holds** [VERIFIED: scratch probe this session, repo `tsc` against `node_modules/effect/dist` types, with `exactOptionalPropertyTypes`]. With the second parameter `{ readonly concurrency?: Concurrency } | undefined`, `get(q, compute)` fails with:
```
error TS2559: Type 'Effect<Trace, Error, never>' has no properties in common with type '{ readonly concurrency?: Concurrency; }'.
```
That is TypeScript's weak-type rule. A thunk and a third argument are refused too (the `@ts-expect-error` lines compiled clean). `get(q)`, `get(q, undefined)`, `get(q, { concurrency: "unbounded" })` and `get(q, opts)` (the `decideQuestion` options type) all compile. **RED on base:** the positive controls fail on today's two-required-parameter signature, and `not.toBeCallableWith(question, compute)` fails because it is callable today.

Caveat: the refusal rests on the weak-type rule. If someone later adds a property named like one of `Effect`'s to the options type, the refusal would weaken. The test is what catches that.

## Q7. Mutation (D-06, WX-05)

**No recorded base for this phase.** The last recorded scores are `DecisionCache.ts` 0.976 and `SharedComputation.ts` 0.986 (`.planning/milestones/v1.3-phases/31-a-reset-supersedes-its-claims/31-mutation-after.json`), and `Lifecycle.ts` 1.0 (`.planning/milestones/v1.3-phases/32-…/32-mutation-after.json`). Those are old trees, so the base is re-measured. The existing `reports/mutation/mutation.json` holds Phase 59's three files only [VERIFIED: read this session], so it is not a base.

**Command** (the Phase 59 form: one run at a time, stdin closed, never beside vitest or the bench; never edit `stryker.config.mjs`):
```
pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/DecisionCache.ts,packages/core/src/Lifecycle.ts,packages/core/src/SharedComputation.ts' < /dev/null
node .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-mutation.mjs base
```
Config facts [VERIFIED: `stryker.config.mjs` read this session]: `ignoreStatic: true`, `coverageAnalysis: "perTest"`, `timeoutMS: 20000`, `thresholds.break: 80`, `jsonReporter.fileName: "reports/mutation/mutation.json"`, `mutate` excludes `index.ts`.

**The harness:** copy `59-mutation.mjs` to `61-mutation.mjs` with these constants:
```js
const D = ".planning/phases/QD-61-decisioncache-is-asked-only-the-question/";
const DC = "packages/core/src/DecisionCache.ts";
const LC = "packages/core/src/Lifecycle.ts";
const SC = "packages/core/src/SharedComputation.ts";
const FILES = [DC, LC, SC];          // sorted
const MOVED = [];                    // nothing moves between measured files with a receiver: no file may fall
const DELETED = {
  [DC]: ["(key, compute) =>"],
  [LC]: ["const answer = walk(question, options?.concurrency);", "getOrCompute(question, answer)"],
};
```
Also replace every `59-` file name with `61-`. With `MOVED` empty, the receiver clause (`LN`, `gained + credit < left`) is dead: drop it, or set `LN = DC` and leave it, because `left` stays 0. Any fall then fails, which is the D-06 rule as stated.

**Predicted mutant movement** (from reading the code; the base run decides):
- `Lifecycle.ts`: the killed `OptionalChaining` mutant on `options?.concurrency` at `:88` leaves with its line, and an identical one appears on the rewritten no-cache branch `: Effect.map(walk(question, options?.concurrency), …)`. The compare matches it as a deletion plus a new detected mutant, not a pair, because `anchorOf` keys on the line. The `ObjectLiteral` mutant on `({ trace, outcome: undefined })` goes the same way. Net detected: about 0. The ternary's `ConditionalExpression` mutants on `Option.isSome(cache)` stay.
- `DecisionCache.ts`: gains `options?.concurrency` → `options.concurrency` (`OptionalChaining`) on the adapter line. It is killed by every cached `evaluate(policy)` without options, since `undefined.concurrency` throws inside `getOrCompute` (for example `:57`, "with a cache around the request…"). Its `ObjectLiteral` mutant on the rewritten adapter line moves to the new text. No new survivor is expected.
- `SharedComputation.ts`: no source change. Its score can move only through test changes, and the one candidate is the rewritten race test, which killed claim-step mutants (ARCH-45 I5). If one of those now survives, the compare reports a new survivor, and the fix is a test (for example a wider `gap` sweep), never a re-baseline.
- Static-ignored: none expected, since the change adds no module-scope code. If the compare reports any, follow the `evidence` step (an `ignoreStatic: false` run through a scratchpad config spreading the gate config).

## Q8. Bench (D-10)

**Recommendation: no A/B run is warranted.** The hit and miss paths keep their shape and their allocation count, provided the call site passes `options` itself (Pattern 2).

| Step per lookup (cache present) | Today | After |
|---------------------------------|-------|-------|
| `walk(...)` → one `Effect.suspend` allocation | in `Lifecycle.ts:88`, every call, hit included | in the adapter, every call, hit included |
| Second argument | the `answer` Effect (already allocated) | `options`, the object `decideQuestion` already holds: **no allocation** |
| `options?.concurrency` read | once, in `Lifecycle` | once, in the adapter |
| `shared.run` + `Effect.map` + the `CacheLookup` literal | same | same |

The no-cache path is `Effect.map(walk(question, options?.concurrency), …)` in both trees. The only extra cost would come from writing `{ concurrency: options?.concurrency }` at the call site, which is one object per lookup, and the plan should forbid it (Anti-Patterns). `DecisionCache.bench.ts` needs no edit, because every workload calls `evaluate`. If the reviewer still wants a figure, Phase 59's `bench/ab.sh` is hard-wired to `Evaluate.bench.ts` (its header, read this session). Pointing a copy at `packages/core/bench/DecisionCache.bench.ts` with `analyze.mjs` is a small edit, but by the table above it measures noise. [ASSUMED: V8 inlines the cross-module `walk` call equally well from either module. Not measured.]

## Q9. Records

**Ids confirmed unused** [VERIFIED: `git grep` outside `.planning` returns nothing for each of ADR-QD-174, CCR-QD-452, BEH-QD-641..645, INV-QD-367..368]. The reservation file holds `{"CCR": 452, "ADR": 174, "BEH": 645, "INV": 368}` [VERIFIED: `$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`]. The previous maxima are in use (CCR-QD-451, ADR-QD-173, BEH-QD-640, INV-QD-366). `next-id.mjs` was not run.

**ADR-QD-174: "A decision cache is asked the question, and walks it itself"** (`spec/decisions/174-a-decision-cache-is-asked-the-question.md`). Status: Accepted. It amends ADR-QD-031 (the interface; the key and its security reasoning are unchanged) and reads ADR-QD-132 (the rules unchanged; the adapter passes the walk of its own key) and ADR-QD-100.
- **Context:** the pairing held at one call site.
- **Options:**
  - A: question only (chosen);
  - B: keep `compute` and pin the call site;
  - C: seal the service (rejected by the owner, D-02).
- **Decision:** the signature; `concurrency` through `Pick<EvaluateOptions, "concurrency">`; the layer imports `walk`; `walk` stays unexported; a host cache delegates.
- **Consequences:**
  - Breaking for implementers;
  - the guarantee is about callers, not host implementations;
  - a coalesced joiner shares the claimant's `concurrency`;
  - no added work per lookup.

ADR-031 Rev 1.3 and ADR-132 Rev 1.2 each gain a one-line amendment note pointing at ADR-QD-174.

**CCR-QD-452** (`spec/README.md` CCR table): ARCH-108, `21-decision-cache.md` Rev 1.10, ADR-QD-174, BEH-QD-641..645, INV-QD-367..368, and the Breaking change.

**BEH proposals** (new section in `spec/behaviors/21-decision-cache.md`, Rev 1.10):

| Id | Title | REQUIREMENT |
|----|-------|-------------|
| BEH-QD-641 | The cache is asked the question, and how the walk runs | `getOrCompute` MUST take the `Question` and, optionally, only `concurrency`. It MUST NOT accept a computation. Enforcement: `DecisionCache.tst.ts` |
| BEH-QD-642 | `decisionCacheLayer` walks the question it is given | On a miss the layer MUST run `walk` of that same question, so a stored trace answers its own key. Enforcement: the existing miss/hit tests, and BEH-QD-643's lookups |
| BEH-QD-643 | `concurrency` reaches the walk and never the key | A question asked with two concurrencies MUST be one entry, and the walk MUST run with the asking (claiming) caller's `concurrency`. A coalesced joiner shares the claimant's walk. Enforcement: the two Q2 tests |
| BEH-QD-644 | `decideQuestion` hands the cache the question alone | With a cache, the lifecycle MUST pass the question and its options and nothing it computed; without one it walks the same question, and the record's `cache` stays absent (BEH-QD-189 unchanged). Enforcement: `Lifecycle.test.ts` (the wrapper records the key) |
| BEH-QD-645 | A host-written cache answers with its own trace | `DecisionCacheShape` stays public and unsealed. An implementation MUST produce a trace for the question it is given, and core MUST NOT export the walk. Wrapping `decisionCacheLayer()` is the supported route. The guarantee in BEH-QD-641 covers callers, not implementations (D-02) |

**INV proposals** (`spec/invariants.md`, Rev 1.160):

| Id | Statement | Enforcement |
|----|-----------|-------------|
| INV-QD-367 | No caller can pair a cache key with a computation: `DecisionCacheShape.getOrCompute`'s parameters are a `Question` and `Pick<EvaluateOptions, "concurrency">`, and an `Effect` is refused at compile time | `packages/core/test/DecisionCache.tst.ts` |
| INV-QD-368 | In `decisionCacheLayer`, every trace settled under key `q` is the exit of `walk(q, …)`, and the walk's options never enter the key | `DecisionCache.test.ts` (Q2 tests, race test), `Lifecycle.test.ts`; mutation of `DecisionCache.ts` |

Related: INV-QD-025, INV-QD-030, INV-QD-033, INV-QD-020, INV-QD-307. **`spec/traceability.md`:** an ADR row for ADR-QD-174 (format `:364`), and test-file rows for `DecisionCache.tst.ts`, plus `DecisionCache.test.ts`/`Lifecycle.test.ts` gaining the new ids (format `:595-596`).

## Q10. The Breaking note

**A 0.13 section series exists** in `apps/website/src/content/docs/docs/reference/upgrading.md`: `## 0.13: …` headings at `:618` through `:1021` ("the feeds are devtools' headless interface", Phase 60), and the file has 1063 lines [VERIFIED: read this session]. `@qadi/core` is at `0.12.0` (`packages/core/package.json`). Append `## 0.13: a DecisionCache is asked only the question`. It should give the signature change, state that a `compute` argument is now a compile error (TS2559), point a host implementation to delegation to `decisionCacheLayer()`, and cite ADR-QD-174. Use a `ts` "Before" fence (it does not compile after) and a `typescript` "After" fence (Pattern 3, compiled by `check-website-doc-examples.mjs`), following `:1021-1035`'s layout.

**Changeset** `.changeset/core-decision-cache-asked-the-question.md`, in the style of `.changeset/core-handover-options.md`:
```
---
"@qadi/core": minor
---

**Breaking.** `DecisionCacheShape.getOrCompute` takes the question and, optionally, `{ concurrency }`; it no longer takes a `compute`. `decisionCacheLayer` walks the question it is given, so no caller can store a trace under a key it does not answer. A hand-written `DecisionCacheShape` must produce its own trace; wrap `decisionCacheLayer()` to delegate. Callers of `evaluate` see no change. See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
```
Nothing is released or versioned (WX-07).

## Common Pitfalls

### Pitfall 1: renaming `getOrCompute`
**What goes wrong:** the metric `decisionCacheLookupsTotal` has the description `"DecisionCache.getOrCompute lookups, by outcome (hit / coalesced / miss)."` [VERIFIED: `EvaluationMetrics.ts:186`], pinned by `EvaluationMetrics.test.ts:91,210`. Effect's metric registry keys on `type:id:description`, so a renamed description is a different metric, and readers of the old one read zero.
**How to avoid:** keep the name. It still reads correctly ("get, or compute it").

### Pitfall 2: allocating the options at the call site
**What goes wrong:** `getOrCompute(question, { concurrency: options?.concurrency })` adds an object per lookup on the hot path.
**How to avoid:** pass `options` through (Pattern 2). The type permits it.

### Pitfall 3: the race test's window shifts
**What goes wrong:** the walk adds steps between claim and completion, so with the old `gap` range the joiner might always land after the owner finishes. The test then still passes but no longer races.
**How to avoid:** widen `gap`, and optionally assert that at least one iteration saw outcome `coalesced` for the joiner and at least one saw `hit`, so the sweep demonstrably covers both sides.

### Pitfall 4: a mutation survivor in `SharedComputation.ts` from the test rewrite
**What goes wrong:** its score depends on the race test, whose shape changes.
**How to avoid:** take the base before touching the test (D-05 step 1). If the compare reports a new survivor, add a test.

### Pitfall 5 (house style, WX-04)
Nothing in the change needs `as`, `!`, `switch`, `fnUntraced` or a budget edit. `"miss" as const` in the old Lifecycle double disappears with the wrapper. The relative import is `import { walk } from "./Walk.ts";`, and `import type` is used for `EvaluateOptions`.

### Pitfall 6: stale prose
`DecisionCache.ts`'s method doc, `clear` doc and `capacity` doc, `Lifecycle.ts:90-116`, and BEH-QD-166/190's "compute" wording all describe a caller-supplied `compute`. Reword them in the same change, or a later review will flag the doc as describing the old interface.

## Code Examples

The examples are Patterns 1 to 3 and the Q3 and Q6 blocks above. Every identifier in them was read this session: `walk`, `shared.run`, `Pick<EvaluateOptions, "concurrency">`, `DecisionCache.of`, `testLayer(subject, { AttributeResolver })`, `questionOf`, `P.hasAttribute`, `M.gte`, `Scheduler.MaxOpsBeforeYield`. The exception is the compile status of Pattern 3 after the change, which is [ASSUMED] (A1).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getOrCompute(key: DecisionCacheKey, compute)` | `getOrCompute(question: Question, compute)` | ADR-QD-100 (CCR-QD-189) | The key became the question |
| `getOrCompute(question, compute)` | `getOrCompute(question, options?)` | this phase (ADR-QD-174) | The pairing is the cache's, not the caller's |

## Runtime State Inventory

This is an interface change, not a rename, so the inventory is short.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None. The cache is in memory per layer; no persisted key format changes | none |
| Live service config | None | none |
| OS-registered state | None | none |
| Secrets/env vars | None | none |
| Build artifacts | `packages/core/lib` `.d.ts` files carry the old signature until rebuilt (`tsc -b`) | Rebuilt by `pnpm check`'s steps; no action |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Pattern 3's fence compiles after the change | Pattern 3, Q10 | The website gate fails; fix the fence |
| A2 | The moved and deleted mutants are as predicted (no new survivor in `DecisionCache.ts`/`Lifecycle.ts`) | Q7 | A compare failure that needs a test |
| A3 | A wider `gap` sweep keeps the race test covering both sides of the owner's completion | Q3, Pitfall 3 | The test passes without racing; add the both-sides assertion |
| A4 | No perf difference worth measuring (allocation table) | Q8 | A hidden regression; run the adapted `ab.sh` if the reviewer asks |

## Open Questions (owner)

1. **Second parameter: `Pick<EvaluateOptions, "concurrency">` (no new export) or a named, exported `WalkOptions`?** Research recommends `Pick`. This falls under Claude's discretion; only ask if the planner wants a public name.
2. **Should BEH-QD-643 pin that a coalesced joiner's `concurrency` is unused** (the claimant's governs)? This is today's behaviour too, but nothing documents it. The recommendation is to state and test it, since it is the one place a caller's option is silently not applied.
3. **Is delegation (`Layer.provide(decisionCacheLayer())`) the documented route for host caches,** with `walk` staying unexported? Research recommends yes. It is consistent with D-02, but the owner may want to see it in the upgrade note before it becomes the stated pattern.

## Risks

- **R1 (Low):** the race test's power under the new walk (Pitfall 3).
- **R2 (Low):** a `SharedComputation.ts` survivor introduced by the test rewrite (Pitfall 4). It is caught by the compare.
- **R3 (Low):** the weak-type refusal is the mechanism behind INV-QD-367. A future option whose name collides with an `Effect` property would weaken it. The `.tst.ts` catches that.
- **R4 (Info):** host caches written against 0.12 break at compile time, not at runtime. That is the intended direction.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node / pnpm | all | yes | repo toolchain | — |
| tsc | typecheck, scratch probe | yes | `7.0.2+effect-tsgo.0.67.5` | — |
| madge | `pnpm circular` | yes | `^8.0.0` | — |
| vitest | tests | yes | 5.1.0 | — |
| tstyche | `.tst.ts` | yes | target `6.0.3` | — |
| Stryker | mutation | yes (config present; not run here) | 10.1.1 vitest runner | — |

No missing dependencies.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 + `@effect/vitest`; tstyche; Stryker |
| Config file | `packages/core/vitest.config.ts`, `tstyche.json`, `stryker.config.mjs` |
| Quick run command | `pnpm exec vitest run --project core packages/core/test/DecisionCache.test.ts packages/core/test/Lifecycle.test.ts packages/core/test/SharedComputation.test.ts < /dev/null` (59 tests, under 1 s on base) |
| Full suite command | `pnpm check:pr < /dev/null` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CASK-02 | `getOrCompute` refuses a computation; positive controls | type | `pnpm exec tstyche packages/core/test/DecisionCache.tst.ts` | ❌ Wave 0 (new) |
| CASK-02 | The layer walks the question it is given; Lifecycle hands over only the question | unit | quick run (`Lifecycle.test.ts` wrapper) | ✅ (edit) |
| CASK-03 | One entry for two concurrencies; concurrency reaches the walk | unit | quick run (`DecisionCache.test.ts`) | ✅ (add 1–2 tests) |
| CASK-04 | Coalescing and interruption through a question alone | unit | quick run | ✅ (only `:1113` rewritten) |
| WX-05 | Scores do not fall | mutation | Q7 command + `61-mutation.mjs compare` | ❌ Wave 0 (harness copy) |

### Sampling Rate
- **Per task commit:** the quick run, plus tstyche on the new file.
- **Per wave merge:** `pnpm test:tstyche` and `pnpm circular`.
- **Phase gate:** `pnpm check:pr < /dev/null`, then Stryker (alone), then the compare.

### Wave 0 Gaps
- [ ] `packages/core/test/DecisionCache.tst.ts`: CASK-02 (RED on base)
- [ ] `.planning/phases/QD-61-…/61-mutation.mjs` and the `61-mutation-base.json` run (D-05 step 1)

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | The cache key is the security boundary (ADR-QD-031). This phase removes the remaining caller-side way to store a trace under a key it does not answer |
| V5 Input Validation | no | No new input |
| V2/V3/V6 | no | — |

| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| A caller stores an allow trace under another question's key (cache poisoning) | Tampering / Elevation | The interface takes no computation (INV-QD-367); the layer walks its own key (INV-QD-368) |
| A host-written cache returns a foreign trace | Tampering | Out of guarantee by owner choice (D-02); documented in BEH-QD-645 and the upgrade note |

## Plan Shape (suggested, D-05 order)

1. **Base:** write `61-mutation.mjs`; run Stryker for the three files; `base`. No source edit before this.
2. **Characterise (green on base):** the two Q2 tests; the race test rewritten through a resolver (Q3); the Lifecycle wrapper cannot be written before the interface changes, so it lands with step 4.
3. **RED:** `DecisionCache.tst.ts` (fails on base).
4. **Interface:** `DecisionCache.ts` (Pattern 1 + doc), `Lifecycle.ts` (Pattern 2 + comment), `Question.ts:4` doc, `Lifecycle.test.ts` wrapper. Green: quick run, tstyche, `pnpm circular`.
5. **Records and docs:** ADR-QD-174 and the ADR-031/132 notes; `21-decision-cache.md` Rev 1.10 with BEH-QD-641..645; INV-QD-367..368; traceability; CCR-QD-452; the changeset; the `upgrading.md` 0.13 section.
6. **Close:** `pnpm check:pr`, Stryker `after`, `compare`.

## Sources

### Primary (HIGH confidence): files read this session at HEAD `5df371e2`
- `packages/core/src/DecisionCache.ts` (all), `Lifecycle.ts` (all), `SharedComputation.ts` (all), `Question.ts` (all), `Walk.ts:1-80, 840-881`
- `packages/core/test/DecisionCache.test.ts:1-44, 484-700, 1100-1260` and the title list; `Lifecycle.test.ts:1-60`; `Lifecycle.tst.ts:1-40`; `PortAccess.tst.ts:1-80`
- `packages/core/bench/DecisionCache.bench.ts` (all); `packages/react/test/DevtoolsFeed.test.tsx:15-80`; `packages/devtools/test/react/Simulator.test.tsx:100-120`
- `spec/behaviors/21-decision-cache.md` (all), `spec/behaviors/25-inspection.md:30-70`, `spec/decisions/031-decision-cache.md:1-140`, `spec/decisions/132-…:1-60`, `spec/overview.md` (rows `103,311,321,344,361,362`), `spec/invariants.md` (INV-QD-366 as format), `spec/traceability.md:364,595-596`
- `scripts/check-house-style.mjs:690-715`, `stryker.config.mjs`, `tsconfig.base.json`, `tstyche.json`, `package.json:30,41`
- `.planning/phases/QD-59-…/59-mutation.mjs`, `bench/ab.sh` header; `.planning/phases/QD-60-…/60-RESEARCH.md` (model)
- `apps/website/src/content/docs/docs/reference/upgrading.md` (headings, `:793-830`, `:1021-1035`); `.changeset/core-handover-options.md`, `.changeset/devtools-headless-interface-is-the-feeds.md`
- Tool runs: madge closure of `Walk.ts` and `DecisionCache.ts`; scratch `tsc` probe (TS2559); vitest quick run (59 passed)

### Secondary / Tertiary
- None. No web source was needed; every claim is in-repo.

## Metadata

**Confidence breakdown:**
- Interface and cycle: HIGH. Read, madge-checked, and the type refusal was probed.
- Test migration: HIGH for which tests need changes (grep plus reading); MEDIUM for the race test's window (A3).
- Mutation prediction: MEDIUM (A2; the base run decides).
- Bench: HIGH that the allocation count is unchanged; the JIT effect was not measured (A4).

**Research date:** 2026-11-19
**Valid until:** the next edit to `DecisionCache.ts`, `Lifecycle.ts`, `Walk.ts` or `SharedComputation.ts`.
