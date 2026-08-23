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
import * as Chunk from "effect/Chunk";
import * as Context from "effect/Context";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import type { AttributeResolver } from "./AttributeResolver.ts";
import type { AuthSubject } from "./AuthSubject.ts";
import type { Trace } from "./Decision.ts";
import type { DecisionHistory } from "./DecisionHistory.ts";
import type { EvaluationError } from "./Errors.ts";
import type { Policy } from "./Policy.ts";
import type { RelationshipResolver } from "./RelationshipResolver.ts";

/**
 * The question a cached decision answers — everything that can change an answer.
 *
 * **The whole subject is in it, and that is a security boundary.** A cache keyed
 * on the policy alone would serve one subject's allow to another — the same
 * class of defect as an unbound hydration payload, and worth stating twice: a
 * decision is *about* a subject, so any structure holding decisions holds the
 * subject too.
 *
 * The **subject**, not the subject's id, and the difference is a privilege
 * escalation. An id was enough only if it determined the subject's grants, and
 * it does not: `@qadi/http`'s `SubjectExtractor` rebuilds an `AuthSubject` per
 * request from a token, so a scoped token and a full token for one user share
 * an id and hold different permissions. Under an application-scoped cache —
 * which this module documents as a supported choice — the first verdict for a
 * given id won, permanently, in whichever direction it happened to be asked
 * first ([INV-QD-033](../../../spec/invariants.md#inv-qd-033-a-cached-decision-belongs-to-the-grants-that-earned-it)).
 * `AuthSubject` compares structurally, `HashSet` grants included, so the key
 * now covers everything a decision can depend on.
 *
 * Used as a `HashMap` key **directly**, with no serialization step
 * ([INV-QD-030](../../../spec/invariants.md#inv-qd-030-cache-key-uniqueness)).
 * Effect's `Equal`/`Hash` compare plain objects structurally, nested included —
 * the same property `Atom.family` relies on in `@qadi/react` — so two equal
 * questions hit however their properties were ordered, and two different ones
 * cannot collide.
 *
 * The predecessor of this was `JSON.stringify`, whose own doc comment claimed
 * property-order misses were the price of having "no chance of colliding". It
 * had that backwards. `stringify` maps a `Date` onto its ISO string, drops
 * `undefined`-valued and function-valued properties, and renders `NaN` as
 * `null` — so `{d: new Date(0)}` and `{d: "1970-01-01T00:00:00.000Z"}` produced
 * one key for two questions, and the second caller received the first's verdict.
 */
export interface DecisionCacheKey {
  readonly subject: AuthSubject;
  readonly policy: Policy;
  readonly resource: Readonly<Record<string, unknown>> | undefined;
  readonly action: string | undefined;
}

/**
 * What `getOrCompute`'s `compute` argument — always `evaluateNode` — can
 * need or raise.
 */
type EvaluationRequirements = AttributeResolver | RelationshipResolver | DecisionHistory;

/**
 * Which of the cache's three documented paths a lookup took.
 *
 * `hit` — an already-completed entry. `coalesced` — joined another fiber's
 * in-flight `compute`. `miss` — this fiber ran `compute` itself.
 */
export type CacheOutcome = "hit" | "coalesced" | "miss";

/** A trace, and how the cache came by it. */
export interface CacheLookup {
  readonly trace: Trace;
  readonly outcome: CacheOutcome;
}

