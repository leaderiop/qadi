/**
 * Every port read either interpreter makes, with its question, span, call
 * metric and defect mapping.
 *
 * `evaluate` and `toPredicate` are two interpreters over one policy tree
 * (ADR-QD-024). Before this module they agreed about *how to ask a port* only by
 * convention: the evaluator read each port through a traced, counted,
 * defect-mapped wrapper and the translator re-implemented two of those reads
 * bare, so a port that threw reached `toPredicate`'s caller as a defect while the
 * same port reached `evaluate`'s caller as a typed error (issue #100, and
 * ARCH-01's E4/E6). Each read lives here once, and each interpreter keeps only
 * what is genuinely its own: what to do with the answer.
 *
 * Deliberately out of the barrel (AGENTS.md §9): scaffolding shared by the two
 * interpreters, like `RetryingLayer.ts`, reachable only through the `./*`
 * subpath.
 */
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Metric from "effect/Metric";
import { AttributeResolver } from "./AttributeResolver.ts";
import type { AuthSubject } from "./AuthSubject.ts";
import { CustomPredicate } from "./CustomPredicate.ts";
import type { ActedResult } from "./DecisionHistory.ts";
import { DecisionHistory } from "./DecisionHistory.ts";
import {
  AttributeResolveError,
  CustomPredicateError,
  DecisionHistoryUnavailable,
  MissingResourceId,
  RelationshipResolveError,
  SignatureHistoryUnavailable,
} from "./Errors.ts";
import type { ResourceId } from "./Identity.ts";
import { makeResourceId } from "./Identity.ts";
import { DEFAULT_MAX_DEPTH } from "./Policy.ts";
import { portCallsTotal, predicatePortCallsTotal } from "./PortMetrics.ts";
import type { PredicatePortName } from "./PortMetrics.ts";
import type { RelatedResult } from "./RelationshipResolver.ts";
import { RelationshipResolver } from "./RelationshipResolver.ts";
import type { Resource } from "./Resource.ts";
import { SignatureHistory } from "./SignatureHistory.ts";

/**
 * Which interpreter is asking.
 *
 * Closed on purpose: it is annotated on every port span (`qadi.interpreter`) and
 * decides which call metric a read counts in, so a third interpreter is a
 * compile error everywhere it is matched rather than a word that silently falls
 * into the wrong series.
 */
export type Interpreter = "evaluate" | "toPredicate";

/**
 * Converts a port call's defect into its own typed error, leaving an
 * already-typed failure — or an interruption — to pass through unchanged.
 *
 * A port's declared error channel (`AttributeResolveError`, and its four
 * siblings) is a promise about what a *failure* looks like; nothing in that
 * promise said what happens when an adapter throws instead of failing, so a
 * defecting port sailed straight past `Effect.retry` (which only ever sees typed
 * errors) and reached `@qadi/http` as a bare 500 instead of the taxonomy's 502
 * (issue #100). Wrapping every port read in this module with this closes that gap
 * without changing what a well-behaved port already promised.
 *
 * Only a genuine defect is rewritten:
 * - `Cause.hasFails` — the port already failed with its declared error —
 *   passes through via `Effect.failCause`, unchanged, rather than being
 *   wrapped a second time. `retry`, `catchTag`, and everything downstream
 *   must keep seeing exactly the value the port raised.
 * - a cause with no `Fail` reason at all (a pure interruption, or an empty
 *   cause) also passes through unchanged: converting an interruption into an
 *   ordinary typed failure would let a caller's `Effect.retry` retry work
 *   that was deliberately cancelled — worse than the defect this function
 *   exists to catch, and not what "an authorization decision must never
 *   become a defect" (AGENTS.md §4) asks for.
 * - only a cause carrying a `Die` and no `Fail` becomes `onDefect(cause)`.
 *
 * Mirrors `DecisionSinkForwarding.ts`'s `Effect.catchCause` in spirit — a
 * port adapter can die as easily as `send` can — but where that swallows
 * every cause into `void`, a port call must still fail with something a
 * caller's `Effect.retry` can see, so a defect becomes the port's own typed
 * error instead of being silently absorbed.
 */
