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
import type { AttributeResolver } from "./AttributeResolver.ts";
import type { AuthSubject } from "./AuthSubject.ts";
import { CurrentSubject } from "./CurrentSubject.ts";
import type { DecisionHistory } from "./DecisionHistory.ts";
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
import { DEFAULT_MAX_DEPTH, fieldsOf, foldPolicy, policyDepth } from "./Policy.ts";
import { askActedAny, readAttribute } from "./PortAccess.ts";
import type { Combining, Policy, RuleEffect } from "./Policy.ts";
import { isRangeBound } from "./PredicateLiteral.ts";
import { anyOfStopsAtAllow, rulesDecisiveEffect } from "./ShortCircuit.ts";

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

/**
 * Dispatches through a `Match.type<CompareOp>()` built once at module scope,
 * mirroring `dispatchPredicate` above and for the identical reason
 * (AGENTS.md §5a): `compare` runs once per `Compare` node **per row**, on
 * `evaluatePredicate`'s own reference-interpreter path that the predicate-sql
 * and predicate-prisma differential property tests drive at 150 predicates ×
 * 12 rows per property (`Agreement.test.ts`) — exactly the per-row hot path
 * §5a measures a per-call `Match.value` rebuild at 3.5–7.7× slower on
 * (JC-03, AN-04). `value`/`against` are call-time state a matcher built once
 * at module scope cannot see, so — the same shape `dispatchPredicate` already
 * uses for `row` — each arm returns a closure over them rather than reading
 * them directly.
 */
const dispatchCompare: (op: CompareOp) => (value: unknown, against: unknown) => boolean =
  Match.type<CompareOp>().pipe(
    // Mirrors `Matcher.ts`'s `Eq`/`Neq` (CCR-QD-112): an absent operand —
    // either a missing column or a subject-side ref that resolved to
    // nothing — denies rather than comparing. Without this,
    // `evaluatePredicate` and `evaluateMatcher` would disagree on exactly
    // the shapes `PROPERTY: the two interpreters agree, row by row` fuzzes.
    Match.when(
      "Eq",
      () => (value: unknown, against: unknown) =>
        value !== undefined && against !== undefined && value === against,
    ),
    Match.when(
      "Neq",
      () => (value: unknown, against: unknown) =>
        value !== undefined && against !== undefined && value !== against,
    ),
    // Both operands must be finite numbers, exactly as in `evaluateMatcher`'s
    // `Gte`/`Lt` (BEH-QD-027, CCR-QD-116); `isRangeBound` (`PredicateLiteral.ts`)
    // is that check, and as a type predicate it leaves no `typeof` half behind.
    //
    // Until CCR-QD-172 only the bound was guarded (issue #65, CCR-QD-120), on
    // the belief that the two interpreters could not disagree about a
    // non-finite *row* value. They did: the matcher denies `Infinity >= x`, so `gte(3)` admitted an `Infinity` row and `lt(3)` a
    // `-Infinity` row here while `evaluate` denied both — an INV-QD-018
    // divergence in the fail-open direction.
    Match.when(
      "Gte",
      () => (value: unknown, against: unknown) =>
        isRangeBound(value) && isRangeBound(against) && value >= against,
    ),
    Match.when(
      "Lt",
      () => (value: unknown, against: unknown) =>
        isRangeBound(value) && isRangeBound(against) && value < against,
    ),
    Match.exhaustive,
  );

const compare = (op: CompareOp, value: unknown, against: unknown): boolean =>
  dispatchCompare(op)(value, against);

