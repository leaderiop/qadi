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
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { Trace } from "./Decision.ts";
import type { Policy } from "./Policy.ts";

/** Everything that can change an answer. */
export interface DecisionCacheKey {
  readonly subjectId: string;
  readonly policy: Policy;
  readonly resource: Readonly<Record<string, unknown>> | undefined;
  readonly action: string | undefined;
}

export interface DecisionCacheShape {
  /** The trace for this exact question, if it has been asked. */
  readonly lookup: (key: DecisionCacheKey) => Effect.Effect<Trace | undefined>;
  readonly remember: (key: DecisionCacheKey, trace: Trace) => Effect.Effect<void>;
  /** How many entries are held. For tests and for a caller reporting hit rates. */
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
    Effect.sync(() => {
      const entries = new Map<string, Trace>();
      return {
        lookup: (key) => Effect.sync(() => entries.get(keyOf(key))),
        remember: (key, trace) =>
          Effect.sync(() => {
            entries.set(keyOf(key), trace);
          }),
        size: Effect.sync(() => entries.size),
      };
    }),
  );
