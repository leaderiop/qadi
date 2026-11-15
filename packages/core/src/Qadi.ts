/**
 * Enforcement.
 *
 * `enforce` is an aspect: it wraps any Effect and fails it with
 * {@link AccessDenied} when the policy denies. The predecessor documented its
 * enforcement as an adapter wrapper that ran at resolution time, but it was
 * really an eight-argument function you had to remember to call. Here the
 * subject, resolvers and identifier generator all travel in the environment, so
 * the call site is `handler.pipe(Qadi.enforce(canEdit))`.
 *
 * The line that divides this module is **reporting versus enforcing**.
 * `decide` and `check` report: they hand back an answer and run nothing, so an
 * obligation they cannot discharge is the caller's to read off the decision.
 * `assert`, `enforce`, `enforceProjected`, `enforceLoaded`,
 * `enforceProjectedLoaded`, `guard`, `filter`, `filterStream`, `filterProjected`
 * and `filterStreamProjected` enforce: each either runs work or hands over data, so each must refuse an
 * allow whose obligation nobody has met (ADR-QD-019). The ten are adapters over the
 * package-private `Handover.ts`, which holds the rule they share.
 */
import * as Brand from "effect/Brand";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as Stream from "effect/Stream";
import type { Authorized } from "./Authorized.ts";
import type { Allow, Decision, Deny } from "./Decision.ts";
import { isAllowed } from "./Decision.ts";
import { AccessDenied } from "./Errors.ts";
import type { UndischargedObligation } from "./Errors.ts";
import type { EnforcementError, EvaluationError } from "./Errors.ts";
import { evaluate } from "./Evaluate.ts";
import type { EvaluationServices } from "./EvaluationServices.ts";
import { RELEASE, decidedOn, handOver, isAdmitted, resourceFree, verdictOf } from "./Handover.ts";
import type { EnforceOptions, HandoverOptions } from "./Handover.ts";
import type { Permission } from "./Permission.ts";
import type { Policy } from "./Policy.ts";
import type { EvaluateOptions } from "./Question.ts";
import type { Resource } from "./Resource.ts";

export type { EnforceOptions, HandoverOptions, ObligationDischarge, ObligationHandler } from "./Handover.ts";

/** The one place a denial becomes an {@link AccessDenied}. */
const accessDenied = (policy: Policy, decision: Deny): AccessDenied =>
  new AccessDenied({
    subjectId: decision.subjectId,
    policyTag: policy._tag,
    reason: decision.reason,
    trace: decision.trace,
  });

/**
 * What a refusal means to the effect shapes: fail with AccessDenied.
 *
 * The verdict itself, and the discharge an allow owes, are `Handover.ts`'s.
 */
const admittedOrDenied = <E = never, R = never>(
  policy: Policy,
  options: EnforceOptions<E, R> | undefined,
): Effect.Effect<Allow, EnforcementError | E, EvaluationServices | R> =>
  Effect.flatMap(verdictOf(policy, options), (verdict) =>
    isAdmitted(verdict)
      ? Effect.succeed(verdict.decision)
      : Effect.fail(accessDenied(policy, verdict.decision)),
  );

/**
 * Evaluates a policy and returns the full decision, including its trace.
 *
 * Reports rather than enforces: any obligations are on the decision for the
 * caller to discharge, and nothing here checks that they did.
 */
export const decide = (
  policy: Policy,
  options?: EvaluateOptions,
): Effect.Effect<Decision, EvaluationError, EvaluationServices> =>
  evaluate(policy, options);

/**
 * Evaluates a policy down to a boolean.
 *
 * Reports rather than enforces, and a boolean has no room for an obligation —
 * so a policy carrying one should not be asked this question. Use `decide`.
 */
export const check = (
  policy: Policy,
  options?: EvaluateOptions,
): Effect.Effect<boolean, EvaluationError, EvaluationServices> =>
  Effect.map(evaluate(policy, options), isAllowed);

