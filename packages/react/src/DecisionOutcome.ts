/**
 * The one read of a decision result: a {@link DecisionResult} becomes one of
 * five {@link DecisionOutcome}s, and nothing else in this package reads its
 * `AsyncResult` state.
 *
 * Three rules are written here, once, and every surface (`Can`, `Cannot`,
 * `useCan`, `useProjected`, the gate registry, and the public
 * {@link currentDecision}) is a projection of what they produce:
 *
 * - **A decision being re-checked is not a decision**
 *   ([ADR-QD-017](../../../spec/decisions/017-stale-decisions-are-not-decisions.md)).
 *   A `waiting` result reads `Rechecking`, whatever it held before, and
 *   `Rechecking` has no field to hold it in.
 * - **A failure is not a denial** (INV-QD-006). An evaluation that could not
 *   finish reads `Failed`, carrying its `Cause`, never `Denied`.
 * - **A seeded decision is a decision** (BEH-QD-149). A server seed reads
 *   `Allowed`/`Denied` like this client's own answer; which one it is stays a
 *   property of the decision inside, answered by `isSeeded`.
 *
 * `waiting` is not the only place a stale answer hides. An `AsyncResult.Failure`
 * keeps the last success as `previousSuccess`, and `AsyncResult.value`,
 * `getOrElse` and `getOrThrow` return it — after a re-check of an allow fails,
 * those accessors still say "allowed". This module never reads it, and `Failed`
 * carries only the cause, so no outcome can leak it.
 *
 * One read is delegated rather than written here: `useDecisionSuspense` suspends
 * through `@effect/atom-react`'s `useAtomSuspense(atom, { suspendOnWaiting: true })`,
 * whose suspend / throw / return partition is exactly `{Pending, Rechecking}` /
 * `{Failed}` / `{Allowed, Denied}`. Reimplementing it over {@link outcomeOf} would
 * need either a derived atom per question or a hand-rolled suspense promise, and
 * the second is where COMPAT-01's race came from (CCR-QD-150).
 *
 * A leaf: it imports nothing local but `SeededDecision.ts`, so `GateWriter.ts`
 * can derive `GateRenderState` from it without closing an import cycle through
 * `QadiAtoms.ts` (ADR-QD-037). No `"use client"`: a server render reads it too.
 */
import type { Allow, Deny, EvaluationError } from "@qadi/core";
import type * as Cause from "effect/Cause";
import * as Data from "effect/Data";
import * as Match from "effect/Match";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import type { ClientDecision, SeededAllow, SeededDeny } from "./SeededDecision.ts";

/**
 * The observable state of one decision, as a decision atom holds it.
 *
 * `Initial` means the decision is not known yet — distinct from a `Deny`, and
 * distinct again from a `Failure`, which means the question could not be
 * answered at all. Collapsing those three into a boolean is what makes an
 * attribute-store outage look like a permissions problem.
 *
 * A success holds a {@link ClientDecision}: this client's own evaluation, or —
 * for the first frames of a server-rendered page — the server's seed, which is a
 * projection and not an evaluation. Read it with {@link outcomeOf}.
 */
export type DecisionResult = AsyncResult.AsyncResult<ClientDecision, EvaluationError>;

/**
 * What a decision result means, in five cases, of which only `Allowed` grants.
 *
 * `Pending` has never had an answer; `Rechecking` had one and no longer trusts
 * it. They are separate because the gate registry reports them separately
 * (ADR-QD-053), and neither carries the answer it may have held. `Failed`
 * carries the evaluation's `Cause`, for logging or `Cause.squash`, and nothing
 * else. Closed: a sixth case is a compile error in every `$match` and
 * `Match.tagsExhaustive` over it, including `GateRenderState`'s consumers.
 */
export type DecisionOutcome = Data.TaggedEnum<{
  Pending: {};
  Rechecking: {};
  Allowed: { readonly decision: Allow | SeededAllow };
  Denied: { readonly decision: Deny | SeededDeny };
  Failed: { readonly cause: Cause.Cause<EvaluationError> };
}>;

/** Constructors, guards and `$match` for {@link DecisionOutcome}. */
export const DecisionOutcome = Data.taggedEnum<DecisionOutcome>();

/** Shared, so the two common non-answers allocate nothing per render. */
const PENDING: DecisionOutcome = DecisionOutcome.Pending();
const RECHECKING: DecisionOutcome = DecisionOutcome.Rechecking();

/** The verdict of every client decision, exhaustively: a fifth tag is a compile error. */
const verdict: (decision: ClientDecision) => DecisionOutcome = Match.type<ClientDecision>().pipe(
  Match.tagsExhaustive({
    Allow: (decision) => DecisionOutcome.Allowed({ decision }),
    SeededAllow: (decision) => DecisionOutcome.Allowed({ decision }),
    Deny: (decision) => DecisionOutcome.Denied({ decision }),
    SeededDeny: (decision) => DecisionOutcome.Denied({ decision }),
  }),
);

/**
 * A result that is not waiting, by its tag.
 *
 * `Initial` is answered by {@link outcomeOf} before this runs; its arm is here
 * because exhaustiveness is checked over the whole union, not because it is
 * reached. `Failure` reads its `cause` and never its `previousSuccess`.
 */
const settled: (result: DecisionResult) => DecisionOutcome = Match.type<DecisionResult>().pipe(
  Match.tagsExhaustive({
    Initial: () => PENDING,
    Failure: (failure) => DecisionOutcome.Failed({ cause: failure.cause }),
    Success: (success) => verdict(success.value),
  }),
);

/**
 * What a decision result means: `Pending`, `Rechecking`, `Allowed`, `Denied`
 * or `Failed`.
 *
 * The order is the substance. `Initial` first, so a first ask — which a
 * decision atom reports as `Initial` with `waiting: true` — reads `Pending`,
 * not `Rechecking`. `waiting` before anything else that remains, so a success
 * *or a failure* being re-checked reads `Rechecking` rather than its previous
 * state (ADR-QD-017). This is the only `waiting` read in `@qadi/react`, and
 * `DECISION_READ_BUDGET` (`scripts/check-house-style.mjs`) keeps it the only
 * one.
 */
export const outcomeOf = (result: DecisionResult): DecisionOutcome =>
  AsyncResult.isInitial(result) ? PENDING : result.waiting ? RECHECKING : settled(result);

/**
 * The decision, or `undefined` when there is not a current one.
 *
 * A projection of {@link outcomeOf} for a caller that wants a settled decision
 * or nothing: `Allowed` and `Denied` give their decision; `Pending`,
 * `Rechecking` and `Failed` all give `undefined`. A result that is `waiting`
 * carries the *previous* decision while a new one is computed — for most data
 * a feature, for authorization an over-permission, however brief — and a
 * failure carries the last success as `previousSuccess`; neither reaches here.
 * Use {@link outcomeOf} when "not yet" and "could not" must render differently.
 */
export const currentDecision = (result: DecisionResult): ClientDecision | undefined =>
  DecisionOutcome.$match(outcomeOf(result), {
    Pending: () => undefined,
    Rechecking: () => undefined,
    Failed: () => undefined,
    Allowed: ({ decision }) => decision,
    Denied: ({ decision }) => decision,
  });
