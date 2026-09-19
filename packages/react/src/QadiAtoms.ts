"use client";
/**
 * Qadi state as Effect atoms.
 *
 * An authorization decision is asynchronous, shared between components, and
 * invalidated by events outside React — a login, a role change, a revoked
 * grant. That is a reactive graph, and `effect/unstable/reactivity` already
 * models one, so this package is a binding over it rather than a bespoke cache.
 *
 * The atoms defined here have no React dependency at all. React enters only in
 * `QadiProvider.tsx`, which subscribes to them. That split is deliberate: it
 * keeps the caching and lifetime rules testable without rendering anything, and
 * it is what makes one shared evaluation per policy possible — the predecessor
 * re-ran the whole evaluation in every component that asked the same question.
 */
import type {
  AuthSubject,
  Decision,
  EvaluationError,
  EvaluationServices,
  Policy,
  Resource,
} from "@qadi/core";
import { CurrentSubject, DecisionCache, evaluate } from "@qadi/core";
import * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import type * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import * as Reactivity from "effect/unstable/reactivity/Reactivity";
import { countRecheck } from "./HydrationCounts.ts";
import { registerHydrationSeeds } from "./HydrationSeed.ts";
import type { HydrationMismatchReporter } from "./HydrationWarning.ts";
import { hydrationMismatchReporter, isMismatch } from "./HydrationWarning.ts";

// `HydrationWarning.ts` is out of the barrel — its ambient-global boundary is
// not a public surface — so the two types callers name are re-exported here.
export type { HydrationMismatch, HydrationMismatchReporter } from "./HydrationWarning.ts";

/**
 * The services a Qadi runtime layer supplies.
 *
 * `CurrentSubject` is excluded on purpose. It changes per user, so it is
 * provided per evaluation from {@link QadiAtoms.subject} rather than baked
 * into the runtime — a login must not rebuild the attribute resolver.
 */
export type QadiRuntimeServices = Exclude<EvaluationServices, CurrentSubject>;

/**
 * The layer a Qadi runtime is built from.
 *
 * Construction must not fail. A resolver that cannot be built is a wiring
 * defect, and turning it into an error on every subsequent decision would
 * report a startup problem as an authorization problem for the life of the
 * process. Callers with a fallible layer resolve it at startup, or use
 * `Layer.orDie`.
 */
export type QadiLayer = Layer.Layer<
  QadiRuntimeServices,
  never,
  AtomRegistry.AtomRegistry | Reactivity.Reactivity
>;

/**
 * The observable state of one decision.
 *
 * `Initial` means the decision is not known yet — distinct from a `Deny`, and
 * distinct again from a `Failure`, which means the question could not be
 * answered at all. Collapsing those three into a boolean is what makes an
 * attribute-store outage look like a permissions problem.
 */
export type DecisionResult = AsyncResult.AsyncResult<Decision, EvaluationError>;

/**
 * The decision, or `undefined` when there is not a current one.
 *
 * A result that is `waiting` carries the *previous* decision while a new one is
 * computed. For most data that staleness is a feature; for authorization it is
 * an over-permission, however brief — the subject has logged out, or their
 * grants have just been invalidated, and the answer on screen is the one from
 * before. Every consumer in this package goes through here, so a stale allow
 * reads as "not decided yet" rather than as permission.
 */
export const currentDecision = (result: DecisionResult): Decision | undefined =>
  AsyncResult.isSuccess(result) && !result.waiting ? result.value : undefined;

/** The reactivity key every decision atom is registered under. */
const DECISIONS_KEY = "qadi/decisions";

