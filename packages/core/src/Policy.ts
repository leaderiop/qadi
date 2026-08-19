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
import * as Brand from "effect/Brand";
import * as Schema from "effect/Schema";
import { Matcher } from "./Matcher.ts";
import { Obligation } from "./Obligation.ts";
import type { Permission } from "./Permission.ts";
import { PermissionSchema, SEGMENT_PATTERN } from "./Permission.ts";

/**
 * The default recursion bound for walking a `Policy` tree, shared by both
 * interpreters — `Evaluate.ts`'s `evaluateNode` and `Predicate.ts`'s
 * `translateNode` — rather than each declaring its own copy of the same
 * literal. `Predicate.ts`'s own header comment calls "the two interpreters
 * must agree" load-bearing (INV-QD-018); a `maxDepth` default that could
 * silently drift between them would be exactly the kind of disagreement
 * that property is meant to rule out.
 */
export const DEFAULT_MAX_DEPTH = 64;

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
// Rule lists
// ---------------------------------------------------------------------------

/**
 * How a rule list resolves the rules that applied.
 *
 * Exactly one rule decides under each (ADR-QD-023):
 *
 * - `FirstApplicable` — the first rule that applies
 * - `DenyOverrides` — the first applying `Deny`; failing that, the first
 *   applying `Permit`
 * - `PermitOverrides` — the first applying `Permit`; failing that, the first
 *   applying `Deny`
 */
export const Combining = Schema.Literals([
  "FirstApplicable",
  "DenyOverrides",
  "PermitOverrides",
]);
export type Combining = typeof Combining.Type;

/** What it means for a rule to apply. */
export const RuleEffect = Schema.Literals(["Permit", "Deny"]);
export type RuleEffect = typeof RuleEffect.Type;

/**
 * One row of a rule table.
 *
 * The `condition` is evaluated for **applicability**, not outcome: allowing
 * means "this rule applies", and `effect` says what applying means. That second
 * bit is the whole of E3 — boolean composition has one bit per child and so
 * cannot distinguish "did not apply" from "applied, and said no".
 */
export interface Rule {
  readonly condition: Policy;
  readonly effect: RuleEffect;
}

// ---------------------------------------------------------------------------
// Branded domain strings
// ---------------------------------------------------------------------------

/**
 * `role`, `event`, `relation`, `action`, and `label` were plain, mutually
 * interchangeable `string`s — `hasRole("doc:write")` type-checked. `Permission`
 * alone was structured. Each gets its own brand here, validated the same way
 * `Permission`'s segments are (non-empty, no `:` — {@link SEGMENT_PATTERN}),
 * so a malformed value is rejected when a `Policy` is decoded from untrusted
 * JSON, not just when one is hand-constructed in already-typechecked source.
 *
 * `Schema.brand` adds no runtime check by itself — the `.check` before it is
 * what makes this real validation, not just a compile-time tag.
 *
 * `HasAttribute`/`HasResourceAttribute`'s `attribute` is **deliberately not
 * branded here**, unlike its five siblings above. Each of those names a
 * closed-ish, policy-authored vocabulary — a fixed set of roles, actions,
 * events, relations, labels a deployment defines — so nominal, colon-free
 * validation genuinely constrains it. `attribute` names a key into an open,
 * caller-defined namespace resolved through `AttributeResolver` or a
 * resource's own record; qadi has no basis for judging one attribute name
 * valid and another not, so `SEGMENT_PATTERN` would reject legitimate
 * attribute names (a `:`-containing namespaced key, say) for no real safety
 * gain. Left as plain `string` on purpose, not by omission.
 */
/** The wrapping every brand below shares — only the tag differs. */
const segmentBrand = <Tag extends string>(tag: Tag) =>
  Schema.String.check(Schema.isPattern(SEGMENT_PATTERN)).pipe(Schema.brand(tag));

export const RoleName = segmentBrand("RoleName");
export type RoleName = typeof RoleName.Type;

export const ActionName = segmentBrand("ActionName");
export type ActionName = typeof ActionName.Type;

export const EventName = segmentBrand("EventName");
export type EventName = typeof EventName.Type;

export const RelationName = segmentBrand("RelationName");
export type RelationName = typeof RelationName.Type;

export const LabelName = segmentBrand("LabelName");
export type LabelName = typeof LabelName.Type;

/**
 * Every smart constructor below (`hasRole`, `hasAction`, …) stays **total**,
 * exactly like `permission()` in `Permission.ts`: it accepts a plain `string`
 * and never fails. `Schema`'s own `.make()` on a checked-and-branded schema
 * *does* run the check and can throw — confirmed empirically, not assumed —
 * so it is the wrong tool for a constructor that must not throw.
 * `Brand.nominal` is: it performs no validation at all and just tags the
 * value, which is exactly the guarantee a smart constructor calling it can
 * keep. Real validation still happens, just only at the `Schema` decode
 * boundary these brands are also wired into above.
 */
