/**
 * A Promise-returning facade over `@qadi/core`, for callers who do not use Effect.
 *
 * **There is no evaluation logic in this file, and that is the whole design.** Every
 * method is `runtime.runPromise(coreFunction(...))`. A review that finds a
 * conditional here deciding anything should treat it as a defect rather than a
 * feature ([ADR-QD-032](../../../spec/decisions/032-promise-facade.md)).
 *
 * The predecessor to this library had a synchronous `evaluate` and an
 * `evaluateAsync` that pre-resolved the whole tree before delegating back — which
 * destroyed short-circuiting, made the asynchronous relationship API unreachable, and
 * rotted because nothing exercised the second path. A facade that only forwards
 * cannot repeat that; a facade that decides anything can.
 *
 * A **denial resolves** and a **failure rejects**. That distinction is
 * [INV-QD-006](../../../spec/invariants.md#inv-qd-006-failure-is-not-denial) crossing
 * the boundary, and collapsing it — `try { check() } catch { return false }` — is
 * what turns an attribute-store outage into a silent lockout.
 */
import type {
  AuthSubject,
  CurrentSubject,
  Decision,
  EvaluateOptions,
  EvaluationServices,
  Policy,
  Resource,
} from "@qadi/core";
import {
  assert as assertCore,
  check as checkCore,
  currentSubjectLayer,
  decide as decideCore,
  filter as filterCore,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";

/**
 * The services a facade runtime supplies.
 *
 * `CurrentSubject` is excluded deliberately, exactly as `@qadi/react` excludes it: a
 * login must not rebuild the attribute resolver, and a long-lived runtime holding one
 * subject would be a per-process subject — the wrong shape for a server and a hazard
 * in a multi-tenant one. The subject travels per call instead.
 */
export type QadiLayer = Layer.Layer<Exclude<EvaluationServices, CurrentSubject>>;

export interface Qadi {
  /**
   * `true` when permitted, `false` when denied.
   *
   * **Rejects** when the question could not be answered — a resolver failure, a
   * policy that reads an absent action, a tree past `maxDepth`. A denial is an
   * answer; a broken lookup is not.
   */
  readonly check: (
    subject: AuthSubject,
    policy: Policy,
    options?: EvaluateOptions,
  ) => Promise<boolean>;

  /** The full decision, with its trace, visible fields and obligations. */
  readonly decide: (
    subject: AuthSubject,
    policy: Policy,
    options?: EvaluateOptions,
  ) => Promise<Decision>;

  /**
   * Resolves when permitted; **rejects with `AccessDenied` when not**.
   *
   * The one place a denial is exceptional, because the caller has said "proceed only
   * if permitted".
   */
  readonly assert: (
    subject: AuthSubject,
    policy: Policy,
    options?: EvaluateOptions,
  ) => Promise<void>;

  /** The items the policy admits, in order. */
  readonly filter: <A extends Resource>(
    subject: AuthSubject,
    policy: Policy,
    items: ReadonlyArray<A>,
  ) => Promise<ReadonlyArray<A>>;

  /**
   * Releases everything the layer built.
   *
   * The facade never calls this: closing its own runtime would be guessing at the
   * process lifetime, which is the caller's to know.
   */
  readonly dispose: () => Promise<void>;
}

/**
 * Builds a facade over a runtime that holds the layer's resources once.
 *
 * ```ts
 * const qadi = makeQadi(myLayer);
 * const allowed = await qadi.check(subject, canEdit, { resource: doc });
 * ```
 */
export const makeQadi = (layer: QadiLayer): Qadi => {
  const runtime = ManagedRuntime.make(layer);

  /** The only helper here, and it forwards rather than decides. */
  const run = <A, E>(
    subject: AuthSubject,
    effect: Effect.Effect<A, E, EvaluationServices>,
  ): Promise<A> =>
    runtime.runPromise(Effect.provide(effect, currentSubjectLayer(subject)));

  return {
    check: (subject, policy, options) => run(subject, checkCore(policy, options)),
    decide: (subject, policy, options) => run(subject, decideCore(policy, options)),
    assert: (subject, policy, options) => run(subject, assertCore(policy, options)),
    filter: (subject, policy, items) => run(subject, filterCore(policy, items)),
    dispose: () => runtime.dispose(),
  };
};
