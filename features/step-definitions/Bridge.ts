/**
 * The six `QadiWorld` methods, ported. Each reads the World's `Ref`, builds
 * `qadiTestLayer`/`qadiReviewLayer` from it exactly as `world.ts` did, and
 * `yield*`s the result instead of `Effect.runSync`/`Effect.runSyncExit`/
 * `Effect.runSync(Effect.result(...))` — the only change is the bridge into
 * Effect; the layer-construction logic is unchanged.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import * as Result from "effect/Result";
import {
  customPredicateFromRecord,
  decideSubjects,
  DecisionHistory,
  DecisionHistoryUnavailable,
  enforce,
  evaluate,
  evaluatePredicate,
  explain,
  filterSubjects,
  fromJson,
  isAllowed,
  makeSubject,
  renderExplanation,
  toJson,
  toPredicate,
} from "@qadi/core";
import type { EvaluateOptions, Obligation, Policy } from "@qadi/core";
import { qadiReviewLayer, qadiTestLayer } from "@qadi/testing";
import { NO_OUTCOME, subjectOf, toOutcome, World } from "./SharedWorld.ts";

const unreachableHistory = Layer.succeed(DecisionHistory, {
  hasActed: (query) =>
    Effect.fail(new DecisionHistoryUnavailable({ event: query.event, cause: "down" })),
});

/** Describes a policy without evaluating it — no layer, no runtime, no subject. */
export const describePolicy = Effect.fn("features.describePolicy")(function* (policy: Policy) {
  const { state } = yield* World;
  yield* Ref.update(state, (s) => ({ ...s, explanation: renderExplanation(explain(policy)) }));
});

/** Runs a policy and records the outcome for the Then steps. */
export const run = Effect.fn("features.run")(function* (policy: Policy) {
  const { state } = yield* World;
  const w = yield* Ref.get(state);

  // Keys are omitted rather than set to undefined, so a scenario that never
  // mentions a resource or an action evaluates exactly as it did before
  // either existed.
  const options: EvaluateOptions = {
    ...(w.resource === undefined ? {} : { resource: w.resource }),
    ...(w.action === undefined ? {} : { action: w.action }),
    ...(w.concurrency === undefined ? {} : { concurrency: w.concurrency }),
  };

  const result = yield* evaluate(policy, options).pipe(
    Effect.provide(
      qadiTestLayer(subjectOf(w), {
        attributes: w.resolvedAttributes,
        ...(w.relationships === undefined ? {} : { relationships: w.relationships }),
        // A store that is *down* and a port that is *unwired* are different
        // answers, and only one of them is a denial.
        ...(w.historyUnreachable
          ? { decisionHistory: unreachableHistory }
          : w.events === undefined
            ? {}
            : { history: w.events }),
        // `undefined` leaves `qadiTestLayer`'s own `CustomPredicateNone`
        // default in place — nothing registered, so every name denies.
        ...(w.customPredicates === undefined
          ? {}
          : {
              customPredicate: customPredicateFromRecord(
                Object.fromEntries(
                  Object.entries(w.customPredicates).map(([name, answer]) => [
                    name,
                    () => Effect.succeed(answer),
                  ]),
                ),
              ),
            }),
        // `undefined` leaves `qadiTestLayer`'s own `SignatureHistoryNone`
        // default in place — no signatures on file, so every hasSignature
        // node denies.
        ...(w.signatures === undefined ? {} : { signatures: w.signatures }),
      }),
    ),
    Effect.result,
  );

  const outcome = Result.isFailure(result) ? { ...NO_OUTCOME, errored: true } : toOutcome(result.success);
  yield* Ref.update(state, (s) => ({ ...s, outcome }));
});

/**
 * Runs a policy as a guard over some work, recording whether the work ran.
 *
 * Distinct from `run` because obligations are where reporting and enforcing
 * diverge: `evaluate` hands the duty back, `enforce` refuses to proceed on
 * one nobody discharged.
 */
