/**
 * Single-flight over a generic key: concurrent asks for one key share one
 * `compute` run.
 *
 * The regime: the first asker claims the key and starts `compute` on a fiber of
 * its own; every later asker for the same key, while that claim is in flight,
 * joins it instead of starting a second one. **Every waiter is settled** with
 * the shared `compute`'s exit, a failure included. **The shared `compute` is
 * interrupted only when nobody is left waiting**: one waiter that stops waiting
 * (a timeout, a cancelled request) only ever detaches itself.
 *
 * Package-private, and generic over its key (a `HashMap`, so `Equal`
 * semantics), so the regime is testable with plain keys and latched effects and
 * no walk (`SharedComputation.test.ts`). `DecisionCache.ts` is its one adapter:
 * what is remembered after a claim settles, the generation counter behind
 * `clear` and FIFO eviction all stay there, behind the `cached` and `claim`
 * hooks below.
 *
 * **A claim is joinable only while somebody waits on it** (issue #64): the
 * last waiter to leave removes it in the same step that abandons it, so a fresh
 * ask never joins a compute nobody wants and never inherits its interrupt, and
 * an abandoned compute's exit is dropped. See the paragraph on it above
 * `awaitShared`.
 */
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import type * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import type { CacheOutcome } from "./EvaluationMetrics.ts";

/** A value, and which of the three paths `run` took to it. */
export interface Shared<A> {
  readonly value: A;
  readonly outcome: CacheOutcome;
}

/** What the adapter supplies: its own memory of settled answers, and its outcome counter. */
export interface SharedComputationHooks<K, A, E> {
  /** Read inside the claim step; `Some` answers `hit` without computing. */
  readonly cached: (key: K) => Option.Option<A>;
  /**
   * Called inside the claim step for a new claim; returns that claim's settle,
   * which runs synchronously in the compute's `onExit` before any waiter is
   * settled.
   */
  readonly claim: (key: K) => (exit: Exit.Exit<A, E>) => void;
  /** Runs once the path is known and before any waiting, so a join still waiting is counted. */
  readonly onOutcome: (outcome: CacheOutcome) => Effect.Effect<void>;
}

export interface SharedComputation<K, A, E> {
  /** The value for `key`: cached, joined from a compute in flight, or computed here. */
  readonly run: <R>(key: K, compute: Effect.Effect<A, E, R>) => Effect.Effect<Shared<A>, E, R>;
  /**
   * Forgets every in-flight claim, so the next ask for any key claims afresh.
   * Claims already running still settle the fibers awaiting them.
   *
   * A plain synchronous function, not an `Effect`, so an adapter can call it
   * inside the same `Effect.sync` step as the rest of its own flush.
   */
  readonly reset: () => void;
}

/**
 * One key's shared, in-flight `compute` — the claiming fiber's own ask, and
 * every later fiber that coalesced onto it instead of starting a second one.
 *
 * `fiber` is the detached fiber actually running `compute` (see the
 * `Effect.forkDetach` call in `run`) — `undefined` only in the
 * narrow window between claiming the key and that fork completing, which
 * `run`'s `Effect.uninterruptibleMask` closes before any waiter can
 * be interrupted. `waiters` is how many fibers (the claimant included) are
 * currently attached to `claim`; it is what tells the last one to leave
 * whether interrupting `fiber` would abandon someone else's answer or just
 * its own. `abandoned` is set by that last leaver, in the step that removes
 * the claim from `inFlight`; it tells the compute's `onExit` to drop its exit.
 */
interface InFlightClaim<A, E> {
  readonly claim: Deferred.Deferred<A, E>;
  fiber: Fiber.Fiber<A, E> | undefined;
  waiters: number;
  abandoned: boolean;
}

