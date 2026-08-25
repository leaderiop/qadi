/**
 * Qadi error taxonomy.
 *
 * `_tag` is the identity. The stable `ACL###` code is derived from the tag by a
 * single exhaustive map, so a code can never be assigned to two unrelated
 * failures — the defect that produced ACL007 collisions in the predecessor.
 */
import * as Data from "effect/Data";
import type { Trace } from "./Decision.ts";
import type { ResourceId, SubjectId } from "./Identity.ts";

/** A policy referenced a resource attribute but no resource was in context. */
export class MissingResource extends Data.TaggedError("MissingResource")<{
  readonly attribute: string;
}> {}

/**
 * A policy read the action but the caller supplied none.
 *
 * `expected` is the action the policy required, when it named one; a matcher
 * referencing `action()` compares rather than requires, so it names nothing.
 */
export class MissingAction extends Data.TaggedError("MissingAction")<{
  readonly expected: string | undefined;
}> {}

/** Resolving a subject or resource attribute failed. */
export class AttributeResolveError extends Data.TaggedError("AttributeResolveError")<{
  readonly attribute: string;
  readonly cause: unknown;
}> {}

/** A relationship check failed to execute. Distinct from the check returning false. */
export class RelationshipResolveError extends Data.TaggedError(
  "RelationshipResolveError",
)<{
  readonly relation: string;
  readonly resourceId: ResourceId;
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
export class MissingResourceId extends Data.TaggedError("MissingResourceId")<{
  /** The relation or event the policy asked about. */
  readonly relation: string;
}> {}

/** A wired history store could not be reached. Distinct from it saying "Unknown". */
export class DecisionHistoryUnavailable extends Data.TaggedError(
  "DecisionHistoryUnavailable",
)<{
  readonly event: string;
  readonly cause: unknown;
}> {}

/**
 * A wired `SignatureHistory` store could not be reached. Distinct from it
 * legitimately answering "no matching signatures" — see `SignatureHistory.ts`.
 *
 * Not yet a member of {@link EvaluationError}/{@link QadiError}: the
 * `hasSignature` Policy leaf that raises this during evaluation does not
 * exist yet (wayfinder ticket #14). It joins both unions once that leaf and
 * its `evaluateNode` wiring land (wayfinder ticket #16).
 */
export class SignatureHistoryUnavailable extends Data.TaggedError(
  "SignatureHistoryUnavailable",
)<{
  readonly subjectId: SubjectId;
  readonly resourceId: ResourceId | undefined;
  readonly cause: unknown;
}> {}

/** The policy tree is deeper than the configured limit. Guards against cyclic input. */
export class PolicyTooDeep extends Data.TaggedError("PolicyTooDeep")<{
  readonly maxDepth: number;
}> {}

/** A role graph loaded from serialized form contains a cycle. */
export class CircularRoleInheritance extends Data.TaggedError(
  "CircularRoleInheritance",
)<{
  readonly roleName: string;
  readonly cycle: ReadonlyArray<string>;
}> {}

/** A permission segment contained the reserved `:` separator. */
export class InvalidPermissionSegment extends Data.TaggedError(
  "InvalidPermissionSegment",
)<{
  readonly segment: string;
  readonly value: string;
}> {}

/**
 * Enforcement denied access.
 *
 * `reason` is the root node's sentence; `trace` is the tree behind it, so a
 * caller can answer "why" without re-evaluating. Render it with `renderTrace`.
 *
 * The trace is carried rather than summarised because enforcement is where a
 * denial usually surfaces — `assert`, `enforce`, `enforceProjected` and `guard`
 * all fail with this value, `@qadi/promise` rejects with it and `@qadi/http`
 * maps it — and it was the one path that built the whole tree and then dropped
 * it. Note what that means for disclosure: a trace names every node's tag, its
 * label and the sentence explaining why it refused, so it belongs in a log or a
 * test failure, not in a response body. `toResponse` returns an empty body for
 * exactly that reason.
 */
export class AccessDenied extends Data.TaggedError("AccessDenied")<{
  readonly subjectId: SubjectId;
  readonly policyTag: string;
  readonly reason: string;
  readonly trace: Trace;
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
  "UndischargedObligation",
)<{
  readonly subjectId: SubjectId;
  readonly obligationIds: ReadonlyArray<string>;
}> {}

/**
 * A `HasCustom` node's registered predicate could not produce an answer.
 *
 * Covers two distinct causes under one tag: the name has no entry in a
 * populated `CustomPredicate` registry (a wiring mistake), or the registered
 * function's own logic failed. Neither is a denial — "failure is not denial"
 * applies to a misconfigured or broken custom predicate exactly as it does to
 * a broken attribute lookup.
 */
export class CustomPredicateError extends Data.TaggedError("CustomPredicateError")<{
  readonly name: string;
  readonly reason: string;
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
  "PolicyNotTranslatable",
)<{
  readonly policyTag: string;
  readonly reason: string;
}> {}

/** Every error this library can produce during evaluation. */
export type EvaluationError =
  | AttributeResolveError
  | RelationshipResolveError
  | DecisionHistoryUnavailable
  | CustomPredicateError
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
  "AccessDenied": "ACL001",
  "AttributeResolveError": "ACL002",
  "RelationshipResolveError": "ACL003",
  "MissingResource": "ACL004",
  "MissingResourceId": "ACL005",
  "PolicyTooDeep": "ACL006",
  "CircularRoleInheritance": "ACL007",
  "InvalidPermissionSegment": "ACL008",
  "MissingAction": "ACL009",
  "UndischargedObligation": "ACL010",
  "DecisionHistoryUnavailable": "ACL011",
  "PolicyNotTranslatable": "ACL012",
  "CustomPredicateError": "ACL013",
} as const satisfies Record<QadiError["_tag"], `ACL${string}`>;

/** The stable code for a guard error. */
export const errorCode = (self: QadiError): string => ERROR_CODES[self._tag];