export const catchPortDefect =
  <E>(onDefect: (cause: Cause.Cause<E>) => E) =>
  <A, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    effect.pipe(
      Effect.catchCause((cause) =>
        Cause.hasFails(cause) || !Cause.hasDies(cause)
          ? Effect.failCause(cause)
          : Effect.fail(onDefect(cause)),
      ),
    );

/**
 * The call metric a read counts in, by who is asking.
 *
 * Hoisted `Match.type` (§5a): each arm returns a closure over nothing but the
 * port name, and this runs on every port read of either interpreter.
 */
const countFor: (interpreter: Interpreter) => (port: PredicatePortName) => Effect.Effect<void> =
  Match.type<Interpreter>().pipe(
    Match.when("evaluate", () => (port: PredicatePortName) => Metric.update(portCallsTotal, port)),
    Match.when(
      "toPredicate",
      () => (port: PredicatePortName) => Metric.update(predicatePortCallsTotal, port),
    ),
    Match.exhaustive,
  );

// ---------------------------------------------------------------------------
// The reads. Each is a named `Effect.fn`, because each owns a span (ADR-QD-051:
// a span says what was asked, and a tracer is what reads it back). That is why
// none is in `UNTRACED_BUDGET` — none runs once per policy *node* the way
// `evaluateAllOf`/`evaluateAnyOf`/`evaluateRules` do, and the port call under
// them is the expensive part.
// ---------------------------------------------------------------------------

/**
 * The port call, when the subject did not already have the attribute.
 *
 * A span here and not in {@link readAttribute} above it, so that a **subject hit
 * emits nothing at all**. The distinction is the one the reader wants: a span
 * named `qadi.attribute` means the resolver was asked, which is the same event
 * the call metric counts, so the trace and the metric agree about what happened
 * rather than counting two different things. It also keeps the commonest branch
 * — the attribute the subject already carries — free of any tracing cost at all.
 *
 * **The value is never recorded.** `hasActed` and `hasRelationship` answer with
 * closed three-valued enums, which are safe to annotate; an attribute resolves
 * to arbitrary data, and a span attribute goes to whatever backend is wired.
 * `qadi.resolved` says a value came back, not what it was
 * ([INV-QD-044](../../../spec/invariants.md)) — the same line
 * `dehydrateDecisions` draws with `includeTrace`.
 */
const resolveAttribute = Effect.fn("qadi.attribute")(function* (
  interpreter: Interpreter,
  subject: AuthSubject,
  attribute: string,
) {
  // Before the call, so a resolver that fails still leaves a span saying what
  // it was asked. A failed lookup with no question on it is the least useful
  // span there is.
  yield* Effect.annotateCurrentSpan({
    "qadi.attribute": attribute,
    "qadi.subject_id": subject.id,
    "qadi.interpreter": interpreter,
  });
  yield* countFor(interpreter)("AttributeResolver");
  const value = yield* AttributeResolver.resolve(subject.id, attribute).pipe(
    catchPortDefect(
      (cause) => new AttributeResolveError({ attribute, cause: Cause.squash(cause) }),
    ),
  );
  // `undefined` is the absent sentinel every fail-closed default answers with;
  // `null` is a value a store genuinely returned.
  yield* Effect.annotateCurrentSpan({ "qadi.resolved": value !== undefined });
  return value;
});

/**
 * Reads an attribute, consulting the subject first.
 *
 * The miss-only call to the resolver is what preserves short-circuiting: a
 * branch that is never evaluated never triggers a lookup. The subject-first
 * lookup is stated here once — both interpreters used to carry their own copy.
 */
