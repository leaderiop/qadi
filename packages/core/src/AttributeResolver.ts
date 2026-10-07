/**
 * Resolves subject attributes that are not already on the subject.
 *
 * The evaluator consults the subject's own `attributes` first and calls this
 * service only on a miss, at the node that needs it. The predecessor resolved
 * every attribute in the whole policy tree up front, which destroyed
 * short-circuiting: an `anyOf` whose first branch allowed still paid for every
 * lookup in every other branch.
 */
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import type * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import { AttributeResolveError } from "./Errors.ts";
import type { InvalidBoundedPermits } from "./Errors.ts";
import type { SubjectId } from "./Identity.ts";
import { boundedPort, nonePort, retryingPort, timingOutPort } from "./PortDerivation.ts";
import type { PortDescription } from "./PortDescription.ts";
import { sharedQuestionFields, sharedQuestionKeys, spanStruct } from "./PortSpanEncode.ts";

export interface AttributeResolverShape {
  /**
   * Which implementation this is — `"AttributeResolverNone"`, a caller's own
   * label, absent if it says nothing.
   *
   * **Nothing branches on it, and nothing may.** A service value is an anonymous
   * object literal, so the only way to tell a fail-closed default from a real
   * store was to call it and infer from the answer — which meant a wiring panel
   * could not report what was wired, and an operator debugging "everything
   * denies" had no way to see that `AttributeResolverNone` was in place. This is
   * a label a reader sees, in the same category as `StoredRecord.environment`,
   * never an input to a decision.
   */
  readonly name?: string | undefined;
  /**
   * Resolves an attribute for the given subject.
   *
   * Returning `undefined` means "no value", which is a legitimate answer and
   * will simply fail the matcher. Failing the Effect means the lookup itself
   * broke, which propagates as an evaluation error rather than a denial.
   *
   * An implementation is not required to fail cleanly. `PortAccess.ts`'s
   * `readAttribute` — the one place either interpreter reads this port —
   * catches a defect from this call — a throw, a rejected
   * promise lifted through `Effect.tryPromise`, an `Effect.die` — and
   * converts it into this same `AttributeResolveError`, so a caller wrapping
   * `evaluate` or `toPredicate` in `Effect.retry` sees a typed, retryable
   * failure either way (issue #100). An implementation that already fails with
   * `AttributeResolveError` pays nothing extra for this; one that dies
   * instead is no longer a silent gap in that guarantee.
   *
   * `subjectId` is an arbitrary id, not implicitly `CurrentSubject`'s own
   * (JF-03) — `PortAccess.ts`'s `readAttribute`, the one call site both
   * `Evaluate.ts` and `Predicate.ts` reach this through, always passes the
   * subject being evaluated, so neither interpreter ever asks about anyone else, but the
   * parameter's width is real and belongs to a different consumer:
   * `@qadi/devtools`'s capture/sweep tooling resolves attributes for
   * subjects it is not currently evaluating, to pre-populate a simulation. An
   * implementation wired for evaluation must still answer safely for a
   * subject id it did not expect — this Shape does not, and cannot, express
   * "only ever asked about the current subject" as a type.
   */
  readonly resolve: (
    subjectId: SubjectId,
    attribute: string,
  ) => Effect.Effect<unknown, AttributeResolveError>;
}

export class AttributeResolver extends Context.Service<
  AttributeResolver,
  AttributeResolverShape
>()("qadi/AttributeResolver") {
  /** One-step accessor. `use` requires its callback to return an Effect. */
  static readonly resolve = (subjectId: SubjectId, attribute: string) =>
    AttributeResolver.use((r) => r.resolve(subjectId, attribute));
}

/**
 * What the attribute span says (BEH-QD-227).
 *
 * **The value is never recorded** ([INV-QD-044](../../../spec/invariants.md)).
 * `hasActed` and `hasRelationship` answer with closed enums, which are safe to
 * annotate; an attribute resolves to arbitrary data, and a span attribute goes
 * to whatever backend is wired. `qadi.resolved` says a value came back, not what
 * it was, and `disclose` is the only path from a resolved value to a span: its
 * return type cannot carry the value. `undefined` is the absent sentinel every
 * fail-closed default answers with; `null` is a value a store genuinely
 * returned.
 */
const attributeSpan = {
  question: spanStruct(
    { attribute: Schema.optionalKey(Schema.String), ...sharedQuestionFields },
    { attribute: "qadi.attribute", ...sharedQuestionKeys },
  ),
  answer: spanStruct({ resolved: Schema.optionalKey(Schema.Boolean) }, { resolved: "qadi.resolved" }),
  disclose: (value: unknown) => ({ resolved: value !== undefined }),
};

/**
 * The attribute port, described once (`PortDescription.ts`): the wrappers and
 * the default below, `PortAccess.ts`'s defect mapping and span, the doubles
 * (`PortDoubles.ts`) and `@qadi/devtools`' capture/replay all read it.
 *
 * A request is keyed by `(subjectId, attribute)`.
 */
