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
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import type { AuthSubject } from "./AuthSubject.ts";
import { CurrentSubject } from "./CurrentSubject.ts";
import type { Decision } from "./Decision.ts";
import { isAllowed } from "./Decision.ts";
import type { EvaluationError } from "./Errors.ts";
import type { EvaluateOptions, EvaluationServices } from "./Evaluate.ts";
import { evaluate } from "./Evaluate.ts";
import type { Policy } from "./Policy.ts";

/**
 * What an evaluation needs when the subject travels as a parameter.
 *
 * Written as `Exclude` rather than as a hand-listed union so that it tracks
 * {@link EvaluationServices}: E5 added a service to that union, and a
 * requirement set that quietly stopped matching the evaluator's would be a
 * worse defect than a type needing one hop to read.
 */
export type SubjectSetServices = Exclude<EvaluationServices, CurrentSubject>;

/** One subject and the decision it received. */
export interface SubjectDecision {
  readonly subject: AuthSubject;
  readonly decision: Decision;
}

/**
 * Evaluates one policy against many subjects, keeping every decision.
 *
 * The reviewable form: a denial arrives with its trace, and "denied" without
 * "why" is not something an access review can act on.
 *
 * Results preserve input order and are not deduplicated — a review is read
 * beside the list it was asked about, so position is the join key, and dropping
 * a row two subjects share an id over would be a helpful-looking silent loss.
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

  return yield* Effect.forEach(
    subjects,
    (subject): Effect.Effect<SubjectDecision, EvaluationError, SubjectSetServices> =>
      Effect.map(
        // Providing the service is what discharges the requirement, and it is
        // also what isolates the elements: each subject is evaluated exactly as
        // it would have been alone (INV-QD-016).
        Effect.provideService(evaluate(policy, options), CurrentSubject, subject),
        (decision) => ({ subject, decision }),
      ),
  );
});

/**
 * Keeps only the subjects a policy allows.
 *
 * Derived from {@link decideSubjects} rather than evaluating separately, so the
 * two can never disagree about who passes — and the one that disagreed by
 * allowing would not announce itself.
 *
 * Reports rather than enforces, like `check` and unlike `filter`: an allow
 * carrying a binding obligation is a member of this list, and its duty is
 * readable only on the decision. Use {@link decideSubjects} when that matters.
 */
export const filterSubjects = (
  policy: Policy,
  subjects: ReadonlyArray<AuthSubject>,
  options?: EvaluateOptions,
): Effect.Effect<ReadonlyArray<AuthSubject>, EvaluationError, SubjectSetServices> =>
  Effect.map(decideSubjects(policy, subjects, options), (results) =>
    results.filter((r) => isAllowed(r.decision)).map((r) => r.subject),
  );

/**
 * The streamed sibling of `decideSubjects`, for a review too large to hold as
 * a `ReadonlyArray` — a full tenant's user base, say, rather than a handful
 * of candidates for a sharing dialog.
 *
 * Sequential, for the same reason `decideSubjects` itself is and not a
 * convenience this loses: `Stream.mapEffect` with no `concurrency` given
 * processes subjects one at a time, matching `decideSubjects`'s deliberate
 * choice not to multiply the caller's own store's load by the batch size. A
 * caller who does want concurrent fan-out here is asking for something this
 * library has chosen not to default to, on both the array and streamed form
 * alike — not a gap in the streaming sibling specifically.
 */
export const decideSubjectsStream = <E2 = never, R2 = never>(
  policy: Policy,
  subjects: Stream.Stream<AuthSubject, E2, R2>,
  options?: EvaluateOptions,
): Stream.Stream<SubjectDecision, EvaluationError | E2, SubjectSetServices | R2> =>
  subjects.pipe(
    Stream.mapEffect((subject) =>
      Effect.map(
        Effect.provideService(evaluate(policy, options), CurrentSubject, subject),
        (decision): SubjectDecision => ({ subject, decision }),
      ),
    ),
  );

/** The streamed sibling of `filterSubjects` — see `decideSubjectsStream`. */
export const filterSubjectsStream = <E2 = never, R2 = never>(
  policy: Policy,
  subjects: Stream.Stream<AuthSubject, E2, R2>,
  options?: EvaluateOptions,
): Stream.Stream<AuthSubject, EvaluationError | E2, SubjectSetServices | R2> =>
  decideSubjectsStream(policy, subjects, options).pipe(
    Stream.filter((r) => isAllowed(r.decision)),
    Stream.map((r) => r.subject),
  );
