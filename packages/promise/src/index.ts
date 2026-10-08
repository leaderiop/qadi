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
  Decision,
  EvaluateOptions,
  EvaluationServices,
  Policy,
  Resource,
  StandingEvaluationServices,
} from "@qadi/core";
import {
  assert as assertCore,
  check as checkCore,
  CurrentSubject,
  decide as decideCore,
  enforceProjectedLoaded as enforceProjectedLoadedCore,
  filter as filterCore,
  filterProjected as filterProjectedCore,
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
export type QadiLayer = Layer.Layer<StandingEvaluationServices>;

/**
 * What each facade call takes: core's `EvaluateOptions`, plus the one thing the
 * `Promise` boundary adds.
 *
 * `signal` is forwarded, untouched and unread, to the runtime's `runPromise`
 * (the platform's own convention, as in `fetch(url, { signal })`). Aborting it
 * interrupts the fibre running the call: work underway stops, and the promise
 * **rejects** with the runtime's interruption error (today
 * `Error("All fibers interrupted without error")`), not with `signal.reason` —
 * mapping it would need a branch here, which this facade does not have
 * ([ADR-QD-032](../../../spec/decisions/032-promise-facade.md), BEH-QD-169).
 * A signal aborted before the call starts rejects without running any lookup.
 * `signal` is not passed on to `@qadi/core`'s options.
 */
export interface FacadeOptions extends EvaluateOptions {
  readonly signal?: AbortSignal | undefined;
}

export interface Qadi {
  /**
   * `true` when permitted, `false` when denied.
   *
   * **Rejects** when the question could not be answered — a resolver failure, a
   * policy that reads an absent action, a tree past `maxDepth`. A denial is an
   * answer; a broken lookup is not.
   *
   * A boolean has no room for an obligation: a policy carrying one resolves
   * `true` with the obligation silently undischarged, the same caveat core's
   * own `check` carries. There is no `onObligations` on this facade at all —
   * every method here takes `EvaluateOptions` (plus `signal`, below), never core's
   * `EnforceOptions` that adds it. `assert`/`filter` below still discharge
   * through core's own `assert`/`filter` (which default `onObligations` to
   * undefined) and so can reject `UndischargedObligation`, but nothing on
   * this facade can supply the handler that would let one succeed instead. A
   * caller whose policies carry obligations needs `@qadi/core` directly.
   */
  readonly check: (
    subject: AuthSubject,
    policy: Policy,
    options?: FacadeOptions,
  ) => Promise<boolean>;

  /** The full decision, with its trace, visible fields and obligations. */
  readonly decide: (
    subject: AuthSubject,
    policy: Policy,
    options?: FacadeOptions,
  ) => Promise<Decision>;

  /**
   * Resolves when permitted; **rejects with `AccessDenied` when not**.
   *
   * The one place a denial is exceptional, because the caller has said "proceed only
   * if permitted".
   *
   * Also rejects with `UndischargedObligation` for an allow carrying a
   * **binding** obligation — see `check`'s note on obligations above. There is
   * no way to supply a handler through this facade, so a binding obligation
   * always rejects here; an allow with only advisory obligations still
   * resolves, since advice never blocks.
   *
   * **The rejection carries the full evaluation trace.** `AccessDenied`'s
   * fields — `subjectId`, `policyTag`, `reason`, and the whole `Trace` — are
   * exactly what `Errors.ts`'s own doc comment says "belongs in a log or a
   * test failure, not in a response body" (AS-06). This facade cannot see
   * where its caller's `catch`/`.catch()` sends a rejected error, and unlike
   * `@qadi/http` (which redacts a denial's trace before it reaches a
   * response) nothing here redacts on the caller's behalf — a review finding
   * a conditional here should treat it as a defect (see this file's own
   * header). A caller forwarding this rejection to a browser bundle, a
   * client-visible error, or an error-reporting SDK is forwarding the trace
   * too, and is responsible for projecting it down first (`decide`'s
   * `Decision` gives the tag-only shape to project from).
   */
  readonly assert: (
    subject: AuthSubject,
    policy: Policy,
    options?: FacadeOptions,
  ) => Promise<void>;

  /**
   * The items the policy admits, in order.
   *
   * Same obligation caveat as `assert`: an item whose policy allows but carries
   * a binding obligation makes the whole call reject with
   * `UndischargedObligation`, since no handler can be supplied here.
   *
   * `options.concurrency` reaches core's own `filter` unchanged, the same as
   * any other option here — a Promise consumer filtering many items is not
   * forced into sequential resolution.
   */
  readonly filter: <A extends Resource>(
    subject: AuthSubject,
    policy: Policy,
    items: ReadonlyArray<A>,
    options?: FacadeOptions,
  ) => Promise<ReadonlyArray<A>>;

  /**
   * The record, projected to the fields the policy lets this subject see.
   *
   * **The record is the resource: the decision sees exactly what is returned.**
   * `options.resource` does not exist here (it is `Omit`ted), so a policy that
   * reads the resource — `hasResourceAttribute`, `hasRelationship`, a custom
   * predicate — decides against the very record that comes back projected,
   * never against a second one the caller restated beside it (INV-QD-108).
   *
   * **Rejects with `AccessDenied` when not permitted** (the record is not
   * handed over), and with `UndischargedObligation` for an allow carrying a
   * binding obligation — the same caveats `assert` carries, including the
   * full evaluation trace on the rejection.
   */
  readonly projected: <A extends Resource>(
    subject: AuthSubject,
    policy: Policy,
    record: A,
    options?: Omit<FacadeOptions, "resource">,
  ) => Promise<Partial<A>>;

  /**
   * The items the policy admits, in order, each projected by its own decision.
   *
   * {@link Qadi.filter} with field-level projection: `filter` returns admitted
   * items whole and ignores an allow's field restriction, this does not. Same
   * obligation caveat as `filter`, and `options.concurrency` reaches core
   * unchanged.
   */
  readonly filterProjected: <A extends Resource>(
    subject: AuthSubject,
    policy: Policy,
    items: ReadonlyArray<A>,
    options?: FacadeOptions,
  ) => Promise<ReadonlyArray<Partial<A>>>;

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
 *
 * **Cancellation crosses this boundary by `options.signal`** (AN-03, ARCH-45).
 * Every method forwards `{ signal }` to `runtime.runPromise` and decides
 * nothing about it: aborting stops the work underway (a `filter` over a large
 * collection issues no further lookups) and the promise rejects with the
 * runtime's interruption error. A caller who wants more control than one signal
 * per call can still reach for `@qadi/core` directly and drive the `Effect`
 * with `Effect.runFork` plus its own interruption.
 */
export const makeQadi = (layer: QadiLayer): Qadi => {
  const runtime = ManagedRuntime.make(layer);

  /** The only helper here, and it forwards rather than decides. */
  const run = <A, E>(
    subject: AuthSubject,
    effect: Effect.Effect<A, E, EvaluationServices>,
    signal: AbortSignal | undefined,
  ): Promise<A> =>
    runtime.runPromise(Effect.provideService(effect, CurrentSubject, subject), { signal });

  return {
    check: (subject, policy, { signal, ...options } = {}) =>
      run(subject, checkCore(policy, options), signal),
    decide: (subject, policy, { signal, ...options } = {}) =>
      run(subject, decideCore(policy, options), signal),
    assert: (subject, policy, { signal, ...options } = {}) =>
      run(subject, assertCore(policy, options), signal),
    filter: (subject, policy, items, { signal, ...options } = {}) =>
      run(subject, filterCore(policy, items, options), signal),
    projected: (subject, policy, record, { signal, ...options } = {}) =>
      run(subject, enforceProjectedLoadedCore(policy, options)(Effect.succeed(record)), signal),
    filterProjected: (subject, policy, items, { signal, ...options } = {}) =>
      run(subject, filterProjectedCore(policy, items, options), signal),
    dispose: () => runtime.dispose(),
  };
};
