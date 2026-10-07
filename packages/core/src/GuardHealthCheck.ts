/**
 * A readiness probe for the guard machinery: asks the wired ports a canary
 * question and reports whether they answered.
 *
 * Unlike HexDi's `createGuardHealthCheck` (`libs/guard/core/src/guard/guard.ts`,
 * researched as this feature's precedent), which probes a single required
 * port (`AuditTrailPort`), Qadi has no single analogous required port —
 * `PortServices` bundles five, and every one carries a fail-closed
 * default that answers cleanly even when nothing real is wired
 * (INV-QD-007), so "nothing configured" is never itself unhealthy. A canary
 * walk exercises whichever ports are actually configured in one pass;
 * a typed `EvaluationError` escaping it — a resolver genuinely unreachable,
 * rather than one answering "I don't know" — is the unhealthy signal.
 *
 * It walks the policy rather than deciding it (ARCH-16, ADR-QD-100). Going
 * through `decide` served every probe after the first from the `DecisionCache`
 * — which has no TTL and keeps successes — so a probe reported healthy while
 * the store was down; it also wrote a `DecisionRecord`, bumped the decision
 * metrics and minted an evaluation id per poll, none of which a probe is.
 *
 * The canary policy, and `options.resource` where relevant, are the
 * caller's to choose: only the caller knows a policy cheap and
 * representative enough of their own deployment to probe with (e.g.
 * `hasPermission` against a dedicated permission nothing else grants).
 */
import * as Clock from "effect/Clock";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import type { EvaluateOptions } from "./Evaluate.ts";
import { CurrentSubject } from "./CurrentSubject.ts";
import type { Policy } from "./Policy.ts";
import { questionOf } from "./Question.ts";
import { walk } from "./Walk.ts";

/** What a guard health check found. */
export interface GuardHealthCheckResult {
  readonly healthy: boolean;
  /** Epoch millis the probe ran, from `Clock` rather than `Date.now()`. */
  readonly checkedAt: number;
  readonly latencyMillis: number;
  /**
   * The failed evaluation's error tags. A single-element array today — the
   * probed evaluation fails with at most one `EvaluationError` — but the field
   * is plural and array-typed because that is not a guarantee this type makes;
   * a caller should read it as "whatever tags describe why this is unhealthy",
   * not assume exactly one. Empty when `healthy`.
   */
  readonly errors: ReadonlyArray<string>;
}

/**
 * Walks `canaryPolicy` against the wired ports and reports the result.
 *
 * Requires only `CurrentSubject` and the ports. `options.evaluationId` is
 * accepted and ignored (a probe has no id); `concurrency` is honoured.
 * The `qadi.guardHealthCheck` span carries `qadi.healthy` and, when
 * unhealthy, `qadi.error_tag`, so a tracer still sees a failed probe.
 *
 * Never fails: a typed `EvaluationError` from the probed evaluation is
 * captured into the result rather than propagated — a health check that
 * itself needs error handling has defeated its own purpose.
 *
 * **Corrected (issue #100, BEH-QD-261).** This doc comment previously drew a
 * line at *how* a probed port refused: a typed `EvaluationError` was
 * captured, but a **defect** (a resolver's own implementation throwing
 * rather than failing with a typed error) was said to be left uncaught here,
 * propagating and failing this Effect outright. That was true only because
 * the evaluator itself had the same gap — the defect reached this function
 * because nothing between the resolver and here had converted it. Now that
 * `PortAccess.ts`'s five port calls each catch a defect and convert it into
 * that port's own typed error (`AttributeResolveError` and its four
 * siblings), a dying port is a typed `EvaluationError` by the time it
 * reaches `Effect.result` below, same as one that failed cleanly — so this
 * function reports it as `healthy: false`, not a crashed probe. That is
 * strictly better for a health check: an operator polling this now learns
 * "the resolver is broken" instead of the probe itself dying, with no
 * change needed here to get it. A defect from something the walk does
 * not wrap (a bug in this library's own evaluation logic, say, rather than
 * in a port implementation) is not converted by anything and still
 * propagates — that half of the original claim stands, narrowed to what it
 * was actually ever true of.
 *
 * Named `createGuardHealthCheck`, not left unprefixed like `evaluate`/
 * `decide`/`enforce`/`guard`: this is the exact identifier two independent
 * `wayfinder:map` issues used for this out-of-scope, build-directly item —
 * keeping it lets a reader land on this export from either map's text.
 *
 * The returned object is checked with `satisfies GuardHealthCheckResult`
 * (as `Simplify.ts`/`Explanation.ts` pin their own return shapes) so the two
 * cannot drift apart silently — without it, a field renamed on one side alone
 * would still typecheck via the surrounding `Effect.fn` inference.
 */
export const createGuardHealthCheck = Effect.fn("qadi.guardHealthCheck")(function* (
  canaryPolicy: Policy,
  options?: EvaluateOptions,
) {
  const subject = yield* CurrentSubject;
  const checkedAt = yield* Clock.currentTimeMillis;
  const [elapsed, result] = yield* Effect.timed(
    Effect.result(walk(questionOf(subject, canaryPolicy, options), options?.concurrency)),
  );
  yield* Effect.annotateCurrentSpan(
    Result.isSuccess(result)
      ? { "qadi.healthy": true }
      : { "qadi.healthy": false, "qadi.error_tag": result.failure._tag },
  );

  return {
    healthy: Result.isSuccess(result),
    checkedAt,
    latencyMillis: Duration.toMillis(elapsed),
    errors: Result.isFailure(result) ? [result.failure._tag] : [],
  } satisfies GuardHealthCheckResult;
});
