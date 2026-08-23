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
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import type { Concurrency } from "effect/Types";
import { AttributeResolver } from "./AttributeResolver.ts";
import type { AuthSubject } from "./AuthSubject.ts";
import type { ActedResult } from "./DecisionHistory.ts";
import { DecisionHistory } from "./DecisionHistory.ts";
import { CurrentSubject } from "./CurrentSubject.ts";
import type { DecisionCacheKey } from "./DecisionCache.ts";
import { DecisionCache } from "./DecisionCache.ts";
import type { Decision, Trace } from "./Decision.ts";
import { Allow, Deny, intersectFields, unionFields } from "./Decision.ts";
import type { EvaluationError } from "./Errors.ts";
import {
  MissingAction,
  MissingResource,
  MissingResourceId,
  PolicyTooDeep,
} from "./Errors.ts";
import { EvaluationId } from "./EvaluationId.ts";
import { makeResourceId } from "./Identity.ts";
import type { MatcherContext } from "./Matcher.ts";
import { evaluateMatcher, referencesAction } from "./Matcher.ts";
import type { Obligation } from "./Obligation.ts";
import { unionObligations } from "./Obligation.ts";
import { permissionKey } from "./Permission.ts";
import { DEFAULT_MAX_DEPTH } from "./Policy.ts";
import type { FieldStrategy, Policy, Rule, RuleEffect } from "./Policy.ts";
import { RelationshipResolver } from "./RelationshipResolver.ts";
import type { Resource } from "./Resource.ts";

/**
 * Every decision `evaluate` reaches, tagged by outcome.
 *
 * The one metric every deployment of this library can use unconditionally:
 * no wiring beyond providing a `Metric.MetricRegistry` (or an exporter built
 * on one) is needed to see the allow/deny rate ADR-QD-009 asks observability
 * to answer.
 *
 * Two fixed, module-scope taggings — `Metric.withAttributes(decisionsTotal,
 * {...})` built fresh per call, the shape Effect's own docs show — rather
 * than one, deliberately: `Metric`'s untagged fast path caches a metric's
 * resolved hooks on the metric object itself, for the process's lifetime,
 * the first time it is touched (`Object.keys(extraAttributes).length === 0`
 * in `effect/Metric`'s `hook`) — cheap for a singleton reused across every
 * call, defeated by rebuilding the tagged wrapper on every `evaluate`
 * instead.
 */
const decisionsTotal = Metric.counter("qadi_decisions_total", {
  description: "Authorization decisions reached by `evaluate`, tagged by outcome.",
});
const decisionsAllowedTotal = Metric.withAttributes(decisionsTotal, { outcome: "allow" });
const decisionsDeniedTotal = Metric.withAttributes(decisionsTotal, { outcome: "deny" });

/**
 * Denials, by the top-level policy tag `evaluate` was asked to decide.
 *
 * Keyed on `policy._tag` — a closed, small union — rather than `decision.reason`,
 * which was tried first and reverted: `evaluateActed` and `evaluateHasRelationship`
 * both build their denial reason from caller-supplied identifiers (`subject.id`, a
 * resource id), so a frequency keyed on the raw sentence would grow one permanent
 * entry per distinct (subject, resource) pair ever denied — unbounded, in a
 * structure this cache-free service holds in memory for the life of the registry.
 * `policy._tag` answers a coarser but still useful question ("which *kind* of
 * policy is denying") with a cardinality bounded by the ADT itself. The full,
 * caller-specific reason is still available — on the `Effect.logDebug` line below,
 * which a log pipeline retains and rotates rather than accumulating in-process.
 */
const denialsByPolicyTagTotal = Metric.frequency("qadi_denials_by_policy_tag_total", {
  description: "Denials, keyed by the top-level policy tag evaluate was asked to decide.",
});

/**
 * The distribution of `evaluate`'s own duration, in milliseconds.
 *
 * `durationMillis` was already computed for every `Decision` — this exports it
 * as an aggregate a deployment can alert or graph on without instrumenting its
 * own call site. Exponential boundaries because evaluation latency is the
 * usual case for one: sub-millisecond for an uncached, resolver-free policy,
 * seconds for one waiting on a slow attribute or relationship store, with
 * nothing meaningful in between to resolve at linear width.
 */
