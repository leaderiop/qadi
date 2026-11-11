/**
 * What a port's description derives: its request key and its defect
 * ({@link makePortDescription}), and the standard layers built from it, the
 * retrying, bounded and timing-out wrappers and the fail-closed default.
 *
 * Each port module declares one line per wrapper —
 * `export const attributeResolverRetrying = retryingPort(attributeResolverPort)`
 * — so the wrapper set is the same for all five by construction rather than
 * by five authors remembering to write it (ARCH-10 E1: three ports had a
 * retrying wrapper, two had a timing-out one, and only one of the three
 * retrying wrappers recorded its attempts).
 *
 * This module absorbed `RetryingLayer.ts`, whose own doc said one generic shape
 * was impossible because the port methods differ in arity; the description's
 * `invoke`/`make` lens is what makes it possible (D-10-a).
 *
 * Deliberately out of the barrel (AGENTS.md §9, D-10-c): callers use the
 * fifteen named wrappers and five named defaults the port modules export, not
 * these derivations, and there is no sixth port they could be applied to.
 * Package-private (ADR-QD-099): not exported from the barrel or any entry point.
 */
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import type * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Ref from "effect/Ref";
import * as Result from "effect/Result";
import type * as Schedule from "effect/Schedule";
import * as Semaphore from "effect/Semaphore";
import { InvalidBoundedPermits } from "./Errors.ts";
import type { SubjectId } from "./Identity.ts";
import { KeyRefusal } from "./PortDescription.ts";
import type { LeafRequests, PortDescription, PortShape } from "./PortDescription.ts";
import { canonicalKey } from "./PortKey.ts";
import { attemptsStruct, encodeSpan } from "./PortSpanEncode.ts";
import { portRetriesTotal, portTimeoutsTotal } from "./PortMetrics.ts";
import type { PortName } from "./PortMetrics.ts";
import type { PortSpanAttributesLike } from "./PortSpan.ts";
import { portWire, presentMembers } from "./PortWireEncode.ts";
import type { PortWireSpec, QuestionOf } from "./PortWireEncode.ts";

/**
 * What a derived port states about its wire: a {@link PortWireSpec} whose
 * `toQuestion` returns the question itself, every member written out
 * ({@link QuestionOf}), not a `Result`.
 *
 * The question of a port that uses {@link makePortDescription} is total: the
 * encode that can be refused is the strict schema's, not the conversion's.
 */
export type DerivedWireSpec<
  Args extends ReadonlyArray<unknown>,
  A,
  Q extends { readonly subjectId: SubjectId },
  QE,
  W,
  WE,
> = Omit<PortWireSpec<Args, A, Q, QE, W, WE>, "toQuestion"> & {
  readonly toQuestion: (args: Args) => QuestionOf<Q>;
};

/**
 * Builds a port's description, deriving its request key from its wire question
 * and its defect from its failure.
 *
 * The four ports whose question is total (`AttributeResolver`,
 * `RelationshipResolver`, `DecisionHistory`, `SignatureHistory`) each listed a
 * tuple of their arguments by hand for `key`, and a tuple a forgotten field
 * compiled through (ARCH-69, ADR-QD-133). The key law is the wire question's
 * (BEH-QD-440, INV-QD-286): two requests share a key exactly when they ask the
 * same question, so the key is `canonicalKey` over the question the spec's
 * `wire.toQuestion` writes, and the defect is the squashed cause through
 * `failure`, the same line each of the four restated.
 *
 * The spec has no `key` or `defect` field on purpose: a derived port cannot
 * state one. It is derived from `PortDescription`, so a member the description
 * gains reaches every port built here without editing this type.
 * `CustomPredicate` does not use it: its key must cover the whole subject and
 * its defect renders with `Cause.pretty`, and it says so where it is declared.
 */
