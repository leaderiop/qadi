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
import * as Fiber from "effect/Fiber";
import * as HashMap from "effect/HashMap";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import * as Record from "effect/Record";
import type { AttributeResolver } from "./AttributeResolver.ts";
import type { AuthSubject } from "./AuthSubject.ts";
import type { CustomPredicate } from "./CustomPredicate.ts";
import type { Trace } from "./Decision.ts";
import type { DecisionHistory } from "./DecisionHistory.ts";
import type { EvaluationError } from "./Errors.ts";
import type { Policy } from "./Policy.ts";
import type { RelationshipResolver } from "./RelationshipResolver.ts";
import type { SignatureHistory } from "./SignatureHistory.ts";

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
 * `AuthSubject` compares structurally, grants included, so the key now covers
 * everything a decision can depend on.
 *
 * Used as a `HashMap` key **directly**, with no serialization step
 * ([INV-QD-030](../../../spec/invariants.md#inv-qd-030-cache-key-uniqueness)).
 * Effect's `Equal`/`Hash` compare plain objects structurally, nested included —
 * the same property `Atom.family` relies on in `@qadi/react` — so two equal
 * questions hit however their properties were ordered, and two different ones
 * cannot collide. `AuthSubject.roles`/`.permissions` are `ReadonlySet<RoleName>`
 * / `ReadonlySet<PermissionKey>` — the built-in JS `Set`, not `effect/HashSet`
 * — but that is not a gap: `effect@4.0.0-rc.112`'s `Equal.equals`/`Hash.hash`
 * special-case `self instanceof Set` (and `Map`) and fold over their elements
 * order-independently, the same way they fold over an array's, so two subjects
 * whose grants are equal in content but held in two different `Set` objects —
 * the common case, since `makeSubject`/`fromRoles` each build a fresh `Set` —
 * are equal keys and this cache hits. Verified empirically against the
 * installed `effect` build, not assumed from the `Equal`/`Hash` docs, since a
 * prior version of this comment called the field `HashSet` and asserted the
 * same property for the wrong reason; `DecisionCache.test.ts`'s "equal grants,
 * different Set identity, still a hit" pins the actual mechanism.
 *
 * The predecessor of this was `JSON.stringify`, whose own doc comment claimed
 * property-order misses were the price of having "no chance of colliding". It
 * had that backwards. `stringify` maps a `Date` onto its ISO string, drops
 * `undefined`-valued and function-valued properties, and renders `NaN` as
 * `null` — so `{d: new Date(0)}` and `{d: "1970-01-01T00:00:00.000Z"}` produced
 * one key for two questions, and the second caller received the first's verdict.
 *
 * **`maxDepth` is in the key for the same reason `action` is.** It is an
 * `evaluate` option, not part of the `Policy` or the subject, but it can still
 * change the answer: the same subject asking the same policy with a shallower
 * `maxDepth` can turn an `Allow`/`Deny` into `PolicyTooDeep`. Omitting it would
 * let a shallow-limited caller's ask hit an entry a deeper-limited caller left
 * behind and be served that caller's verdict instead of its own
 * `PolicyTooDeep` — the same class of cross-question collision `resource` and
 * `action` are already here to prevent.
 */
export interface DecisionCacheKey {
  readonly subject: AuthSubject;
  readonly policy: Policy;
  readonly resource: Readonly<Record<string, unknown>> | undefined;
  readonly action: string | undefined;
  readonly maxDepth: number;
}

/**
 * What `getOrCompute`'s `compute` argument — always `evaluateNode` — can
 * need or raise.
 */
type EvaluationRequirements =
  | AttributeResolver
  | RelationshipResolver
  | DecisionHistory
  | CustomPredicate
  | SignatureHistory;

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
   * A `compute` already in flight keeps its claim and still settles for the
   * fibers already awaiting it — cancelling those would turn a housekeeping
   * action into a source of failures, and they are answering questions asked
   * before the flush. But that stale answer never re-enters the cache this
   * call just emptied, and a *new* ask for the same key arriving after this
   * call starts its own fresh compute rather than coalescing onto the old
   * one — both closed by an internal generation counter this call advances,
   * so a compute racing the flush can tell whether it is still current when
   * it finishes.
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

const CACHE_OUTCOMES_BY_OUTCOME: Record<CacheOutcome, true> = {
  hit: true,
  coalesced: true,
  miss: true,
};

/** `CACHE_OUTCOMES_BY_OUTCOME`'s keys, in the array form `preregisteredWords` takes. */
const CACHE_OUTCOMES: ReadonlyArray<CacheOutcome> = Record.keys(CACHE_OUTCOMES_BY_OUTCOME);

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
  preregisteredWords: CACHE_OUTCOMES,
});

