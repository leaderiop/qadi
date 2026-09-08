/**
 * Qadi error taxonomy.
 *
 * `_tag` is the identity. The stable `ACL###` code is derived from the tag by a
 * single exhaustive map, so a code can never be assigned to two unrelated
 * failures — the defect that produced ACL007 collisions in the predecessor.
 *
 * **Eleven `EnforcementError` members are `Schema.TaggedError`, not
 * `Data.TaggedError`** — the narrow, named exception to AGENTS.md §4. Nine of
 * them (ADR-QD-060) cross a process boundary as part of a `SinkRecord`
 * (`SinkCodec.ts`); the remaining two, `AccessDenied` and
 * `UndischargedObligation`, do not cross that wire but do cross a second,
 * independent trust boundary — `@qadi/http`'s response body — and ADR-QD-072
 * narrows ADR-QD-060 to cover them too, for the same reason: the class is the
 * schema `httpApiStatus` annotates, rather than a second, hand-mapped
 * description of the same eleven shapes living beside it in `@qadi/http`.
 * Every other error in this file stays `Data.TaggedError`.
 */
import * as Data from "effect/Data";
import * as Schema from "effect/Schema";
import { TraceSchema } from "./Decision.ts";
import { ResourceIdSchema, SubjectIdSchema } from "./Identity.ts";
import type { PolicyDecodeTooDeep } from "./Policy.ts";

/** A policy referenced a resource attribute but no resource was in context. */
export class MissingResource extends Schema.TaggedError<MissingResource>()("MissingResource", {
  attribute: Schema.String,
}) {}

/**
 * A policy read the action but the caller supplied none.
 *
 * `expected` is the action the policy required, when it named one; a matcher
 * referencing `action()` compares rather than requires, so it names nothing.
 */
export class MissingAction extends Schema.TaggedError<MissingAction>()("MissingAction", {
  // `Schema.optional`, not `Schema.UndefinedOr`: `Schema.encodeEffect` writing
  // `expected: undefined` survives a `JSON.stringify` round-trip as an
  // ABSENT key (JSON has no `undefined`), and `UndefinedOr` only tolerates a
  // *present* key whose value is `undefined` — it still requires the key on
  // decode. `optional` tolerates the key being genuinely missing, which is
  // exactly what a `JSON.parse(JSON.stringify(...))` round-trip produces.
  expected: Schema.optional(Schema.String),
}) {}

/** Resolving a subject or resource attribute failed. */
export class AttributeResolveError extends Schema.TaggedError<AttributeResolveError>()(
  "AttributeResolveError",
  {
    attribute: Schema.String,
    cause: Schema.Defect(),
  },
) {}

/** A relationship check failed to execute. Distinct from the check returning false. */
export class RelationshipResolveError extends Schema.TaggedError<RelationshipResolveError>()(
  "RelationshipResolveError",
  {
    relation: Schema.String,
    resourceId: ResourceIdSchema,
    cause: Schema.Defect(),
  },
) {}

/**
 * A policy needing `resource.id` was evaluated without one.
 *
 * Raised by `HasRelationship`, and by `HasActed`/`HasNotActed` under
 * `scope: "resource"`. One error rather than two: it is the same failure with
 * the same diagnosis, and a second code meaning the same thing would be worse
 * than a field named for the more general case.
 */
export class MissingResourceId extends Schema.TaggedError<MissingResourceId>()(
  "MissingResourceId",
  {
    /** The relation or event the policy asked about. */
    relation: Schema.String,
  },
) {}

/** A wired history store could not be reached. Distinct from it saying "Unknown". */
export class DecisionHistoryUnavailable extends Schema.TaggedError<DecisionHistoryUnavailable>()(
  "DecisionHistoryUnavailable",
  {
    event: Schema.String,
    cause: Schema.Defect(),
  },
) {}

/**
 * A wired `SignatureHistory` store could not be reached. Distinct from it
 * legitimately answering "no matching signatures" — see `SignatureHistory.ts`.
 */
export class SignatureHistoryUnavailable extends Schema.TaggedError<SignatureHistoryUnavailable>()(
  "SignatureHistoryUnavailable",
  {
    subjectId: SubjectIdSchema,
    // `Schema.optional`, not `Schema.UndefinedOr` — see `MissingAction.expected`'s
    // doc comment above for why: a JSON round-trip turns `undefined` into an
    // absent key, which only `optional` tolerates on decode.
    resourceId: Schema.optional(ResourceIdSchema),
    cause: Schema.Defect(),
  },
) {}

/** The policy tree is deeper than the configured limit. Guards against cyclic input. */
export class PolicyTooDeep extends Schema.TaggedError<PolicyTooDeep>()("PolicyTooDeep", {
  maxDepth: Schema.Number,
}) {}

/** A role graph loaded from serialized form contains a cycle. */
export class CircularRoleInheritance extends Data.TaggedError(
  "CircularRoleInheritance",
)<{
  readonly roleName: string;
  readonly cycle: ReadonlyArray<string>;
}> {}