const evaluationDurationMillis = Metric.histogram("qadi_evaluation_duration_millis", {
  description: "Distribution of evaluate's wall-clock duration, in milliseconds.",
  boundaries: Metric.exponentialBoundaries({ start: 1, factor: 2, count: 15 }),
});

export interface EvaluateOptions {
  /** The resource under consideration, if any. */
  readonly resource?: Resource;
  /**
   * What the caller is doing — `"read"`, `"write"`, an OrBAC activity name.
   *
   * A property of the request, never a grant the subject holds (ADR-QD-018).
   */
  readonly action?: string;
  /**
   * Maximum policy tree depth. Bounds recursion on hostile decoded input.
   * Defaults to 64.
   */
  readonly maxDepth?: number;
  /**
   * Evaluate the children of `allOf`, `anyOf` and `rules` concurrently.
   *
   * Absent — the default — evaluation is sequential and short-circuits, so a
   * branch that is never reached performs no lookup
   * ([INV-QD-005](../../../spec/invariants.md#inv-qd-005-short-circuit-preservation)).
   * Supplying this **forfeits that** in exchange for latency: every child of a
   * composite is evaluated, so a caller pays for speculative attribute and
   * relationship lookups against their own store.
   *
   * What it does *not* change is the answer. The decision and its trace are
   * identical either way, because both paths drive the same fold over children in
   * declaration order — including discarding the trace of a child evaluated after
   * the decisive one ([ADR-QD-026](../../../spec/decisions/026-concurrent-evaluation.md)).
   */
  readonly concurrency?: Concurrency;
}

/**
 * Everything a recursive call passes through unchanged: the inputs a policy may
 * read, plus the settings that govern how the walk is performed.
 *
 * Bundled rather than threaded as separate parameters, and `concurrency` is the
 * clearest case for it. `Concurrency` is `number | "unbounded" | "inherit"`, so a
 * positional slip between it, `depth` and `maxDepth` would **typecheck** — which
 * is exactly the shape of bug this bundle exists to make impossible.
 *
 * `concurrency` is deliberately here and not in `MatcherContext`: it is a
 * property of the evaluation, never a value a matcher can compare against.
 */
interface Evaluation {
  readonly resource: Resource | undefined;
  readonly action: string | undefined;
  readonly concurrency: Concurrency | undefined;
}

/** Services an evaluation needs. */
export type EvaluationServices =
  | CurrentSubject
  | AttributeResolver
  | RelationshipResolver
  | DecisionHistory
  | EvaluationId;

const NO_OBLIGATIONS: ReadonlyArray<Obligation> = [];

const allow = (
  policyTag: Policy["_tag"],
  fields: ReadonlyArray<string> | undefined,
  children: ReadonlyArray<Trace> = [],
  label?: string,
  obligations: ReadonlyArray<Obligation> = NO_OBLIGATIONS,
): Trace => ({
  policyTag,
  label,
  allowed: true,
  reason: undefined,
  children,
  visibleFields: fields,
  obligations,
});

const deny = (
  policyTag: Policy["_tag"],
  reason: string,
  children: ReadonlyArray<Trace> = [],
  label?: string,
): Trace => ({
  policyTag,
  label,
  allowed: false,
  reason,
  children,
  visibleFields: undefined,
  // A denial permits nothing, so it conditions nothing.
  obligations: NO_OBLIGATIONS,
});

/**
 * Reads an attribute, consulting the subject first.
 *
 * The miss-only call to the resolver is what preserves short-circuiting: a
 * branch that is never evaluated never triggers a lookup.
 */
const readAttribute = (
  subject: AuthSubject,
  attribute: string,
): Effect.Effect<unknown, EvaluationError, AttributeResolver> =>
  Object.hasOwn(subject.attributes, attribute)
    ? Effect.succeed(subject.attributes[attribute])
    : AttributeResolver.resolve(subject.id, attribute);

