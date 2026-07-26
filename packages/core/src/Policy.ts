/**
 * The policy algebraic data type.
 *
 * Defined **once** as a Schema; the TypeScript type is derived from it and the
 * JSON codec is derived from it. This is the central design decision of the
 * library (ADR-QD-002).
 *
 * The predecessor maintained the type in one file and a hand-written
 * serializer/deserializer in two others. They drifted: `fieldStrategy` was
 * never written to JSON, so a policy stored and reloaded silently narrowed
 * field-level visibility. Deriving both artefacts from one definition makes
 * that class of defect unrepresentable.
 *
 * `fieldStrategy` is therefore **required**, not optional — an omitted optional
 * field is exactly what went missing before.
 */
import * as Schema from "effect/Schema";
import { Matcher } from "./Matcher.ts";
import { Obligation } from "./Obligation.ts";
import type { Permission } from "./Permission.ts";
import { PermissionSchema } from "./Permission.ts";

// ---------------------------------------------------------------------------
// Field visibility strategy
// ---------------------------------------------------------------------------

/**
 * How a composite policy merges the visible-field sets of its children.
 *
 * `undefined` field sets mean "all fields", the top of the lattice, so
 * intersecting with them is identity.
 *
 * - `Intersection` — visible in *every* allowing child (least privilege)
 * - `Union` — visible in *any* allowing child; forces full evaluation
 * - `First` — the first allowing child's set; short-circuits
 */
export const FieldStrategy = Schema.Literals(["Intersection", "Union", "First"]);
export type FieldStrategy = typeof FieldStrategy.Type;

/**
 * Which past events a history policy asks about.
 *
 * - `Resource` — this subject, this event, *this resource*. Needs `resource.id`.
 * - `Any` — this subject, this event, ever, whatever the resource.
 *
 * Required rather than optional for the reason `fieldStrategy` is: an omitted
 * optional field is exactly what went missing in the predecessor, and the
 * difference between the two here is the difference between "you approved this
 * invoice" and "you have ever approved anything".
 */
export const HistoryScope = Schema.Literals(["Resource", "Any"]);
export type HistoryScope = typeof HistoryScope.Type;

// ---------------------------------------------------------------------------
// The policy union
// ---------------------------------------------------------------------------