/** A fresh single-flight table, empty, over the adapter's hooks. */
export const makeSharedComputation = <K, A, E>(
  hooks: SharedComputationHooks<K, A, E>,
): SharedComputation<K, A, E> => {
  // Keys with a `compute` currently running, so a second concurrent ask for
  // the same key awaits the first's result instead of starting its own.
  //
  // A plain, directly-reassigned `HashMap`, not `Ref`-wrapped: this and the
  // adapter's own state live inside one closure, and Effect only
  // reorders fiber execution at `yield*` boundaries — never mid-callback —
  // so a direct reassignment inside `Effect.sync` is exactly as atomic as
  // `Ref.modify` would be here.
  let inFlight = HashMap.empty<K, InFlightClaim<A, E>>();

  // Removes `entry` only if it is still the claim at `key`: a `reset`, or an
  // abandonment, may already have let a fresh claim take the slot, and that
  // claim is not this one's to remove.
  const forget = (key: K, entry: InFlightClaim<A, E>): void => {
    const current = HashMap.get(inFlight, key);
    if (Option.isSome(current) && current.value === entry) {
      inFlight = HashMap.remove(inFlight, key);
    }
  };

  /**
   * Attaches this fiber's interest in `entry`'s shared computation and
   * waits for it — the one path both the claimant and every coalescing
   * follower take, so no fiber has a privileged relationship with
   * `compute` any more (see `run`'s own comment on
   * `Effect.forkDetach` for what that privilege used to cost).
   *
   * A fiber interrupted while waiting here just detaches (`waiters -=
   * 1`) and stops — `compute` is unaffected, which is the fix — UNLESS
   * it was the last one still attached, in which case nobody is left to
   * want `compute`'s answer, and its fiber is interrupted along with it
   * so an abandoned evaluation does not keep running for no one.
   *
   * **The `waiters === 0` check and the `Fiber.interrupt` call below are
   * two separate steps, and in the regime this cache's `compute` actually
   * runs in, that is not a race** (issue #64, part of the #33 wayfinder
   * map — a Low/Info re-audit finding, read from source rather than
   * reproduced). A reader could imagine a brand-new caller for this same
   * key claiming or joining in the gap between them, re-incrementing
   * `waiters` too late to stop an interrupt that was already decided.
   * Verified against the installed `effect@4.0.0-rc.116` (checked
   * 2026-09-19; re-check on the next `effect` bump —
   * `FiberImpl.interruptUnsafe` in `internal/effect.ts`): it evaluates a
   * fiber's interrupt **synchronously, in the caller's own call stack**,
   * only when that fiber is both **idle** (not currently `_running`) and
   * **interruptible**. `awaitShared`'s own fiber, suspended in
   * `Deferred.await`, is always both. So for this fiber the decrement,
   * the decision, the nested interrupt of `entry.fiber`, and — when
   * `entry.fiber` is *also* idle-and-interruptible at that instant —
   * that fiber's own `onExit` finalizer (removing `inFlight`, settling
   * `claim`) all run as one uninterrupted synchronous cascade, with no
   * scheduler dispatch boundary inside it for another, independently
   * scheduled fiber's claim-or-join to land in. `DecisionCache.test.ts`'s
   * two "REGRESSION PIN for issue #64" tests race a fresh joiner against
   * exactly that cascade — one through nested fibers on this runtime's
   * own scheduler, one through fully independent `ManagedRuntime` roots
   * on real Node.js `setImmediate` macrotasks — and neither ever
   * produces the interrupted outcome the finding describes.
   *
   * **That idle-and-interruptible premise does not hold for `entry.fiber`
   * whenever `compute` is parked inside a caller-supplied port's
   * uninterruptible region** — a connection checkout, an
   * `Effect.acquireUseRelease` acquire, a finalizer window — which is a
   * real, reachable state for `AttributeResolver`/`RelationshipResolver`/
   * `CustomPredicate` implementations, this cache's primary extension
   * points. There, `Fiber.interrupt(entry.fiber)` only *records* the
   * interrupt cause; delivery is deferred until `entry.fiber` next
   * becomes interruptible, and `compute` then exits interrupted. Before
   * this regime, a fresh ask for the same key could join in that
   * deferral window and resolve interrupted without ever having been
   * cancelled itself (issue #64 follow-up).
   *
   * **So a claim is joinable only while somebody waits on it.** The same
   * synchronous step that sees `waiters` reach 0 marks the claim
   * `abandoned` and removes it from `inFlight` (by identity, through
   * `forget`), before `Fiber.interrupt` is called at all. A fresh ask
   * for the same key after that claims afresh and runs its own `compute`,
   * so a joiner can only ever reach a claim somebody still waits on, and
   * never inherits an interrupt it did not receive. An abandoned claim's
   * exit is dropped: its settle is not called, so nothing is cached from
   * it — nobody asked for it any more, and a fresh claim may already be
   * computing the same key, so writing both would be the double
   * insertion-order append the claim-window fix in `run` exists to
   * prevent — and its `Deferred.done` reaches no waiter, because none is
   * left. In the idle-and-interruptible cascade above the claim is
   * abandoned the same way, so that cascade's `onExit` settles nothing
   * either, where it used to settle an interrupted exit the adapter then
   * ignored.
   *
   * The comment this replaces listed three ways out: fall through to a
   * fresh compute when a join lands on a claim whose fiber already
   * carries a pending interrupt; deliver the last-leaver signal as a
   * typed abandon failure instead of raw interruption; or pin the regime
   * as it stood. This is the first, taken at the moment of abandonment
   * rather than at the moment of joining: it needs no new error type,
   * changes no public type, and the join needs no knowledge of the
   * compute fiber's interrupt state. `SharedComputation.test.ts`'s two
   * "abandon" tests pin it with a plain key and a compute parked in
   * `Effect.uninterruptible`, and `DecisionCache.test.ts`'s "issue #64,
   * uninterruptible regime" test pins it through `evaluate`.
   *
   * One cost is unchanged: `Fiber.interrupt` awaits its target's exit, so
   * the last leaver itself still waits until a compute parked
   * uninterruptibly leaves that region.
   */
  const awaitShared = (key: K, entry: InFlightClaim<A, E>): Effect.Effect<A, E> =>
    Deferred.await(entry.claim).pipe(
      Effect.onInterrupt(() =>
        Effect.sync(() => {
          entry.waiters -= 1;
          if (entry.waiters > 0) return undefined;
          // The last one out: nobody can join this claim from here on.
          entry.abandoned = true;
          forget(key, entry);
          return entry.fiber;
        }).pipe(Effect.flatMap((fiber) => (fiber === undefined ? Effect.void : Fiber.interrupt(fiber)))),
      ),
    );

  // Not an `Effect.fn`: it runs on every cached evaluation, as the arrow
  // returning an Effect that `getOrCompute` always was (AGENTS.md §5's
  // budget is untouched).
  const run = <R>(key: K, compute: Effect.Effect<A, E, R>): Effect.Effect<Shared<A>, E, R> =>
    // The hit check is NOT made before the claim, but inside the
    // claim's own synchronous step below (ARCH-45 I5). A check made in its
    // own step could miss, the fiber be preempted, and the owner finish in
    // the gap (its answer cached, `inFlight[key]` removed): the claim would
    // then find nothing in flight and compute `key` a second time, appending
    // it to the adapter's insertion order twice, so that a later pop of the
    // stale copy evicted a freshly recomputed entry. Reading `cached`, then
    // `inFlight`, then claiming in one synchronous step leaves no gap for an
    // owner's `onExit` to land in.
    //
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
    Effect.uninterruptibleMask((restore) =>
      Effect.gen(function* () {
        // `Deferred.makeUnsafe` inside the same synchronous check as the
        // claim itself, not `yield* Deferred.make` before it: allocating a
        // Deferred is only useful for whichever fiber actually becomes the
        // owner, so it happens *inside* the "nobody has claimed this key
        // yet" branch — a follower, the common case on the concurrent-ask
        // path this exists for, never allocates one it will discard.
        // `Deferred.make` is a synchronous allocation under the hood
        // regardless (`effect/Deferred`'s own source defines it as
        // `Effect.sync(() => makeUnsafe())`); `makeUnsafe` just lets that
        // allocation stay inside the one atomic check instead of paying for
        // it up front on every ask.
        const claimed = yield* Effect.sync(():
          | { readonly _tag: "Hit"; readonly value: A }
          | {
              readonly _tag: "Claimed";
              readonly entry: InFlightClaim<A, E>;
              readonly settle: (exit: Exit.Exit<A, E>) => void;
            }
          | { readonly _tag: "Joined"; readonly entry: InFlightClaim<A, E> } => {
          // First, in the same step as the join and the claim: see the
          // comment at the top of `run`.
          const cached = hooks.cached(key);
          if (Option.isSome(cached)) return { _tag: "Hit", value: cached.value };
          const existing = HashMap.get(inFlight, key);
          if (Option.isSome(existing)) {
            // Joining, not claiming: one more fiber now cares about
            // this entry's eventual answer — see `awaitShared`.
            existing.value.waiters += 1;
            return { _tag: "Joined", entry: existing.value };
          }
          const entry: InFlightClaim<A, E> = {
            claim: Deferred.makeUnsafe<A, E>(),
            fiber: undefined,
            waiters: 1,
            abandoned: false,
          };
          inFlight = HashMap.set(inFlight, key, entry);
          // The adapter's own claim-time reads (`DecisionCache`'s
          // generation) happen here, in the same synchronous step.
          return { _tag: "Claimed", entry, settle: hooks.claim(key) };
        });

        if (claimed._tag === "Hit") {
          yield* hooks.onOutcome("hit");
          const hit: Shared<A> = { value: claimed.value, outcome: "hit" };
          return hit;
        }
        // Someone else already claimed this key — share their result,
        // success or failure, rather than compute a second time.
        if (claimed._tag === "Joined") {
          yield* hooks.onOutcome("coalesced");
          const joined: Shared<A> = { value: yield* restore(awaitShared(key, claimed.entry)), outcome: "coalesced" };
          return joined;
        }
        yield* hooks.onOutcome("miss");
        const { entry, settle } = claimed;

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
              // The adapter's settle first, so what it remembers is in place
              // before any waiter — or a fresh ask — can observe the answer.
              // An abandoned claim's exit is dropped (see `awaitShared`).
              if (!entry.abandoned) settle(exit);
              // A no-op when `reset` or the abandoning leave already did it.
              forget(key, entry);
            }).pipe(Effect.flatMap(() => Deferred.done(entry.claim, exit))),
          ),
          Effect.forkDetach,
        );
        // Set before `restore`, still inside the uninterruptible part of
        // this mask — see the comment above this block for why.
        yield* Effect.sync(() => {
          entry.fiber = fiber;
        });

        const missed: Shared<A> = { value: yield* restore(awaitShared(key, entry)), outcome: "miss" };
        return missed;
      }),
    );

  return {
    run,
    reset: () => {
      inFlight = HashMap.empty<K, InFlightClaim<A, E>>();
    },
  };
};