/**
 * Why an attribute policy refused.
 *
 * Two sentences rather than one, because an absent attribute and a present one
 * that compares wrong are different problems with the same fix rate of roughly
 * zero when they are reported identically. "did not match" is *true* of
 * `undefined` — every matcher fails it — which is why this was never a defect,
 * only a diagnosis withheld. An unwired or misconfigured `AttributeResolver`
 * produces the absent case exclusively, so naming it points at the wiring
 * (INV-QD-029, and the mirror of what `"Unknown"` does for relationships).
 *
 * The value itself is still never printed. The attribute *name* was already in
 * the sentence; its contents are the subject's data and stay out of a reason
 * that reaches logs and, through `AccessDenied`, error handlers.
 */
const attributeReason = (
  side: "subject" | "resource",
  attribute: string,
  value: unknown,
): string =>
  value === undefined
    ? `${side} attribute '${attribute}' has no value`
    : `${side} attribute '${attribute}' did not match`;

const mergeFields = (
  strategy: FieldStrategy,
  sets: ReadonlyArray<ReadonlyArray<string> | undefined>,
): ReadonlyArray<string> | undefined => {
  switch (strategy) {
    case "Intersection":
      return sets.reduce<ReadonlyArray<string> | undefined>(
        (acc, cur) => intersectFields(acc, cur),
        undefined,
      );
    case "Union": {
      // `unionFields` is absorbing on undefined: if any allowing branch grants
      // all fields, the union grants all fields. Seeding with sets[0] rather
      // than undefined preserves that, since undefined is the top of the
      // lattice, not the empty set.
      if (sets.length === 0) return undefined;
      let acc = sets[0];
      for (let i = 1; i < sets.length; i += 1) acc = unionFields(acc, sets[i]);
      return acc;
    }
    case "First":
      return sets.length === 0 ? undefined : sets[0];
    default: {
      // Unreachable, and load-bearing for the same reason as `resolveRef`'s: the
      // return type already includes `undefined`, so a fourth strategy would
      // compile and silently merge to "all fields" — the *top* of the field
      // lattice, which widens visibility rather than narrowing it. That is the
      // one direction a field-strategy bug must never fail in (ADR-QD-034).
      const exhaustive: never = strategy;
      return exhaustive;
    }
  }
};

/**
 * `HasActed`/`HasNotActed` share every line but the wanted `ActedResult` — the
 * `_tag` itself supplies that, so there is nothing left for the two case labels
 * in `evaluateNode` to differ on. Extracted for the same reason `evaluateAllOf`
 * and friends are: `switch (policy._tag)` keeps dispatching in one glance, and
 * the twenty-odd lines of what a given tag actually *does* move to a name
 * instead of living inline in the arm.
 */
const evaluateActed = Effect.fn("qadi.acted")(function* (
  policy: Extract<Policy, { _tag: "HasActed" | "HasNotActed" }>,
  subject: AuthSubject,
  resource: Resource | undefined,
) {
  const scoped = policy.scope === "Resource";
  const rawId = resource?.["id"];
  if (scoped && typeof rawId !== "string") {
    return yield* Effect.fail(new MissingResourceId({ relation: policy.event }));
  }
  const wanted: ActedResult = policy._tag === "HasActed" ? "Acted" : "NotActed";
  const answer = yield* DecisionHistory.hasActed({
    subjectId: subject.id,
    event: policy.event,
    resourceId: scoped && typeof rawId === "string" ? makeResourceId(rawId) : undefined,
  });
  // `"Unknown"` matches neither, so both polarities deny under an unwired
  // port. That is the whole reason the port is three-valued rather than
  // boolean (ADR-QD-020).
  return answer === wanted
    ? allow(policy._tag, policy.fields)
    : deny(
        policy._tag,
        answer === "Unknown"
          ? `no history is available for '${policy.event}'`
          : `subject '${subject.id}' ${answer === "Acted" ? "has already" : "has not"} performed '${policy.event}'`,
      );
});

