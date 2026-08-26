/**
 * Predicate output — a policy compiled into a row filter.
 *
 * The evaluator answers a question about a resource *in hand*. Row-level
 * security must decide about rows not yet loaded, so this is a **second
 * interpreter over the same tree**, returning a different type under a different
 * contract (ADR-QD-024).
 *
 * Two interpreters must agree, and nothing structural makes them. What makes
 * them here is that the predicate is executable: `evaluatePredicate` is the
 * reference semantics, so the agreement is a property that can be *run* rather
 * than an argument that is made (INV-QD-018). It is also what lets a caller
 * differential-test the SQL compiler they wrote against what Qadi meant.
 */
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Metric from "effect/Metric";
import { AttributeResolver } from "./AttributeResolver.ts";
import type { AuthSubject } from "./AuthSubject.ts";
import { CurrentSubject } from "./CurrentSubject.ts";
import { DecisionHistory } from "./DecisionHistory.ts";
import type { ActedResult } from "./DecisionHistory.ts";
import type { AttributeResolveError, DecisionHistoryUnavailable } from "./Errors.ts";
import { MissingAction, PolicyNotTranslatable, PolicyTooDeep } from "./Errors.ts";
import type { Matcher, MatcherContext, ValueRef } from "./Matcher.ts";
import {
  evaluateMatcher,
  getByPath,
  referencesAction,
  referencesResource,
} from "./Matcher.ts";
import { permissionKey } from "./Permission.ts";
import { DEFAULT_MAX_DEPTH } from "./Policy.ts";
import type { Policy, Rule } from "./Policy.ts";

// ---------------------------------------------------------------------------
// The predicate
// ---------------------------------------------------------------------------

export type CompareOp = "Eq" | "Neq" | "Gte" | "Lt";

/**
 * A filter over rows. No SQL, no dialect, no database dependency.
 *
 * Hand-written with **no `Schema`**, unlike `Policy`. That is the ADR-QD-002
 * boundary applied rather than forgotten: a policy is persisted and re-parsed
 * from untrusted JSON, and a predicate is produced and consumed in the same
 * process — like `Decision` and `Trace`, which carry no codec either.
 */
export type Predicate =
  | { readonly _tag: "True" }
  | { readonly _tag: "False" }
  | {
      readonly _tag: "Compare";
      readonly column: string;
      readonly op: CompareOp;
      readonly value: unknown;
    }
  | {
      readonly _tag: "MemberOf";
      readonly column: string;
      readonly values: ReadonlyArray<unknown>;
    }
  | { readonly _tag: "And"; readonly predicates: ReadonlyArray<Predicate> }
  | { readonly _tag: "Or"; readonly predicates: ReadonlyArray<Predicate> }
  | { readonly _tag: "Negate"; readonly predicate: Predicate };

const TRUE: Predicate = { _tag: "True" };
const FALSE: Predicate = { _tag: "False" };

const constant = (value: boolean): Predicate => (value ? TRUE : FALSE);

/**
 * Conjunction, simplifying as it builds.
 *
 * Not tidiness. Every subject-side node folds to a constant, so an unsimplified
 * result is mostly `True`, and the one outcome worth naming falls out of this:
 * a policy that reduces to `False` means **do not run the query**.
 */
const and = (predicates: ReadonlyArray<Predicate>): Predicate => {
  const kept: Array<Predicate> = [];
  for (const p of predicates) {
    if (p._tag === "False") return FALSE;
    if (p._tag === "True") continue;
    kept.push(p);
  }
  const first = kept[0];
  if (first === undefined) return TRUE;
  return kept.length === 1 ? first : { _tag: "And", predicates: kept };
};

const or = (predicates: ReadonlyArray<Predicate>): Predicate => {
  const kept: Array<Predicate> = [];
  for (const p of predicates) {
    if (p._tag === "True") return TRUE;
    if (p._tag === "False") continue;
    kept.push(p);
  }
  const first = kept[0];
  if (first === undefined) return FALSE;
  return kept.length === 1 ? first : { _tag: "Or", predicates: kept };
};

