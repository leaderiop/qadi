/**
 * Qadi error taxonomy.
 *
 * `_tag` is the identity. The stable `ACL###` code is derived from the tag by a
 * single exhaustive map, so a code can never be assigned to two unrelated
 * failures — the defect that produced ACL007 collisions in the predecessor.
 */
import * as Data from "effect/Data";

/** A policy referenced a resource attribute but no resource was in context. */
export class MissingResource extends Data.TaggedError("qadi/MissingResource")<{
  readonly attribute: string;
}> {}

/**
 * A policy read the action but the caller supplied none.
 *
 * `expected` is the action the policy required, when it named one; a matcher
 * referencing `action()` compares rather than requires, so it names nothing.
 */
export class MissingAction extends Data.TaggedError("qadi/MissingAction")<{
  readonly expected: string | undefined;
}> {}

/** Resolving a subject or resource attribute failed. */
export class AttributeResolveError extends Data.TaggedError("qadi/AttributeResolveError")<{
  readonly attribute: string;
  readonly cause: unknown;
}> {}

/** A relationship check failed to execute. Distinct from the check returning false. */
export class RelationshipResolveError extends Data.TaggedError(
  "qadi/RelationshipResolveError",
)<{
  readonly relation: string;
  readonly resourceId: string;
  readonly cause: unknown;
}> {}

/** A `HasRelationship` policy was evaluated without `resource.id` in context. */
export class MissingResourceId extends Data.TaggedError("qadi/MissingResourceId")<{
  readonly relation: string;
}> {}

/** The policy tree is deeper than the configured limit. Guards against cyclic input. */
export class PolicyTooDeep extends Data.TaggedError("qadi/PolicyTooDeep")<{
  readonly maxDepth: number;
}> {}

/** A role graph loaded from serialized form contains a cycle. */
export class CircularRoleInheritance extends Data.TaggedError(
  "qadi/CircularRoleInheritance",
)<{
  readonly roleName: string;
  readonly cycle: ReadonlyArray<string>;
}> {}

/** A permission segment contained the reserved `:` separator. */
export class InvalidPermissionSegment extends Data.TaggedError(
  "qadi/InvalidPermissionSegment",
)<{
  readonly segment: string;
  readonly value: string;
}> {}

/** Enforcement denied access. Carries the decision so callers can inspect the trace. */
export class AccessDenied extends Data.TaggedError("qadi/AccessDenied")<{
  readonly subjectId: string;
  readonly policyTag: string;
  readonly reason: string;
}> {}

/**
 * Enforcement met an obligation it could not discharge.
 *
 * `enforce` returns the guarded effect's value, not the decision, so an
 * obligation would otherwise be computed and thrown away while the caller ran
 * the protected work believing the policy permitted it unconditionally. Failing
 * is the only honest option: the permission had a condition nobody met.
 */
export class UndischargedObligation extends Data.TaggedError(
  "qadi/UndischargedObligation",
)<{
  readonly subjectId: string;
  readonly obligationIds: ReadonlyArray<string>;
}> {}

/** Every error this library can produce during evaluation. */
export type EvaluationError =
  | AttributeResolveError
  | RelationshipResolveError
  | MissingAction
  | MissingResource
  | MissingResourceId
  | PolicyTooDeep;

/** Every error this library can produce, including enforcement and construction. */
export type QadiError =
  | EvaluationError
  | AccessDenied
  | UndischargedObligation
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
  "qadi/AccessDenied": "ACL001",
  "qadi/AttributeResolveError": "ACL002",
  "qadi/RelationshipResolveError": "ACL003",
  "qadi/MissingResource": "ACL004",
  "qadi/MissingResourceId": "ACL005",
  "qadi/PolicyTooDeep": "ACL006",
  "qadi/CircularRoleInheritance": "ACL007",
  "qadi/InvalidPermissionSegment": "ACL008",
  "qadi/MissingAction": "ACL009",
  "qadi/UndischargedObligation": "ACL010",
} as const satisfies Record<QadiError["_tag"], `ACL${string}`>;

/** The stable code for a guard error. */
export const errorCode = (self: QadiError): string => ERROR_CODES[self._tag];