export const attributeResolverPort: PortDescription<
  "AttributeResolver",
  AttributeResolver,
  AttributeResolverShape,
  [subjectId: SubjectId, attribute: string],
  unknown,
  AttributeResolveError,
  typeof attributeSpan
> = {
  port: "AttributeResolver",
  method: "resolve",
  span: "qadi.attribute",
  attributes: attributeSpan,
  service: AttributeResolver,
  invoke: (shape) => (subjectId, attribute) => shape.resolve(subjectId, attribute),
  make: (name, call) => ({ name, resolve: call }),
  failure: ([, attribute], cause) => new AttributeResolveError({ attribute, cause }),
  defect: ([, attribute], cause) =>
    new AttributeResolveError({ attribute, cause: Cause.squash(cause) }),
  key: ([subjectId, attribute]) => JSON.stringify([subjectId, attribute]),
  none: { name: "AttributeResolverNone", answer: undefined },
};

/**
 * Resolves nothing.
 *
 * The default. Policies that reference only attributes already present on the
 * subject need no resolver, and this layer lets them run without one. Derived
 * from {@link attributeResolverPort}'s `none` (ADR-QD-040): it answers
 * `undefined` to every request.
 */
export const AttributeResolverNone: Layer.Layer<AttributeResolver> = nonePort(attributeResolverPort);

/** Resolves from a static table. Useful for tests and fixed configuration. */
export const attributeResolverFromRecord = (
  table: Readonly<Record<string, unknown>>,
): Layer.Layer<AttributeResolver> =>
  Layer.succeed(AttributeResolver, {
    name: "attributeResolverFromRecord",
    resolve: (_subjectId, attribute) => Effect.succeed(table[attribute]),
  });

/**
 * Wraps a resolver layer so every `resolve` call retries on
 * `AttributeResolveError` under the given schedule before surfacing it.
 *
 * Additive, not a change to {@link AttributeResolverShape}: a schedule that
 * exhausts still surfaces the same `AttributeResolveError` it always would,
 * just after retrying. Every shipped resolver here is a static in-memory
 * fixture and never fails this way, so nothing needs this today — it exists
 * for the resolver this module's own doc comment anticipates, "backed by a
 * graph database or a remote service", which does.
 *
 * **The attempt count is annotated onto the caller's current span** (KH-01)
 * — `qadi.attempts`, `1` when the first attempt simply succeeds — and failed
 * attempts count in `portRetriesTotal`. Derived from
 * {@link attributeResolverPort} by `PortDerivation.ts`'s `retryingPort`, which
 * says why both exist and why each attempt re-invokes `resolve`.
 */
export const attributeResolverRetrying: (
  schedule: Schedule.Schedule<unknown, AttributeResolveError>,
) => (layer: Layer.Layer<AttributeResolver>) => Layer.Layer<AttributeResolver> =
  retryingPort(attributeResolverPort);

/**
 * Wraps a resolver layer so no more than `permits` calls to `resolve` run at
 * once, queuing the rest.
 *
 * `Qadi.filter`'s `concurrency` option bounds how many *policy evaluations*
 * run in parallel; it says nothing about how many of those evaluations reach
 * this resolver at the same instant, since a single composite policy can fire
 * several `resolve` calls per item. A caller passing `concurrency: "unbounded"`
 * to `filter` over a large collection has no way, short of this, to keep that
 * fan-out from overwhelming whatever store `resolve` is backed by.
 *
 * Rejects `permits <= 0` (and non-integers) at layer construction with
 * `InvalidBoundedPermits`, rather than building a layer that deadlocks every
 * call. Derived from {@link attributeResolverPort} by `PortDerivation.ts`'s
 * `boundedPort`, which says why a semaphore and not a rate limiter.
 */
export const attributeResolverBounded: (
  permits: number,
) => (
  layer: Layer.Layer<AttributeResolver>,
) => Layer.Layer<AttributeResolver, InvalidBoundedPermits> = boundedPort(attributeResolverPort);

/**
 * Wraps a resolver layer so a `resolve` call that does not settle within
 * `duration` fails with a typed `AttributeResolveError` instead of holding
 * its caller open indefinitely (JM-01/WV-01/SP-01), and counts in
 * `portTimeoutsTotal`.
 *
 * A retry schedule only ever fires on a *settled* failure, and a bounded
 * wrapper's permit stays held by a hung call — so this is the wrapper that
 * turns a black-holed store into a failure. Composes with both: put outermost
 * (closest to the caller) so a request that has already exhausted its retries
 * is not then held open a second, unbounded time; put innermost (closest to
 * the real resolver) so each individual attempt, not the whole retried
 * sequence, is what the deadline bounds. Beneath `attributeResolverBounded`, a
 * timed-out call releases its permit like any other failure.
 *
 * `duration` is `Duration.Input` — a plain millisecond number is still valid.
 * Derived from {@link attributeResolverPort} by `PortDerivation.ts`'s
 * `timingOutPort`.
 */
export const attributeResolverTimingOut: (
  duration: Duration.Input,
) => (layer: Layer.Layer<AttributeResolver>) => Layer.Layer<AttributeResolver> =
  timingOutPort(attributeResolverPort);
