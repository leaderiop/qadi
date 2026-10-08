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
import type { Concurrency } from "effect/Types";
import type { CurrentSubject } from "./CurrentSubject.ts";
import type { Decision } from "./Decision.ts";
import type { EvaluationError } from "./Errors.ts";
import type { EvaluationId } from "./EvaluationId.ts";
import { ask } from "./Lifecycle.ts";
import type { Policy } from "./Policy.ts";
import type { PortServices } from "./Ports.ts";
import type { QuestionOptions } from "./Question.ts";

/**
 * What `evaluate` is asked with: the {@link QuestionOptions} that can change
 * the answer, plus two fields that cannot.
 */
export interface EvaluateOptions extends QuestionOptions {
  /**
   * Evaluate the children of `allOf`, `anyOf` and `rules` concurrently.
   *
   * Absent — the default — evaluation is sequential and short-circuits, so a
   * branch that is never reached performs no lookup
   * ([INV-QD-005](../../../spec/invariants.md#inv-qd-005-short-circuit-preservation)).
   * Supplying this **forfeits that** in exchange for latency: every child of a
   * composite is evaluated, so a caller pays for speculative attribute,
   * relationship, decision-history and custom-predicate lookups against their
   * own stores — this option changes what a caller's resolvers get asked, not
   * only how long the call takes.
   *
   * What it does *not* change is the answer. The decision and its trace are
   * identical either way, because both paths drive the same fold over children in
   * declaration order — including discarding the trace of a child evaluated after
   * the decisive one ([ADR-QD-026](../../../spec/decisions/026-concurrent-evaluation.md)).
   *
   * Not part of the `Question`: it does not change the answer (ADR-QD-026).
   */
  readonly concurrency?: Concurrency;
  /**
   * Correlate this evaluation with one already made elsewhere.
   *
   * Absent — the default, and unchanged — every call mints a fresh id, hit or
   * miss, for the reason stated where the cache is read below: two log lines
   * claiming to be the same event would break the one thing the identifier
   * exists for.
   *
   * That default is right for a *repeat* of a question and wrong for a
   * *continuation* of one. A decision made on the server, dehydrated, and
   * re-checked on the client is one story told in two places; with a fresh id
   * at each end there is nothing to join them by, and the re-check appears as
   * an unrelated evaluation. Supplying the server's id makes the pair
   * expressible without any new correlation protocol.
   *
   * Opt-in, so it can only ever be a caller stating a relationship it knows
   * about. Qadi cannot infer one — see
   * [ADR-QD-012](../../../spec/decisions/012-deterministic-time-and-ids.md).
   *
   * Not part of the `Question`: it does not change the answer (ADR-QD-012).
   */
  readonly evaluationId?: string;
}

/**
 * Services an evaluation needs: who is asking, an id for the evaluation, and
 * the five ports (`PortServices`, `Ports.ts`). The ports come from the
 * registry rather than a list here, so a port added to the registry reaches
 * every alias of this type without an edit here (ADR-QD-094).
 */
export type EvaluationServices = CurrentSubject | EvaluationId | PortServices;

/**
 * Everything an evaluation needs except who is asking.
 *
 * The services a runtime holds for its lifetime while the subject travels per
 * call. Written as `Exclude` rather than as a hand-listed union so it tracks
 * {@link EvaluationServices}: a port added to that union reaches every
 * adapter that names this alias without a second edit. Its domain-named
 * aliases keep their own meaning and public names: `SubjectSetServices`
 * (`SubjectSet.ts`), `QadiRuntimeServices` (`@qadi/react`), and the
 * `@qadi/promise` and `@qadi/http` runtime requirement sets.
 *
 * Before this alias the same `Exclude` was spelled out six times across four
 * packages, and `@qadi/http`'s `RequirePermission.ts` re-listed the six
 * services by hand instead (ARCH-04).
 */
export type StandingEvaluationServices = Exclude<EvaluationServices, CurrentSubject>;

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
