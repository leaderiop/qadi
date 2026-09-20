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
import type * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Ref from "effect/Ref";
import type * as Schedule from "effect/Schedule";
import * as Semaphore from "effect/Semaphore";
import { AttributeResolveError } from "./Errors.ts";
import { InvalidBoundedPermits } from "./Errors.ts";
import type { SubjectId } from "./Identity.ts";
import { portRetriesTotal, portTimeoutsTotal } from "./PortMetrics.ts";
import { boundedPermits, wrapService, wrapServiceEffect } from "./RetryingLayer.ts";

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
   * An implementation is not required to fail cleanly. `Evaluate.ts`'s
   * `resolveAttribute` catches a defect from this call — a throw, a rejected
   * promise lifted through `Effect.tryPromise`, an `Effect.die` — and
   * converts it into this same `AttributeResolveError`, so a caller wrapping
   * `evaluate` in `Effect.retry` sees a typed, retryable failure either way
   * (issue #100). An implementation that already fails with
   * `AttributeResolveError` pays nothing extra for this; one that dies
   * instead is no longer a silent gap in that guarantee.
   *
   * `subjectId` is an arbitrary id, not implicitly `CurrentSubject`'s own
   * (JF-03) — `Evaluate.ts`'s only call site always passes the subject being
   * evaluated, so evaluation itself never asks about anyone else, but the
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
 *
 * **The attempt count is annotated onto the caller's current span** (KH-01)
 * — `qadi.attempts`, `1` when the first attempt simply succeeds. Without
 * this, `Evaluate.ts`'s `resolveAttribute` opens one `qadi.attempt` span
 * around the whole wrapped call, and every retry this layer performs happens
 * silently inside that one span's duration: a trace reader sees one
 * deceptively slow call rather than the N store round trips that actually
 * happened. `portRetriesTotal` (`PortMetrics.ts`) already counts failed
 * attempts, but as a process-wide aggregate with no correlation back to the
 * request that triggered them — this annotation is the per-call signal that
 * aggregate cannot give. `Effect.ensuring`, not a `tap` on only the success or
 * only the failure path: the count is worth recording whichever way the
 * retried call finally settles, and a finalizer runs either way.
 */
export const attributeResolverRetrying =
  (schedule: Schedule.Schedule<unknown, AttributeResolveError>) =>
  (layer: Layer.Layer<AttributeResolver>): Layer.Layer<AttributeResolver> =>
    wrapService(AttributeResolver, layer, (inner) => ({
      // The wrapper names itself around whatever it wrapped, so a panel reports
      // the whole stack rather than losing the base implementation's identity.
      name: `${inner.name ?? "?"} (retrying)`,
      resolve: (subjectId, attribute) =>
        Effect.gen(function* () {
          const attempts = yield* Ref.make(0);
          // Incremented once per actual invocation of `inner.resolve`, not
          // once per failure — counting failures instead double-counts the
          // exhausting failure, the one `Effect.retry` decides not to retry:
          // `tapError` cannot see that decision, so it always assumed
          // another call was coming. This wraps the real call site instead,
          // so the count is exactly how many times `resolve` actually ran,
          // whether the run this settles on succeeds or the schedule gives up.
          const attempt = Effect.gen(function* () {
            yield* Ref.update(attempts, (n) => n + 1);
            return yield* inner.resolve(subjectId, attribute);
          });
          return yield* attempt.pipe(
            Effect.tapError(() => Metric.update(portRetriesTotal, "AttributeResolver")),
            Effect.retry(schedule),
            Effect.ensuring(
              Effect.flatMap(Ref.get(attempts), (n) =>
                Effect.annotateCurrentSpan({ "qadi.attempts": n }),
              ),
            ),
          );
        }),
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
 *
 * Rejects `permits <= 0` rather than building a layer that deadlocks every
 * call. `Semaphore.make` performs no validation of its own — `SemaphoreImpl`
 * just assigns the field — so with `permits` zero, negative, `NaN` or
 * infinite, `free` is permanently below the `1` every `withPermit` call
 * needs, and every wrapped `resolve` enqueues in `waitForPermits` forever.
 * Failing here, at layer construction, turns that into a diagnosable
 * `InvalidBoundedPermits` instead of an unexplained hang the first time a
 * caller reaches the wrapped resolver.
 */
export const attributeResolverBounded =
  (permits: number) =>
  (layer: Layer.Layer<AttributeResolver>): Layer.Layer<AttributeResolver, InvalidBoundedPermits> =>
    wrapServiceEffect(AttributeResolver, layer, (inner) =>
      Effect.map(boundedPermits(permits), (semaphore) => ({
        name: `${inner.name ?? "?"} (bounded ${permits})`,
        resolve: (subjectId, attribute) =>
          Semaphore.withPermit(semaphore)(inner.resolve(subjectId, attribute)),
      })),
    );

/**
 * Wraps a resolver layer so a `resolve` call that does not settle within
 * `duration` fails with a typed `AttributeResolveError` instead of holding
 * its caller open indefinitely (JM-01/WV-01/SP-01).
 *
 * `attributeResolverRetrying` only ever sees `resolve` *fail* —
 * `Effect.retry`'s schedule fires on a settled error, and a resolver backed by
 * a store whose TCP connection black-holes never settles at all, so it
 * produces neither a retry nor a typed failure; it just holds the fiber.
 * `attributeResolverBounded` makes this worse rather than better on its own:
 * a hung call parked under its semaphore keeps the permit it acquired
 * forever, so one wedged resolver call eventually queues every subsequent
 * one behind it, turning a single slow dependency into a standing outage of
 * the whole enforcement path. Composing `attributeResolverTimingOut` beneath
 * `attributeResolverBounded` closes that: a timed-out call fails and releases
 * its permit like any other failure, rather than holding it.
 *
 * `duration` is `Duration.Input`, matching `CircuitBreaker.ts`'s
 * `resetTimeoutMs` — a plain millisecond number is still valid input, the
 * type only widens what else is accepted.
 *
 * Additive, like `attributeResolverRetrying`/`attributeResolverBounded`: a
 * caller who does not reach for this sees no change. Composes with both — put
 * outermost (closest to the caller) so a request that has already exhausted
 * its retries is not then held open a second, unbounded time by a resolver
 * that stopped answering mid-retry; put innermost (closest to the real
 * resolver) so each individual attempt, not the whole retried sequence, is
 * what the deadline bounds.
 */
export const attributeResolverTimingOut =
  (duration: Duration.Input) =>
  (layer: Layer.Layer<AttributeResolver>): Layer.Layer<AttributeResolver> =>
    wrapService(AttributeResolver, layer, (inner) => ({
      name: `${inner.name ?? "?"} (timing out)`,
      resolve: (subjectId, attribute) =>
        inner.resolve(subjectId, attribute).pipe(
          Effect.timeout(duration),
          Effect.catchTag("TimeoutError", () =>
            Metric.update(portTimeoutsTotal, "AttributeResolver").pipe(
              Effect.flatMap(() =>
                Effect.fail(
                  new AttributeResolveError({
                    attribute,
                    cause: new Error(`AttributeResolver.resolve did not settle within the configured deadline`),
                  }),
                ),
              ),
            ),
          ),
        ),
    }));
