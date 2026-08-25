/**
 * A readiness probe for the guard machinery: runs a canary policy through the
 * wired `EvaluationServices` and reports whether it evaluated cleanly.
 *
 * Unlike HexDi's `createGuardHealthCheck` (`libs/guard/core/src/guard/guard.ts`,
 * researched as this feature's precedent), which probes a single required
 * port (`AuditTrailPort`), Qadi has no single analogous required port —
 * `EvaluationServices` bundles six, and every one carries a fail-closed
 * default that answers cleanly even when nothing real is wired
 * (INV-QD-007), so "nothing configured" is never itself unhealthy. A canary
 * evaluation exercises whichever ports are actually configured in one pass;
 * a typed `EvaluationError` escaping it — a resolver genuinely unreachable,
 * rather than one answering "I don't know" — is the unhealthy signal.
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
import type { Policy } from "./Policy.ts";
import { decide } from "./Qadi.ts";

/** What a guard health check found. */
export interface GuardHealthCheckResult {
  readonly healthy: boolean;
  /** Epoch millis the probe ran, from `Clock` rather than `Date.now()`. */
  readonly checkedAt: number;
  readonly latencyMillis: number;
  /** The failed evaluation's error tag. Empty when `healthy`. */
  readonly errors: ReadonlyArray<string>;
}

/**
 * Runs `canaryPolicy` through `EvaluationServices` and reports the result.
 *
 * Never fails: a typed `EvaluationError` from the probed evaluation is
 * captured into the result rather than propagated — a health check that
 * itself needs error handling has defeated its own purpose. A **defect** (a
 * resolver's own implementation throwing, rather than failing with a typed
 * error) is not caught here and still propagates: converting a real bug into
 * a clean "unhealthy" would hide it instead of surfacing it, the same
 * reasoning AGENTS.md §4 gives for never `Effect.orDie`-ing a typed failure
 * away on an evaluation path — this just runs in the other direction.
 *
 * Named `createGuardHealthCheck`, not left unprefixed like `evaluate`/
 * `decide`/`enforce`/`guard`: this is the exact identifier two independent
 * `wayfinder:map` issues used for this out-of-scope, build-directly item —
 * keeping it lets a reader land on this export from either map's text.
 */
export const createGuardHealthCheck = Effect.fn("qadi.guardHealthCheck")(function* (
  canaryPolicy: Policy,
  options?: EvaluateOptions,
) {
  const checkedAt = yield* Clock.currentTimeMillis;
  const [elapsed, result] = yield* Effect.timed(Effect.result(decide(canaryPolicy, options)));

  return {
    healthy: Result.isSuccess(result),
    checkedAt,
    latencyMillis: Duration.toMillis(elapsed),
    errors: Result.isFailure(result) ? [result.failure._tag] : [],
  };
});