/**
 * Fails with {@link AccessDenied} unless the policy allows.
 *
 * Useful as a standalone precondition when there is no effect to wrap.
 *
 * Keeps `EnforceOptions` and so `options.resource`: it hands over no value, so a
 * policy that reads a resource reads it from there (ADR-QD-104).
 */
export const assert = <E = never, R = never>(
  policy: Policy,
  options?: EnforceOptions<E, R>,
): Effect.Effect<void, EnforcementError | E, EvaluationServices | R> =>
  Effect.asVoid(admittedOrDenied(policy, options));

/**
 * Guards an effect with a policy.
 *
 * The wrapped effect runs only if the policy allows *and* its obligations have
 * been discharged; otherwise the result fails and the effect is never started.
 *
 * @example
 * ```ts
 * const handler = updateDocument(id).pipe(Qadi.enforce(canEditDocument))
 * ```
 *
 * Keeps `EnforceOptions` and so `options.resource`: the wrapped work's result is
 * not a resource, so nothing is handed over to decide on, and a policy that
 * reads a resource reads it from there (ADR-QD-104).
 */
export const enforce =
  <EO = never, RO = never>(policy: Policy, options?: EnforceOptions<EO, RO>) =>
  <A, E, R>(
    self: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E | EnforcementError | EO, R | EvaluationServices | RO> =>
    Effect.flatMap(admittedOrDenied(policy, options), () => self);

/**
 * Guards an effect with a resource-free decision and projects its result down to the visible fields.
 *
 * This is where field-level authorization earns its keep: the policy decides
 * both *whether* the caller may read the record and *which* of its fields come
 * back, in one pass.
 *
 * The decision is taken before `self` runs, so it can see no resource: a policy
 * that reads one (`hasResourceAttribute`, `hasRelationship`) fails closed with
 * `MissingResource`, and a custom predicate is handed none. A policy that reads
 * the record belongs on {@link enforceProjectedLoaded}, which decides against the
 * value it projects. `options` is {@link HandoverOptions}, which refuses
 * `resource`, and a `resource` an untyped caller passes anyway is dropped, so the
 * decision is taken with none: it was a second channel, evaluated against one
 * record while `self`'s value, a possibly different one, was projected under that
 * decision's field visibility (ADR-QD-104, INV-QD-108; the same defect `guard` closed under
 * [INV-QD-032](../../../spec/invariants.md#inv-qd-032-a-guarded-resource-is-the-evaluated-resource)).
 *
 * **The return type is optimistic for a `"*"`-projected nested object** — see
 * `Decision.ts`'s `project`, which this delegates to, for the caveat.
 */
export const enforceProjected =
  <EO = never, RO = never>(policy: Policy, options?: HandoverOptions<EO, RO>) =>
  <A extends Resource, E, R>(
    self: Effect.Effect<A, E, R>,
  ): Effect.Effect<
    Partial<A>,
    E | EnforcementError | EO,
    R | EvaluationServices | RO
  > =>
    Effect.flatMap(admittedOrDenied(policy, resourceFree(options)), (decision) =>
      Effect.map(self, (value) => RELEASE.Projected(decision, value)),
    );

/**
 * Guards a loaded value with a policy evaluated against that value, and passes it through.
 *
 * The effect-shaped sibling of {@link enforce} for a read: `self` produces the
 * record, and the policy is evaluated with *that record* as its resource, so a
 * policy that reads the resource (`hasResourceAttribute`, `hasRelationship`,
 * a custom predicate) sees what it is deciding about. On a denial the loaded
 * value is never handed over.
 *
 * **The loader runs before the decision** — it is the decision's input, as
 * `authorizeRequest`'s `loadResource` is — so `enforce`'s "the wrapped effect
 * never runs" does not hold here; the guarantee is "the loaded value is never
 * handed over" (ADR-QD-011, as amended by ADR-QD-104). A loader failure
 * surfaces before any evaluation: no decision, no record. The loader should be
 * a read with no side effects that matter on a denial, and its failure reveals
 * existence to a caller who would have been denied. To keep a caller with no
 * access at all from reaching the loader, gate it with a resource-free policy
 * first: `load.pipe(enforce(canReadAny), enforceLoaded(isOwner))`.
 *
 * `options` is {@link HandoverOptions}, which refuses `resource`: the resource is
 * the loaded value, and a second one is the two-channel hazard INV-QD-108 closes.
 */
export const enforceLoaded =
  <EO = never, RO = never>(policy: Policy, options?: HandoverOptions<EO, RO>) =>
  <A extends Resource, E, R>(
    self: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E | EnforcementError | EO, R | EvaluationServices | RO> =>
    Effect.flatMap(self, (value) =>
      Effect.map(admittedOrDenied(policy, decidedOn(options, value)), (decision) =>
        RELEASE.Whole(decision, value),
      ),
    );

/**
 * Guards a loaded value with a policy evaluated against that value, and projects it.
 *
 * {@link enforceLoaded} with field-level projection: the policy decides whether
 * the caller may read the record *and* which of its fields come back, and the
 * resource it decides on is the very value that is projected. A projected read
 * decides against the value it projects (INV-QD-108).
 *
 * The loader runs first and a denial hands nothing over; see {@link enforceLoaded}
 * for what that means for loader side effects and the coarse-gate composition.
 * The return type is as optimistic as {@link enforceProjected}'s for a
 * `"*"`-projected nested object — see `Decision.ts`'s `project`.
 */
export const enforceProjectedLoaded =
  <EO = never, RO = never>(policy: Policy, options?: HandoverOptions<EO, RO>) =>
  <A extends Resource, E, R>(
    self: Effect.Effect<A, E, R>,
  ): Effect.Effect<Partial<A>, E | EnforcementError | EO, R | EvaluationServices | RO> =>
    Effect.flatMap(self, (value) =>
      Effect.map(admittedOrDenied(policy, decidedOn(options, value)), (decision) =>
        RELEASE.Projected(decision, value),
      ),
    );

/**
 * Guards a resource-scoped handler with a policy, and hands the handler a
 * witness that the check succeeded.
 *
 * Shares `enforce`'s handover module (`Handover.ts`) and so its obligation
 * discharge and denial handling, and is not written over `enforce`. Differs
 * from `enforce` in shape: rather than wrapping an existing effect, it takes a
 * resource and a handler *function*, and passes the resulting witness to the
 * handler as a value rather than through the environment. Per-permission distinctness falls out of `permission` being a
 * real field on {@link Authorized}, not out of `Context`'s runtime tag
 * identity — a per-permission `Context.Service` registry was tried first and
 * rejected for needing an unsound cast at retrieval (ADR-QD-035).
 *
 * **`resource` is what the policy is evaluated against**, as well as what the
 * handler receives. It was previously only the latter: `enforce(policy,
 * options)` ran with `options.resource`, which every caller left unset, so a
 * resource-scoped policy was evaluated with no resource at all. A matcher
 * comparing against an absent resource does not deny — `neq` on `undefined` is
 * *true* — so a policy written to refuse a mismatched tenant allowed one
 * ([INV-QD-032](../../../spec/invariants.md#inv-qd-032-a-guarded-resource-is-the-evaluated-resource)).
 *
 * A second resource cannot be written (`HandoverOptions`), the positional
 * resource is the one evaluated, and an untyped caller's resource is dropped at
 * runtime, so the handler, the witness and the evaluation cannot disagree about
 * which resource was checked (INV-QD-032).
 *
 * **The handler is invoked to build its description before the policy is
 * checked (BS-05, ED-05, EM-05).** `handler(witness, resource)` runs eagerly,
 * as any argument to an `Effect` combinator does — but that only constructs
 * the *description* of the guarded effect; nothing it describes executes
 * until the handover module's `flatMap` runs it, which happens only after the
 * policy has allowed and its obligations are discharged. The witness is
 * therefore an inert value at construction time, observable only from inside
 * the handler's own body once it runs. A handler
 * written as an idiomatic pure effect description is unaffected by this; one
 * that performs work in its function body *before* returning an `Effect` runs
 * that work unconditionally — on both the allow and the deny path — so
 * handlers should describe work, not perform it, up to the point they return.
 *
 * **The witness is forgeable in principle, not just in practice (PW-04,
 * RH-02).** `Brand.nominal` is `effect/Brand`'s own public export, so nothing
 * in the type system stops other code from minting an `Authorized<P>` the
 * same way this function does, for a permission it was never granted.
 * {@link Authorized}'s "produced only by `Qadi.guard`" is a documented
 * convention this module happens to follow, not a runtime guarantee the type
 * enforces. What actually gates the protected work is the handover module
 * checking the policy on every call, not possession of the witness — so a
 * forged witness fabricates a value, not authority: the guarded effect still
 * only runs once the handover module admits it.
 */
export const guard =
  <P extends Permission, EO = never, RO = never>(
    permission: P,
    policy: Policy,
    options?: HandoverOptions<EO, RO>,
  ) =>
  <A extends Resource, B, E, R>(
    resource: A,
    handler: (authorized: Authorized<P>, resource: A) => Effect.Effect<B, E, R>,
  ): Effect.Effect<B, E | EnforcementError | EO, R | EvaluationServices | RO> =>
  {
    const work = handler(Brand.nominal<Authorized<P>>()({ permission }), resource);
    return Effect.flatMap(admittedOrDenied(policy, decidedOn(options, resource)), () => work);
  };

/**
 * The values an array collection kept, in input order, in one pass (BS-04): the
 * streamed forms never materialize an intermediate array, and neither do these.
 */
const keptInOrder = <B>(results: ReadonlyArray<Result.Result<B, void>>): ReadonlyArray<B> => {
  const kept: Array<B> = [];
  for (const result of results) {
    if (Result.isSuccess(result)) kept.push(result.success);
  }
  return kept;
};

/**
 * Keeps only the elements a policy allows, evaluated per element as resource.
 *
 * Enforces rather than reports, because it hands back data. An element whose
 * allow carries a binding obligation fails the call rather than being silently
 * dropped: dropping it would report a wiring mistake as a denial, which
 * [INV-QD-006] exists to prevent.
 *
 * **Decides which items, never which fields.** The admitted items come back
 * whole: an allow's `visibleFields` are not applied, so a field-restricting
 * policy's withheld fields are returned on every admitted item (BEH-QD-050).
 * `toPredicate` refuses such a policy for the same reason (ADR-QD-024).
 *
 * `options.concurrency` does double duty here, deliberately: it still governs
 * each item's own `allOf`/`anyOf`/`rules` fan-out exactly as `EvaluateOptions`
 * documents, and it now also governs the fan-out **across items**. The two are
 * safe to share one knob because, unlike a composite's children, the items
 * have no short-circuit relationship — nothing here ever depends on which
 * item finished first, so there is no INV-QD-005-shaped invariant a second,
 * independent option would need to preserve.
 *
 * A second resource cannot be written (`HandoverOptions`): every item is the
 * resource of its own decision.
 *
 * **Not given `SubjectSet.ts`'s `decideSubjects`/`filterSubjects` partition
 * treatment, deliberately (JA-04).** Those report: a subject-set review has no
 * permission being exercised and nothing discharged, so one subject's
 * `EvaluationError` can be split into `failures` and the batch's other rows
 * kept. This function enforces: by the time an item is known to be allowed,
 * `handOver` (`Handover.ts`) has already discharged its obligations (an audit
 * write, a notification) below, so a later item's `EvaluationError` failing the whole
 * call is the only option that does not pair an already-fired side effect
 * with a return value — "the items the policy admits" — that never actually
 * admitted it.
 */
export const filter = <A extends Resource, EO = never, RO = never>(
  policy: Policy,
  items: ReadonlyArray<A>,
  options?: HandoverOptions<EO, RO>,
): Effect.Effect<
  ReadonlyArray<A>,
  EvaluationError | UndischargedObligation | EO,
  EvaluationServices | RO
> =>
  Effect.map(
    Effect.forEach(items, (item) => handOver(policy, item, options, RELEASE.Whole), {
      concurrency: options?.concurrency,
    }),
    keptInOrder,
  );

/**
 * The streamed sibling of `filter`, for a collection too large to hold in
 * memory as a `ReadonlyArray` — or too large to wait on in full before the
 * first admitted item can be used.
 *
 * Additive: `filter` is unchanged and stays the default, least-surprising
 * entry point for the common case of "a collection I already have in hand".
 * Reach for this one when `items` is itself a stream — paginated rows from a
 * database, say — and the caller wants to start consuming admitted items as
 * they're decided rather than after every one has been.
 *
 * Shares `handOver` (`Handover.ts`) with `filter`, so the two can never disagree
 * about who passes. A second resource cannot be written (`HandoverOptions`).
 * `options.concurrency` does the same double duty documented on
 * `filter` — bounding both this stream's own fan-out and each item's
 * `allOf`/`anyOf`/`rules` fan-out — for the same reason: nothing here depends
 * on which item is decided first, so there is no short-circuit invariant a
 * second, independent knob would need to preserve.
 */
export const filterStream = <A extends Resource, E2 = never, R2 = never, EO = never, RO = never>(
  policy: Policy,
  items: Stream.Stream<A, E2, R2>,
  options?: HandoverOptions<EO, RO>,
): Stream.Stream<
  A,
  EvaluationError | UndischargedObligation | EO | E2,
  EvaluationServices | RO | R2
> =>
  items.pipe(
    Stream.mapEffect((item) => handOver(policy, item, options, RELEASE.Whole), {
      concurrency: options?.concurrency,
    }),
    Stream.filterMap((result) => result),
  );

/**
 * Keeps only the elements a policy allows, each projected by its own decision.
 *
 * {@link filter} with field-level projection: every admitted item is the
 * resource of its own evaluation, and comes back narrowed to the `visibleFields`
 * of that evaluation's allow, so a field-restricting policy's withheld fields
 * never reach the caller. Items are admitted, dropped, discharged and ordered
 * exactly as `filter` does it — the two share `handOver` (`Handover.ts`) and
 * cannot disagree about who passes; only the shape of what an admitted item
 * comes back as differs (BEH-QD-050). A second resource cannot be written
 * (`HandoverOptions`): every item is the resource of its own decision.
 */
export const filterProjected = <A extends Resource, EO = never, RO = never>(
  policy: Policy,
  items: ReadonlyArray<A>,
  options?: HandoverOptions<EO, RO>,
): Effect.Effect<
  ReadonlyArray<Partial<A>>,
  EvaluationError | UndischargedObligation | EO,
  EvaluationServices | RO
> =>
  Effect.map(
    Effect.forEach(items, (item) => handOver(policy, item, options, RELEASE.Projected), {
      concurrency: options?.concurrency,
    }),
    keptInOrder,
  );

/**
 * The streamed sibling of {@link filterProjected}: admitted items, each
 * projected by its own decision, as they are decided.
 *
 * Shares `handOver` (`Handover.ts`) with `filterProjected` and `filter`, so all
 * of them agree about who passes, and carries `filterStream`'s
 * `options.concurrency` double duty for the same reason. A second resource
 * cannot be written (`HandoverOptions`).
 */
export const filterStreamProjected = <
  A extends Resource,
  E2 = never,
  R2 = never,
  EO = never,
  RO = never,
>(
  policy: Policy,
  items: Stream.Stream<A, E2, R2>,
  options?: HandoverOptions<EO, RO>,
): Stream.Stream<
  Partial<A>,
  EvaluationError | UndischargedObligation | EO | E2,
  EvaluationServices | RO | R2
> =>
  items.pipe(
    Stream.mapEffect((item) => handOver(policy, item, options, RELEASE.Projected), {
      concurrency: options?.concurrency,
    }),
    Stream.filterMap((result) => result),
  );