const negate = (predicate: Predicate): Predicate => {
  if (predicate._tag === "True") return FALSE;
  if (predicate._tag === "False") return TRUE;
  return { _tag: "Negate", predicate };
};

const compare = (op: CompareOp, value: unknown, against: unknown): boolean =>
  Match.value(op).pipe(
    Match.when("Eq", () => value === against),
    Match.when("Neq", () => value !== against),
    // Mirrors `Gte`/`Lt` in the matcher, which are false for a non-number: a
    // divergence here is a row the evaluator would have refused.
    Match.when(
      "Gte",
      () => typeof value === "number" && typeof against === "number" && value >= against,
    ),
    Match.when(
      "Lt",
      () => typeof value === "number" && typeof against === "number" && value < against,
    ),
    Match.exhaustive,
  );

/**
 * The reference semantics of a predicate, applied to one row.
 *
 * This is what makes a second interpreter trustworthy rather than merely
 * plausible. Callers compiling to SQL should differential-test against it.
 */
export const evaluatePredicate = (
  self: Predicate,
  row: Readonly<Record<string, unknown>>,
): boolean =>
  Match.value(self).pipe(
    Match.tagsExhaustive({
      True: () => true,
      False: () => false,
      Compare: (p) => compare(p.op, row[p.column], p.value),
      MemberOf: (p) => p.values.includes(row[p.column]),
      And: (p) => p.predicates.every((inner) => evaluatePredicate(inner, row)),
      Or: (p) => p.predicates.some((inner) => evaluatePredicate(inner, row)),
      Negate: (p) => !evaluatePredicate(p.predicate, row),
    }),
  );

// ---------------------------------------------------------------------------
// Translation
// ---------------------------------------------------------------------------

/**
 * What translation needs.
 *
 * Narrower than `EvaluationServices` and listed rather than derived: the set is
 * chosen by *what folds to a constant*, not by subtraction. `RelationshipResolver`
 * is absent because a relationship is keyed by `resourceId` and cannot fold, and
 * `EvaluationId` because no decision is produced.
 */
export type PredicateServices = CurrentSubject | AttributeResolver | DecisionHistory;

export interface PredicateOptions {
  /**
   * What the caller is doing. A property of the request, so it folds — but a
   * policy that reads it without one supplied fails, exactly as in the
   * evaluator (INV-QD-011).
   */
  readonly action?: string;
  /** Maximum policy tree depth. Bounds recursion on hostile decoded input. */
  readonly maxDepth?: number;
}

const untranslatable = (
  policyTag: string,
  reason: string,
): Effect.Effect<never, PolicyNotTranslatable> =>
  Effect.fail(new PolicyNotTranslatable({ policyTag, reason }));

type Folded = { readonly ok: true; readonly value: unknown } | { readonly ok: false };

/**
 * Resolves the constant side of a comparison, or reports that there is none.
 *
 * Mirrors the matcher's `resolveRef`, which is private to that module. The
 * duplication is four lines and the alternative is exporting a helper whose
 * whole meaning is "the evaluator's internals"; what matters is that both read
 * the same four cases the same way, and the agreement property is what says
 * they do.
 */
const constantRef = (ref: ValueRef, context: MatcherContext): Folded =>
  Match.value(ref).pipe(
    Match.tagsExhaustive({
      SubjectRef: (r): Folded => ({ ok: true, value: getByPath(context.subject, r.path) }),
      SubjectIdRef: (): Folded => ({ ok: true, value: context.subjectId }),
      ActionRef: (): Folded => ({ ok: true, value: context.action }),
      LiteralRef: (r): Folded => ({ ok: true, value: r.value }),
      // A second column. `column op column` is the one comparison `Predicate`
      // cannot express, and a dotted path names a column no schema has.
      ResourceRef: (): Folded => ({ ok: false }),
    }),
  );

