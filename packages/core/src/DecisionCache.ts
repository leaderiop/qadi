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
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import type { Trace } from "./Decision.ts";
import type { EvaluationError } from "./Errors.ts";
import { decisionCacheLookupsTotal } from "./EvaluationMetrics.ts";
import type { CacheOutcome } from "./EvaluationMetrics.ts";
import type { PortServices } from "./Ports.ts";
import type { Question } from "./Question.ts";
import { makeSharedComputation } from "./SharedComputation.ts";

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
   *
   * **One caller's interruption is not every caller's interruption.**
   * `compute` runs on a fiber of its own — detached from whichever caller
   * happened to claim the key — so a caller who stops waiting (a timeout, a
   * cancelled request) only ever detaches itself; it does not cancel the
   * answer every other coalesced caller is still waiting on. Only once the
   * last waiter detaches does the shared `compute` itself get interrupted,
   * so an evaluation nobody wants any more does not keep running for no one.
   * `DecisionCache.test.ts`'s "one caller interrupted, the other still gets
   * a result" pins this.
   */
  readonly getOrCompute: (
    question: Question,
    compute: Effect.Effect<Trace, EvaluationError, PortServices>,
  ) => Effect.Effect<CacheLookup, EvaluationError, PortServices>;
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
   * A `compute` already in flight keeps answering the fibers already
   * awaiting it — cancelling those would turn a housekeeping action into a
   * source of failures, and they are answering questions asked before the
   * flush. This call supersedes it, so its answer never re-enters the cache
   * this call just emptied, and a *new* ask for the same key arriving after
   * this call computes afresh rather than joining it. That rule lives in
   * `SharedComputation`'s `reset`.
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
 *
 * A bad `capacity` is a defect and not a typed error, unlike a port's
 * `…Bounded(permits)` (`InvalidBoundedPermits`): the `…Bounded` wrappers are
 * derived for every port by `PortDerivation.ts`, whose layers already carry an
 * error channel, whereas this checks a constant the caller wrote, which no
 * caller recovers from (BEH-QD-166). `makeDecisionLog` does the same.
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

      let entries = HashMap.empty<Question, Trace>();
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
      let insertionOrder: Chunk.Chunk<Question> = Chunk.empty();
      // Single-flight (claim, join, hit, every waiter settled, last-leaver
      // interrupt) and its staleness rule (a reset supersedes every in-flight
      // claim) live in `SharedComputation.ts`, with their own comments. What
      // stays here is what a settled answer does to this cache.
      const shared = makeSharedComputation<Question, Trace, EvaluationError>({
        cached: (key) => HashMap.get(entries, key),
        settle: (key, exit) => {
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
              // `entries` insert (a key is claimed by one fiber at a time,
              // and a hit never claims, so it is appended once per
              // completed compute nobody else answered), and eviction
              // always removes one of each —
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
        },
        onOutcome: (outcome) => Metric.update(decisionCacheLookupsTotal, outcome),
      });

      const getOrCompute: DecisionCacheShape["getOrCompute"] = (key, compute) =>
        Effect.map(shared.run(key, compute), (found) => ({ trace: found.value, outcome: found.outcome }));

      return {
        getOrCompute,
        size: Effect.sync(() => HashMap.size(entries)),
        clear: Effect.sync(() => {
          entries = HashMap.empty<Question, Trace>();
          insertionOrder = Chunk.empty();
          // Resetting the in-flight claims supersedes every compute already
          // running, so none of them writes into the emptied cache and an ask
          // after this claims afresh instead of coalescing onto a compute that
          // started before the flush. That rule is `SharedComputation`'s.
          shared.reset();
        }),
      };
    }),
  );