export interface QadiAtoms {
  /** The runtime the decision atoms evaluate in. */
  readonly runtime: Atom.AtomRuntime<QadiRuntimeServices>;
  /** The subject under authorization. `undefined` means "not known yet". */
  readonly subject: Atom.Writable<AuthSubject | undefined>;
  /** The decision for a policy, with no resource in scope. */
  readonly decision: (policy: Policy) => Atom.Atom<DecisionResult>;
  /** The decision for a policy against one resource. */
  readonly decisionFor: (policy: Policy, resource: Resource) => Atom.Atom<DecisionResult>;
  /** Writing to this discards every decision and re-evaluates the mounted ones. */
  readonly invalidate: Atom.AtomResultFn<void, void>;
  /**
   * Every question this atom set has been asked, in the order first asked.
   *
   * The honest version of a devtools "gates in tree" panel, and the reason that
   * screen is keyed by **question** rather than by component instance.
   * `Atom.family` keys structurally, so ten `<Can policy={isAdmin}>` in
   * different places in the tree are **one atom** — the library cannot tell them
   * apart, and a panel listing ten rows would be inventing a distinction the
   * architecture does not have.
   *
   * Recorded here, in the atom layer, because this is the layer that knows what
   * was *asked*. What is **asking** is recorded separately, by the components
   * themselves, in `GateRegistry.ts` — the two views sit side by side in the
   * devtools React panel ([ADR-QD-053](../../../spec/decisions/053-a-gate-can-be-found.md)).
   *
   * This paragraph read "an instance registry would breach [AGENTS.md §13]
   * twice over", and it does not. Decisions are still not in React state and the
   * React glue is still one `useSyncExternalStore` call in `QadiProvider.tsx`;
   * the registry exposes `subscribe`/`snapshot` for exactly that purpose. What
   * the argument above actually establishes is that the *atom layer* cannot see
   * instances, which is true and is why this screen is keyed by question. A
   * component knows perfectly well that it exists; nothing was asking it
   * (CCR-QD-073, corrected here in CCR-QD-076).
   *
   * **Correction:** this comment, ADR-QD-053 and AGENTS.md §13 all previously
   * went on to claim "and it is `@qadi/devtools`, a DOM package already, that
   * subscribes" — present tense, as if already wired. It is not: nothing under
   * `packages/devtools/src` calls `subscribeGates`, and `DevtoolsDock.tsx`
   * takes `gates` as a plain, one-shot prop rather than subscribing itself.
   * `GateRegistry.ts`'s `subscribeGates`/`gateInstances` contract is correct
   * and exercised by `GateRegistry.test.tsx`; what is missing is the
   * consumer, in a package this file does not own. Flagged rather than
   * silently reworded, per AGENTS.md §15's reason for gating claims like this
   * one at all.
   *
   * Read the current verdict for each with `decision`/`decisionFor` — that is
   * what keeps a stale entry rendering as re-checking rather than as its old
   * answer (ADR-QD-017).
   *
   * **Bounded, not by growing forever and hoping GC keeps up.** A long-lived
   * session asking many distinct (policy, resource) combinations has nothing
   * else bounding this array or the underlying `Atom.family` tracking behind
   * `decision`/`decisionFor` — a confirmed leak, closed by `sweepEvictions`
   * dropping the oldest entries with no reader currently holding them once
   * `maxTrackedQuestions` is exceeded. A question a gate still has open is
   * never among those dropped; see {@link TrackedQuestion}.
   */
  readonly asked: () => ReadonlyArray<AskedQuestion>;
  /**
   * Evicts tracked questions with no reader currently holding them, until at
   * most `maxTrackedQuestions` remain — or until every question left over
   * that bound is still live, in which case it stops there rather than
   * dropping something in use.
   *
   * A plain `Effect.sync` over this atom set's own closure state, requiring
   * no service and touching nothing in `AtomRegistry` — deliberately, so it
   * cannot go anywhere near the `scheduleTask`/`defaultIdleTTL` knob AGENTS.md
   * §13 documents as off-limits (it also governs the registry's core
   * value-dispatch/notify batching, and wiring it for idle-atom GC once
   * already silently coalesced away a required intermediate render). Meant
   * to be run periodically by whatever owns this atom set's lifecycle —
   * `QadiProvider` forks it on `Schedule.spaced` at mount and interrupts that
   * fiber at unmount — rather than invoked once. Eviction order among
   * eligible (non-live) entries is oldest-first, the same FIFO choice
   * `DecisionCache.ts`'s own bounded mode makes and for the same reason:
   * nothing here claims "recently used" predicts "will be asked again"
   * better than "recently added" does.
   */
  readonly sweepEvictions: Effect.Effect<void>;
}