export const runGuarded = Effect.fn("features.runGuarded")(function* (policy: Policy) {
  const { state } = yield* World;
  const w = yield* Ref.get(state);

  const work = Ref.update(state, (s) => ({ ...s, workRan: true }));

  const handler = (obligations: ReadonlyArray<Obligation>) =>
    Ref.update(state, (s) => ({ ...s, discharged: [...s.discharged, ...obligations.map((o) => o.id)] }));

  const result = yield* work.pipe(
    enforce(policy, w.handlesObligations ? { onObligations: handler } : {}),
    Effect.provide(qadiTestLayer(subjectOf(w), {})),
    Effect.result,
  );

  const outcome = Result.isFailure(result)
    ? { ...NO_OUTCOME, errored: true, failure: result.failure._tag }
    : { ...NO_OUTCOME, allowed: true };
  yield* Ref.update(state, (s) => ({ ...s, outcome }));
});

/**
 * Runs a policy across every candidate, recording the whole review.
 *
 * Note what is *not* provided: no current subject. A review query is asked by
 * nobody, and requiring one would mean wiring a value that could not affect
 * any answer (ADR-QD-022).
 */
export const runSubjectSet = Effect.fn("features.runSubjectSet")(function* (policy: Policy) {
  const { state } = yield* World;
  const w = yield* Ref.get(state);

  const options: EvaluateOptions = w.resource === undefined ? {} : { resource: w.resource };
  const subjects = w.candidates.map((c) =>
    makeSubject({ id: c.id, roles: c.roles, permissions: c.permissions }),
  );

  // Both entry points, every scenario. `filterSubjects` is derived from
  // `decideSubjects`, so running the pair here means every scenario also
  // asserts they agree.
  const [reviewed, kept] = yield* Effect.all([
    decideSubjects(policy, subjects, options),
    filterSubjects(policy, subjects, options),
  ]).pipe(Effect.provide(qadiReviewLayer()));

  const review = reviewed.map(({ subject, decision }) => ({
    id: subject.id,
    allowed: isAllowed(decision),
    reason: decision._tag === "Deny" ? decision.reason : undefined,
    obligations: decision._tag === "Allow" ? decision.obligations.map((o) => o.id) : [],
  }));
  const answer = kept.map((s) => s.id);
  yield* Ref.update(state, (s) => ({ ...s, review, answer }));
});

/**
 * Compiles a policy into a row filter, recording the predicate or the refusal.
 *
 * Note the environment: no `EvaluationId`, because no decision is produced.
 * Translation reads the subject and folds; it never sees a row.
 */
export const compile = Effect.fn("features.compile")(function* (policy: Policy) {
  const { state } = yield* World;
  const w = yield* Ref.get(state);

  const result = yield* toPredicate(policy).pipe(
    Effect.provide(qadiTestLayer(subjectOf(w), { attributes: w.resolvedAttributes })),
    Effect.result,
  );

  if (Result.isFailure(result)) {
    const refusedTag =
      result.failure._tag === "PolicyNotTranslatable" ? result.failure.policyTag : result.failure._tag;
    yield* Ref.update(state, (s) => ({ ...s, predicate: undefined, refusedTag }));
    return;
  }
  yield* Ref.update(state, (s) => ({ ...s, predicate: result.success, refusedTag: undefined }));
});

/**
 * Runs the compiled filter and the evaluator over the same rows.
 *
 * INV-QD-018 as a scenario: two interpreters over one tree, compared rather
 * than argued about.
 */
export const agreesWith = Effect.fn("features.agreesWith")(function* (
  policy: Policy,
  rows: ReadonlyArray<Record<string, unknown>>,
) {
  const { state } = yield* World;
  const w = yield* Ref.get(state);
  if (w.predicate === undefined) throw new Error("nothing was compiled");
  const compiled = w.predicate;

  for (const row of rows) {
    const decision = yield* evaluate(policy, { resource: row }).pipe(
      Effect.provide(qadiTestLayer(subjectOf(w), { attributes: w.resolvedAttributes })),
    );
    if (evaluatePredicate(compiled, row) !== isAllowed(decision)) return false;
  }
  return true;
});

/** Serializes then deserializes a policy, recording both sides. */
export const roundTrip = Effect.fn("features.roundTrip")(function* (policy: Policy) {
  const { state } = yield* World;
  const json = yield* toJson(policy);
  const restored = yield* fromJson(json);
  yield* Ref.update(state, (s) => ({ ...s, serialized: json, restored }));
});