export const makePortDescription = <
  N extends PortName,
  Self,
  Shape extends PortShape,
  Args extends ReadonlyArray<unknown>,
  A,
  E,
  P extends ReadonlyArray<unknown>,
  Span extends PortSpanAttributesLike,
  Asks extends LeafRequests<P>,
  Q extends { readonly subjectId: SubjectId },
  QE,
  W,
  WE,
>(
  spec: Omit<PortDescription<N, Self, Shape, Args, A, E, P, Span, Asks>, "wire" | "key" | "defect"> & {
    readonly wire: DerivedWireSpec<Args, A, Q, QE, W, WE>;
  },
): PortDescription<N, Self, Shape, Args, A, E, P, Span, Asks> => {
  const { wire, ...rest } = spec;
  return {
    ...rest,
    wire: portWire({
      ...wire,
      toQuestion: (args) => Result.succeed(wire.toQuestion(args)),
    }),
    // Reading the question can throw (a getter on a request, an untyped caller),
    // and a key is refused, never thrown (`PortDescription.key`).
    key: (args) =>
      Result.try({
        try: () => presentMembers(wire.toQuestion(args)),
        catch: (error) =>
          KeyRefusal.Unreadable({
            path: [],
            message: error instanceof Error ? error.message : String(error),
          }),
      }).pipe(Result.flatMap(canonicalKey)),
    defect: (args, cause) => spec.failure(args, Cause.squash(cause)),
  };
};

/** Rebuilds `layer`'s service through `wrap`, once, when the returned layer itself builds. */
export const wrapService = <Self, Shape>(
  service: Context.Key<Self, Shape>,
  layer: Layer.Layer<Self>,
  wrap: (inner: Shape) => Shape,
): Layer.Layer<Self> =>
  Layer.effect(
    service,
    Effect.map(Layer.build(layer), (context) => wrap(Context.get(context, service))),
  );

/**
 * Effectful counterpart to `wrapService`: rebuilds `layer`'s service through
 * `wrap`, once, when the returned layer itself builds — but here `wrap` may
 * itself fail or require the effect context, unlike `wrapService`'s plain
 * function.
 *
 * This is what `boundedPort` builds on: it needs to validate `permits` and
 * construct a `Semaphore` — which `boundedPermits` below does — before it has
 * a wrapped shape to return, something `wrapService`'s synchronous `wrap`
 * cannot express.
 */
export const wrapServiceEffect = <Self, Shape, E>(
  service: Context.Key<Self, Shape>,
  layer: Layer.Layer<Self>,
  wrap: (inner: Shape) => Effect.Effect<Shape, E>,
): Layer.Layer<Self, E> =>
  Layer.effect(
    service,
    Effect.flatMap(Layer.build(layer), (context) => wrap(Context.get(context, service))),
  );

/**
 * Validates `permits` and builds the `Semaphore` every `*Bounded` wrapper
 * guards its wrapped calls with.
 *
 * Rejects `permits <= 0` (and non-integers, and `NaN`) rather than handing back
 * a semaphore that deadlocks every call: `Semaphore.make` performs no
 * validation of its own, so with `permits` zero, negative, `NaN` or infinite,
 * `free` is permanently below the `1` every `withPermit` call needs, and every
 * wrapped call enqueues in `waitForPermits` forever. Failing here, at layer
 * construction, turns that into a diagnosable `InvalidBoundedPermits` instead
 * of an unexplained hang the first time a caller reaches the wrapped service.
 */
export const boundedPermits = (
  permits: number,
): Effect.Effect<Semaphore.Semaphore, InvalidBoundedPermits> =>
  Number.isInteger(permits) && permits > 0
    ? Semaphore.make(permits)
    : Effect.fail(new InvalidBoundedPermits({ permits }));