/**
 * The reference semantics of a predicate, applied to one row.
 *
 * This is what makes a second interpreter trustworthy rather than merely
 * plausible. Callers compiling to SQL should differential-test against it.
 *
 * Dispatches through a `Match.type<Predicate>()` built once at module scope,
 * per AGENTS.md §5a's guidance for a per-row, per-node hot path — this
 * replaces a `Match.value(self)` that was rebuilt on every call, the form a
 * naive conversion produces and the one §5a measures as 3.5–7.7x slower at
 * the dispatch site. `row` is call-time state a matcher built once at module
 * scope cannot see, so — exactly like the four house-style-budgeted switches
 * this is *not* one of — each arm returns a closure over `row` rather than
 * reading it directly. Matcher.ts's `referencesAction`/`referencesResource`
 * (imported below, used further down) need no such closure because they take
 * no second argument; `restrictsFields` (below) is a fold over `Policy.ts`'s
 * `fieldsOf` and dispatches on nothing here.
 */
type Row = Readonly<Record<string, unknown>>;

const dispatchPredicate: (self: Predicate) => (row: Row) => boolean = Match.type<Predicate>().pipe(
  Match.tagsExhaustive({
    True: () => (_row: Row) => true,
    False: () => (_row: Row) => false,
    Compare: (p) => (row: Row) => compare(p.op, row[p.column], p.value),
    MemberOf: (p) => (row: Row) => p.values.includes(row[p.column]),
    And: (p) => (row: Row) => p.predicates.every((inner) => evaluatePredicate(inner, row)),
    Or: (p) => (row: Row) => p.predicates.some((inner) => evaluatePredicate(inner, row)),
    Negate: (p) => (row: Row) => !evaluatePredicate(p.predicate, row),
  }),
);

export const evaluatePredicate = (
  self: Predicate,
  row: Readonly<Record<string, unknown>>,
): boolean => dispatchPredicate(self)(row);

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

const isTrue = (value: boolean): boolean => value;

/**
 * True when any node in the tree restricts visible fields.
 *
 * `toPredicate` calls this *before* `compile` (which demands the proof it feeds),
 * over a policy already shown to be within `maxDepth`. A plain fold over
 * `Policy.ts`'s `fieldsOf` — which tags carry `fields` is that module's fact, not
 * a list kept here (ARCH-02 C4) — so a new tag that narrows visibility is a
 * compile error there rather than a silent `false` here. Stack-safe through
 * `foldPolicy`, which matters because the caller chooses `maxDepth`: the guard
 * used to be only as good as that number, and `toPredicate(not^1000(…), {
 * maxDepth: 1e9 })` threw a raw `RangeError` from the old native recursion.
 */
const restrictsFields = (policy: Policy): boolean =>
  foldPolicy<boolean>(
    policy,
    (node, children) => fieldsOf(node) !== undefined || children.some(isTrue),
  );

/**
 * A tree shown to be no deeper than `maxDepth`, and whether any node in it
 * restricts visible fields.
 *
 * Also the proof `compile` demands: only {@link checkFields} constructs one, so
 * "the depth was already checked" is something the type checker proves rather
 * than a second runtime guard whose failing branch could never run — an
 * unkillable mutant.
 */
class Checked {
  constructor(readonly restricts: boolean) {}
}

/**
 * The depth check, as a result: `undefined` when the policy nests deeper than
 * `maxDepth`, otherwise the {@link Checked} proof.
 *
 * Depth is judged first and from the policy alone (`policyDepth`, which counts
 * matcher nesting too), so a policy that is both too deep and field-restricting
 * is always `PolicyTooDeep` — independent of child order, as the evaluator's own
 * root check is independent of who is asking (ARCH-02 D-02-e, N4).
 */
const checkFields = (policy: Policy, maxDepth: number): Checked | undefined =>
  policyDepth(policy) > maxDepth ? undefined : new Checked(restrictsFields(policy));

/**
 * What a translation can fail with once it is running — a port that failed, or
 * an action nobody supplied. Refusals and depth are decided before anything runs
 * (see {@link compile}), so `PolicyNotTranslatable` and `PolicyTooDeep` are not
 * in this set.
 */
type RunError = AttributeResolveError | DecisionHistoryUnavailable | MissingAction;

/**
 * A translation, planned.
 *
 * What `compile` produces and `run` walks. Closed, so `run` is exhaustive over
 * it: a node that cannot be translated is not a member, and `run` never meets
 * one — the refusal is `compile`'s output, not an arm `run` could reach.
 */