/**
 * One key's shared, in-flight `compute` — the claiming fiber's own ask, and
 * every later fiber that coalesced onto it instead of starting a second one.
 *
 * `fiber` is the detached fiber actually running `compute` (see the
 * `Effect.forkDetach` call in `getOrCompute`) — `undefined` only in the
 * narrow window between claiming the key and that fork completing, which
 * `getOrCompute`'s `Effect.uninterruptibleMask` closes before any waiter can
 * be interrupted. `waiters` is how many fibers (the claimant included) are
 * currently attached to `claim`; it is what tells the last one to leave
 * whether interrupting `fiber` would abandon someone else's answer or just
 * its own.
 */
interface InFlightClaim {
  readonly claim: Deferred.Deferred<Trace, EvaluationError>;
  fiber: Fiber.Fiber<Trace, EvaluationError> | undefined;
  waiters: number;
}

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
      let inFlight = HashMap.empty<DecisionCacheKey, InFlightClaim>();
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
      // Advanced by `clear` alone. A compute captures this at claim time and
      // compares again in its `onExit` finalizer — unequal means a `clear`
      // happened while it was running, so its result answers the fibers
      // already awaiting its `Deferred` (below) but must not repopulate
      // `entries` on top of a flush that already happened, nor answer a
      // caller who asks for the same key after that flush.
      let generation = 0;

      /**
       * Attaches this fiber's interest in `entry`'s shared computation and
       * waits for it — the one path both the claimant and every coalescing
       * follower take, so no fiber has a privileged relationship with
       * `compute` any more (see `getOrCompute`'s own doc comment on
       * `Effect.forkDetach` for what that privilege used to cost).
       *
       * A fiber interrupted while waiting here just detaches (`waiters -=
       * 1`) and stops — `compute` is unaffected, which is the fix — UNLESS
       * it was the last one still attached, in which case nobody is left to
       * want `compute`'s answer, and its fiber is interrupted along with it
       * so an abandoned evaluation does not keep running for no one.
       *
       * **The `waiters === 0` check and the `Fiber.interrupt` call below are
       * two separate steps, and that is not a race** (issue #64, part of the
       * #33 wayfinder map — a Low/Info re-audit finding, read from source
       * rather than reproduced). A reader could imagine a brand-new caller
       * for this same key claiming or joining in the gap between them,
       * re-incrementing `waiters` too late to stop an interrupt that was
       * already decided. It cannot happen: `effect@4.0.0-rc.112`'s
       * `FiberImpl.interruptUnsafe` (`internal/effect.ts`) evaluates an
       * idle fiber's interrupt **synchronously, in the caller's own call
       * stack**, whenever that fiber is not currently `_running` — and a
       * fiber suspended in `Deferred.await` (this fiber, and the `compute`
       * fiber `Fiber.interrupt` targets below) is exactly "idle". So the
       * decrement, the decision, the nested interrupt of `entry.fiber`, and
       * that fiber's own `onExit` finalizer (removing `inFlight`, settling
       * `claim`) all run as one uninterrupted synchronous cascade — there is
       * no scheduler dispatch boundary inside it for another, independently
       * scheduled fiber's claim-or-join to land in. `DecisionCache.test.ts`'s
       * two "REGRESSION PIN for issue #64" tests race a fresh joiner against
       * this exact cascade — one through nested fibers on this runtime's own
       * scheduler, one through fully independent `ManagedRuntime` roots on
       * real Node.js `setImmediate` macrotasks — and neither ever produces
       * the interrupted outcome the finding describes.
       */
      const awaitShared = (entry: InFlightClaim): Effect.Effect<Trace, EvaluationError> =>
        Deferred.await(entry.claim).pipe(
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              entry.waiters -= 1;
              return entry.waiters === 0 ? entry.fiber : undefined;
            }).pipe(Effect.flatMap((fiber) => (fiber === undefined ? Effect.void : Fiber.interrupt(fiber)))),
          ),
        );

      const getOrCompute: DecisionCacheShape["getOrCompute"] = (key, compute) =>
        Effect.gen(function* () {
          const cached = HashMap.get(entries, key);
          if (Option.isSome(cached)) {
            yield* Metric.update(cacheLookupsTotal, "hit");
            return { trace: cached.value, outcome: "hit" };
          }

          // The claim-or-join step, the fork that starts `compute` (owner
          // only), and the assignment of `entry.fiber` all live inside one
          // `Effect.uninterruptibleMask` — not because any single step needs
          // it, but because the SEQUENCE does. Each is a separate `yield*`,
          // and Effect can act on a pending interrupt at any `yield*`
          // boundary; without the mask there would be a window where this
          // fiber could be torn down after joining/owning the entry but
          // before `awaitShared` (the one part of this that decrements
          // `waiters` again) ever ran — leaking a waiter forever, or, for the
          // owner, leaving `entry.fiber` `undefined` with the key stuck in
          // `inFlight` and nothing left to ever compute it.
          //
          // `restore` re-enables interruption only for the final
          // `awaitShared` call, which is the one part of this that MUST stay
          // interruptible: it is what lets a single coalesced waiter's own
          // cancellation return control to its caller instead of blocking on
          // someone else's answer forever.
          return yield* Effect.uninterruptibleMask((restore) =>
            Effect.gen(function* () {
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
                | { readonly owned: true; readonly entry: InFlightClaim; readonly generation: number }
                | { readonly owned: false; readonly entry: InFlightClaim } => {
                const existing = HashMap.get(inFlight, key);
                if (Option.isSome(existing)) {
                  // Joining, not claiming: one more fiber now cares about
                  // this entry's eventual answer — see `awaitShared`.
                  existing.value.waiters += 1;
                  return { owned: false, entry: existing.value };
                }
                const entry: InFlightClaim = {
                  claim: Deferred.makeUnsafe<Trace, EvaluationError>(),
                  fiber: undefined,
                  waiters: 1,
                };
                inFlight = HashMap.set(inFlight, key, entry);
                // Read in the same synchronous step the claim itself is made in —
                // see `clear`'s own doc comment for what this closes.
                return { owned: true, entry, generation };
              });

              // Someone else already claimed this key — share their result,
              // success or failure, rather than compute a second time.
              if (!claimed.owned) {
                yield* Metric.update(cacheLookupsTotal, "coalesced");
                return { trace: yield* restore(awaitShared(claimed.entry)), outcome: "coalesced" as const };
              }
              yield* Metric.update(cacheLookupsTotal, "miss");
              const entry = claimed.entry;
              const myGeneration = claimed.generation;

              // `Effect.forkDetach`, not run directly on this fiber: `compute`
              // now belongs to every fiber that coalesces onto `entry.claim`,
              // not just the one that happened to claim the key, so it must
              // not die because THIS fiber's own caller stopped waiting.
              // `forkDetach` attaches the new fiber to the global scope
              // rather than this one, so interrupting this fiber — which
              // `awaitShared`, below, is the only interruptible point where
              // that can happen — does not cascade into it the way a plain
              // `Effect.forkChild` would. This is the actual fix for
              // coalesced waiters inheriting the claimant's interruption:
              // under the previous version `compute` ran directly on the
              // claiming fiber, so interrupting *that one caller* interrupted
              // `compute` itself and every other waiter's `Deferred.await`
              // resolved to that same, unwanted interruption.
              //
              // `Effect.onExit`, not a plain `yield* Effect.exit(compute)`
              // followed by more steps: a fiber interrupted while `compute` is
              // running does not return control to the surrounding generator
              // at all — confirmed empirically, not assumed — so any
              // settle-and-clear logic placed *after* an `Effect.exit(compute)`
              // yield, even wrapped in `Effect.uninterruptible`, silently
              // never runs, leaving `claim` permanently unresolved and its key
              // permanently stuck in `inFlight`. `Effect.onExit`'s finalizer is
              // different: it is guaranteed to run on every path `compute` can
              // end on, interruption included, which is exactly the guarantee
              // this needs — and interruption is now a live path here again,
              // since the detached fiber running `compute` is itself
              // interruptible (`awaitShared` reaches for `Fiber.interrupt` on
              // it once the last waiter leaves).
              //
              // Clearing `inFlight` now happens *before* `Deferred.done`,
              // reversed from the order this finalizer used when it ran
              // directly on the claiming fiber. That version's caller only
              // ever resumed once the WHOLE finalizer — settle, then clear —
              // had finished, so nothing could observe the gap between the
              // two steps except a genuinely separate fiber, which the
              // identity check below already protects. Detaching `compute`
              // onto its own fiber breaks that: `Deferred.done` now resumes
              // the claimant's fiber concurrently with whatever the rest of
              // *this* finalizer still has to do, so a claimant that
              // immediately asks the same failed-and-not-cached (or
              // capacity-evicted) question again could race its own
              // finalizer's `inFlight` removal and wrongly coalesce onto an
              // entry that has already settled instead of retrying fresh.
              // Clearing first closes that: by the time anything can resume
              // from `Deferred.done`, `inFlight` no longer holds this claim.
              const fiber = yield* compute.pipe(
                Effect.onExit((exit) =>
                  Effect.sync(() => {
                    // `myGeneration === generation`: no `clear` ran while this
                    // compute was in flight. One did — `clear`'s doc comment
                    // explains why this result must not repopulate the cache it
                    // flushed, even though it still settles `claim` below for
                    // whichever fibers are already awaiting it.
                    if (exit._tag === "Success" && myGeneration === generation) {
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
                    Effect.flatMap(() =>
                      Effect.sync(() => {
                        // Removes this claim only if it is still the one at
                        // `key` — a `clear` between this compute's claim and now
                        // may have reset `inFlight` and let a fresh compute claim
                        // the same key already; that claim is not this one's to
                        // remove.
                        const current = HashMap.get(inFlight, key);
                        if (Option.isSome(current) && current.value === entry) {
                          inFlight = HashMap.remove(inFlight, key);
                        }
                      }),
                    ),
                    Effect.flatMap(() => Deferred.done(entry.claim, exit)),
                  ),
                ),
                Effect.forkDetach,
              );
              // Set before `restore`, still inside the uninterruptible part of
              // this mask — see the doc comment above this block for why.
              yield* Effect.sync(() => {
                entry.fiber = fiber;
              });

              return { trace: yield* restore(awaitShared(entry)), outcome: "miss" as const };
            }),
          );
        });

      return {
        getOrCompute,
        size: Effect.sync(() => HashMap.size(entries)),
        clear: Effect.sync(() => {
          entries = HashMap.empty<DecisionCacheKey, Trace>();
          insertionOrder = Chunk.empty();
          // Resetting `inFlight` here, not just `entries`, is what stops a
          // caller asking for the same key right after this from coalescing
          // onto a compute that started before the flush and would hand them
          // back the exact staleness they just asked to discard.
          inFlight = HashMap.empty<DecisionCacheKey, InFlightClaim>();
          generation += 1;
        }),
      };
    }),
  );