/**
 * A role graph loaded from serialized form names the same role more than once.
 *
 * `resolveRoleGraph` built `byName` from a `Map`, so the last definition for a
 * repeated name silently won and every earlier definition's permissions
 * vanished with nothing said at any level — the same shape of defect an
 * unknown parent name has, except there the surviving behavior (grant less) is
 * defensible and here it is not: which of two same-named definitions "wins" is
 * not a decision this library can make on a caller's behalf, so it fails
 * instead of guessing.
 */
export class DuplicateRoleDefinition extends Data.TaggedError(
  "DuplicateRoleDefinition",
)<{
  readonly names: ReadonlyArray<string>;
}> {}

/**
 * A permission segment contained the reserved `:` separator.
 *
 * Reserved for this purpose but not currently raised by any code path: today
 * a colon in a decoded permission's `resource`/`action` surfaces as a generic
 * `Schema` issue from {@link PermissionSchema}'s pattern check, not as this
 * typed error — {@link Permission.ts}'s `permission()` constructor rejects a
 * colon-containing literal at compile time via `NoColon` instead of at
 * runtime. Kept in {@link QadiError}/{@link ERROR_CODES} (`ACL008`) as the
 * stable code this violation would carry if a call site is ever added that
 * raises it directly, rather than removed and the code retired.
 */
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
export class AccessDenied extends Schema.TaggedError<AccessDenied>()("AccessDenied", {
  subjectId: SubjectIdSchema,
  policyTag: Schema.String,
  reason: Schema.String,
  trace: TraceSchema,
}) {}

/**
 * Enforcement met an obligation it could not discharge.
 *
 * `enforce` returns the guarded effect's value, not the decision, so an
 * obligation would otherwise be computed and thrown away while the caller ran
 * the protected work believing the policy permitted it unconditionally. Failing
 * is the only honest option: the permission had a condition nobody met.
 */
export class UndischargedObligation extends Schema.TaggedError<UndischargedObligation>()(
  "UndischargedObligation",
  {
    subjectId: SubjectIdSchema,
    obligationIds: Schema.Array(Schema.String),
  },
) {}

/**
 * A `HasCustom` node's registered predicate could not produce an answer.
 *
 * Covers two distinct causes under one tag: the name has no entry in a
 * populated `CustomPredicate` registry (a wiring mistake), or the registered
 * function's own logic failed. Neither is a denial — "failure is not denial"
 * applies to a misconfigured or broken custom predicate exactly as it does to
 * a broken attribute lookup.
 */
export class CustomPredicateError extends Schema.TaggedError<CustomPredicateError>()(
  "CustomPredicateError",
  {
    name: Schema.String,
    reason: Schema.String,
  },
) {}

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

/**
 * A `…Bounded` port wrapper was given a non-positive permit count.
 *
 * `effect/Semaphore`'s `Semaphore.make` performs no validation of its own: with
 * `permits <= 0`, `free` is permanently below `1`, so every `withPermit` call
 * enqueues in `waitForPermits` and nothing ever releases enough to wake it —
 * every wrapped call deadlocks forever rather than failing. Caught here, at
 * layer construction, rather than left to manifest as an unexplained hang the
 * first time a caller reaches the wrapped port.
 */
export class InvalidBoundedPermits extends Data.TaggedError("InvalidBoundedPermits")<{
  readonly permits: number;
}> {}

/** Every error this library can produce during evaluation. */
export type EvaluationError =
  | AttributeResolveError
  | RelationshipResolveError
  | DecisionHistoryUnavailable
  | CustomPredicateError
  | SignatureHistoryUnavailable
  | MissingAction
  | MissingResource
  | MissingResourceId
  | PolicyTooDeep;

/**
 * Every error this library can produce, including enforcement and construction.
 *
 * `PolicyDecodeTooDeep` is defined in `Policy.ts`, not here, and imported as a
 * type only: it is raised by the public `decodePolicy`/`fromJson` API, before
 * evaluation, and `Errors.ts` cannot import it as a value without a circular
 * dependency (see the class's own doc comment in `Policy.ts`) — a type-only
 * import is erased at compile time, so it carries none of that risk. It
 * belongs in this union regardless: ADR-QD-008/INV-QD-010 promise every error
 * this library can produce a stable code, and this one previously bypassed
 * both the union and `ERROR_CODES`.
 */
export type QadiError =
  | EvaluationError
  | PolicyNotTranslatable
  | AccessDenied
  | UndischargedObligation
  | CircularRoleInheritance
  | DuplicateRoleDefinition
  | InvalidPermissionSegment
  | PolicyDecodeTooDeep
  | InvalidBoundedPermits;

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
  "SignatureHistoryUnavailable": "ACL014",
  "DuplicateRoleDefinition": "ACL015",
  "InvalidBoundedPermits": "ACL016",
  "PolicyDecodeTooDeep": "ACL017",
} as const satisfies Record<QadiError["_tag"], `ACL${string}`>;

/** The stable code for a guard error. */
export const errorCode = (self: { readonly _tag: QadiError["_tag"] }): string =>
  ERROR_CODES[self._tag];
