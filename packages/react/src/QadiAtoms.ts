"use client";
/**
 * Qadi state as Effect atoms.
 *
 * An authorization decision is asynchronous, shared between components, and
 * invalidated by events outside React — a login, a role change, a revoked
 * grant. That is a reactive graph, and `effect/reactivity` already
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
  Policy,
  Resource,
  StandingEvaluationServices,
} from "@qadi/core";
import { CurrentSubject, DecisionCache, evaluate, subjectEquivalence } from "@qadi/core";
import * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import * as Reactivity from "effect/reactivity/Reactivity";
import {
  type DehydratedPayload,
  type HydrateOptions,
  type HydrationMismatchReporter,
  type InitialValues,
  hydrateWith,
  makeSeededQuestion,
  resolveMismatchReporter,
} from "./HydrationEngine.ts";
import type { GateRegistry } from "./GateRegistry.ts";
import { makeGateRegistry } from "./GateRegistry.ts";
import { gateIdCollisionReporter } from "./HydrationWarning.ts";
import type { ClientDecision } from "./SeededDecision.ts";

// `HydrationWarning.ts` is out of the barrel — its ambient-global boundary is
// not a public surface — so the two types callers name are re-exported here.
export type { HydrationMismatch, HydrationMismatchReporter } from "./HydrationEngine.ts";

/**
 * The services a Qadi runtime layer supplies.
 *
 * `CurrentSubject` is excluded on purpose. It changes per user, so it is
 * provided per evaluation from {@link QadiAtoms.subject} rather than baked
 * into the runtime — a login must not rebuild the attribute resolver.
 */
export type QadiRuntimeServices = StandingEvaluationServices;

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
 *
 * A success holds a {@link ClientDecision}: this client's own evaluation, or —
 * for the first frames of a server-rendered page — the server's seed, which is a
 * projection and not an evaluation. Read its verdict with `permits`.
 */
export type DecisionResult = AsyncResult.AsyncResult<ClientDecision, EvaluationError>;

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
export const currentDecision = (result: DecisionResult): ClientDecision | undefined =>
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
   * Keyed by **question**, not by component instance, because `Atom.family` keys
   * structurally: ten `<Can policy={isAdmin}>` in different places in the tree
   * are one atom, and the atom layer cannot tell them apart. What is *asking* is
   * {@link QadiAtoms.gates}, beside this
   * ([ADR-QD-080](../../../spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md),
   * superseding the module-scope registry of ADR-QD-053). The devtools panel
   * joins the two structurally, with `Equal.equals`, because `@qadi/devtools`
   * does not depend on this package.
   *
   * Read the verdict for each with `decision`/`decisionFor`, which is what keeps a
   * stale entry rendering as re-checking rather than as its old answer
   * ([ADR-QD-017](../../../spec/decisions/017-stale-decisions-are-not-decisions.md)).
   *
   * Bounded: `sweepEvictions` drops the oldest questions no reader is holding
   * once `maxTrackedQuestions` is exceeded, and never one a mounted gate still has
   * open — see {@link TrackedQuestion}.
   */
  readonly asked: () => ReadonlyArray<AskedQuestion>;
  /**
   * Every live guard under this atom set: the "asking" half of the panel.
   *
   * Owned by the same atom set as {@link QadiAtoms.asked}, so the two share one
   * scope and one lifetime. Every instrumented `QadiProvider` over this atom set
   * writes here unless it was handed its own `gates`. Read it with `instances()`
   * and `subscribe()`, or with `useGateInstances()` inside a provider. Empty for
   * the atom set's life when nothing is instrumented.
   */
  readonly gates: GateRegistry;
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
  /**
   * Seeds this atom set from a server's dehydrated payload.
   *
   * The capability `hydrateDecisions` calls — **prefer `hydrateDecisions`**, which
   * is the documented entry point and checks the payload the same way. It lives on
   * the atom set because the seed atoms do: each is private to this closure,
   * reachable by neither reflection nor import, which is what ADR-QD-039 actually
   * requires (a consumer holding a seed atom could write an authorization decision
   * straight into a registry, bypassing the subject check and the evaluator).
   *
   * Never throws, and drops what it cannot verify — see `hydrateDecisions`. A
   * wrapper that forwards `decision`/`decisionFor` can forward this too, and a
   * hand-built test double supplies its own: that is the caller's code, not a
   * trust crossing.
   */
  readonly hydrate: (
    dehydrated: DehydratedPayload,
    subject: AuthSubject,
    options?: HydrateOptions,
  ) => InitialValues;
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
 * since `Atom.family`'s constructor callback runs exactly once per distinct
 * key's lifetime, not on every read (`QadiAtoms.test.ts`'s "hands back a
 * copy" test is what pins that once-only construction).
 *
 * That once-only construction cuts the other way too, and `inTracked` is
 * what closes it: `Atom.family` has no public API to force-remove an entry,
 * so evicting a *cold* (`liveCount === 0`) question from `tracked` does not
 * remove its atom from the family's own cache — the atom can still be
 * alive, just untracked. A component that re-asks the identical question
 * before that atom is GC'd gets the same cached atom back, and because the
 * constructor callback that does `tracked.push` never runs again for an
 * already-cached key, the reawakened question would otherwise never
 * reappear in `tracked`/`asked()` at all, contradicting "a question a gate
 * still has open is never dropped" for the one case that actually asks
 * again after eviction. `combined`'s reader re-adds the entry (and flips
 * this back to `true`) the moment it observes `inTracked === false`, before
 * incrementing `liveCount` — so a reawakened question is visible again from
 * its very first new subscriber, not only after the next full sweep.
 */