export type Policy =
  | { readonly _tag: "HasPermission"; readonly permission: Permission; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasRole"; readonly role: string }
  | { readonly _tag: "HasAttribute"; readonly attribute: string; readonly matcher: Matcher; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasResourceAttribute"; readonly attribute: string; readonly matcher: Matcher; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasRelationship"; readonly relation: string; readonly depth?: number | undefined; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasAction"; readonly action: string; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasActed"; readonly event: string; readonly scope: HistoryScope; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasNotActed"; readonly event: string; readonly scope: HistoryScope; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "AllOf"; readonly policies: ReadonlyArray<Policy>; readonly fieldStrategy: FieldStrategy }
  | { readonly _tag: "AnyOf"; readonly policies: ReadonlyArray<Policy>; readonly fieldStrategy: FieldStrategy }
  | { readonly _tag: "Not"; readonly policy: Policy }
  | { readonly _tag: "Obliged"; readonly obligation: Obligation; readonly policy: Policy }
  | { readonly _tag: "Labeled"; readonly label: string; readonly policy: Policy };

/** Single suspended self-reference shared by every recursive position. */
const PolicyRef = Schema.suspend((): Schema.Codec<Policy> => Policy);

const Fields = Schema.optional(Schema.Array(Schema.String));

const HasPermission = Schema.TaggedStruct("HasPermission", {
  permission: PermissionSchema,
  fields: Fields,
});

const HasRole = Schema.TaggedStruct("HasRole", { role: Schema.String });

const HasAttribute = Schema.TaggedStruct("HasAttribute", {
  attribute: Schema.String,
  matcher: Matcher,
  fields: Fields,
});

const HasResourceAttribute = Schema.TaggedStruct("HasResourceAttribute", {
  attribute: Schema.String,
  matcher: Matcher,
  fields: Fields,
});

const HasRelationship = Schema.TaggedStruct("HasRelationship", {
  relation: Schema.String,
  depth: Schema.optional(Schema.Number),
  fields: Fields,
});

const HasAction = Schema.TaggedStruct("HasAction", {
  action: Schema.String,
  fields: Fields,
});

const HasActed = Schema.TaggedStruct("HasActed", {
  event: Schema.String,
  scope: HistoryScope,
  fields: Fields,
});

const HasNotActed = Schema.TaggedStruct("HasNotActed", {
  event: Schema.String,
  scope: HistoryScope,
  fields: Fields,
});

const AllOf = Schema.TaggedStruct("AllOf", {
  policies: Schema.Array(PolicyRef),
  fieldStrategy: FieldStrategy,
});

const AnyOf = Schema.TaggedStruct("AnyOf", {
  policies: Schema.Array(PolicyRef),
  fieldStrategy: FieldStrategy,
});

const Not = Schema.TaggedStruct("Not", { policy: PolicyRef });

const Obliged = Schema.TaggedStruct("Obliged", {
  obligation: Obligation,
  policy: PolicyRef,
});

const Labeled = Schema.TaggedStruct("Labeled", {
  label: Schema.String,
  policy: PolicyRef,
});

export const Policy: Schema.Codec<Policy> = Schema.Union([
  HasPermission,
  HasRole,
  HasAttribute,
  HasResourceAttribute,
  HasRelationship,
  HasAction,
  HasActed,
  HasNotActed,
  AllOf,
  AnyOf,
  Not,
  Obliged,
  Labeled,
]);

// ---------------------------------------------------------------------------
// Combinators
// ---------------------------------------------------------------------------

export interface FieldOptions {
  /** Restricts the fields visible when this policy allows. Omitted means all. */
  readonly fields?: ReadonlyArray<string>;
}

export interface CombinatorOptions {
  /** Defaults to `Intersection` for `allOf` and `First` for `anyOf`. */
  readonly fieldStrategy?: FieldStrategy;
}

/** The subject holds the given permission. */
/**
 * Optional keys are *omitted* rather than set to `undefined`.
 *
 * `Schema.optional` drops absent keys on decode, so writing `fields: undefined`
 * would make a constructed policy structurally different from the same policy
 * after a round trip — and `deepStrictEqual` would see the difference. Omitting
 * keeps encode/decode an exact identity.
 */
const optionalKey = <K extends string, V>(
  key: K,
  value: V | undefined,
): Readonly<Record<K, V>> | Record<string, never> =>
  value === undefined ? {} : ({ [key]: value } as Readonly<Record<K, V>>);

export const hasPermission = (
  permission: Permission,
  options?: FieldOptions,
): Policy => ({
  _tag: "HasPermission",
  permission,
  ...optionalKey("fields", options?.fields),
});

/** The subject holds the given role, directly or by inheritance. */
export const hasRole = (role: string): Policy => ({ _tag: "HasRole", role });

/** A subject attribute satisfies the matcher. */
export const hasAttribute = (
  attribute: string,
  matcher: Matcher,
  options?: FieldOptions,
): Policy => ({
  _tag: "HasAttribute",
  attribute,
  matcher,
  ...optionalKey("fields", options?.fields),
});

/** A resource attribute satisfies the matcher. */
export const hasResourceAttribute = (
  attribute: string,
  matcher: Matcher,
  options?: FieldOptions,
): Policy => ({
  _tag: "HasResourceAttribute",
  attribute,
  matcher,
  ...optionalKey("fields", options?.fields),
});

/** The subject has the named relationship to the resource. */
export const hasRelationship = (
  relation: string,
  options?: FieldOptions & { readonly depth?: number },
): Policy => ({
  _tag: "HasRelationship",
  relation,
  ...optionalKey("depth", options?.depth),
  ...optionalKey("fields", options?.fields),
});

/**
 * The call being authorized is the named action.
 *
 * This is the *request's* verb, not a grant: `hasAction("write")` asks whether
 * the caller is writing, where `hasPermission(permission("doc", "write"))` asks
 * whether they are allowed to. Read-down/write-up rules need both, and
 * conflating them is the failure ADR-QD-018 refuses.
 */
export const hasAction = (action: string, options?: FieldOptions): Policy => ({
  _tag: "HasAction",
  action,
  ...optionalKey("fields", options?.fields),
});

export interface HistoryOptions extends FieldOptions {
  /** Defaults to `"Resource"`. */
  readonly scope?: HistoryScope;
}

/**
 * The subject has already performed the named event.
 *
 * Reads the caller's history through `DecisionHistory`. An unwired port answers
 * `"Unknown"`, and this denies.
 */
export const hasActed = (event: string, options?: HistoryOptions): Policy => ({
  _tag: "HasActed",
  event,
  scope: options?.scope ?? "Resource",
  ...optionalKey("fields", options?.fields),
});

/**
 * The subject has **not** performed the named event — "approve, unless you
 * raised it".
 *
 * **This is not `not(hasActed(e))`, and the difference is a security one.** The
 * port is three-valued: an unwired one answers `"Unknown"`, under which
 * `hasActed` denies — so `not(hasActed(e))` *allows*. This denies. Anyone
 * tempted to collapse the two should read
 * [ADR-QD-020](../../../spec/decisions/020-decision-history-port.md) first.
 */
export const hasNotActed = (event: string, options?: HistoryOptions): Policy => ({
  _tag: "HasNotActed",
  event,
  scope: options?.scope ?? "Resource",
  ...optionalKey("fields", options?.fields),
});

/**
 * Every child must allow.
 *
 * Defaults to `Intersection`: a subject may see only the fields every branch
 * agrees on. Least privilege is the safe default for a conjunction.
 */
export const allOf = (
  policies: ReadonlyArray<Policy>,
  options?: CombinatorOptions,
): Policy => ({
  _tag: "AllOf",
  policies,
  fieldStrategy: options?.fieldStrategy ?? "Intersection",
});

/**
 * At least one child must allow.
 *
 * Defaults to `First`, which short-circuits. Pass `Union` to evaluate every
 * child and merge their field sets — useful when several grants each expose a
 * different slice of a record.
 */
export const anyOf = (
  policies: ReadonlyArray<Policy>,
  options?: CombinatorOptions,
): Policy => ({
  _tag: "AnyOf",
  policies,
  fieldStrategy: options?.fieldStrategy ?? "First",
});

/** Inverts a decision. Carries no field visibility of its own. */
export const not = (policy: Policy): Policy => ({ _tag: "Not", policy });

/**
 * Attaches a duty the caller must discharge if this policy allows.
 *
 * "Permit, provided the access is logged" — the thing `fields` cannot say,
 * because it restricts what comes back rather than what the caller owes.
 *
 * The obligation reaches the decision only when the wrapped policy **allows**.
 * That single rule is why `not` needs no special case: negating an obliged
 * policy either denies (permitting nothing, so conditioning nothing) or allows
 * because the inner policy denied (contributing no obligation either way). The
 * discarded obligation is still on the trace node it arose from
 * ([ADR-QD-019](../../../spec/decisions/019-obligations.md)).
 */
export const obliged = (obligation: Obligation, policy: Policy): Policy => ({
  _tag: "Obliged",
  obligation,
  policy,
});

/** Attaches a human-readable label, surfaced in the evaluation trace. */
export const labeled = (label: string, policy: Policy): Policy => ({
  _tag: "Labeled",
  label,
  policy,
});

/** Any of the given roles. */
export const anyOfRoles = (roles: ReadonlyArray<string>): Policy =>
  anyOf(roles.map(hasRole));

// ---------------------------------------------------------------------------
// Serialization — derived, never hand-written
// ---------------------------------------------------------------------------

/** JSON string codec for a policy. */
export const PolicyFromJson = Schema.fromJsonString(Policy);

/** Encodes a policy to a JSON string. */
export const toJson = Schema.encodeEffect(PolicyFromJson);

/** Decodes a policy from an untrusted JSON string. */
export const fromJson = Schema.decodeUnknownEffect(PolicyFromJson);

/** Encodes a policy to a plain JSON value. */
export const toJsonValue = Schema.encodeEffect(Policy);

/** Decodes a policy from an untrusted plain JSON value. */
export const fromJsonValue = Schema.decodeUnknownEffect(Policy);
