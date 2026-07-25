/**
 * Guard error taxonomy.
 *
 * `_tag` is the identity. The stable `ACL###` code is derived from the tag by a
 * single exhaustive map, so a code can never be assigned to two unrelated
 * failures — the defect that produced ACL007 collisions in the predecessor.
 */
import * as Data from "effect/Data";

/** A policy referenced a resource attribute but no resource was in context. */
export class MissingResource extends Data.TaggedError("guard/MissingResource")<{
  readonly attribute: string;
}> {}

/** Resolving a subject or resource attribute failed. */
export class AttributeResolveError extends Data.TaggedError("guard/AttributeResolveError")<{
  readonly attribute: string;
  readonly cause: unknown;
}> {}

/** A relationship check failed to execute. Distinct from the check returning false. */
export class RelationshipResolveError extends Data.TaggedError(
  "guard/RelationshipResolveError",
)<{
  readonly relation: string;
  readonly resourceId: string;
  readonly cause: unknown;
}> {}

/** A `HasRelationship` policy was evaluated without `resource.id` in context. */
export class MissingResourceId extends Data.TaggedError("guard/MissingResourceId")<{
  readonly relation: string;
}> {}

/** The policy tree is deeper than the configured limit. Guards against cyclic input. */
export class PolicyTooDeep extends Data.TaggedError("guard/PolicyTooDeep")<{
  readonly maxDepth: number;
}> {}

/** A role graph loaded from serialized form contains a cycle. */
export class CircularRoleInheritance extends Data.TaggedError(
  "guard/CircularRoleInheritance",
)<{
  readonly roleName: string;
  readonly cycle: ReadonlyArray<string>;
}> {}

/** A permission segment contained the reserved `:` separator. */
export class InvalidPermissionSegment extends Data.TaggedError(
  "guard/InvalidPermissionSegment",
)<{
  readonly segment: string;
  readonly value: string;
}> {}

/** Enforcement denied access. Carries the decision so callers can inspect the trace. */
export class AccessDenied extends Data.TaggedError("guard/AccessDenied")<{
  readonly subjectId: string;
  readonly policyTag: string;
  readonly reason: string;
}> {}

/** Every error this library can produce during evaluation. */
export type EvaluationError =
  | AttributeResolveError
  | RelationshipResolveError
  | MissingResource
  | MissingResourceId
  | PolicyTooDeep;

/** Every error this library can produce, including enforcement and construction. */
export type GuardError =
  | EvaluationError
  | AccessDenied
  | CircularRoleInheritance
  | InvalidPermissionSegment;

/**
 * Stable numeric codes for logging and cross-process correlation.
 *
 * The map is exhaustive over the tag union: adding an error without a code is a
 * compile error, and reusing a code is visible in one place rather than spread
 * across constructors.
 */
export const ERROR_CODES = {
  "guard/AccessDenied": "ACL001",
  "guard/AttributeResolveError": "ACL002",
  "guard/RelationshipResolveError": "ACL003",
  "guard/MissingResource": "ACL004",
  "guard/MissingResourceId": "ACL005",
  "guard/PolicyTooDeep": "ACL006",
  "guard/CircularRoleInheritance": "ACL007",
  "guard/InvalidPermissionSegment": "ACL008",
} as const satisfies Record<GuardError["_tag"], `ACL${string}`>;

/** The stable code for a guard error. */
export const errorCode = (self: GuardError): string => ERROR_CODES[self._tag];