interface TrackedQuestion {
  readonly question: AskedQuestion;
  liveCount: number;
  inTracked: boolean;
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
   * Called once per id when two live guards under this atom set minted the same
   * React `useId` (two hydrated roots do).
   *
   * Supplying this replaces the development-mode console warning, and runs in
   * production too. Both guards stay listed; the second under a disambiguated
   * `id`. The fix at the source is a distinct `identifierPrefix` per root.
   */
  readonly onGateIdCollision?: (id: string) => void;
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

/**
 * Equality for the `subject` atom: {@link subjectEquivalence}, tolerating `undefined`.
 *
 * `makeSubject`/`fromRoles` (`AuthSubject.ts`) return a fresh plain object on
 * every call, by design. `AtomRegistry`'s write path treats *any* referentially
 * distinct write as a real change and invalidates every dependent, and every
 * decision atom reads `subject`. A host that constructs its subject inline —
 * `<QadiProvider subject={makeSubject({ id: user.id, roles: user.roles })} />`
 * in a component that re-renders — would otherwise re-run every mounted
 * decision on every render, though who is asking never changed (RC-01).
 *
 * The comparison is `@qadi/core`'s own, the one `DecisionCache`'s key uses, so a
 * nested attribute object that is equal by structure no longer counts as a change
 * either. This used to be a separate, shallow `Object.is`-per-key walk.
 */
const subjectsEqual = (a: AuthSubject | undefined, b: AuthSubject | undefined): boolean =>
  a === b || (a !== undefined && b !== undefined && subjectEquivalence(a, b));

/**
 * Builds the atom set for one authorization context.
 *
 * Call this once per context, at module scope. An application that serves
 * several tenants in one process calls it once per tenant; the atoms are
 * distinct objects, so their decisions cannot be confused for one another.
 */
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
  const subject = Atom.make<AuthSubject | undefined>(undefined).pipe(
    Atom.withEquality(subjectsEqual),
  );
  const report = resolveMismatchReporter(options?.onHydrationMismatch);
  const collisionReporter = gateIdCollisionReporter(options?.onGateIdCollision);
  const gates = makeGateRegistry(
    collisionReporter === undefined ? {} : { onIdCollision: collisionReporter },
  );

