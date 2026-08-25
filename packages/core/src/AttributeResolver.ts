/**
 * Resolves subject attributes that are not already on the subject.
 *
 * The evaluator consults the subject's own `attributes` first and calls this
 * service only on a miss, at the node that needs it. The predecessor resolved
 * every attribute in the whole policy tree up front, which destroyed
 * short-circuiting: an `anyOf` whose first branch allowed still paid for every
 * lookup in every other branch.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import type * as Schedule from "effect/Schedule";
import * as Semaphore from "effect/Semaphore";
import type { AttributeResolveError } from "./Errors.ts";
import type { SubjectId } from "./Identity.ts";
import { portRetriesTotal } from "./PortMetrics.ts";
import { wrapService } from "./RetryingLayer.ts";

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
 * Resolves nothing.
 *
 * The default. Policies that reference only attributes already present on the
 * subject need no resolver, and this layer lets them run without one.
 */
export const AttributeResolverNone: Layer.Layer<AttributeResolver> = Layer.succeed(
  AttributeResolver,
  { name: "AttributeResolverNone", resolve: () => Effect.succeed(undefined) },
);

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
 */
export const attributeResolverRetrying =
  (schedule: Schedule.Schedule<unknown, AttributeResolveError>) =>
  (layer: Layer.Layer<AttributeResolver>): Layer.Layer<AttributeResolver> =>
    wrapService(AttributeResolver, layer, (inner) => ({
      // The wrapper names itself around whatever it wrapped, so a panel reports
      // the whole stack rather than losing the base implementation's identity.
      name: `${inner.name ?? "?"} (retrying)`,
      resolve: (subjectId, attribute) =>
        inner
          .resolve(subjectId, attribute)
          .pipe(
            Effect.tapError(() => Metric.update(portRetriesTotal, "AttributeResolver")),
            Effect.retry(schedule),
          ),
    }));

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
 * Built on `effect/Semaphore` rather than a request-rate limiter: the problem
 * this solves is concurrent in-flight calls, not calls-per-second, and a
 * permit-based bound is the stable, direct tool for that — `effect/Semaphore`
 * is the concurrency primitive; there is no top-level stable rate limiter to
 * reach for instead (`effect/unstable/persistence/RateLimiter` exists, but is
 * unstable and shaped for distributed, cross-process quotas, not this).
 *
 * Additive, like {@link attributeResolverRetrying}: a caller who does not
 * reach for this sees no change.
 */
export const attributeResolverBounded =
  (permits: number) =>
  (layer: Layer.Layer<AttributeResolver>): Layer.Layer<AttributeResolver> =>
    Layer.effect(
      AttributeResolver,
      Effect.gen(function* () {
        const semaphore = yield* Semaphore.make(permits);
        const inner = yield* Layer.build(layer).pipe(
          Effect.map((context) => Context.get(context, AttributeResolver)),
        );
        return {
          name: `${inner.name ?? "?"} (bounded ${permits})`,
          resolve: (subjectId, attribute) =>
            Semaphore.withPermit(semaphore)(inner.resolve(subjectId, attribute)),
        };
      }),
    );