export const readAttribute = (
  interpreter: Interpreter,
  subject: AuthSubject,
  attribute: string,
): Effect.Effect<unknown, AttributeResolveError, AttributeResolver> =>
  Object.hasOwn(subject.attributes, attribute)
    ? Effect.succeed(subject.attributes[attribute])
    : resolveAttribute(interpreter, subject, attribute);

/**
 * Requires a Resource-scoped question to carry a usable resource id, and hands
 * it back as the string it was checked to be.
 *
 * Returns the id rather than a bare success so the caller has no second
 * `typeof` test to write — one whose false branch would be unreachable.
 * Called with the *raw* `resource.id`, which is `unknown` until this runs; the
 * callers annotate their span with it first, so the span that records a wiring
 * error still names the question it was asked (BEH-QD-227).
 */
const requireResourceId = Effect.fn("qadi.requireScopedResourceId")(function* (
  rawResourceId: unknown,
  relation: string,
) {
  if (typeof rawResourceId !== "string") {
    return yield* Effect.fail(new MissingResourceId({ relation }));
  }
  return rawResourceId;
});

/**
 * The port half of a `HasActed`/`HasNotActed` read, once the question is formed.
 *
 * A plain function, not a span of its own: its two callers each own one.
 */
const callHasActed = (
  interpreter: Interpreter,
  subject: AuthSubject,
  event: string,
  resourceId: ResourceId | undefined,
) =>
  Effect.gen(function* () {
    yield* countFor(interpreter)("DecisionHistory");
    const answer = yield* DecisionHistory.hasActed({
      subjectId: subject.id,
      event,
      resourceId,
    }).pipe(
      catchPortDefect(
        (cause) => new DecisionHistoryUnavailable({ event, cause: Cause.squash(cause) }),
      ),
    );
    // A closed three-valued enum, so this discloses nothing a policy tag does not.
    yield* Effect.annotateCurrentSpan({ "qadi.answer": answer });
    return answer;
  });

/**
 * Asks whether the subject has ever performed `event`, about no resource in
 * particular (`scope: "Any"`).
 *
 * The answer is three-valued (`"Unknown"` matches neither polarity, so both deny
 * under an unwired port, ADR-QD-020); what to do with it is the caller's.
 */
export const askActedAny = Effect.fn("qadi.acted")(function* (
  interpreter: Interpreter,
  subject: AuthSubject,
  event: string,
) {
  // An `Any`-scoped question asks about no resource even where the request has
  // one, and the span says what was asked rather than what was available.
  yield* Effect.annotateCurrentSpan({
    "qadi.subject_id": subject.id,
    "qadi.event": event,
    "qadi.scope": "Any",
    "qadi.interpreter": interpreter,
  });
  const answer: ActedResult = yield* callHasActed(interpreter, subject, event, undefined);
  return answer;
});

/**
 * Asks whether the subject has performed `event` on one resource
 * (`scope: "Resource"`).
 *
 * Evaluator-only in practice — `toPredicate` refuses a resource-scoped history
 * question because it is keyed by the row — but the parameter is `Interpreter`
 * all the same, because nothing about the read itself is evaluator-specific.
 * Takes the raw `resource.id` and fails with `MissingResourceId` when it is not a
 * string, after annotating the span with the question.
 */
export const askActedForResource = Effect.fn("qadi.acted")(function* (
  interpreter: Interpreter,
  subject: AuthSubject,
  event: string,
  rawResourceId: unknown,
) {
  // Annotated before the `MissingResourceId` check, so the span that records a
  // wiring error still names the event it was asked about.
  yield* Effect.annotateCurrentSpan({
    "qadi.subject_id": subject.id,
    "qadi.event": event,
    "qadi.scope": "Resource",
    "qadi.interpreter": interpreter,
    ...(typeof rawResourceId === "string" ? { "qadi.resource_id": rawResourceId } : {}),
  });
  const resourceId = yield* requireResourceId(rawResourceId, event);
  const answer: ActedResult = yield* callHasActed(
    interpreter,
    subject,
    event,
    makeResourceId(resourceId),
  );
  return answer;
});

