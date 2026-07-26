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
import { currentSubjectLayer, evaluate } from "@qadi/core";
import * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import type * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import * as Reactivity from "effect/unstable/reactivity/Reactivity";

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
}

/**
 * Builds the atom set for one authorization context.
 *
 * Call this once per context, at module scope. An application that serves
 * several tenants in one process calls it once per tenant; the atoms are
 * distinct objects, so their decisions cannot be confused for one another.
 */
export const makeQadiAtoms = (layer: QadiLayer): QadiAtoms => {
  const runtime = Atom.runtime(layer);
  const subject = Atom.make<AuthSubject | undefined>(undefined);

  const decisionAtom = (
    policy: Policy,
    resource: Resource | undefined,
  ): Atom.Atom<DecisionResult> =>
    runtime
      .atom((get): Effect.Effect<Decision, EvaluationError, QadiRuntimeServices> => {
        const current = get(subject);
        // No subject yet is not a denial — it is an unanswerable question. An
        // effect that never settles leaves the atom `Initial`, which is exactly
        // "still loading". Returning a Deny here would render every guarded
        // control as forbidden for the first frame after a page load.
        if (current === undefined) return Effect.never;
        return evaluate(policy, resource === undefined ? undefined : { resource }).pipe(
          Effect.provide(currentSubjectLayer(current)),
        );
      })
      .pipe(runtime.factory.withReactivity([DECISIONS_KEY]));

  // `Atom.family` memoises on the argument, so every component asking the same
  // question shares one evaluation. It keys **structurally** — the family holds
  // a `MutableHashMap`, which compares with `Equal.equals` — so two separately
  // constructed but equal policies share one atom, and sharing survives a policy
  // built inline in render. Hoisting to module scope is still worth doing, but
  // for hashing cost rather than for correctness: the hash is cached per object,
  // so a fresh object each render re-walks the whole policy tree.
  // `v4-reactivity-smoke.test.ts` pins this; a bump to reference keying would
  // silently stop inline policies sharing.
  const decision = Atom.family((policy: Policy) => decisionAtom(policy, undefined));

  const decisionByResource = Atom.family((policy: Policy) =>
    Atom.family((resource: Resource) => decisionAtom(policy, resource)),
  );

  const invalidate = runtime.fn((_: void) => Reactivity.invalidate([DECISIONS_KEY]));

  return {
    runtime,
    subject,
    decision,
    decisionFor: (policy, resource) => decisionByResource(policy)(resource),
    invalidate,
  };
};
