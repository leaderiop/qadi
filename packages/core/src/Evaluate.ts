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
import { CurrentSubject } from "./CurrentSubject.ts";
import type { Decision, Trace } from "./Decision.ts";
import { Allow, Deny, intersectFields, unionFields } from "./Decision.ts";
import type { EvaluationError } from "./Errors.ts";
import { MissingResource, MissingResourceId, PolicyTooDeep } from "./Errors.ts";
import { EvaluationId } from "./EvaluationId.ts";
import type { MatcherContext } from "./Matcher.ts";
import { evaluateMatcher } from "./Matcher.ts";
import { permissionKey } from "./Permission.ts";
import type { FieldStrategy, Policy } from "./Policy.ts";
import { RelationshipResolver } from "./RelationshipResolver.ts";

/** Arbitrary resource attributes a policy may inspect. */
export type Resource = Readonly<Record<string, unknown>>;

export interface EvaluateOptions {
  /** The resource under consideration, if any. */
  readonly resource?: Resource;
  /**
   * Maximum policy tree depth. Bounds recursion on hostile decoded input.
   * Defaults to 64.
   */
  readonly maxDepth?: number;
}

const DEFAULT_MAX_DEPTH = 64;

/** Services an evaluation needs. */
export type EvaluationServices =
  | CurrentSubject
  | AttributeResolver
  | RelationshipResolver
  | EvaluationId;

const allow = (
  policyTag: Policy["_tag"],
  fields: ReadonlyArray<string> | undefined,
  children: ReadonlyArray<Trace> = [],
  label?: string,
): Trace => ({
  policyTag,
  label,
  allowed: true,
  reason: undefined,
  children,
  visibleFields: fields,
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
  resource: Resource | undefined,
  depth: number,
  maxDepth: number,
): Effect.Effect<
  Trace,
  EvaluationError,
  AttributeResolver | RelationshipResolver
> => {
  if (depth > maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth }));

  const matcherContext: MatcherContext = { subject: subject.attributes, resource };

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
      return Effect.map(readAttribute(subject, policy.attribute), (value) =>
        evaluateMatcher(policy.matcher, value, matcherContext)
          ? allow("HasAttribute", policy.fields)
          : deny("HasAttribute", `subject attribute '${policy.attribute}' did not match`),
      );

    case "HasResourceAttribute": {
      if (resource === undefined) {
        return Effect.fail(new MissingResource({ attribute: policy.attribute }));
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

    case "AllOf":
      return evaluateAllOf(policy, subject, resource, depth, maxDepth);

    case "AnyOf":
      return evaluateAnyOf(policy, subject, resource, depth, maxDepth);

    case "Not":
      return Effect.map(
        evaluateNode(policy.policy, subject, resource, depth + 1, maxDepth),
        (child) =>
          child.allowed
            ? deny("Not", "negated policy allowed", [child])
            : // Negation carries no field visibility of its own: knowing a
              // policy did *not* hold says nothing about which fields are safe.
              allow("Not", undefined, [child]),
      );

    case "Labeled":
      return Effect.map(
        evaluateNode(policy.policy, subject, resource, depth + 1, maxDepth),
        (child) => ({
          policyTag: "Labeled" as const,
          label: policy.label,
          allowed: child.allowed,
          reason: child.reason,
          children: [child],
          visibleFields: child.visibleFields,
        }),
      );
  }
};

/** Short-circuits on the first denying child. */
const evaluateAllOf = Effect.fn("guard.allOf")(function* (
  policy: Extract<Policy, { _tag: "AllOf" }>,
  subject: AuthSubject,
  resource: Resource | undefined,
  depth: number,
  maxDepth: number,
) {
  const children: Array<Trace> = [];
  const fieldSets: Array<ReadonlyArray<string> | undefined> = [];

  for (const child of policy.policies) {
    const trace = yield* evaluateNode(child, subject, resource, depth + 1, maxDepth);
    children.push(trace);
    if (!trace.allowed) {
      return deny("AllOf", trace.reason ?? "a required policy denied", children);
    }
    fieldSets.push(trace.visibleFields);
  }

  return allow("AllOf", mergeFields(policy.fieldStrategy, fieldSets), children);
});

/**
 * Short-circuits on the first allowing child — except under `Union`, which must
 * see every child to merge their field sets.
 *
 * `Intersection` on an `anyOf` is honoured rather than silently downgraded to
 * `First`, which is what the predecessor did.
 */
const evaluateAnyOf = Effect.fn("guard.anyOf")(function* (
  policy: Extract<Policy, { _tag: "AnyOf" }>,
  subject: AuthSubject,
  resource: Resource | undefined,
  depth: number,
  maxDepth: number,
) {
  const children: Array<Trace> = [];
  const allowingFieldSets: Array<ReadonlyArray<string> | undefined> = [];
  const exhaustive = policy.fieldStrategy !== "First";
  let lastReason: string | undefined;

  for (const child of policy.policies) {
    const trace = yield* evaluateNode(child, subject, resource, depth + 1, maxDepth);
    children.push(trace);

    if (trace.allowed) {
      allowingFieldSets.push(trace.visibleFields);
      if (!exhaustive) {
        return allow("AnyOf", trace.visibleFields, children);
      }
    } else {
      lastReason = trace.reason;
    }
  }

  if (allowingFieldSets.length > 0) {
    return allow("AnyOf", mergeFields(policy.fieldStrategy, allowingFieldSets), children);
  }

  return deny("AnyOf", lastReason ?? "no alternative policy allowed", children);
});

/**
 * Evaluates a policy against the current subject.
 *
 * Emits a `guard.evaluate` span carrying the decision, so authorization shows up
 * in tracing without a bespoke audit port.
 */
export const evaluate = Effect.fn("guard.evaluate")(function* (
  policy: Policy,
  options?: EvaluateOptions,
) {
  const subject = yield* CurrentSubject;
  const evaluationId = yield* EvaluationId.next;
  const startedAt = yield* Clock.currentTimeMillis;

  const trace = yield* evaluateNode(
    policy,
    subject,
    options?.resource,
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
      })
    : new Deny({
        evaluationId,
        subjectId: subject.id,
        durationMillis,
        trace,
        reason: trace.reason ?? "denied",
      });

  yield* Effect.annotateCurrentSpan({
    "guard.decision": decision._tag,
    "guard.subject_id": subject.id,
    "guard.evaluation_id": evaluationId,
    "guard.policy_tag": policy._tag,
  });

  return decision;
});