type Plan =
  | { readonly _tag: "Constant"; readonly value: boolean }
  | { readonly _tag: "Column"; readonly predicate: Predicate }
  | { readonly _tag: "AskAttribute"; readonly attribute: string; readonly matcher: Matcher }
  | { readonly _tag: "AskActed"; readonly wanted: ActedResult; readonly event: string }
  | { readonly _tag: "NeedAction"; readonly expected: string | undefined }
  | { readonly _tag: "Conjunction"; readonly plans: ReadonlyArray<Plan> }
  | {
      readonly _tag: "Disjunction";
      readonly plans: ReadonlyArray<Plan>;
      readonly stopsAtTrue: boolean;
    }
  | { readonly _tag: "Negation"; readonly plan: Plan }
  | {
      readonly _tag: "RuleTable";
      readonly rules: ReadonlyArray<{ readonly effect: RuleEffect; readonly plan: Plan }>;
      readonly combining: Combining;
    };

/**
 * A node `compile` refuses: outside the translatable subset
 * (`PolicyNotTranslatable`). A class rather than a tagged object so that telling
 * a refusal from a plan is an `instanceof`, with no discriminant literal on the
 * plan side that nothing would ever read.
 */
class Refusal {
  constructor(
    readonly policyTag: string,
    readonly reason: string,
  ) {}
}

type Compiled = Plan | Refusal;

/** Widens a plan to {@link Compiled}, so a literal's `_tag` is not re-inferred as `string`. */
const planned = (plan: Plan): Compiled => plan;

const refused = (policyTag: string, reason: string): Compiled => new Refusal(policyTag, reason);

/** What a matcher sees: the subject, the request's action, and no resource. */
const matcherContextFor = (subject: AuthSubject, action: string | undefined): MatcherContext => ({
  subject: subject.attributes,
  subjectId: subject.id,
  // There is no resource: that is the whole point. A matcher that reads one
  // is rejected rather than folded against `undefined`.
  resource: undefined,
  action,
});

/**
 * Plans one `Policy` tree — or refuses it. Pure and synchronous.
 *
 * Every property of the *tree* is decided here: whether a node is in the
 * translatable subset (`PolicyNotTranslatable`, BEH-QD-123) and, by the
 * {@link Checked} proof it demands, whether it is too deep. None of it
 * depends on the subject's attributes, the action, or what any port answers, so
 * a policy that refuses for one caller refuses for all of them — it cannot work
 * for an admin in development and fail in production. The first refusal in
 * depth-first declaration order wins.
 *
 * What is *not* decided here is what depends on the request and the stores: an
 * absent action becomes a `NeedAction` node and fails only if `run` reaches it
 * (INV-QD-011), exactly as the evaluator fails only on reach.
 */
