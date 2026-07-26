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
import { AttributeResolver } from "./AttributeResolver.ts";
import type { AuthSubject } from "./AuthSubject.ts";
import type { ActedResult } from "./DecisionHistory.ts";
import { DecisionHistory } from "./DecisionHistory.ts";
import { CurrentSubject } from "./CurrentSubject.ts";
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
import type { MatcherContext } from "./Matcher.ts";
import { evaluateMatcher, referencesAction } from "./Matcher.ts";
import type { Obligation } from "./Obligation.ts";
import { unionObligations } from "./Obligation.ts";
import { permissionKey } from "./Permission.ts";
import type { FieldStrategy, Policy, Rule, RuleEffect } from "./Policy.ts";
import { RelationshipResolver } from "./RelationshipResolver.ts";

/** Arbitrary resource attributes a policy may inspect. */
export type Resource = Readonly<Record<string, unknown>>;

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
}

/**
 * The request-scoped inputs a policy may read.
 *
 * Bundled rather than threaded as separate parameters: every recursive call
 * passes them unchanged, and a third positional `string | undefined` beside
 * `depth` and `maxDepth` is exactly the shape an argument-order slip hides in.
 */
interface Request {
  readonly resource: Resource | undefined;
  readonly action: string | undefined;
}

const DEFAULT_MAX_DEPTH = 64;

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
  }
};

const evaluateNode = (
  policy: Policy,
  subject: AuthSubject,
  request: Request,
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
          : deny("HasAttribute", `subject attribute '${policy.attribute}' did not match`),
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
              `resource attribute '${policy.attribute}' did not match`,
            ),
      );
    }

    case "HasRelationship": {
      const rawId = resource?.["id"];
      if (typeof rawId !== "string") {
        return Effect.fail(new MissingResourceId({ relation: policy.relation }));
      }
      return Effect.map(
        RelationshipResolver.check({
          subjectId: subject.id,
          relation: policy.relation,
          resourceId: rawId,
          depth: policy.depth,
        }),
        (related) =>
          related
            ? allow("HasRelationship", policy.fields)
            : deny(
                "HasRelationship",
                `subject '${subject.id}' has no '${policy.relation}' relation to '${rawId}'`,
              ),
      );
    }

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
    case "HasNotActed": {
      const scoped = policy.scope === "Resource";
      const rawId = resource?.["id"];
      if (scoped && typeof rawId !== "string") {
        return Effect.fail(new MissingResourceId({ relation: policy.event }));
      }
      const wanted: ActedResult = policy._tag === "HasActed" ? "Acted" : "NotActed";
      return Effect.map(
        DecisionHistory.hasActed({
          subjectId: subject.id,
          event: policy.event,
          resourceId: scoped && typeof rawId === "string" ? rawId : undefined,
        }),
        (answer) =>
          // `"Unknown"` matches neither, so both polarities deny under an
          // unwired port. That is the whole reason the port is three-valued
          // rather than boolean (ADR-QD-020).
          answer === wanted
            ? allow(policy._tag, policy.fields)
            : deny(
                policy._tag,
                answer === "Unknown"
                  ? `no history is available for '${policy.event}'`
                  : `subject '${subject.id}' ${answer === "Acted" ? "has already" : "has not"} performed '${policy.event}'`,
              ),
      );
    }

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

/** Short-circuits on the first denying child. */
const evaluateAllOf = Effect.fn("qadi.allOf")(function* (
  policy: Extract<Policy, { _tag: "AllOf" }>,
  subject: AuthSubject,
  request: Request,
  depth: number,
  maxDepth: number,
) {
  const children: Array<Trace> = [];
  const fieldSets: Array<ReadonlyArray<string> | undefined> = [];
  let obligations: ReadonlyArray<Obligation> = NO_OBLIGATIONS;

  for (const child of policy.policies) {
    const trace = yield* evaluateNode(child, subject, request, depth + 1, maxDepth);
    children.push(trace);
    if (!trace.allowed) {
      return deny("AllOf", trace.reason ?? "a required policy denied", children);
    }
    fieldSets.push(trace.visibleFields);
    // Every child allowed, so every child's duties apply. Union, never
    // intersection — dropping one a branch required would be a quiet grant.
    obligations = unionObligations(obligations, trace.obligations);
  }

  return allow(
    "AllOf",
    mergeFields(policy.fieldStrategy, fieldSets),
    children,
    undefined,
    obligations,
  );
});

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
  request: Request,
  depth: number,
  maxDepth: number,
) {
  const children: Array<Trace> = [];
  const allowingFieldSets: Array<ReadonlyArray<string> | undefined> = [];
  const exhaustive = policy.fieldStrategy !== "First";
  let obligations: ReadonlyArray<Obligation> = NO_OBLIGATIONS;
  let lastReason: string | undefined;

  for (const child of policy.policies) {
    const trace = yield* evaluateNode(child, subject, request, depth + 1, maxDepth);
    children.push(trace);

    if (trace.allowed) {
      allowingFieldSets.push(trace.visibleFields);
      obligations = unionObligations(obligations, trace.obligations);
      if (!exhaustive) {
        // Under `First` the obligations are the winning branch's, so the set
        // depends on the order the author wrote the branches in. Accepted, and
        // stated: collecting from every branch would force exhaustive
        // evaluation and repeal INV-QD-005 for any tree carrying a duty.
        return allow("AnyOf", trace.visibleFields, children, undefined, obligations);
      }
    } else {
      lastReason = trace.reason;
    }
  }

  if (allowingFieldSets.length > 0) {
    return allow(
      "AnyOf",
      mergeFields(policy.fieldStrategy, allowingFieldSets),
      children,
      undefined,
      obligations,
    );
  }

  return deny("AnyOf", lastReason ?? "no alternative policy allowed", children);
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
  request: Request,
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

  for (let index = 0; index < policy.rules.length; index += 1) {
    const rule = policy.rules[index]!;
    // The condition answers *does this rule apply*, never *is this permitted*.
    const trace = yield* evaluateNode(
      rule.condition,
      subject,
      request,
      depth + 1,
      maxDepth,
    );
    children.push(trace);
    if (!trace.allowed) continue;

    const applied: Applied = { index, rule, trace };
    firstApplying ??= applied;
    if (decisive === undefined) break;
    if (rule.effect === decisive) {
      firstDecisive = applied;
      break;
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

  const trace = yield* evaluateNode(
    policy,
    subject,
    { resource: options?.resource, action: options?.action },
    0,
    options?.maxDepth ?? DEFAULT_MAX_DEPTH,
  );

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

  return decision;
});
