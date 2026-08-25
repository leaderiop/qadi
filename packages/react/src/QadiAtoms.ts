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
  CurrentSubject,
  Decision,
  EvaluationError,
  EvaluationServices,
  Policy,
  Resource,
} from "@qadi/core";
import { currentSubjectLayer, DecisionCache, evaluate } from "@qadi/core";
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
   * the registry exposes `subscribe`/`snapshot` and it is `@qadi/devtools` that
   * subscribes. What the argument above actually establishes is that the *atom
   * layer* cannot see instances, which is true and is why this screen is keyed
   * by question. A component knows perfectly well that it exists; nothing was
   * asking it (CCR-QD-073, corrected here in CCR-QD-076).
   *
   * Read the current verdict for each with `decision`/`decisionFor` — that is
   * what keeps a stale entry rendering as re-checking rather than as its old
   * answer (ADR-QD-017).
   */
  readonly asked: () => ReadonlyArray<AskedQuestion>;
}

/** One question an atom set has been asked. */
export interface AskedQuestion {
  readonly policy: Policy;
  /** Absent when the question was asked with no resource in scope. */
  readonly resource?: Resource | undefined;
}

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
}

export const makeQadiAtoms = (
  layer: QadiLayer,
  options?: QadiAtomsOptions,
): QadiAtoms => {
  const runtime = Atom.runtime(layer);
  const subject = Atom.make<AuthSubject | undefined>(undefined);
  const report = hydrationMismatchReporter(options?.onHydrationMismatch);

  const seededDecision = (
    policy: Policy,
    resource: Resource | undefined,
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
        }).pipe(Effect.provide(currentSubjectLayer(current)));
      })
      .pipe(runtime.factory.withReactivity([DECISIONS_KEY]));

    // Announced once per question, the first time this client answers it for
    // itself. A closure flag rather than a read of the atom's own previous
    // value: `seededDecision` runs once per `Atom.family` key, so the flag
    // outlives every read of `combined` — and it absorbs StrictMode's double
    // render, which a value comparison would report twice.
    let announced = false;

    /**
     * The seed, as this atom first saw it.
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
    let observedSeed: Decision | undefined;

    const combined = Atom.readable((get): DecisionResult => {
      const result = get(computed);
      // `Initial` is the only state in which this client has never answered for
      // itself. The moment it has — allow, deny or failure — that answer is
      // authoritative and the seed is spent. That includes while a *later*
      // re-check is in flight: a re-checking result already carries its own
      // previous decision, and falling back to the seed there would resurrect
      // something older still.
      if (!AsyncResult.isInitial(result)) {
        if (!announced) {
          announced = true;
          // `get.once`, not `get`. This block previously ran only when a
          // reporter was wired, and was guarded that way so an atom set without
          // one "reads exactly the atoms it read before — no reporter, no added
          // dependency, no change". Counting must happen whether or not a
          // reporter is wired, so the guard could not stay; `get.once` keeps the
          // promise it was protecting, because it registers no dependency. It is
          // also the honest read here: the seed is already spent in this branch,
          // so re-running on a later seed change could not change the answer.
          // `?? observedSeed`: the registry's copy is authoritative when it has
          // one, and the first reading stands in when it has dropped it.
          const seeded = get.once(seed) ?? observedSeed;
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
      if (seeded !== undefined) observedSeed = seeded;
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
  // constructor again and cannot double-count.
  const asked: Array<AskedQuestion> = [];

  const bare = Atom.family((policy: Policy) => {
    asked.push({ policy });
    return seededDecision(policy, undefined);
  });

  const byResource = Atom.family((policy: Policy) =>
    Atom.family((resource: Resource) => {
      asked.push({ policy, resource });
      return seededDecision(policy, resource);
    }),
  );

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
    // A copy, so a reader cannot mutate the atom set's own record of what it
    // has been asked.
    asked: () => [...asked],
  };

  registerHydrationSeeds(atoms, (policy, resource) =>
    resource === undefined ? bare(policy).seed : byResource(policy)(resource).seed,
  );

  return atoms;
};