const compileTree = (
  policy: Policy,
  subject: AuthSubject,
  action: string | undefined,
): Compiled => {
  const context = matcherContextFor(subject, action);

  /** Plans every folded child in order, stopping at the first refusal. */
  const plansOf = (folded: ReadonlyArray<Compiled>): ReadonlyArray<Plan> | Refusal => {
    const plans: Array<Plan> = [];
    for (const compiled of folded) {
      if (compiled instanceof Refusal) return compiled;
      plans.push(compiled);
    }
    return plans;
  };

  /**
   * The one child a wrapper folded, or a thrown invariant failure: `Not` and
   * `Labeled` always fold exactly one, by construction of `childrenOf`.
   */
  const onlyChild = (tag: string, folded: ReadonlyArray<Compiled>): Compiled => {
    const [first, ...rest] = folded;
    if (first === undefined || rest.length !== 0) {
      throw new Error(`toPredicate: ${tag} expected exactly one child, got ${folded.length}`);
    }
    return first;
  };

  /**
   * The scope is what decides a history question. `"Any"` asks about the
   * subject and folds; `"Resource"` asks once per row, which is the cost a
   * predicate exists to avoid.
   */
  const history = (
    tag: "HasActed" | "HasNotActed",
    event: string,
    scope: "Resource" | "Any",
  ): Compiled =>
    scope === "Resource"
      ? refused(tag, "a resource-scoped history question is keyed by the row")
      : planned({
          _tag: "AskActed",
          wanted: tag === "HasActed" ? "Acted" : "NotActed",
          event,
        });

  /**
   * One node's plan, from its already-compiled children, supplied in
   * `childrenOf`'s order (a leaf's `folded` is empty).
   */
  const compileNode = (node: Policy, folded: ReadonlyArray<Compiled>): Compiled =>
  Match.value(node).pipe(
    Match.tagsExhaustive({
      HasRole: (p) => planned({ _tag: "Constant", value: subject.roles.has(p.role) }),

      HasPermission: (p) =>
        planned({ _tag: "Constant", value: subject.permissions.has(permissionKey(p.permission)) }),

      HasAction: (p) =>
        action === undefined
          ? planned({ _tag: "NeedAction", expected: p.action })
          : planned({ _tag: "Constant", value: action === p.action }),

      HasAttribute: (p) => {
        // Folds against the subject — but only if it does not reach for a column
        // on the other side of the comparison.
        if (referencesResource(p.matcher)) {
          return refused(
            "HasAttribute",
            "the matcher compares against the resource, which is a column",
          );
        }
        if (action === undefined && referencesAction(p.matcher)) {
          return planned({ _tag: "NeedAction", expected: undefined });
        }
        return planned({ _tag: "AskAttribute", attribute: p.attribute, matcher: p.matcher });
      },

      HasResourceAttribute: (p) => {
        if (action === undefined && referencesAction(p.matcher)) {
          return planned({ _tag: "NeedAction", expected: undefined });
        }
        const column = columnPredicate(p.attribute, p.matcher, context);
        return column === undefined
          ? refused(
              "HasResourceAttribute",
              `matcher '${p.matcher._tag}' on column '${p.attribute}' has no predicate form`,
            )
          : planned({ _tag: "Column", predicate: column });
      },

      HasActed: (p) => history("HasActed", p.event, p.scope),
      HasNotActed: (p) => history("HasNotActed", p.event, p.scope),

      HasRelationship: () =>
        refused("HasRelationship", "a relationship is keyed by the row's id and cannot fold"),

      // Opaque, externally-registered logic — there is nothing here to fold,
      // and approximating it would be exactly the failure mode ADR-QD-024
      // refuses (ADR-QD-055).
      HasCustom: (p) =>
        refused(
          "HasCustom",
          `'${p.name}' is opaque, externally-registered logic and cannot be reduced to a resource-independent expression`,
        ),

      // Looked up through an external port (SignatureHistory), keyed by
      // subject/resource — not a column any row carries, the same reason
      // HasRelationship refuses rather than HasCustom's opacity reason
      // (INV-QD-056).
      HasSignature: () =>
        refused(
          "HasSignature",
          "a signature is looked up through an external port and cannot fold into a resource-independent expression",
        ),

      // INV-QD-013 reaching a construct it could not otherwise reach: a
      // predicate has no channel to carry a duty, so rows selected by one would
      // be handed over with a condition nobody was told about.
      Obliged: () =>
        refused(
          "Obliged",
          "a predicate cannot carry an obligation, and rows would be handed over with it unmet",
        ),

      AllOf: () => {
        const plans = plansOf(folded);
        return plans instanceof Refusal ? plans : planned({ _tag: "Conjunction", plans });
      },

      AnyOf: (p) => {
        const plans = plansOf(folded);
        return plans instanceof Refusal
          ? plans
          : planned({
              _tag: "Disjunction",
              plans,
              stopsAtTrue: anyOfStopsAtAllow(p.fieldStrategy),
            });
      },

      Not: () => {
        const plan = onlyChild("Not", folded);
        return plan instanceof Refusal ? plan : planned({ _tag: "Negation", plan });
      },

      // Transparent. The label survives only in the caller's own logging; a
      // predicate has no trace to put it on.
      Labeled: () => onlyChild("Labeled", folded),

      Rules: (p) => {
        const plans = plansOf(folded);
        if (plans instanceof Refusal) return plans;
        // Carrying the effect and its plan together, rather than indexing two
        // parallel arrays back into alignment, makes a reorder-one-without-the-
        // other bug unrepresentable rather than merely unlikely. The plans arrive
        // in row order, so one iterator pairs each row with its own.
        const remaining = plans[Symbol.iterator]();
        const rules: Array<{ readonly effect: RuleEffect; readonly plan: Plan }> = [];
        for (const rule of p.rules) {
          const next = remaining.next();
          if (next.done) throw new Error("toPredicate: Rules folded fewer children than rows");
          rules.push({ effect: rule.effect, plan: next.value });
        }
        return planned({ _tag: "RuleTable", rules, combining: p.combining });
      },
    }),
  );

  // Folded through `foldPolicy`, not recursed natively: a caller-held policy has
  // no decode bound and `maxDepth` is the caller's to set arbitrarily high. Every
  // child is compiled before its parent, which is harmless because compiling is
  // pure, and the first refusal in declaration order still wins because
  // `plansOf` takes the first one it meets in `childrenOf`'s order.
  return foldPolicy<Compiled>(policy, compileNode);
};