/**
 * Exported — unlike its four siblings below — because `AuthSubject.ts` needs
 * the identical total, non-validating conversion: `subject.roles.has(policy.role)`
 * (`Evaluate.ts`) only type-checks as a comparison of the same brand on both
 * sides if subject role names are constructed the same way `hasRole` builds
 * `policy.role`. A second, independent `Brand.nominal<RoleName>()` call in
 * `AuthSubject.ts` would behave identically today (the constructor performs
 * no validation, so there is nothing for two calls to disagree on) but would
 * give a future change to how `RoleName` is constructed no compiler-enforced
 * reason to reach both call sites.
 */
export const makeRoleName = Brand.nominal<RoleName>();
const mkActionName = Brand.nominal<ActionName>();
const mkEventName = Brand.nominal<EventName>();
const mkRelationName = Brand.nominal<RelationName>();
const mkLabelName = Brand.nominal<LabelName>();

// ---------------------------------------------------------------------------
// The policy union
// ---------------------------------------------------------------------------

export type Policy =
  | { readonly _tag: "HasPermission"; readonly permission: Permission; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasRole"; readonly role: RoleName }
  | { readonly _tag: "HasAttribute"; readonly attribute: string; readonly matcher: Matcher; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasResourceAttribute"; readonly attribute: string; readonly matcher: Matcher; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasRelationship"; readonly relation: RelationName; readonly depth?: number | undefined; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasAction"; readonly action: ActionName; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasActed"; readonly event: EventName; readonly scope: HistoryScope; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasNotActed"; readonly event: EventName; readonly scope: HistoryScope; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "AllOf"; readonly policies: ReadonlyArray<Policy>; readonly fieldStrategy: FieldStrategy }
  | { readonly _tag: "AnyOf"; readonly policies: ReadonlyArray<Policy>; readonly fieldStrategy: FieldStrategy }
  | { readonly _tag: "Rules"; readonly rules: ReadonlyArray<Rule>; readonly combining: Combining }
  | { readonly _tag: "Not"; readonly policy: Policy }
  | { readonly _tag: "Obliged"; readonly obligation: Obligation; readonly policy: Policy }
  | { readonly _tag: "Labeled"; readonly label: LabelName; readonly policy: Policy };

/**
 * The wire shape of a {@link Rule} — `condition` is a {@link PolicyEncoded},
 * not a `Policy`, for the same reason `PolicyEncoded` exists at all.
 */
export interface RuleEncoded {
  readonly condition: PolicyEncoded;
  readonly effect: RuleEffect;
}

/**
 * {@link Policy}'s JSON wire shape — identical except that `role`, `event`,
 * `relation`, `action`, and `label` are plain `string`, not the branded types
 * `Policy` carries in memory. A brand is compile-time-only type metadata; it
 * cannot and does not survive a JSON round trip, so `Schema.Codec`'s encoded
 * type parameter has to say so explicitly rather than claim (wrongly) that
 * decoding a `Policy` back out of JSON produces the exact same type as the
 * one that was encoded.
 */
export type PolicyEncoded =
  | { readonly _tag: "HasPermission"; readonly permission: Permission; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasRole"; readonly role: string }
  | { readonly _tag: "HasAttribute"; readonly attribute: string; readonly matcher: Matcher; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasResourceAttribute"; readonly attribute: string; readonly matcher: Matcher; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasRelationship"; readonly relation: string; readonly depth?: number | undefined; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasAction"; readonly action: string; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasActed"; readonly event: string; readonly scope: HistoryScope; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "HasNotActed"; readonly event: string; readonly scope: HistoryScope; readonly fields?: ReadonlyArray<string> | undefined }
  | { readonly _tag: "AllOf"; readonly policies: ReadonlyArray<PolicyEncoded>; readonly fieldStrategy: FieldStrategy }
  | { readonly _tag: "AnyOf"; readonly policies: ReadonlyArray<PolicyEncoded>; readonly fieldStrategy: FieldStrategy }
  | { readonly _tag: "Rules"; readonly rules: ReadonlyArray<RuleEncoded>; readonly combining: Combining }
  | { readonly _tag: "Not"; readonly policy: PolicyEncoded }
  | { readonly _tag: "Obliged"; readonly obligation: Obligation; readonly policy: PolicyEncoded }
  | { readonly _tag: "Labeled"; readonly label: string; readonly policy: PolicyEncoded };

/** Single suspended self-reference shared by every recursive position. */
const PolicyRef = Schema.suspend((): Schema.Codec<Policy, PolicyEncoded> => Policy);

const Fields = Schema.optional(Schema.Array(Schema.String));

const HasPermission = Schema.TaggedStruct("HasPermission", {
  permission: PermissionSchema,
  fields: Fields,
});

const HasRole = Schema.TaggedStruct("HasRole", { role: RoleName });

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
  relation: RelationName,
  depth: Schema.optional(Schema.Number),
  fields: Fields,
});

const HasAction = Schema.TaggedStruct("HasAction", {
  action: ActionName,
  fields: Fields,
});

const HasActed = Schema.TaggedStruct("HasActed", {
  event: EventName,
  scope: HistoryScope,
  fields: Fields,
});

const HasNotActed = Schema.TaggedStruct("HasNotActed", {
  event: EventName,
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

/** Untagged: a rule is a row of a table, not a member of the policy union. */
const RuleStruct = Schema.Struct({
  condition: PolicyRef,
  effect: RuleEffect,
});

const Rules = Schema.TaggedStruct("Rules", {
  rules: Schema.Array(RuleStruct),
  combining: Combining,
});

const Not = Schema.TaggedStruct("Not", { policy: PolicyRef });

const Obliged = Schema.TaggedStruct("Obliged", {
  obligation: Obligation,
  policy: PolicyRef,
});

const Labeled = Schema.TaggedStruct("Labeled", {
  label: LabelName,
  policy: PolicyRef,
});

export const Policy: Schema.Codec<Policy, PolicyEncoded> = Schema.Union([
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
  Rules,
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
 *
 * One monomorphic helper per key rather than a single one generic over the key
 * name: a generic computed property `{ [key]: value }` only ever type-checks
 * as an index signature, `{ [x: string]: V }`, not the precise `Record<K, V>`
 * — closing that gap needs either a cast or a same-shaped but untyped
 * implementation signature underneath the generic, and both just move the
 * unsoundness rather than remove it. Two ordinary, fully-typed functions have
 * no such gap to close.
 */
const fieldsKey = (
  fields: ReadonlyArray<string> | undefined,
): Readonly<{ fields?: ReadonlyArray<string> }> => (fields === undefined ? {} : { fields });

const depthKey = (depth: number | undefined): Readonly<{ depth?: number }> =>
  depth === undefined ? {} : { depth };

export const hasPermission = (
  permission: Permission,
  options?: FieldOptions,
): Policy => ({
  _tag: "HasPermission",
  permission,
  ...fieldsKey(options?.fields),
});

/** The subject holds the given role, directly or by inheritance. */
export const hasRole = (role: string): Policy => ({ _tag: "HasRole", role: makeRoleName(role) });

/** A subject attribute satisfies the matcher. */
export const hasAttribute = (
  attribute: string,
  matcher: Matcher,
  options?: FieldOptions,
): Policy => ({
  _tag: "HasAttribute",
  attribute,
  matcher,
  ...fieldsKey(options?.fields),
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
  ...fieldsKey(options?.fields),
});

/** The subject has the named relationship to the resource. */
export const hasRelationship = (
  relation: string,
  options?: FieldOptions & { readonly depth?: number },
): Policy => ({
  _tag: "HasRelationship",
  relation: mkRelationName(relation),
  ...depthKey(options?.depth),
  ...fieldsKey(options?.fields),
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
  action: mkActionName(action),
  ...fieldsKey(options?.fields),
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
  event: mkEventName(event),
  scope: options?.scope ?? "Resource",
  ...fieldsKey(options?.fields),
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
  event: mkEventName(event),
  scope: options?.scope ?? "Resource",
  ...fieldsKey(options?.fields),
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

/**
 * A rule that permits when its condition applies.
 *
 * Named `permitWhen` rather than `permit` because `Deny` is already a decision
 * class, and a bare `deny` in scope beside it would be read as producing one.
 */
export const permitWhen = (condition: Policy): Rule => ({ condition, effect: "Permit" });

/** A rule that refuses when its condition applies — the explicit deny row. */
export const denyWhen = (condition: Policy): Rule => ({ condition, effect: "Deny" });

/**
 * An ordered rule table, walked from the top.
 *
 * Exactly one rule decides, and the decision's field set and obligations are
 * that rule's alone (ADR-QD-023). No rule applying is a denial, and so is an
 * empty list: there is no default-permit spelling, and a caller wanting one
 * writes `permitWhen(allOf([]))` as the final row.
 *
 * Defaults to `FirstApplicable`, the cheapest of the three — the overrides
 * cannot short-circuit in the direction that used to be cheap.
 */
export const rules = (
  rules: ReadonlyArray<Rule>,
  options?: { readonly combining?: Combining },
): Policy => ({
  _tag: "Rules",
  rules,
  combining: options?.combining ?? "FirstApplicable",
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
  label: mkLabelName(label),
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