/**
 * Bounds `HasRelationship.depth` before it reaches `RelationshipResolver` as
 * traversal fuel.
 *
 * Every other untrusted numeric at this trust boundary is bounded: the policy
 * tree itself by `DEFAULT_MAX_DEPTH`, a raw decoded JSON value by
 * `MAX_DECODE_DEPTH`. `Policy.ts`'s wire schema now rejects a non-integer,
 * negative, or out-of-`[0, DEFAULT_MAX_DEPTH]` `depth` at decode — the same
 * boundary-not-runtime treatment `Matcher.ts`'s `Gte`/`Lt` give their bound —
 * so `fromJson`/`fromJsonValue` are no longer where `1e308`, a negative
 * number, or `NaN`/`Infinity` gets through. This clamp stays anyway: the
 * smart constructors (`hasRelationship`, …) are deliberately total and never
 * cross the schema (`Policy.ts`'s `makeRoleName` comment explains why), so a
 * policy built in memory with `hasRelationship("owner", { depth: -5 })` still
 * reaches `RelationshipResolver.check` unclamped without this. Reusing
 * `DEFAULT_MAX_DEPTH`'s value rather than inventing a second bound: nothing
 * here argues a relationship graph should be walked deeper than a policy tree
 * is ever allowed to be.
 */
const MAX_RELATIONSHIP_DEPTH = DEFAULT_MAX_DEPTH;

/**
 * Clamps an in-memory `HasRelationship.depth` to `[0, MAX_RELATIONSHIP_DEPTH]`
 * — defense-in-depth for policies built through the smart constructors, which
 * never cross `Policy.ts`'s decode-time bound (see the comment above).
 *
 * `undefined` passes through unchanged — "the resolver decides" is a real,
 * distinct meaning `RelationshipResolverShape.check`'s own doc comment names,
 * not an absent value to default. `NaN` fails every comparison, including
 * `<= 0`, so it is called out explicitly rather than silently falling through
 * the clamp below with no bound applied at all; a fractional depth is
 * truncated, since fuel is spent in whole hops.
 */
const clampRelationshipDepth = (depth: number | undefined): number | undefined => {
  if (depth === undefined) return undefined;
  if (Number.isNaN(depth) || depth <= 0) return 0;
  return Math.min(Math.trunc(depth), MAX_RELATIONSHIP_DEPTH);
};

/**
 * Asks the relationship resolver whether the subject holds `relation` to the
 * resource.
 *
 * Evaluator-only: `toPredicate` refuses `HasRelationship` before it would ask
 * (a relationship is keyed by the row's id and cannot fold), so the span's
 * `qadi.interpreter` is the constant `"evaluate"` and no parameter admits
 * `"toPredicate"`. Takes the raw `resource.id` and fails with `MissingResourceId`
 * when it is not a string, after annotating the span with the question.
 */
export const askRelationship = Effect.fn("qadi.hasRelationship")(function* (
  subject: AuthSubject,
  relation: string,
  rawResourceId: unknown,
  depth: number | undefined,
) {
  const clamped = clampRelationshipDepth(depth);
  // Before the check: the span that records a missing resource id should still
  // name the relation it wanted one for. Annotated with the clamped value, not
  // the raw decoded one: the span should say what was actually asked of the
  // resolver.
  yield* Effect.annotateCurrentSpan({
    "qadi.subject_id": subject.id,
    "qadi.relation": relation,
    "qadi.interpreter": "evaluate",
    ...(typeof rawResourceId === "string" ? { "qadi.resource_id": rawResourceId } : {}),
    ...(clamped === undefined ? {} : { "qadi.depth": clamped }),
  });
  if (typeof rawResourceId !== "string") {
    return yield* Effect.fail(new MissingResourceId({ relation }));
  }
  yield* Metric.update(portCallsTotal, "RelationshipResolver");
  const resourceId = makeResourceId(rawResourceId);
  const related: RelatedResult = yield* RelationshipResolver.check({
    subjectId: subject.id,
    relation,
    resourceId,
    depth: clamped,
  }).pipe(
    catchPortDefect(
      (cause) =>
        new RelationshipResolveError({ relation, resourceId, cause: Cause.squash(cause) }),
    ),
  );
  yield* Effect.annotateCurrentSpan({ "qadi.answer": related });
  return related;
});