/** `HasRelationship`'s arm, extracted for the same reason `evaluateActed` is. */
const evaluateHasRelationship = Effect.fn("qadi.hasRelationship")(function* (
  policy: Extract<Policy, { _tag: "HasRelationship" }>,
  subject: AuthSubject,
  resource: Resource | undefined,
) {
  const rawId = resource?.["id"];
  if (typeof rawId !== "string") {
    return yield* Effect.fail(new MissingResourceId({ relation: policy.relation }));
  }
  const related = yield* RelationshipResolver.check({
    subjectId: subject.id,
    relation: policy.relation,
    resourceId: makeResourceId(rawId),
    depth: policy.depth,
  });
  // `Match.value` rather than a hoisted `Match.type` (§5a's preferred form):
  // the arms close over `policy`, `subject` and `rawId`, so there is nothing to
  // hoist. The rebuild is also noise against the service call above, which may
  // be a graph traversal or a network round trip.
  return Match.value(related).pipe(
    Match.when("Related", () => allow("HasRelationship", policy.fields)),
    Match.when("Unrelated", () =>
      deny(
        "HasRelationship",
        `subject '${subject.id}' has no '${policy.relation}' relation to '${rawId}'`,
      ),
    ),
    // Not "has no relation": nothing looked. Naming the absent resolver is the
    // whole of INV-QD-029 — the sentence above would send a reader to audit a
    // graph they had never connected.
    Match.when("Unknown", () =>
      deny(
        "HasRelationship",
        `no relationship resolver is wired, so no '${policy.relation}' relation to '${rawId}' can be confirmed`,
      ),
    ),
    Match.exhaustive,
  );
});

const evaluateNode = (
  policy: Policy,
  subject: AuthSubject,
  request: Evaluation,
  depth: number,
  maxDepth: number,
): Effect.Effect<
  Trace,
  EvaluationError,
  AttributeResolver | RelationshipResolver | DecisionHistory
> => {
  if (depth > maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth }));

  const { action, resource } = request;

  const matcherContext: MatcherContext = {
    subject: subject.attributes,
    subjectId: subject.id,
    resource,
    action,
  };

  switch (policy._tag) {
    case "HasPermission": {
      const key = permissionKey(policy.permission);
      return Effect.succeed(
        subject.permissions.has(key)
          ? allow("HasPermission", policy.fields)
          : deny("HasPermission", `subject lacks permission '${key}'`),
      );
    }

    case "HasRole":
      return Effect.succeed(
        subject.roles.has(policy.role)
          ? allow("HasRole", undefined)
          : deny("HasRole", `subject lacks role '${policy.role}'`),
      );

    case "HasAttribute":
      if (action === undefined && referencesAction(policy.matcher)) {
        return Effect.fail(new MissingAction({ expected: undefined }));
      }
      return Effect.map(readAttribute(subject, policy.attribute), (value) =>
        evaluateMatcher(policy.matcher, value, matcherContext)
          ? allow("HasAttribute", policy.fields)
          : deny("HasAttribute", attributeReason("subject", policy.attribute, value)),
      );

    case "HasResourceAttribute": {
      if (resource === undefined) {
        return Effect.fail(new MissingResource({ attribute: policy.attribute }));
      }
      if (action === undefined && referencesAction(policy.matcher)) {
        return Effect.fail(new MissingAction({ expected: undefined }));
      }
      const value = resource[policy.attribute];
      return Effect.succeed(
        evaluateMatcher(policy.matcher, value, matcherContext)
          ? allow("HasResourceAttribute", policy.fields)
          : deny(
              "HasResourceAttribute",
              attributeReason("resource", policy.attribute, value),
            ),
      );
    }

    case "HasRelationship":
      return evaluateHasRelationship(policy, subject, resource);

    case "HasAction": {
      // Absent input is a caller error, not a decision — the `MissingResource`
      // precedent, and the reason `referencesAction` is checked above.
      if (action === undefined) {
        return Effect.fail(new MissingAction({ expected: policy.action }));
      }
      return Effect.succeed(
        action === policy.action
          ? allow("HasAction", policy.fields)
          : deny("HasAction", `action is '${action}', not '${policy.action}'`),
      );
    }

    case "HasActed":
    case "HasNotActed":
      return evaluateActed(policy, subject, resource);

    case "AllOf":
      return evaluateAllOf(policy, subject, request, depth, maxDepth);

    case "AnyOf":
      return evaluateAnyOf(policy, subject, request, depth, maxDepth);

    case "Rules":
      return evaluateRules(policy, subject, request, depth, maxDepth);

    case "Not":
      return Effect.map(
        evaluateNode(policy.policy, subject, request, depth + 1, maxDepth),
        (child) =>
          child.allowed
            ? deny("Not", "negated policy allowed", [child])
            : // Negation carries no field visibility of its own: knowing a
              // policy did *not* hold says nothing about which fields are safe.
              // It carries no obligations either, and needs no rule to say so:
              // the child denied, so it contributed none (ADR-QD-019).
              allow("Not", undefined, [child]),
      );

    case "Obliged":
      return Effect.map(
        evaluateNode(policy.policy, subject, request, depth + 1, maxDepth),
        (child) =>
          child.allowed
            ? // The duty attaches only to a permission that was granted.
              allow(
                "Obliged",
                child.visibleFields,
                [child],
                undefined,
                unionObligations([policy.obligation], child.obligations),
              )
            : deny("Obliged", child.reason ?? "the obliged policy denied", [child]),
      );

    case "Labeled":
      return Effect.map(
        evaluateNode(policy.policy, subject, request, depth + 1, maxDepth),
        (child) => ({
          policyTag: "Labeled" as const,
          label: policy.label,
          allowed: child.allowed,
          reason: child.reason,
          children: [child],
          visibleFields: child.visibleFields,
          obligations: child.obligations,
        }),
      );
  }
};

