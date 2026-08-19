/**
 * An optional, caller-scoped cache for repeated identical questions.
 *
 * A request resolving forty fields may ask the same question forty times: same
 * subject, same policy, same resource. Each ask costs the lookups the policy needs
 * against the caller's own store.
 *
 * **Absent by default.** `evaluate` reads this with `Effect.serviceOption`, so it is
 * not part of `EvaluationServices` and an application that never provides it behaves
 * exactly as it did before this existed
 * ([ADR-QD-031](../../../spec/decisions/031-decision-cache.md)).
 *
 * `@qadi/react` does not need it: the atom graph already shares one evaluation per
 * policy across every component that asks.
 */
import * as Context from "effect/Context";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import type { AttributeResolver } from "./AttributeResolver.ts";
import type { Trace } from "./Decision.ts";
import type { DecisionHistory } from "./DecisionHistory.ts";
import type { EvaluationError } from "./Errors.ts";
import type { Policy } from "./Policy.ts";
import type { RelationshipResolver } from "./RelationshipResolver.ts";

/** Everything that can change an answer. */
export interface DecisionCacheKey {
  readonly subjectId: string;
  readonly policy: Policy;
  readonly resource: Readonly<Record<string, unknown>> | undefined;
  readonly action: string | undefined;
}

/**
 * What `getOrCompute`'s `compute` argument — always `evaluateNode` — can
 * need or raise.
 */
type EvaluationRequirements = AttributeResolver | RelationshipResolver | DecisionHistory;

export interface DecisionCacheShape {
  /**
   * The trace for this exact question — from a prior call's completed
   * `compute`, from another fiber's currently-running `compute`, or freshly
   * computed by running `compute` here.
   *
   * Concurrent calls for the **same key** share one `compute` run: the first
   * caller runs it, every other caller concurrently asking the same question
   * awaits that caller's result instead of running its own — a genuine
   * failure included, per the fail-shared design of `DecisionCache.test.ts`'s
   * concurrency tests. `compute` failing does not poison the cache: the next
   * call for that key, once nothing is in flight for it, runs fresh.
   */
  readonly getOrCompute: (
    key: DecisionCacheKey,
    compute: Effect.Effect<Trace, EvaluationError, EvaluationRequirements>,
  ) => Effect.Effect<Trace, EvaluationError, EvaluationRequirements>;
  /**
   * How many completed entries are held. For tests and for a caller
   * reporting hit rates.
   */
  readonly size: Effect.Effect<number>;
}

/**
 * No static method accessors, unlike every other service here.
 *
 * The house shape is `static resolve = X.use((x) => x.resolve(...))`, and it is
 * unreachable in this case: `evaluate` has to read the service *optionally*, through
 * `Effect.serviceOption`, so it holds the shape directly and never goes through the
 * class. A caller inspecting the cache uses `DecisionCache.use` in one line. Keeping
 * accessors nothing can call would be convention-shaped dead code.
 */
export class DecisionCache extends Context.Service<
  DecisionCache,
  DecisionCacheShape
>()("qadi/DecisionCache") {}

/**
 * Builds the cache key.
 *
 * **The subject is in the key, and that is a security boundary.** A cache keyed on
 * the policy alone would serve one subject's allow to another — the same class of
 * defect as an unbound hydration payload, and worth stating twice: a decision is
 * *about* a subject, so any structure holding decisions holds the subject too.
 *
 * Stringifying means two structurally equal resources with different property order
 * **miss** rather than hit. That is the safe direction — a miss costs an evaluation,
 * a wrong hit costs an authorization — and it is left as it is rather than optimised
 * into something with a chance of colliding.
 */
const keyOf = (key: DecisionCacheKey): string =>
  JSON.stringify([key.subjectId, key.policy, key.resource ?? null, key.action ?? null]);

/**
 * A fresh cache, held for as long as the layer it is provided through.
 *
 * A **function**, not a constant, and deliberately: `decisionCacheLayer()` at a call
 * site reads as "make a cache here", where a `decisionCacheLive` constant would read
 * as "the cache". The difference is the mistake to avoid.
 *
 * Provide it **per request** and the cache dies with the request. Provide it once at
 * application scope and it lives for the process — which is not a leak across
 * subjects, since the key includes the subject, but *is* staleness: a revoked grant
 * stays granted until the process restarts.
 *
 * Qadi cannot choose this. It has no notion of a request boundary, and inventing one
 * would be inventing a framework.
 *
 * **Provide it around the unit of work, not around each evaluation.**
 * `Effect.provide` builds a layer per *execution*, so
 *
 * ```ts
 * evaluate(p).pipe(Effect.provide(decisionCacheLayer()))   // a fresh empty cache, every time
 * ```
 *
 * caches nothing while looking exactly right. The cache has to wrap the work:
 *
 * ```ts
 * Effect.gen(function* () {
 *   yield* evaluate(p)
 *   yield* evaluate(p)   // hit
 * }).pipe(Effect.provide(decisionCacheLayer()))
 * ```
 *
 * `DecisionCache.test.ts` asserts the trap as well as the correct shape.
 */
export const decisionCacheLayer = (): Layer.Layer<DecisionCache> =>
  Layer.effect(
    DecisionCache,
    Effect.gen(function* () {
      const entries = new Map<string, Trace>();
      // Keys with a `compute` currently running, so a second concurrent ask for
      // the same question awaits the first's result instead of starting its own.
      const inFlight = yield* Ref.make(
        new Map<string, Deferred.Deferred<Trace, EvaluationError>>(),
      );

      const getOrCompute: DecisionCacheShape["getOrCompute"] = (key, compute) =>
        Effect.gen(function* () {
          const k = keyOf(key);
          const cached = entries.get(k);
          if (cached !== undefined) return cached;

          const claim = yield* Deferred.make<Trace, EvaluationError>();
          const owner = yield* Ref.modify(inFlight, (map) => {
            const existing = map.get(k);
            if (existing !== undefined) return [existing, map] as const;
            const claimed = new Map(map);
            claimed.set(k, claim);
            return [claim, claimed] as const;
          });

          // Someone else already claimed this key — share their result,
          // success or failure, rather than compute a second time.
          if (owner !== claim) return yield* Deferred.await(owner);

          const exit = yield* Effect.exit(compute);
          if (exit._tag === "Success") entries.set(k, exit.value);
          // Resolve waiters (and, on failure, share the same failure with all
          // of them) *before* clearing the claim — a fiber arriving in the
          // gap between the two either sees the finished entry or awaits an
          // already-resolved Deferred, never starts a redundant third compute.
          yield* Deferred.done(claim, exit);
          yield* Ref.update(inFlight, (map) => {
            const cleared = new Map(map);
            cleared.delete(k);
            return cleared;
          });

          return yield* Deferred.await(claim);
        });

      return { getOrCompute, size: Effect.sync(() => entries.size) };
    }),
  );