/**
 * {@link compileTree}, for a tree already shown to be within `maxDepth`.
 *
 * The {@link Checked} parameter is a proof, not data: it is never read, and
 * exists so a caller cannot reach the walk without having checked the depth.
 */
const compile = (
  policy: Policy,
  subject: AuthSubject,
  action: string | undefined,
  _checked: Checked,
): Compiled => compileTree(policy, subject, action);

/**
 * A rule table as a set-based formula, over the conditions `run` asked.
 *
 * The overrides do not depend on position, so each is one line. `FirstApplicable`
 * does, and pays for it: every `Permit` row must exclude every row above it, so
 * an n-row table becomes O(n²) conjuncts. That is the honest cost of pushing an
 * ordered walk into an engine that has no order.
 */
const formulaFor = (
  combining: Combining,
  translated: ReadonlyArray<{ readonly effect: RuleEffect; readonly condition: Predicate }>,
): Predicate => {
  const permits = translated
    .filter(({ effect }) => effect === "Permit")
    .map(({ condition }) => condition);
  const denies = translated
    .filter(({ effect }) => effect === "Deny")
    .map(({ condition }) => condition);

  return Match.value(combining).pipe(
    // A Permit anywhere decides; otherwise a Deny does, or nothing applied.
    // Both remaining cases refuse.
    Match.when("PermitOverrides", () => or(permits)),
    Match.when("DenyOverrides", () => and([negate(or(denies)), or(permits)])),
    Match.when("FirstApplicable", () =>
      or(
        translated.map(({ effect, condition }, index) =>
          effect === "Permit"
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
};

/**
 * Walks a {@link Plan}, asking ports through `PortAccess.ts`, and stops where the
 * evaluator stops.
 *
 * A composite stops at the first child that runs to a *constant* that settles it
 * under the evaluator's own rule (`ShortCircuit.ts`): a `False` for `allOf`, a
 * `True` for an `anyOf` that may stop at an allow, and for a rule table the
 * condition that is `True` with the effect nothing later can beat (INV-QD-017).
 * So translation asks no port the evaluator would not, and fails on no port the
 * evaluator would not reach (INV-QD-NEXT).
 *
 * **Pruning never changes a successful predicate**, which is why it is safe to
 * stop early and what Stryker cannot tell a reader. A pruned `Conjunction` child
 * could only have been `and`-ed with a `False`, so the result is `False`
 * regardless. A pruned `Disjunction` child could only have been `or`-ed with a
 * `True`, so the result is `True` regardless. A pruned `RuleTable` suffix
 * contributes only `False` terms under `FirstApplicable` (each later permit
 * conjoins the negation of the settled `True` condition, which is `False`),
 * cannot undo a `True` permit under `PermitOverrides`, and cannot undo
 * `Negate(Or(denies)) = False` under `DenyOverrides`. Pruning therefore removes
 * port calls and failures the evaluator would also never reach, and nothing else.
 *
 * A plain function, not `Effect.fn`: it runs once per translation, not per row,
 * and a port read inside it owns its own span.
 */
const run = (
  plan: Plan,
  subject: AuthSubject,
  context: MatcherContext,
): Effect.Effect<Predicate, RunError, AttributeResolver | DecisionHistory> =>
  Match.value(plan).pipe(
    Match.tagsExhaustive({
      Constant: (p) => Effect.succeed(constant(p.value)),
      Column: (p) => Effect.succeed(p.predicate),
      AskAttribute: (p) =>
        Effect.map(readAttribute("toPredicate", subject, p.attribute), (value) =>
          constant(evaluateMatcher(p.matcher, value, context)),
        ),
      AskActed: (p) =>
        Effect.map(askActedAny("toPredicate", subject, p.event), (answer) =>
          constant(answer === p.wanted),
        ),
      NeedAction: (p) => Effect.fail(new MissingAction({ expected: p.expected })),
      // Suspended: building the child eagerly recursed natively once per `Not`
      // level, so a deep chain under a large `maxDepth` overflowed the stack.
      Negation: (p) => Effect.map(Effect.suspend(() => run(p.plan, subject, context)), negate),
      Conjunction: (p) =>
        Effect.gen(function* () {
          const collected: Array<Predicate> = [];
          for (const inner of p.plans) {
            const result = yield* run(inner, subject, context);
            // `False` settles an `and`: nothing after it can matter.
            if (result._tag === "False") return FALSE;
            collected.push(result);
          }
          return and(collected);
        }),
      Disjunction: (p) =>
        Effect.gen(function* () {
          const collected: Array<Predicate> = [];
          for (const inner of p.plans) {
            const result = yield* run(inner, subject, context);
            if (p.stopsAtTrue && result._tag === "True") return TRUE;
            collected.push(result);
          }
          return or(collected);
        }),
      RuleTable: (p) =>
        Effect.gen(function* () {
          const decisive = rulesDecisiveEffect(p.combining);
          const translated: Array<{ readonly effect: RuleEffect; readonly condition: Predicate }> =
            [];
          for (const rule of p.rules) {
            const condition = yield* run(rule.plan, subject, context);
            translated.push({ effect: rule.effect, condition });
            // A condition that holds for every row settles the walk when the
            // evaluator would stop there: any applying rule under
            // `FirstApplicable`, the overriding effect under the others.
            if (condition._tag === "True" && (decisive === undefined || rule.effect === decisive)) {
              break;
            }
          }
          return formulaFor(p.combining, translated);
        }),
    }),
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
  const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;

  const fieldsCheck = checkFields(policy, maxDepth);
  if (fieldsCheck === undefined) {
    return yield* Effect.fail(new PolicyTooDeep({ maxDepth }));
  }
  if (fieldsCheck.restricts) {
    return yield* untranslatable(
      policy._tag,
      "the policy restricts visible fields, and a predicate selects rows rather than columns",
    );
  }

  // Refusals first, and from the tree alone: they cannot depend on the subject
  // or on what any port answers (BEH-QD-NEXT-c). Only then does anything run.
  const compiled = compile(policy, subject, options?.action, fieldsCheck);
  if (compiled instanceof Refusal) {
    return yield* untranslatable(compiled.policyTag, compiled.reason);
  }
  const predicate = yield* run(compiled, subject, matcherContextFor(subject, options?.action));

  yield* Effect.annotateCurrentSpan({
    "qadi.subject_id": subject.id,
    "qadi.policy_tag": policy._tag,
    "qadi.predicate_tag": predicate._tag,
  });

  yield* Metric.update(predicatesTranslatedTotal, 1);

  return predicate;
});
