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

/**
 * A policy needing `resource.id` was evaluated without one.
 *
 * Raised by `HasRelationship`, and by `HasActed`/`HasNotActed` under
 * `scope: "resource"`. One error rather than two: it is the same failure with
 * the same diagnosis, and a second code meaning the same thing would be worse
 * than a field named for the more general case.
 */
export class MissingResourceId extends Data.TaggedError("qadi/MissingResourceId")<{
  /** The relation or event the policy asked about. */
  readonly relation: string;
}> {}

/** A wired history store could not be reached. Distinct from it saying "Unknown". */
export class DecisionHistoryUnavailable extends Data.TaggedError(
  "qadi/DecisionHistoryUnavailable",
)<{
  readonly event: string;
  readonly cause: unknown;
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

/**
 * A policy could not be translated into a row predicate.
 *
 * Raised rather than approximated. A node outside the translatable subset
 * rendered as "true" would return rows the policy denies, which is the one
 * failure mode that makes predicate output worse than its absence
 * (ADR-QD-024).
 */
export class PolicyNotTranslatable extends Data.TaggedError(
  "qadi/PolicyNotTranslatable",
)<{
  readonly policyTag: string;
  readonly reason: string;
}> {}

/** Every error this library can produce during evaluation. */
export type EvaluationError =
  | AttributeResolveError
  | RelationshipResolveError
  | DecisionHistoryUnavailable
  | MissingAction
  | MissingResource
  | MissingResourceId
  | PolicyTooDeep;

/** Every error this library can produce, including enforcement and construction. */
export type QadiError =
  | EvaluationError
  | PolicyNotTranslatable
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
  "qadi/DecisionHistoryUnavailable": "ACL011",
  "qadi/PolicyNotTranslatable": "ACL012",
} as const satisfies Record<QadiError["_tag"], `ACL${string}`>;

/** The stable code for a guard error. */
export const errorCode = (self: QadiError): string => ERROR_CODES[self._tag];
