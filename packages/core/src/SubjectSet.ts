/**
 * Subject-set evaluation — one policy across many subjects.
 *
 * The transpose of `Qadi.filter`, which runs one policy across many resources.
 * This side answers "who can see this?", which is the question an access review,
 * a sharing dialog and a leak investigation all ask
 * ([ADR-QD-022](../../../spec/decisions/022-subject-set-evaluation.md)).
 *
 * Two things distinguish it from everything else in the library.
 *
 * It **replaces** the ambient subject rather than reading it, so it is the only
 * entry point that does not require a `CurrentSubject`. A review query is asked
 * by nobody: a batch job at midnight and an admin console have no requesting
 * subject, and requiring one would make callers wire a value that could not
 * affect any answer.
 *
 * And it **reports** rather than enforces (ADR-QD-019's dividing line). It hands
 * back identities, to an administrator rather than to the subjects named, so no
 * permission is being exercised and there is no duty to discharge. Discharging
 * here would fire every obligation once per candidate — logging accesses that
 * never happened, which is the defect the read-only history port exists to
 * prevent.
 */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Filter from "effect/Filter";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import type { AuthSubject } from "./AuthSubject.ts";
import { CurrentSubject } from "./CurrentSubject.ts";
import type { Decision } from "./Decision.ts";
import { isAllowed } from "./Decision.ts";
import type { EvaluationError } from "./Errors.ts";
import type { EvaluateOptions, StandingEvaluationServices } from "./Evaluate.ts";
import { evaluate } from "./Evaluate.ts";
import type { Policy } from "./Policy.ts";

/**
 * What an evaluation needs when the subject travels as a parameter.
 *
 * Written as `Exclude` rather than as a hand-listed union so that it tracks
 * {@link StandingEvaluationServices}: E5 added a service to the union it narrows, and a
 * requirement set that quietly stopped matching the evaluator's would be a
 * worse defect than a type needing one hop to read.
 */
export type SubjectSetServices = StandingEvaluationServices;

/** One subject and the decision it received. */
export interface SubjectDecision {
  readonly subject: AuthSubject;
  readonly decision: Decision;
}

/** One subject whose evaluation itself broke, rather than producing a decision. */
export interface SubjectEvaluationFailure {
  readonly subject: AuthSubject;
  readonly error: EvaluationError;
}

/**
 * The outcome of evaluating a policy against many subjects: every decision
 * that completed, and every subject whose evaluation broke instead of
 * completing.
 *
 * `failures` is never folded into `decisions`, and a failed subject is never
 * a member of either an allow or a deny — that would be exactly the
 * "broken lookup presents as not authorized" shape INV-QD-006 forbids, just
 * moved from the per-decision level to the per-subject one. It is also never
 * silently absent: a caller checking only `decisions.length` against
 * `subjects.length` can tell a clean run from a partial one.
 */
export interface SubjectSetOutcome {
  readonly decisions: ReadonlyArray<SubjectDecision>;
  readonly failures: ReadonlyArray<SubjectEvaluationFailure>;
}

/**
 * One subject's review outcome: the decision it received, or the evaluation
 * failure that kept it from getting one.
 *
 * A failed subject is never a denial (INV-QD-006): `SubjectFailed` is its own
 * case, carrying the `EvaluationError` and the subject it was resolving for.
 * It is what {@link decideSubject} returns and what the streamed siblings
 * emit, so a downstream `Stream.filter`/`Stream.map` can tell a decision from
 * a failure.
 */
export type SubjectOutcome = Data.TaggedEnum<{
  SubjectDecided: { readonly subject: AuthSubject; readonly decision: Decision };
  SubjectFailed: { readonly subject: AuthSubject; readonly error: EvaluationError };
}>;

/** Constructors and guards for {@link SubjectOutcome}. */
export const SubjectOutcome = Data.taggedEnum<SubjectOutcome>();

/**
 * What `filterSubjectsStream` emits: an allowed subject, or a subject whose
 * evaluation failed. A denied subject is simply absent (it is not allowed), but
 * a failed one never is (BEH-QD-108).
 */
export type FilteredSubjectOutcome = Data.TaggedEnum<{
  SubjectAllowed: { readonly subject: AuthSubject };
  SubjectFailed: { readonly subject: AuthSubject; readonly error: EvaluationError };
}>;