/**
 * The accumulator both `AllOf` paths drive, and the reason concurrency cannot
 * change an answer.
 *
 * The decision rules live in `stepAllOf`/`finishAllOf` and nowhere else. The
 * sequential path steps one child at a time and stops evaluating the moment a
 * step returns a verdict; the concurrent path evaluates every child and then
 * steps over the results **in declaration order**, stopping at the same index.
 * Same fold, same input order, same output — including the shape of
 * `Trace.children`, which is public and is what a reviewer reads.
 */
interface AllOfFold {
  readonly children: Array<Trace>;
  readonly fieldSets: Array<ReadonlyArray<string> | undefined>;
  obligations: ReadonlyArray<Obligation>;
}

const beginAllOf = (): AllOfFold => ({
  children: [],
  fieldSets: [],
  obligations: NO_OBLIGATIONS,
});

/**
 * Returns a verdict once one child settles the question, `undefined` while
 * open. Short-circuits on the first *denying* child — `AllOf` needs every
 * child to allow, so one denial already decides it and nothing later runs.
 */
const stepAllOf = (fold: AllOfFold, trace: Trace): Trace | undefined => {
  fold.children.push(trace);
  if (!trace.allowed) {
    return deny("AllOf", trace.reason ?? "a required policy denied", fold.children);
  }
  fold.fieldSets.push(trace.visibleFields);
  // Every child allowed, so every child's duties apply. Union, never
  // intersection — dropping one a branch required would be a quiet grant.
  fold.obligations = unionObligations(fold.obligations, trace.obligations);
  return undefined;
};

const finishAllOf = (
  policy: Extract<Policy, { _tag: "AllOf" }>,
  fold: AllOfFold,
): Trace =>
  allow(
    "AllOf",
    mergeFields(policy.fieldStrategy, fold.fieldSets),
    fold.children,
    undefined,
    fold.obligations,
  );

const evaluateAllOf = Effect.fn("qadi.allOf")(function* (
  policy: Extract<Policy, { _tag: "AllOf" }>,
  subject: AuthSubject,
  request: Evaluation,
  depth: number,
  maxDepth: number,
) {
  const fold = beginAllOf();

  if (request.concurrency === undefined) {
    for (const child of policy.policies) {
      const verdict = stepAllOf(
        fold,
        yield* evaluateNode(child, subject, request, depth + 1, maxDepth),
      );
      if (verdict !== undefined) return verdict;
    }
  } else {
    const traces = yield* Effect.forEach(
      policy.policies,
      (child) => evaluateNode(child, subject, request, depth + 1, maxDepth),
      { concurrency: request.concurrency },
    );
    // Traces arrive in input order regardless of completion order, so the fold
    // below is the sequential fold. Children after the decisive one are dropped:
    // the work was speculative, and keeping it would make the trace depend on a
    // performance switch (ADR-QD-026).
    for (const trace of traces) {
      const verdict = stepAllOf(fold, trace);
      if (verdict !== undefined) return verdict;
    }
  }

  return finishAllOf(policy, fold);
});