/**
 * Asks a registered custom predicate. Evaluator-only (translation refuses
 * `HasCustom`, ADR-QD-055).
 */
export const askCustom = Effect.fn("qadi.hasCustom")(function* (
  subject: AuthSubject,
  resource: Resource | undefined,
  name: string,
  params: unknown,
) {
  yield* Effect.annotateCurrentSpan({
    "qadi.custom_predicate": name,
    "qadi.subject_id": subject.id,
    "qadi.interpreter": "evaluate",
  });
  yield* Metric.update(portCallsTotal, "CustomPredicate");
  const allowed = yield* CustomPredicate.evaluate(name, subject, resource, params).pipe(
    catchPortDefect(
      // `CustomPredicateError` has no `cause` field — unlike the other four
      // port errors, it already represents its other failure mode (an
      // unregistered name) as a human sentence in `reason`
      // (`customPredicateFromRecord`, `Evaluate.test.ts`), not as a raw
      // defect value. `Cause.pretty` matches that convention for a defect
      // too, rather than inventing a second shape `reason` can hold.
      (cause) => new CustomPredicateError({ name, reason: Cause.pretty(cause) }),
    ),
  );
  yield* Effect.annotateCurrentSpan({ "qadi.answer": allowed });
  return allowed;
});

/**
 * What `HasSignature` needs from the signatures on file: whether one matched,
 * and whether there were any at all (the deny reason distinguishes "nothing on
 * file" from "none match").
 */
export interface SignatureAnswer {
  readonly matched: boolean;
  readonly onFile: number;
}

/**
 * Asks the signature history and matches the requirement against what it
 * returns. Evaluator-only (translation refuses `HasSignature`, INV-QD-056).
 *
 * The match lives here, not in the evaluator's arm, because `qadi.matched` is
 * annotated on the span and must be there even when the verdict is built
 * elsewhere. `qadi.matched` rather than a three-valued `qadi.answer`: a
 * signature either matches or it doesn't, with no analogous middle state.
 */
export const askSignature = Effect.fn("qadi.hasSignature")(function* (
  subject: AuthSubject,
  meaning: string,
  signerRole: string | undefined,
  scope: "Resource" | "Any",
  rawResourceId: unknown,
) {
  const scoped = scope === "Resource";
  yield* Effect.annotateCurrentSpan({
    "qadi.subject_id": subject.id,
    "qadi.meaning": meaning,
    "qadi.scope": scope,
    "qadi.interpreter": "evaluate",
    ...(signerRole === undefined ? {} : { "qadi.signer_role": signerRole }),
    ...(scoped && typeof rawResourceId === "string" ? { "qadi.resource_id": rawResourceId } : {}),
  });
  const signatureResourceId = scoped
    ? makeResourceId(yield* requireResourceId(rawResourceId, meaning))
    : undefined;
  yield* Metric.update(portCallsTotal, "SignatureHistory");
  const signatures = yield* SignatureHistory.signaturesFor({
    subjectId: subject.id,
    resourceId: signatureResourceId,
  }).pipe(
    catchPortDefect(
      (cause) =>
        new SignatureHistoryUnavailable({
          subjectId: subject.id,
          resourceId: signatureResourceId,
          cause: Cause.squash(cause),
        }),
    ),
  );
  const matched = signatures.some(
    (s) => s.meaning === meaning && (signerRole === undefined || s.signerRole === signerRole),
  );
  yield* Effect.annotateCurrentSpan({ "qadi.matched": matched });
  const answer: SignatureAnswer = { matched, onFile: signatures.length };
  return answer;
});