/**
 * Runs `attempt` under `schedule`, counting failed attempts in
 * `portRetriesTotal` and annotating the caller's current span with how many
 * times `attempt` actually ran (`qadi.attempts`).
 *
 * Only `attributeResolverRetrying` used to annotate (KH-01);
 * `relationshipResolverRetrying` and `customPredicateRetrying` retried
 * silently, though the latter's doc said it mirrored the former exactly
 * (ARCH-10 E2). KH-01's reason applies to every retrying wrapper:
 * `PortAccess.ts` opens one span around the whole wrapped call, and every
 * retry happens silently inside that one span's duration — a trace reader
 * sees one deceptively slow call rather than the N store round trips that
 * actually happened. `portRetriesTotal` counts failed attempts, but as a
 * process-wide aggregate with no correlation back to the request that
 * triggered them; this annotation is the per-call signal that aggregate
 * cannot give.
 *
 * The count is incremented once per actual run of `attempt`, not once per
 * failure — counting failures instead double-counts the exhausting failure,
 * the one `Effect.retry` decides not to retry: `tapError` cannot see that
 * decision, so it always assumed another call was coming. `Effect.ensuring`,
 * not a `tap` on only the success or only the failure path: the count is worth
 * recording whichever way the retried call finally settles, and a finalizer
 * runs either way.
 */
export const retryCountingAttempts = <A, E>(
  port: PortName,
  schedule: Schedule.Schedule<unknown, E>,
  attempt: Effect.Effect<A, E>,
): Effect.Effect<A, E> =>
  Effect.gen(function* () {
    const attempts = yield* Ref.make(0);
    return yield* Ref.update(attempts, (n) => n + 1).pipe(
      Effect.flatMap(() => attempt),
      Effect.tapError(() => Metric.update(portRetriesTotal, port)),
      Effect.retry(schedule),
      Effect.ensuring(
        Effect.flatMap(Ref.get(attempts), (n) => Effect.annotateCurrentSpan(encodeSpan(attemptsStruct, { attempts: n }))),
      ),
    );
  });

/**
 * Rebuilds `layer`'s port with every call passed through `around`, named
 * `"<inner> (<suffix>)"` so a panel reports the whole stack rather than losing
 * the base implementation's identity (BEH-QD-196). An unnamed inner reads
 * `"?"`.
 */
export const wrapPort = <
  N extends PortName,
  Self,
  Shape extends PortShape,
  Args extends ReadonlyArray<unknown>,
  A,
  E,
  P extends ReadonlyArray<unknown>,
>(
  d: PortDescription<N, Self, Shape, Args, A, E, P>,
  layer: Layer.Layer<Self>,
  suffix: string,
  around: (call: (...args: Args) => Effect.Effect<A, E>) => (...args: Args) => Effect.Effect<A, E>,
): Layer.Layer<Self> =>
  wrapService(d.service, layer, (inner) =>
    d.make(`${inner.name ?? "?"} (${suffix})`, around(d.invoke(inner))),
  );

/**
 * A port's retrying wrapper: every call retries on the port's typed error
 * under `schedule` before surfacing it.
 *
 * Each attempt **re-invokes** the wrapped method (`Effect.suspend`), rather
 * than re-running the one effect the first invocation returned, so an adapter
 * that does work while building its effect is asked again on each attempt.
 * Counts failed attempts in `portRetriesTotal` and annotates `qadi.attempts`
 * on the caller's span ({@link retryCountingAttempts}). A schedule that
 * exhausts surfaces the same error the port raised.
 */
export const retryingPort =
  <
    N extends PortName,
    Self,
    Shape extends PortShape,
    Args extends ReadonlyArray<unknown>,
    A,
    E,
    P extends ReadonlyArray<unknown>,
  >(
    d: PortDescription<N, Self, Shape, Args, A, E, P>,
  ) =>
  (schedule: Schedule.Schedule<unknown, E>) =>
  (layer: Layer.Layer<Self>): Layer.Layer<Self> =>
    wrapPort(d, layer, "retrying", (call) => (...args) =>
      retryCountingAttempts(
        d.port,
        schedule,
        Effect.suspend(() => call(...args)),
      ),
    );