/**
 * `AnyOf`'s counterpart to `AllOfFold` — same contract, mirrored: the decision
 * rules live in `stepAnyOf`/`finishAnyOf` and nowhere else, the sequential path
 * stops at the first step that returns a verdict, and the concurrent path
 * evaluates every child before folding the results **in declaration order**,
 * stopping at the same index. What differs from `AllOf` is *which* child
 * settles it — an allowing one, not a denying one — and that `exhaustive`
 * exists at all: `First` can return the instant it has a winner, but `Union`
 * and `Intersection` must see every allowing child to merge their field sets,
 * so the fold cannot short-circuit under those two the way `AllOf`'s always can.
 */
interface AnyOfFold {
  readonly children: Array<Trace>;
  readonly allowingFieldSets: Array<ReadonlyArray<string> | undefined>;
  /** `First` may stop at the first allowing child; the others must see them all. */
  readonly exhaustive: boolean;
  obligations: ReadonlyArray<Obligation>;
  lastReason: string | undefined;
}

const beginAnyOf = (policy: Extract<Policy, { _tag: "AnyOf" }>): AnyOfFold => ({
  children: [],
  allowingFieldSets: [],
  exhaustive: policy.fieldStrategy !== "First",
  obligations: NO_OBLIGATIONS,
  lastReason: undefined,
});

/**
 * Returns a verdict once one child settles the question, `undefined` while
 * open. Short-circuits on the first *allowing* child under `First`
 * (`!fold.exhaustive`) — `AnyOf` needs only one child to allow, so a winner
 * already decides it there; `Union`/`Intersection` never return early here and
 * settle only in `finishAnyOf`, once every child has been folded in.
 */
const stepAnyOf = (fold: AnyOfFold, trace: Trace): Trace | undefined => {
  fold.children.push(trace);

  if (trace.allowed) {
    fold.allowingFieldSets.push(trace.visibleFields);
    fold.obligations = unionObligations(fold.obligations, trace.obligations);
    if (!fold.exhaustive) {
      // Under `First` the obligations are the winning branch's, so the set
      // depends on the order the author wrote the branches in. Accepted, and
      // stated: collecting from every branch would force exhaustive
      // evaluation and repeal INV-QD-005 for any tree carrying a duty.
      return allow("AnyOf", trace.visibleFields, fold.children, undefined, fold.obligations);
    }
  } else {
    fold.lastReason = trace.reason;
  }
  return undefined;
};

const finishAnyOf = (
  policy: Extract<Policy, { _tag: "AnyOf" }>,
  fold: AnyOfFold,
): Trace => {
  if (fold.allowingFieldSets.length > 0) {
    return allow(
      "AnyOf",
      mergeFields(policy.fieldStrategy, fold.allowingFieldSets),
      fold.children,
      undefined,
      fold.obligations,
    );
  }
  return deny("AnyOf", fold.lastReason ?? "no alternative policy allowed", fold.children);
};

/**
 * Short-circuits on the first allowing child — except under `Union`, which must
 * see every child to merge their field sets.
 *
 * `Intersection` on an `anyOf` is honoured rather than silently downgraded to
 * `First`, which is what the predecessor did.
 */
const evaluateAnyOf = Effect.fn("qadi.anyOf")(function* (
  policy: Extract<Policy, { _tag: "AnyOf" }>,
  subject: AuthSubject,
  request: Evaluation,
  depth: number,
  maxDepth: number,
) {
  const fold = beginAnyOf(policy);

  if (request.concurrency === undefined) {
    for (const child of policy.policies) {
      const verdict = stepAnyOf(
        fold,
        yield* evaluateNode(child, subject, request, depth + 1, maxDepth),
      );
      if (verdict !== undefined) return verdict;
    }
  } else {
    const traces = yield* Effect.forEach(
      policy.policies,
      (child) => evaluateNode(child, subject, request, depth + 1, maxDepth),
      { concurrency: request.concurrency },
    );
    for (const trace of traces) {
      const verdict = stepAnyOf(fold, trace);
      if (verdict !== undefined) return verdict;
    }
  }

  return finishAnyOf(policy, fold);
});