/** Translates a resource-attribute matcher into a column comparison. */
const columnPredicate = (
  column: string,
  matcher: Matcher,
  context: MatcherContext,
): Predicate | undefined => {
  /** `Eq` and `Neq` are the only matchers whose other side may be a column. */
  const comparison = (op: "Eq" | "Neq", ref: ValueRef): Predicate | undefined => {
    const other = constantRef(ref, context);
    return other.ok ? { _tag: "Compare", column, op, value: other.value } : undefined;
  };
  return Match.value(matcher).pipe(
    Match.tagsExhaustive({
      Eq: (m) => comparison("Eq", m.ref),
      Neq: (m) => comparison("Neq", m.ref),
      Gte: (m): Predicate => ({ _tag: "Compare", column, op: "Gte", value: m.value }),
      Lt: (m): Predicate => ({ _tag: "Compare", column, op: "Lt", value: m.value }),
      In: (m): Predicate => ({ _tag: "MemberOf", column, values: m.values }),
      Dominates: () => undefined,
      Exists: () => undefined,
      Contains: () => undefined,
      FieldMatch: () => undefined,
      SomeMatch: () => undefined,
      EveryMatch: () => undefined,
      Size: () => undefined,
    }),
  );
};

/** True when any node in the tree restricts visible fields. */
const restrictsFields: (policy: Policy) => boolean = Match.type<Policy>().pipe(
  Match.tagsExhaustive({
    HasPermission: (p) => p.fields !== undefined,
    HasAttribute: (p) => p.fields !== undefined,
    HasResourceAttribute: (p) => p.fields !== undefined,
    HasRelationship: (p) => p.fields !== undefined,
    HasAction: (p) => p.fields !== undefined,
    HasActed: (p) => p.fields !== undefined,
    HasNotActed: (p) => p.fields !== undefined,
    HasCustom: (p) => p.fields !== undefined,
    HasSignature: (p) => p.fields !== undefined,
    HasRole: () => false,
    AllOf: (p) => p.policies.some(restrictsFields),
    AnyOf: (p) => p.policies.some(restrictsFields),
    Rules: (p) => p.rules.some((r) => restrictsFields(r.condition)),
    Not: (p) => restrictsFields(p.policy),
    Obliged: (p) => restrictsFields(p.policy),
    Labeled: (p) => restrictsFields(p.policy),
  }),
);

/**
 * The subset of {@link EvaluationError} `translateNode`/`toPredicate` can
 * actually raise — a `HasRelationship` node always short-circuits to
 * `PolicyNotTranslatable` before touching `RelationshipResolver`, and a
 * predicate translation never carries a resource, so `MissingResource` and
 * `MissingResourceId` cannot occur here by construction.
 */
type PredicateError = AttributeResolveError | DecisionHistoryUnavailable | MissingAction | PolicyTooDeep;

const translateNode = (
  policy: Policy,
  subject: AuthSubject,
  action: string | undefined,
  depth: number,
  maxDepth: number,
): Effect.Effect<
  Predicate,
  PolicyNotTranslatable | PredicateError,
  AttributeResolver | DecisionHistory