/**
 * A port's bounded wrapper: no more than `permits` calls run at once, the
 * rest queue.
 *
 * `Qadi.filter`'s `concurrency` option bounds how many *policy evaluations*
 * run in parallel; it says nothing about how many of them reach one port at
 * the same instant, since a single composite policy can call it several times
 * per item. Built on `effect/Semaphore` rather than a rate limiter: the
 * problem is concurrent in-flight calls, not calls per second. A permit count
 * that is not a positive integer fails the layer's construction with
 * `InvalidBoundedPermits` ({@link boundedPermits}).
 */
export const boundedPort =
  <
    N extends PortName,
    Self,
    Shape extends PortShape,
    Args extends ReadonlyArray<unknown>,
    A,
    E,
    P extends ReadonlyArray<unknown>,
  >(
    d: PortDescription<N, Self, Shape, Args, A, E, P>,
  ) =>
  (permits: number) =>
  (layer: Layer.Layer<Self>): Layer.Layer<Self, InvalidBoundedPermits> =>
    wrapServiceEffect(d.service, layer, (inner) =>
      Effect.map(boundedPermits(permits), (semaphore) => {
        const call = d.invoke(inner);
        return d.make(`${inner.name ?? "?"} (bounded ${permits})`, (...args) =>
          Semaphore.withPermit(semaphore)(call(...args)),
        );
      }),
    );

/**
 * A port's timing-out wrapper: a call that does not settle within `duration`
 * fails with the port's own typed error — built by the description's
 * `failure` from an `Error` reading `"<port>.<method> did not settle within
 * the configured deadline"` — and counts in `portTimeoutsTotal`
 * (JM-01/WV-01/SP-01).
 *
 * A retrying wrapper only ever sees a call *fail*; a store whose connection
 * black-holes never settles, so it produces neither a retry nor a typed
 * failure — it just holds the fiber. A bounded wrapper makes that worse on its
 * own: a hung call keeps its permit forever. Composed beneath a bounded
 * wrapper, a timed-out call fails and releases its permit like any other
 * failure. Put it outermost (closest to the caller) to bound the whole retried
 * sequence, innermost (closest to the store) to bound each attempt.
 */
export const timingOutPort =
  <
    N extends PortName,
    Self,
    Shape extends PortShape,
    Args extends ReadonlyArray<unknown>,
    A,
    E,
    P extends ReadonlyArray<unknown>,
  >(
    d: PortDescription<N, Self, Shape, Args, A, E, P>,
  ) =>
  (duration: Duration.Input) =>
  (layer: Layer.Layer<Self>): Layer.Layer<Self> =>
    wrapPort(d, layer, "timing out", (call) => (...args) =>
      call(...args).pipe(
        Effect.timeoutOrElse({
          duration,
          orElse: () =>
            Metric.update(portTimeoutsTotal, d.port).pipe(
              Effect.flatMap(() =>
                Effect.fail(
                  d.failure(
                    args,
                    new Error(`${d.port}.${d.method} did not settle within the configured deadline`),
                  ),
                ),
              ),
            ),
        }),
      ),
    );

/**
 * A port's fail-closed default: named `none.name`, answering `none.answer` to
 * every request (INV-QD-007, ADR-QD-040).
 *
 * The answer is one precomputed effect shared by every call, so the default
 * adds no allocation to the evaluation path.
 */
export const nonePort = <
  N extends PortName,
  Self,
  Shape extends PortShape,
  Args extends ReadonlyArray<unknown>,
  A,
  E,
  P extends ReadonlyArray<unknown>,
>(
  d: PortDescription<N, Self, Shape, Args, A, E, P>,
): Layer.Layer<Self> => {
  const answered: Effect.Effect<A, E> = Effect.succeed(d.none.answer);
  return Layer.succeed(d.service, d.make(d.none.name, () => answered));
};