/** Constructors and guards for {@link FilteredSubjectOutcome}. */
export const FilteredSubjectOutcome = Data.taggedEnum<FilteredSubjectOutcome>();

/**
 * Evaluates one policy against one subject and reports the outcome as a
 * value; never fails.
 *
 * The one per-subject step: the array form ({@link decideSubjects}) and the
 * streamed forms both fold over it, so the per-subject error mapping lives in
 * one place. Providing `CurrentSubject` is what discharges the requirement,
 * and it is also what isolates the element: each subject is evaluated exactly
 * as it would have been alone (INV-QD-016).
 */
export const decideSubject = Effect.fn("qadi.decideSubject")(function* (
  policy: Policy,
  subject: AuthSubject,
  options?: EvaluateOptions,
) {
  return yield* Effect.provideService(evaluate(policy, options), CurrentSubject, subject).pipe(
    Effect.match({
      onSuccess: (decision): SubjectOutcome => SubjectOutcome.SubjectDecided({ subject, decision }),
      onFailure: (error): SubjectOutcome => SubjectOutcome.SubjectFailed({ subject, error }),
    }),
  );
});

/**
 * Evaluates one policy against many subjects, keeping every decision — and
 * every failure, separately, rather than discarding the rest of the batch.
 *
 * The reviewable form: a denial arrives with its trace, and "denied" without
 * "why" is not something an access review can act on.
 *
 * `decisions` preserves input order and is not deduplicated — a review is
 * read beside the list it was asked about, so position is the join key, and
 * dropping a row two subjects share an id over would be a helpful-looking
 * silent loss. That correspondence is to the subjects that *completed*, not
 * to `subjects` itself once `failures` is non-empty: a failed subject leaves
 * no row in `decisions` to occupy its original position, and reconciling the
 * two against `subjects` is `failures`'s job, not an index the caller can
 * assume.
 *
 * A fold over {@link decideSubject}, not an `Effect.forEach` that fails: one
 * flaky resolver used to fail the whole call, discarding every decision already reached for every other
 * subject in the batch — for an access review over a full tenant, exactly
 * the shape of thing this entry point exists to avoid ("the transpose of
 * `Qadi.filter`", this file's own top comment says, and `Qadi.filter` is
 * deliberately **not** changed the same way — see that function's doc
 * comment for why the two entry points cannot share this fix). This effect
 * never fails, so a caller no longer loses partial progress to a single
 * broken lookup; `failures` is where that lookup's `EvaluationError` — paired
 * with the subject it was resolving for — now goes (issue #107).
 *
 * `options.concurrency` applies to each element's own evaluation — the
 * children of its `allOf`/`anyOf`/`rules` — and never across elements
 * (BEH-QD-108).
 *
 * Sequential, and not for E3's reason: separate subjects produce separate
 * decisions and nothing combines them. A batch multiplies the load on the
 * caller's resolvers by its own length, and an unbounded fan-out onto somebody
 * else's database is not a default to choose for them.
 */
export const decideSubjects = Effect.fn("qadi.decideSubjects")(function* (
  policy: Policy,
  subjects: ReadonlyArray<AuthSubject>,
  options?: EvaluateOptions,
) {
  yield* Effect.annotateCurrentSpan({
    "qadi.subject_count": subjects.length,
    "qadi.policy_tag": policy._tag,
  });

  // Sequential: `Effect.forEach` with no `concurrency` runs one element at a time.
  const outcomes = yield* Effect.forEach(subjects, (subject) => decideSubject(policy, subject, options));

  const decisions: Array<SubjectDecision> = [];
  const failures: Array<SubjectEvaluationFailure> = [];
  for (const outcome of outcomes) {
    if (outcome._tag === "SubjectDecided") {
      decisions.push({ subject: outcome.subject, decision: outcome.decision });
    } else {
      failures.push({ subject: outcome.subject, error: outcome.error });
    }
  }

  return { decisions, failures };
});

/**
 * Keeps only the subjects a policy allows, alongside every subject whose
 * evaluation broke instead of producing a decision.
 *
 * Derived from {@link decideSubjects} rather than evaluating separately, so the
 * two can never disagree about who passes — and the one that disagreed by
 * allowing would not announce itself.
 *
 * Reports rather than enforces, like `check` and unlike `filter`: an allow
 * carrying a binding obligation is a member of `subjects`, and its duty is
 * readable only on the decision. Use {@link decideSubjects} when that matters.
 *
 * `failures` carries forward unchanged from `decideSubjects` — see that
 * function's doc comment for why a failed subject is neither an allow nor a
 * denial and must not be silently absent from both.
 */