> => {
  if (depth > maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth }));

  const context: MatcherContext = {
    subject: subject.attributes,
    subjectId: subject.id,
    // There is no resource: that is the whole point. A matcher that reads one
    // is rejected rather than folded against `undefined`.
    resource: undefined,
    action,
  };

  const child = (p: Policy) => translateNode(p, subject, action, depth + 1, maxDepth);

  /** Folds a subject-side attribute question to a constant. */
  const foldAttribute = (attribute: string, matcher: Matcher) => {
    // Folds against the subject — but only if it does not reach for a column on
    // the other side of the comparison.
    if (referencesResource(matcher)) {
      return untranslatable(
        "HasAttribute",
        "the matcher compares against the resource, which is a column",
      );
    }
    if (action === undefined && referencesAction(matcher)) {
      return Effect.fail(new MissingAction({ expected: undefined }));
    }
    const read = Object.hasOwn(subject.attributes, attribute)
      ? Effect.succeed(subject.attributes[attribute])
      : AttributeResolver.resolve(subject.id, attribute);
    return Effect.map(read, (value) => constant(evaluateMatcher(matcher, value, context)));
  };

  /**
   * The scope is what decides a history question. `"Any"` asks about the
   * subject and folds; `"Resource"` asks once per row, which is the cost a
   * predicate exists to avoid.
   */
  const foldHistory = (
    tag: "HasActed" | "HasNotActed",
    event: string,
    scope: "Resource" | "Any",
  ) => {
    if (scope === "Resource") {
      return untranslatable(tag, "a resource-scoped history question is keyed by the row");
    }
    const wanted: ActedResult = tag === "HasActed" ? "Acted" : "NotActed";
    return Effect.map(
      DecisionHistory.hasActed({ subjectId: subject.id, event, resourceId: undefined }),
      (answer) => constant(answer === wanted),
    );
  };

  return Match.value(policy).pipe(
    Match.tagsExhaustive({
      HasRole: (p) => Effect.succeed(constant(subject.roles.has(p.role))),

      HasPermission: (p) =>
        Effect.succeed(constant(subject.permissions.has(permissionKey(p.permission)))),

      HasAction: (p) =>
        action === undefined
          ? Effect.fail(new MissingAction({ expected: p.action }))
          : Effect.succeed(constant(action === p.action)),

      HasAttribute: (p) => foldAttribute(p.attribute, p.matcher),

      HasResourceAttribute: (p) => {
        if (action === undefined && referencesAction(p.matcher)) {
          return Effect.fail(new MissingAction({ expected: undefined }));
        }
        const compiled = columnPredicate(p.attribute, p.matcher, context);
        return compiled === undefined
          ? untranslatable(
              "HasResourceAttribute",
              `matcher '${p.matcher._tag}' on column '${p.attribute}' has no predicate form`,
            )
          : Effect.succeed(compiled);
      },

      HasActed: (p) => foldHistory("HasActed", p.event, p.scope),
      HasNotActed: (p) => foldHistory("HasNotActed", p.event, p.scope),

      HasRelationship: () =>
        untranslatable(
          "HasRelationship",
          "a relationship is keyed by the row's id and cannot fold",
        ),

      // Opaque, externally-registered logic — there is nothing here to fold,
      // and approximating it would be exactly the failure mode ADR-QD-024
      // refuses (ADR-QD-055).
      HasCustom: (p) =>
        untranslatable(
          "HasCustom",
          `'${p.name}' is opaque, externally-registered logic and cannot be reduced to a resource-independent expression`,
        ),

      // Looked up through an external port (SignatureHistory), keyed by
      // subject/resource — not a column any row carries, the same reason
      // HasRelationship refuses rather than HasCustom's opacity reason
      // (INV-QD-056).
      HasSignature: () =>
        untranslatable(
          "HasSignature",
          "a signature is looked up through an external port and cannot fold into a resource-independent expression",
        ),

      // INV-QD-013 reaching a construct it could not otherwise reach: a
      // predicate has no channel to carry a duty, so rows selected by one would
      // be handed over with a condition nobody was told about.
      Obliged: () =>
        untranslatable(
          "Obliged",
          "a predicate cannot carry an obligation, and rows would be handed over with it unmet",
        ),

      AllOf: (p) => Effect.map(Effect.forEach(p.policies, child), and),
      AnyOf: (p) => Effect.map(Effect.forEach(p.policies, child), or),
      Not: (p) => Effect.map(child(p.policy), negate),

      // Transparent. The label survives only in the caller's own logging; a
      // predicate has no trace to put it on.
      Labeled: (p) => child(p.policy),

      Rules: (p) => translateRules(p, child),
    }),
  );
};