  const seededDecision = (
    policy: Policy,
    resource: Resource | undefined,
    tracking: TrackedQuestion,
  ) =>
    makeSeededQuestion<EvaluationError>({
      policy,
      resource,
      report,
      computedFor: (seed) =>
        runtime
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
          .pipe(runtime.factory.withReactivity([DECISIONS_KEY])),
      // Marks this question live for as long as this computation stays
      // cached — see `TrackedQuestion`'s own doc comment for why a recompute
      // (dispose-then-reread, synchronous, no `yield*` in between) can never
      // be observed by `sweepEvictions` as a real drop to zero, only a
      // genuine teardown can.
      track: (get) => {
        if (!tracking.inTracked) {
          // A previous sweep evicted this question while it was cold, but
          // `Atom.family` handed back the same cached atom rather than
          // rebuilding it — see `TrackedQuestion.inTracked`'s own doc comment.
          tracked.push(tracking);
          tracking.inTracked = true;
        }
        tracking.liveCount += 1;
        get.addFinalizer(() => {
          tracking.liveCount -= 1;
        });
      },
    });

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
  //
  // **`byResource`'s `resource` argument is a family key, and a family key must
  // not be mutated after its first use (BL-05).** `Atom.family` compares with
  // `Equal.equals` and caches the comparison per object pair in a `WeakMap`
  // (`effect`'s own `Equal` contract) — the same structural keying
  // `DecisionCacheKey.resource` relies on in `@qadi/core/DecisionCache.ts`,
  // and the same caveat applies here: a caller who mutates a `resource` object
  // in place after asking a question with it keeps hitting this family's
  // existing entry, because the key's hash and the cached comparison were
  // computed against the pre-mutation shape. `useInvalidate`/`Reactivity.invalidate`
  // does not help — it recomputes the *cached decision* behind an existing key,
  // it does not give a mutated object a new one. Treat a `resource` passed to
  // `decisionFor` as immutable for as long as any component might still be
  // asking about it; build a new object for a new state instead of mutating
  // the old one in place.
  //
  // **What this closure owns, and who may reach it.** Everything per-atom-set
  // lives here and nowhere at module scope: `tracked` (liveness, for the eviction
  // sweep), the `bare`/`byResource` families (one `SeededQuestion` per question,
  // from `HydrationEngine.ts`, holding its private seed atom and the one atom a
  // consumer reads), and the `hydrate` capability that closes over those families.
  // Nothing outside `makeQadiAtoms` can reach a seed atom — that is ADR-QD-039's
  // requirement, met by scope rather than by a side table keyed on this object.
  // Anything else that needs to be scoped to one atom set (a gate registry, say)
  // belongs in this closure and on the `QadiAtoms` interface, in the same shape.
  const tracked: Array<TrackedQuestion> = [];

  const bare = Atom.family((policy: Policy) => {
    const tracking: TrackedQuestion = { question: { policy }, liveCount: 0, inTracked: true };
    tracked.push(tracking);
    return seededDecision(policy, undefined, tracking);
  });

  const byResource = Atom.family((policy: Policy) =>
    Atom.family((resource: Resource) => {
      const tracking: TrackedQuestion = {
        question: { policy, resource },
        liveCount: 0,
        inTracked: true,
      };
      tracked.push(tracking);
      return seededDecision(policy, resource, tracking);
    }),
  );

  const sweepEvictions: Effect.Effect<void> = Effect.sync(() => {
    while (tracked.length > maxTrackedQuestions) {
      const entry = tracked.find((candidate) => candidate.liveCount === 0);
      // Every remaining entry over the bound is still live — stop rather than
      // evict something in use. The bound becomes best-effort in that case,
      // which is the same tradeoff `DecisionCache.ts`'s own bounded mode makes
      // for an entry with a `compute` still in flight.
      if (entry === undefined) break;
      entry.inTracked = false;
      tracked.splice(tracked.indexOf(entry), 1);
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
    decision: (policy) => bare(policy).read,
    decisionFor: (policy, resource) => byResource(policy)(resource).read,
    invalidate,
    // A fresh array of the wrapped questions, so a reader cannot mutate the
    // atom set's own record of what it has been asked (or reach `liveCount`,
    // which is not part of the public `AskedQuestion` shape).
    asked: () => tracked.map((entry) => entry.question),
    gates,
    sweepEvictions,
    // The one place a seed atom is looked up, and it never leaves this closure:
    // `hydrateWith` is handed the lookup, not the atoms.
    hydrate: (dehydrated, hydrateSubject, hydrateOptions) =>
      hydrateWith(
        (policy, resource) =>
          resource === undefined ? bare(policy).seed : byResource(policy)(resource).seed,
        dehydrated,
        hydrateSubject,
        hydrateOptions,
      ),
  };

  return atoms;
};