export interface FilteredSubjects {
  readonly subjects: ReadonlyArray<AuthSubject>;
  readonly failures: ReadonlyArray<SubjectEvaluationFailure>;
}

export const filterSubjects = (
  policy: Policy,
  subjects: ReadonlyArray<AuthSubject>,
  options?: EvaluateOptions,
): Effect.Effect<FilteredSubjects, never, SubjectSetServices> =>
  Effect.map(decideSubjects(policy, subjects, options), ({ decisions, failures }) => ({
    subjects: decisions.filter((r) => isAllowed(r.decision)).map((r) => r.subject),
    failures,
  }));

/**
 * The streamed sibling of `decideSubjects`, for a review too large to hold as
 * a `ReadonlyArray` — a full tenant's user base, say, rather than a handful
 * of candidates for a sharing dialog.
 *
 * Emits one {@link SubjectOutcome} per subject, through the same
 * {@link decideSubject} step the array form folds over, so it has the array
 * form's failure isolation: a subject whose evaluation breaks is emitted as
 * `SubjectFailed` and the stream continues with the next one. The error
 * channel is the input stream's own `E2` alone.
 *
 * Sequential, for the same reason `decideSubjects` itself is and not a
 * convenience this loses: `Stream.mapEffect` with no `concurrency` given
 * processes subjects one at a time, matching `decideSubjects`'s deliberate
 * choice not to multiply the caller's own store's load by the batch size. A
 * caller who does want concurrent fan-out here is asking for something this
 * library has chosen not to default to, on both the array and streamed form
 * alike — not a gap in the streaming sibling specifically.
 *
 * Carries `qadi.policy_tag`, the one `decideSubjects` annotation known before
 * a single element runs. `qadi.subject_count` has no batch-level equivalent
 * here: `subjects` is a `Stream`, so its length is not known in advance and
 * may not even be finite — a span annotated with a count would either block
 * on consuming the whole stream first or lie about what has been seen so far.
 */
export const decideSubjectsStream = <E2 = never, R2 = never>(
  policy: Policy,
  subjects: Stream.Stream<AuthSubject, E2, R2>,
  options?: EvaluateOptions,
): Stream.Stream<SubjectOutcome, E2, SubjectSetServices | R2> =>
  subjects.pipe(
    Stream.mapEffect((subject) => decideSubject(policy, subject, options)),
    Stream.withSpan("qadi.decideSubjectsStream", {
      attributes: { "qadi.policy_tag": policy._tag },
    }),
  );

/** One outcome as `filterSubjectsStream` reports it: allowed, failed, or nothing for a denial. */
const toFilteredOutcome: (outcome: SubjectOutcome) => Option.Option<FilteredSubjectOutcome> =
  Match.type<SubjectOutcome>().pipe(
    Match.tagsExhaustive({
      SubjectDecided: (o) =>
        isAllowed(o.decision)
          ? Option.some(FilteredSubjectOutcome.SubjectAllowed({ subject: o.subject }))
          : Option.none(),
      SubjectFailed: (o) =>
        Option.some(FilteredSubjectOutcome.SubjectFailed({ subject: o.subject, error: o.error })),
    }),
  );

const keepAllowedAndFailed = Filter.fromPredicateOption(toFilteredOutcome);

/**
 * The streamed sibling of `filterSubjects` — see `decideSubjectsStream`.
 *
 * Emits every allowed subject as `SubjectAllowed` and every subject whose
 * evaluation failed as `SubjectFailed`; a denied subject is absent, a failed
 * one never is, so the consumer can tell a clean run from a partial one.
 */
export const filterSubjectsStream = <E2 = never, R2 = never>(
  policy: Policy,
  subjects: Stream.Stream<AuthSubject, E2, R2>,
  options?: EvaluateOptions,
): Stream.Stream<FilteredSubjectOutcome, E2, SubjectSetServices | R2> =>
  decideSubjectsStream(policy, subjects, options).pipe(Stream.filterMap(keepAllowedAndFailed));