export interface DecisionCacheShape {
  /**
   * The trace for this exact question — from a prior call's completed
   * `compute`, from another fiber's currently-running `compute`, or freshly
   * computed by running `compute` here.
   *
   * Returns the {@link CacheOutcome} alongside it. It used to return a bare
   * `Trace`, which made "was this decision cached?" answerable only as a
   * process-global frequency metric — so an operator could see a hit *rate*
   * across every cache in the process and never learn whether the one decision
   * in front of them had been recomputed.
   *
   * **This does not weaken [INV-QD-025](../../../spec/invariants.md).** That
   * invariant is about the *decision*: a hit must produce the same verdict,
   * trace and fields as a miss, and it still does. What differs is what an
   * observer is told about how the answer was obtained — the same category as
   * `durationMillis` and the evaluation id, which already differ between a hit
   * and a miss by design.
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
  ) => Effect.Effect<CacheLookup, EvaluationError, EvaluationRequirements>;
  /**
   * How many completed entries are held. For tests and for a caller
   * reporting hit rates.
   */
  readonly size: Effect.Effect<number>;
  /**
   * Discards every completed entry.
   *
   * There was no way to empty a cache short of discarding the layer scope,
   * which a tool running *inside* that scope cannot do — so "flush" was
   * unofferable to an operator who could see a stale decision and knew exactly
   * why it was stale. `useInvalidate` in `@qadi/react` is not this: it
   * invalidates *atoms*, and an invalidated atom that re-evaluates through a
   * warm cache gets the same cached trace back.
   *
   * Entries only. A `compute` already in flight keeps its claim and still
   * settles for the fibers awaiting it — cancelling those would turn a
   * housekeeping action into a source of failures, and they are answering
   * questions asked before the flush.
   */
  readonly clear: Effect.Effect<void>;
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
 * Every `getOrCompute` lookup, by which of the cache's three documented paths
 * it took: `hit` (an already-completed entry), `coalesced` (joined another
 * fiber's in-flight `compute`), or `miss` (this fiber ran `compute` itself).
 *
 * The metric a caller needs to answer "is this cache earning its keep" —
 * `hit / (hit + coalesced + miss)` — without instrumenting their own call
 * sites, and the closest thing to the "production cache hit rate" this
 * library could not previously report at all.
 */
const cacheLookupsTotal = Metric.frequency("qadi_decision_cache_lookups_total", {
  description: "DecisionCache.getOrCompute lookups, by outcome (hit / coalesced / miss).",
});

/**
 * A fresh cache, held for as long as the layer it is provided through.
 *
 * A **function**, not a constant, and deliberately: `decisionCacheLayer()` at a call
 * site reads as "make a cache here", where a `decisionCacheLive` constant would read
 * as "the cache". The difference is the mistake to avoid.
 *
 * Provide it **per request** and the cache dies with the request. Provide it once at
 * application scope and it lives for the process — which is not a leak across
 * subjects, since the key includes the whole subject.
 *
 * Staleness is narrower than it used to be stated here, and the boundary is worth
 * knowing. A grant revoked in the **subject** changes the key, so the next request
 * carrying the reduced subject misses and re-evaluates — it does not inherit the
 * old allow. A grant revoked only in a **store this evaluation consults** —
 * an `AttributeResolver` value, a relationship edge, a history event — is invisible
 * to the key, so that decision does stay cached until the cache is discarded. An
 * application-scoped cache is therefore safe against token downgrade and unsafe
 * against backend revocation; per-request scope is safe against both.
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
 *
 * **Unbounded by default** — `entries` is never evicted unless `capacity` is
 * given. That matches every behaviour this doc comment already describes: a
 * cache scoped to one request's lifetime never grows large enough for it to
 * matter, and inventing a default limit for the one caller who *does* provide
 * this at a longer-lived scope would be a behaviour change nobody asked for.
 * A caller who provides it at application scope — this file already warns
 * that is staleness, not a leak, since the key includes the subject — should
 * pass `capacity` so unboundedness is a choice made at that call site rather
 * than an absence noticed later, in production, as memory growth.
 *
 * Eviction, when `capacity` is set, is **insertion order (FIFO)**, not
 * least-recently-used: recording an access on every hit would cost every
 * lookup something to buy a policy this cache has no stated need for, since
 * nothing here claims "recently used" predicts "will be asked again" better
 * than "recently completed" does.
 *
 * `capacity`, when given, must be a non-negative integer. A negative one
 * would make the eviction loop's own exit condition (`size(entries) >
 * capacity`) unsatisfiable once `entries` empties out — an infinite loop, not
 * a small cache. A `NaN` one would make that same comparison always `false`,
 * silently turning "bounded" into unbounded instead of failing loudly. This
 * is checked here, at construction, rather than left to fail in whichever of
 * those two ways at the first eviction.
 */
export const decisionCacheLayer = (options?: {
  /**
   * The most completed entries `entries` holds at once. Once exceeded, the
   * oldest completed entry is evicted — never an entry with a `compute` still
   * in flight, since eviction only ever runs after a `compute` settles.
   */
  readonly capacity?: number;
}): Layer.Layer<DecisionCache> =>
  Layer.effect(
    DecisionCache,
    Effect.sync(() => {
      if (
        options?.capacity !== undefined &&
        !(Number.isInteger(options.capacity) && options.capacity >= 0)
      ) {
        throw new Error(
          `decisionCacheLayer: capacity must be a non-negative integer, got ${options.capacity}`,
        );
      }

      let entries = HashMap.empty<DecisionCacheKey, Trace>();
      // Keys with a `compute` currently running, so a second concurrent ask for
      // the same question awaits the first's result instead of starting its own.
      //
      // A plain, directly-reassigned `HashMap`, not `Ref`-wrapped: both this and
      // `entries` live inside this one `Layer.effect` closure, and Effect only
      // reorders fiber execution at `yield*` boundaries — never mid-callback —
      // so a direct reassignment inside `Effect.sync` is exactly as atomic as
      // `Ref.modify` would be here.
      let inFlight = HashMap.empty<DecisionCacheKey, Deferred.Deferred<Trace, EvaluationError>>();
      // Parallel to `entries`, in insertion order, so a bounded cache knows what
      // to evict without walking `entries` itself — a `HashMap` has no order to
      // walk. Only ever grows where `entries` does, and only ever shrinks by
      // eviction, so it can never hold a key `entries` does not. Left empty and
      // unwritten-to when `capacity` is unset — the common case, per this file's
      // own doc comment — since nothing would ever read it.
      //
      // A `Chunk`, not an `Array`: eviction pops from the front on every entry
      // over capacity, and `Array.prototype.shift` is O(n) — it re-indexes every
      // remaining element. `Chunk.drop(chunk, 1)` is O(1) amortized for this
      // access pattern (push at the tail, drop from the head), so eviction under
      // sustained pressure stays proportional to how much was evicted, not to
      // how large the cache is.
      let insertionOrder: Chunk.Chunk<DecisionCacheKey> = Chunk.empty();

      const getOrCompute: DecisionCacheShape["getOrCompute"] = (key, compute) =>
        Effect.gen(function* () {
          const cached = HashMap.get(entries, key);
          if (Option.isSome(cached)) {
            yield* Metric.update(cacheLookupsTotal, "hit");
            return { trace: cached.value, outcome: "hit" };
          }

          // `Deferred.makeUnsafe` inside the same synchronous check as the
          // claim itself, not `yield* Deferred.make` before it: allocating a
          // Deferred is only useful for whichever fiber actually becomes the
          // owner, so it happens *inside* the "nobody has claimed this key
          // yet" branch — a follower, the common case on the concurrent-ask
          // path this cache exists for, never allocates one it will discard.
          // `Deferred.make` is a synchronous allocation under the hood
          // regardless (`effect/Deferred`'s own source defines it as
          // `Effect.sync(() => makeUnsafe())`); `makeUnsafe` just lets that
          // allocation stay inside the one atomic check instead of paying for
          // it up front on every ask.
          const claimed = yield* Effect.sync(():
            | { readonly owned: true; readonly claim: Deferred.Deferred<Trace, EvaluationError> }
            | { readonly owned: false; readonly claim: Deferred.Deferred<Trace, EvaluationError> } => {
            const existing = HashMap.get(inFlight, key);
            if (Option.isSome(existing)) return { owned: false, claim: existing.value };
            const claim = Deferred.makeUnsafe<Trace, EvaluationError>();
            inFlight = HashMap.set(inFlight, key, claim);
            return { owned: true, claim };
          });

          // Someone else already claimed this key — share their result,
          // success or failure, rather than compute a second time.
          if (!claimed.owned) {
            yield* Metric.update(cacheLookupsTotal, "coalesced");
            return {
              trace: yield* Deferred.await(claimed.claim),
              outcome: "coalesced",
            };
          }
          yield* Metric.update(cacheLookupsTotal, "miss");
          const claim = claimed.claim;

          // `Effect.onExit`, not a plain `yield* Effect.exit(compute)` followed
          // by more steps: a fiber interrupted while `compute` is running does
          // not return control to the surrounding generator at all — confirmed
          // empirically, not assumed — so any settle-and-clear logic placed
          // *after* an `Effect.exit(compute)` yield, even wrapped in
          // `Effect.uninterruptible`, silently never runs, leaving `claim`
          // permanently unresolved and its key permanently stuck in
          // `inFlight`. `Effect.onExit`'s finalizer is different: it is
          // guaranteed to run on every path `compute` can end on, interruption
          // included, which is exactly the guarantee this needs. Settling the
          // claim (and, on failure, sharing that same failure with every
          // waiter) *before* clearing it from `inFlight` is still the order
          // that matters inside the finalizer: a fiber arriving in the gap
          // between the two either sees the finished entry or awaits an
          // already-resolved `Deferred`, never starts a redundant third
          // compute.
          return yield* compute.pipe(
            Effect.onExit((exit) =>
              Effect.sync(() => {
                if (exit._tag === "Success") {
                  entries = HashMap.set(entries, key, exit.value);
                  // Recorded, and evicted from, only when `capacity` was given —
                  // the unbounded default (the common case, per this file's own
                  // doc comment) has nothing that will ever read this array, so
                  // it stays empty rather than growing in lockstep with `entries`
                  // for the life of the cache.
                  if (options?.capacity === undefined) return;
                  insertionOrder = Chunk.append(insertionOrder, key);
                  // FIFO eviction: a `while` rather than an `if` because a caller
                  // who lowers `capacity` between two `decisionCacheLayer()`
                  // calls is not a case this loop should special-case to "evict
                  // one" and leave still over budget. Always terminates:
                  // `capacity` is validated non-negative-integer at construction,
                  // so `size(entries)` — a non-negative integer that strictly
                  // decreases each iteration — reaches it in finitely many steps.
                  while (HashMap.size(entries) > options.capacity) {
                    // `Chunk.size(insertionOrder) === HashMap.size(entries)`
                    // always — every append here has exactly one corresponding
                    // `entries` insert, and eviction always removes one of each —
                    // so this loop's own condition (`size(entries) > capacity >=
                    // 0`) guarantees `insertionOrder` is non-empty. The `Option`
                    // check exists for that same reason `noUncheckedIndexedAccess`
                    // forced a guard on the old `Array` version, not because this
                    // can happen.
                    const oldest = Chunk.head(insertionOrder);
                    insertionOrder = Chunk.drop(insertionOrder, 1);
                    if (Option.isSome(oldest)) entries = HashMap.remove(entries, oldest.value);
                  }
                }
              }).pipe(
                Effect.flatMap(() => Deferred.done(claim, exit)),
                Effect.flatMap(() =>
                  Effect.sync(() => {
                    inFlight = HashMap.remove(inFlight, key);
                  }),
                ),
              ),
            ),
            // After `onExit`, deliberately: the finalizer stores the raw `Trace`
            // in `entries` and settles the claim with it, so it must run on the
            // un-wrapped value. Mapping first would cache a `CacheLookup` and
            // hand every coalescing waiter one whose `outcome` said "miss".
            Effect.map((trace): CacheLookup => ({ trace, outcome: "miss" })),
          );
        });

      return {
        getOrCompute,
        size: Effect.sync(() => HashMap.size(entries)),
        clear: Effect.sync(() => {
          entries = HashMap.empty<DecisionCacheKey, Trace>();
          insertionOrder = Chunk.empty();
        }),
      };
    }),
  );