/**
 * Walks an ordered rule table.
 *
 * Exactly one rule decides, and the walk stops at the first rule that cannot be
 * overridden (INV-QD-017). `FirstApplicable` stops at the first rule that
 * applies at all; the overrides stop at the first rule carrying the effect
 * nothing later can beat, and must otherwise ask every rule — which inverts the
 * cost profile of the rest of the library, where allowing is the cheap outcome.
 */
const evaluateRules = Effect.fn("qadi.rules")(function* (
  policy: Extract<Policy, { _tag: "Rules" }>,
  subject: AuthSubject,
  request: Evaluation,
  depth: number,
  maxDepth: number,
) {
  const children: Array<Trace> = [];

  /** The effect that ends the walk. `undefined` under `FirstApplicable`,
   *  where the first rule to apply at all is already final. */
  const decisive: RuleEffect | undefined =
    policy.combining === "DenyOverrides"
      ? "Deny"
      : policy.combining === "PermitOverrides"
        ? "Permit"
        : undefined;

  interface Applied {
    readonly index: number;
    readonly rule: Rule;
    readonly trace: Trace;
  }
  let firstApplying: Applied | undefined;
  let firstDecisive: Applied | undefined;

  /**
   * Folds one condition result at index `index`. Returns `true` when the walk is
   * settled and no later rule can change the outcome.
   *
   * Shared by both paths so the **deciding rule** is selected identically. Under
   * the overrides it is the first applying row of the winning effect *by index* —
   * selecting by arrival would make two runs of the same table owe different
   * duties, which is the constraint E3 contributed (ADR-QD-023).
   */
  // Takes `rule` alongside `index` rather than looking it up by indexing
  // `policy.rules[index]` — under `noUncheckedIndexedAccess` that access types
  // as possibly-`undefined` no matter how provably in-bounds the loop is, and
  // AGENTS.md §6 bans asserting past that with `!`. Both call sites below
  // already have `rule` in hand from iterating the array directly, so passing
  // it through costs nothing.
  const step = (index: number, rule: Rule, trace: Trace): boolean => {
    children.push(trace);
    if (!trace.allowed) return false;

    const applied: Applied = { index, rule, trace };
    firstApplying ??= applied;
    if (decisive === undefined) return true;
    if (rule.effect === decisive) {
      firstDecisive = applied;
      return true;
    }
    return false;
  };

  if (request.concurrency === undefined) {
    for (const [index, rule] of policy.rules.entries()) {
      // The condition answers *does this rule apply*, never *is this permitted*.
      const trace = yield* evaluateNode(rule.condition, subject, request, depth + 1, maxDepth);
      if (step(index, rule, trace)) break;
    }
  } else {
    // `rule` and `index` travel with the trace from the same `forEach` that
    // produced it, rather than being re-associated afterward by indexing a
    // second array — the same reasoning as `translateRules` in Predicate.ts.
    const results = yield* Effect.forEach(
      policy.rules,
      (rule, index) =>
        Effect.map(
          evaluateNode(rule.condition, subject, request, depth + 1, maxDepth),
          (trace) => ({ index, rule, trace }),
        ),
      { concurrency: request.concurrency },
    );
    for (const { index, rule, trace } of results) {
      if (step(index, rule, trace)) break;
    }
  }

  // Under the overrides, an applying rule of the other effect decides only
  // because nothing decisive was found — which is knowable solely by asking all.
  const deciding = firstDecisive ?? firstApplying;

  if (deciding === undefined) {
    return deny("Rules", "no rule applied", children);
  }

  if (deciding.rule.effect === "Deny") {
    // `Not`'s rule: a refusal permits nothing, so it carries neither fields nor
    // obligations — whatever its own condition's trace holds (ADR-QD-023).
    return deny("Rules", `rules[${deciding.index}] denied`, children);
  }

  return {
    policyTag: "Rules" as const,
    allowed: true,
    // The only allowing node in the library that carries a reason. A rule
    // table's first question is *which row hit*, and it is asked in both
    // directions.
    reason: `rules[${deciding.index}] permitted`,
    children,
    visibleFields: deciding.trace.visibleFields,
    obligations: deciding.trace.obligations,
  };
});

/**
 * Evaluates a policy against the current subject.
 *
 * Emits a `qadi.evaluate` span carrying the decision, so authorization shows up
 * in tracing without a bespoke audit port.
 */