/** One question an atom set has been asked. */
export interface AskedQuestion {
  readonly policy: Policy;
  /** Absent when the question was asked with no resource in scope. */
  readonly resource?: Resource | undefined;
}

/**
 * Bookkeeping for one asked question, kept alongside the public
 * {@link AskedQuestion} it wraps.
 *
 * `liveCount` is how many currently-subscribed computations — across every
 * registry sharing this atom set, since `bare`/`byResource`'s memoized atoms
 * are shared objects, not per-registry ones — are holding the question's
 * decision atom open. Incremented when `combined`'s reader runs and
 * decremented by the finalizer it registers through `get.addFinalizer`,
 * which `AtomRegistry` invokes both on a genuine teardown (last subscriber
 * gone) and on a recompute (a dependency changed, or `useInvalidate` fired).
 * The two cases are distinguishable in effect, if not in the count itself:
 * `NodeImpl.invalidate` calls `disposeLifetime()` (dropping this to `0`) and
 * then, synchronously and with no `yield*` in between, `this.value()` (which
 * reads the atom again, bringing it back to `1`) — so `sweepEvictions`,
 * running on its own fiber, can never observe a momentarily-zero count for
 * something a registry still actually holds open; only a real teardown
 * leaves it at zero for `sweepEvictions` to find.
 *
 * `sweepEvictions` must never drop an entry while this is above zero: doing
 * so would silently remove a still-mounted gate from `asked()` forever,
 * since `Atom.family`'s constructor callback — the one place a dropped entry
 * could be re-added — runs exactly once per distinct key's lifetime, not on
 * every read (`QadiAtoms.test.ts`'s "hands back a copy" test is what pins
 * that once-only construction).
 */
interface TrackedQuestion {
  readonly question: AskedQuestion;
  liveCount: number;
}

/**
 * The default for {@link QadiAtomsOptions.maxTrackedQuestions}.
 *
 * Generous enough that no application built against pre-eviction `@qadi/react`
 * should notice it, while still being an actual bound: unlike
 * `decisionCacheLayer`'s deliberately unbounded default (`DecisionCache.ts`'s
 * own doc comment — safe because that cache is meant to be scoped to one
 * request), this package's atoms are the long-lived case: a single-page
 * session that asks many distinct (policy, resource) combinations over
 * hours has nothing else bounding `asked()` or the underlying `Atom.family`
 * tracking, which is exactly the audited leak this default closes.
 */
const DEFAULT_MAX_TRACKED_QUESTIONS = 500;

/**
 * Builds the atom set for one authorization context.
 *
 * Call this once per context, at module scope. An application that serves
 * several tenants in one process calls it once per tenant; the atoms are
 * distinct objects, so their decisions cannot be confused for one another.
 */
/**
 * A decision, and the server-rendered seed that covers its first frames.
 *
 * They are **separate atoms**, and that separation is the whole of INV-QD-028.
 * A seed written directly into the decision atom is *preserved over the value
 * that atom computes*: `AtomRegistry` sets `preserveInitialValueOnBuild` for a
 * seeded node and, when the build finishes with the node still awaiting a
 * value, keeps the seed and throws the computed value away. An effect that
 * settles asynchronously escapes that, because it publishes through `setSelf`
 * on a later turn — but one that settles **synchronously** returns its value
 * straight out of the read, and the seed wins permanently. Every policy that
 * needs no resolver settles synchronously, so that was the common case, and it
 * left a subject holding a server-issued allow they no longer qualified for.
 *
 * Keeping the two apart makes the precedence explicit and one-directional
 * instead of a consequence of when an effect happens to settle.
 */
interface SeededDecision {
  readonly seed: Atom.Writable<Decision | undefined>;
  readonly combined: Atom.Atom<DecisionResult>;
}

