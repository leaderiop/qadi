/**
 * Policy evaluation.
 *
 * One function. The predecessor had a synchronous `evaluate` and an
 * `evaluateAsync` that pre-resolved every attribute in the tree before
 * delegating back to the synchronous one — which meant short-circuiting was
 * destroyed and the async relationship API was unreachable. Returning an
 * `Effect` collapses both paths: resolution happens lazily, at the node that
 * needs it, and `anyOf` stops at its first allowing child.
 */
import * as Effect from "effect/Effect";
import type { Decision } from "./Decision.ts";
import type { EvaluationError } from "./Errors.ts";
import type { EvaluationServices } from "./EvaluationServices.ts";
import { ask } from "./Lifecycle.ts";
import type { Policy } from "./Policy.ts";
import type { EvaluateOptions } from "./Question.ts";

/**
 * Evaluates a policy against the current subject: the lifecycle around `walk`.
 *
 * Mints the id, reads the clock and the optional cache and sink, builds the
 * `Question`, and wraps the walk's answer in metrics, a span, a log line and
 * the records. The interpreter itself is `Walk.ts`'s, the lifecycle
 * `Lifecycle.ts`'s: this is `ask`'s decision.
 *
 * Emits a `qadi.evaluate` span carrying the decision, so authorization shows up
 * in tracing without a bespoke audit port.
 */
export const evaluate = (
  policy: Policy,
  options?: EvaluateOptions,
): Effect.Effect<Decision, EvaluationError, EvaluationServices> =>
  Effect.map(ask(policy, options), (asked) => asked.decision);