export const evaluate = Effect.fn("qadi.evaluate")(function* (
  policy: Policy,
  options?: EvaluateOptions,
) {
  const subject = yield* CurrentSubject;
  const evaluationId = yield* EvaluationId.next;
  const startedAt = yield* Clock.currentTimeMillis;

  // Optional by construction: `serviceOption` adds nothing to the requirements, so
  // `EvaluationServices` is unchanged and an application that never provides a cache
  // behaves exactly as it did (ADR-QD-031).
  const cache = yield* Effect.serviceOption(DecisionCache);
  const cacheKey: DecisionCacheKey = {
    subjectId: subject.id,
    policy,
    resource: options?.resource,
    action: options?.action,
  };

  // `Effect.suspend`, not a direct call: `evaluateNode` is a plain switch, not
  // an `Effect.gen`, so for a leaf tag (HasRole, HasPermission, …) calling it
  // does the real comparison — `subject.roles.has(...)`, `evaluateMatcher` —
  // immediately, as part of building the `Effect.succeed(...)` it returns,
  // not lazily when that Effect later runs. Calling it here, unconditionally,
  // before the cache-hit check below, would pay that cost on every ask
  // whether or not the cache already had the answer — exactly the "resolving
  // forty fields forty times" cost `DecisionCache`'s own doc comment exists
  // to avoid. `Effect.suspend` defers the call itself to when `compute` is
  // actually run, so a cache hit never invokes `evaluateNode` at all.
  const compute = Effect.suspend(() =>
    evaluateNode(
      policy,
      subject,
      {
        resource: options?.resource,
        action: options?.action,
        concurrency: options?.concurrency,
      },
      0,
      options?.maxDepth ?? DEFAULT_MAX_DEPTH,
    ),
  );

  // The TRACE is cached, never the `Decision`. A cached decision would carry a
  // duplicate `evaluationId`, so two log lines would claim to be the same event and
  // correlation — the one thing the identifier exists for — would stop working. The
  // id and the duration below are stamped per call, hit or miss, so a hit is
  // indistinguishable from a fresh evaluation except that it was faster.
  //
  // `getOrCompute` also coalesces concurrent identical asks into one `compute`
  // run — including sharing a genuine failure with every waiter — rather than
  // each racing its own (ADR-QD-031's follow-up: absence is still free, since
  // this is still read through `serviceOption`).
  const trace = Option.isSome(cache)
    ? yield* cache.value.getOrCompute(cacheKey, compute)
    : yield* compute;

  const durationMillis = (yield* Clock.currentTimeMillis) - startedAt;

  const decision: Decision = trace.allowed
    ? new Allow({
        evaluationId,
        subjectId: subject.id,
        durationMillis,
        trace,
        visibleFields: trace.visibleFields,
        obligations: trace.obligations,
      })
    : new Deny({
        evaluationId,
        subjectId: subject.id,
        durationMillis,
        trace,
        reason: trace.reason ?? "denied",
      });

  yield* Effect.annotateCurrentSpan({
    "qadi.decision": decision._tag,
    "qadi.subject_id": subject.id,
    "qadi.evaluation_id": evaluationId,
    "qadi.policy_tag": policy._tag,
    // Only when supplied: an absent action must not become the string
    // "undefined" in a trace viewer, and adding a key unconditionally would
    // change every existing span.
    ...(options?.action === undefined ? {} : { "qadi.action": options.action }),
    // Obligations are reported, never run. Present only when there are some, so
    // an evaluation that carries none looks exactly as it did before E2.
    ...(decision._tag === "Allow" && decision.obligations.length > 0
      ? { "qadi.obligations": decision.obligations.map((o) => o.id).join(",") }
      : {}),
  });

  yield* Metric.update(decision._tag === "Allow" ? decisionsAllowedTotal : decisionsDeniedTotal, 1);
  yield* Metric.update(evaluationDurationMillis, durationMillis);

  if (decision._tag === "Deny") {
    yield* Metric.update(denialsByPolicyTagTotal, policy._tag);
    yield* Effect.logDebug("qadi: policy denied").pipe(
      Effect.annotateLogs({
        "qadi.policy_tag": policy._tag,
        "qadi.subject_id": subject.id,
        "qadi.reason": decision.reason,
      }),
    );
  }

  return decision;
});