/**
 * A rule table as a set-based formula.
 *
 * The overrides do not depend on position, so each is one line. `FirstApplicable`
 * does, and pays for it: every `Permit` row must exclude every row above it, so
 * an n-row table becomes O(n²) conjuncts. That is the honest cost of pushing an
 * ordered walk into an engine that has no order.
 */
const translateRules = (
  policy: Extract<Policy, { _tag: "Rules" }>,
  child: (
    p: Policy,
  ) => Effect.Effect<
    Predicate,
    PolicyNotTranslatable | PredicateError,
    AttributeResolver | DecisionHistory
  >,
): Effect.Effect<
  Predicate,
  PolicyNotTranslatable | PredicateError,
  AttributeResolver | DecisionHistory
> =>
  Effect.map(
    Effect.forEach(policy.rules, (rule: Rule) =>
      Effect.map(child(rule.condition), (condition) => ({ rule, condition })),
    ),
    (translated) => {
      // Carrying `rule` and `condition` together, rather than indexing two
      // parallel arrays back into alignment, makes a reorder-one-without-the-
      // other bug unrepresentable rather than merely unlikely.
      const permits = translated
        .filter(({ rule }) => rule.effect === "Permit")
        .map(({ condition }) => condition);
      const denies = translated
        .filter(({ rule }) => rule.effect === "Deny")
        .map(({ condition }) => condition);

      return Match.value(policy.combining).pipe(
        // A Permit anywhere decides; otherwise a Deny does, or nothing applied.
        // Both remaining cases refuse.
        Match.when("PermitOverrides", () => or(permits)),
        Match.when("DenyOverrides", () => and([negate(or(denies)), or(permits)])),
        Match.when("FirstApplicable", () =>
          or(
            translated.map(({ rule, condition }, index) =>
              rule.effect === "Permit"
                ? and([
                    ...translated.slice(0, index).map(({ condition: c }) => negate(c)),
                    condition,
                  ])
                : FALSE,
            ),
          ),
        ),
        Match.exhaustive,
      );
    },
  );

/**
 * Successful policy-to-`Predicate` translations.
 *
 * The complementary case to `PolicyNotTranslatable`, which is already a typed
 * failure a caller can catch and count on its own: this is a metric a
 * deployment can watch for the successful path without wiring a catch clause
 * of its own, the same reason `Evaluate.ts`'s `qadi_decisions_total` exists.
 */
const predicatesTranslatedTotal = Metric.counter("qadi_predicates_translated_total", {
  description: "Policies successfully compiled to a Predicate by `toPredicate`.",
});

/**
 * Compiles a policy into a filter over rows the caller has not loaded.
 *
 * Fails rather than approximates. A node outside the translatable subset
 * rendered as `True` would return rows the policy denies — the one failure mode
 * that makes this feature worse than its absence (ADR-QD-024).
 *
 * Answers **which rows**, never which columns: a policy carrying a `fields`
 * restriction is refused, because a row filter alone would let a caller select
 * columns the policy withheld. Narrow the page with this, then judge the columns
 * with `decide` and `project`.
 */
export const toPredicate = Effect.fn("qadi.toPredicate")(function* (
  policy: Policy,
  options?: PredicateOptions,
) {
  const subject = yield* CurrentSubject;

  if (restrictsFields(policy)) {
    return yield* untranslatable(
      policy._tag,
      "the policy restricts visible fields, and a predicate selects rows rather than columns",
    );
  }

  const predicate = yield* translateNode(
    policy,
    subject,
    options?.action,
    0,
    options?.maxDepth ?? DEFAULT_MAX_DEPTH,
  );

  yield* Effect.annotateCurrentSpan({
    "qadi.subject_id": subject.id,
    "qadi.policy_tag": policy._tag,
    "qadi.predicate_tag": predicate._tag,
  });

  yield* Metric.update(predicatesTranslatedTotal, 1);

  return predicate;
});