export interface QadiAtomsOptions {
  /**
   * Called when this client's own answer disagrees with the server's seed.
   *
   * Supplying this replaces the development-mode console warning. It runs in
   * production too, which is the point of exposing it: a server and a client
   * disagreeing about an authorization question is signal worth reporting, and
   * it usually means one of the two is wired differently from the other.
   *
   * Called at most once per question, when this client first answers it. It
   * observes; it cannot change the outcome — the client's answer is already the
   * one in effect by the time this runs ([INV-QD-028](../../../spec/invariants.md)).
   */
  readonly onHydrationMismatch?: HydrationMismatchReporter;
  /**
   * The most distinct questions this atom set keeps in `asked()` and its own
   * `Atom.family` tracking at once.
   *
   * Once exceeded, `sweepEvictions` drops the oldest questions with no reader
   * currently holding them — never one a mounted gate still has open. Must be
   * a positive integer; defaults to `DEFAULT_MAX_TRACKED_QUESTIONS`.
   */
  readonly maxTrackedQuestions?: number;
}

export const makeQadiAtoms = (
  layer: QadiLayer,
  options?: QadiAtomsOptions,
): QadiAtoms => {
  const maxTrackedQuestions = options?.maxTrackedQuestions ?? DEFAULT_MAX_TRACKED_QUESTIONS;
  // Mirrors `decisionCacheLayer`'s own capacity validation (`DecisionCache.ts`)
  // and for the same two reasons: a negative capacity makes an eviction loop's
  // `while (tracked.length > maxTrackedQuestions)` unsatisfiable once `tracked`
  // empties out, and a `NaN` one makes that comparison always `false`, silently
  // turning "bounded" into unbounded instead of failing loudly. Checked once
  // here, at construction, rather than left to fail in whichever of those two
  // ways the first time `sweepEvictions` runs.
  if (!(Number.isInteger(maxTrackedQuestions) && maxTrackedQuestions >= 1)) {
    throw new Error(
      `makeQadiAtoms: maxTrackedQuestions must be a positive integer, got ${maxTrackedQuestions}`,
    );
  }

  const runtime = Atom.runtime(layer);
  const subject = Atom.make<AuthSubject | undefined>(undefined);
  const report = hydrationMismatchReporter(options?.onHydrationMismatch);

  const seededDecision = (
    policy: Policy,
    resource: Resource | undefined,
    tracking: TrackedQuestion,
  ): SeededDecision => {
    // Declared before `computed`, which reads it with `get.once` to carry the
    // server's evaluation id into the re-check.
    const seed = Atom.make<Decision | undefined>(undefined);

    const computed = runtime
      .atom((get): Effect.Effect<Decision, EvaluationError, QadiRuntimeServices> => {
        const current = get(subject);
        // No subject yet is not a denial — it is an unanswerable question. An
        // effect that never settles leaves the atom `Initial`, which is exactly
        // "still loading". Returning a Deny here would render every guarded
        // control as forbidden for the first frame after a page load.
        if (current === undefined) return Effect.never;
        // A re-check continues the server's evaluation rather than starting an
        // unrelated one, so it carries that evaluation's id. Without this the
        // two halves of a hydrated decision cannot be joined by anything: the
        // payload carries an id, the client minted a fresh one, and nothing
        // related them (BEH-QD-186).
        //
        // `get.once`, not `get`: reading the seed reactively would make every
        // re-evaluation depend on the seed atom, so a seed set or cleared after
        // mount would re-run a computation whose answer it cannot change. The id
        // is correlation metadata, not an input to the decision.
        const seeded = get.once(seed);
        return evaluate(policy, {
          ...(resource === undefined ? {} : { resource }),
          ...(seeded === undefined ? {} : { evaluationId: seeded.evaluationId }),
        }).pipe(Effect.provideService(CurrentSubject, current));
      })
      .pipe(runtime.factory.withReactivity([DECISIONS_KEY]));

    /**
     * Announcement state for one question, kept **per registry**.
     *
     * Two providers over the same atom set — two tabs, or a server render
     * followed by the client's own registry — each get their own first answer,
     * and each must report its own first disagreement. A single closure flag
     * shared across every registry that ever reads this atom would let only the
     * first registry's first answer ever be announced or counted; every other
     * registry's genuinely-first re-check would silently join the "already
     * announced" branch of a flag it never flipped.
     *
     * This is the same defect `settled.ts` documents at length for its own
     * `pending`/`resolvers`/`subscribed` state, and the fix is the same shape:
     * a `WeakMap<AtomRegistry.AtomRegistry, …>` rather than a bare closure
     * variable. Scoped inside `seededDecision` (so once per `Atom.family` key,
     * as the flag it replaces was) rather than at module scope, because nothing
     * outside this one question's state needs to share the map.
     */
    interface AnnounceState {
      /**
       * Announced once per question **per registry**, the first time that
       * registry's client answers it for itself — absorbing StrictMode's double
       * render, which a value comparison would report twice.
       */
      announced: boolean;
      /**
       * The seed, as this registry first saw it.
       *
       * Kept because `get.once(seed)` below can read `undefined` for a seed that
       * was definitely there: a registry may drop the value of an atom nothing
       * mounted, and the seed atom is only ever a *dependency* of this one. Under
       * `registry.mount` it survives and the disagreement is reported; under a
       * `QadiProvider`, which subscribes rather than mounts, it does not and the
       * report is silently skipped.
       *
       * That made whether a disagreement is announced a fact about registry
       * lifetime rather than about the decision, which is the defect. Remembering
       * the first non-absent reading makes the announcement depend only on what
       * was seeded and what this client then decided.
       *
       * Written in the branch that already reads the seed reactively, so it costs
       * nothing and adds no dependency of its own.
       */
      observedSeed: Decision | undefined;
    }

    const announceState = new WeakMap<AtomRegistry.AtomRegistry, AnnounceState>();
    const announceStateFor = (registry: AtomRegistry.AtomRegistry): AnnounceState => {
      const existing = announceState.get(registry);
      if (existing !== undefined) return existing;
      const created: AnnounceState = { announced: false, observedSeed: undefined };
      announceState.set(registry, created);
      return created;
    };

    const combined = Atom.readable((get): DecisionResult => {
      // Marks this question live for as long as this computation stays
      // cached — see `TrackedQuestion`'s own doc comment for why a recompute
      // (dispose-then-reread, synchronous, no `yield*` in between) can never
      // be observed by `sweepEvictions` as a real drop to zero, only a
      // genuine teardown can.
      tracking.liveCount += 1;
      get.addFinalizer(() => {
        tracking.liveCount -= 1;
      });

      const state = announceStateFor(get.registry);
      const result = get(computed);
      // `Initial` is the only state in which this client has never answered for
      // itself. The moment it has — allow, deny or failure — that answer is
      // authoritative and the seed is spent. That includes while a *later*
      // re-check is in flight: a re-checking result already carries its own
      // previous decision, and falling back to the seed there would resurrect
      // something older still.
      if (!AsyncResult.isInitial(result)) {
        if (!state.announced) {
          state.announced = true;
          // `get.once`, not `get`. This block previously ran only when a
          // reporter was wired, and was guarded that way so an atom set without
          // one "reads exactly the atoms it read before — no reporter, no added
          // dependency, no change". Counting must happen whether or not a
          // reporter is wired, so the guard could not stay; `get.once` keeps the
          // promise it was protecting, because it registers no dependency. It is
          // also the honest read here: the seed is already spent in this branch,
          // so re-running on a later seed change could not change the answer.
          // `?? state.observedSeed`: the registry's copy is authoritative when it
          // has one, and the first reading stands in when it has dropped it.
          const seeded = get.once(seed) ?? state.observedSeed;
          if (seeded !== undefined) {
            // A failure is not a disagreement. The client could not answer, so
            // there is nothing for the server's answer to disagree with, and
            // reporting one would be INV-QD-006 in reverse. It is still a
            // re-check: the question was seeded and has now been asked again.
            const mismatched =
              AsyncResult.isSuccess(result) && isMismatch(seeded, result.value);
            countRecheck(mismatched);
            if (mismatched && report !== undefined && AsyncResult.isSuccess(result)) {
              report({ policy, resource, seeded, decided: result.value });
            }
          }
        }
        return result;
      }
      const seeded = get(seed);
      if (seeded !== undefined) state.observedSeed = seeded;
      return seeded === undefined ? result : AsyncResult.success(seeded);
    });

    return { seed, combined };
  };

  // `Atom.family` memoises on the argument, so every component asking the same
  // question shares one evaluation. It keys **structurally** — the family holds
  // a `MutableHashMap`, which compares with `Equal.equals` — so two separately
  // constructed but equal policies share one atom, and sharing survives a policy
  // built inline in render. Hoisting to module scope is still worth doing, but
  // for hashing cost rather than for correctness: the hash is cached per object,
  // so a fresh object each render re-walks the whole policy tree.
  // `v4-reactivity-smoke.test.ts` pins this; a bump to reference keying would
  // silently stop inline policies sharing.
  // Appended as each family key is first built, which is exactly once per
  // distinct question — `Atom.family` memoises, so a repeat ask does not run the
  // constructor again and cannot double-count. `tracked`, not a plain
  // `Array<AskedQuestion>`, so `sweepEvictions` has somewhere to record which
  // entries currently have a live reader (`TrackedQuestion.liveCount`) — see
  // that interface's own doc comment for why eviction cannot rely on anything
  // computed from `Policy`/`Resource` structural equality instead.
  const tracked: Array<TrackedQuestion> = [];

  const bare = Atom.family((policy: Policy) => {
    const tracking: TrackedQuestion = { question: { policy }, liveCount: 0 };
    tracked.push(tracking);
    return seededDecision(policy, undefined, tracking);
  });

  const byResource = Atom.family((policy: Policy) =>
    Atom.family((resource: Resource) => {
      const tracking: TrackedQuestion = { question: { policy, resource }, liveCount: 0 };
      tracked.push(tracking);
      return seededDecision(policy, resource, tracking);
    }),
  );

  const sweepEvictions: Effect.Effect<void> = Effect.sync(() => {
    while (tracked.length > maxTrackedQuestions) {
      const index = tracked.findIndex((entry) => entry.liveCount === 0);
      // Every remaining entry over the bound is still live — stop rather than
      // evict something in use. The bound becomes best-effort in that case,
      // which is the same tradeoff `DecisionCache.ts`'s own bounded mode makes
      // for an entry with a `compute` still in flight.
      if (index === -1) break;
      tracked.splice(index, 1);
    }
  });

  /**
   * Discards every decision, and every cached answer behind one.
   *
   * **The cache is cleared first, and that ordering is the whole fix.**
   * `Reactivity.invalidate` makes the mounted atoms recompute immediately, and a
   * `DecisionCache` still holding the previous answer serves it straight back —
   * so the ports are never re-asked, the verdict cannot change, and the button
   * that exists to notice a revoked grant is the one thing guaranteed not to.
   *
   * It was silent, which is what made it dangerous. Nothing failed and nothing
   * logged; the atoms really were discarded and really were recomputed, and the
   * recomputation was answered from memory. An application without a cache in
   * its layer worked, so every test of this passed
   * ([BEH-QD-070](../../../spec/behaviors/09-react.md)) until one was written
   * with a cache in it.
   *
   * `serviceOption`, because `DecisionCache` is optional — an atom set without
   * one must not fail here, and most do not have one.
   */
  const invalidate = runtime.fn((_: void) =>
    Effect.gen(function* () {
      const cache = yield* Effect.serviceOption(DecisionCache);
      if (Option.isSome(cache)) yield* cache.value.clear;
      yield* Reactivity.invalidate([DECISIONS_KEY]);
    })
  );

  const atoms: QadiAtoms = {
    runtime,
    subject,
    decision: (policy) => bare(policy).combined,
    decisionFor: (policy, resource) => byResource(policy)(resource).combined,
    invalidate,
    // A fresh array of the wrapped questions, so a reader cannot mutate the
    // atom set's own record of what it has been asked (or reach `liveCount`,
    // which is not part of the public `AskedQuestion` shape).
    asked: () => tracked.map((entry) => entry.question),
    sweepEvictions,
  };

  registerHydrationSeeds(atoms, (policy, resource) =>
    resource === undefined ? bare(policy).seed : byResource(policy)(resource).seed,
  );

  return atoms;
};
