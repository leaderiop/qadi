/**
 * What a policy leaf needs from the request, stated once.
 *
 * `evaluate` and `toPredicate` are two interpreters over one policy tree
 * (ADR-QD-024), and the rule that a leaf which reads the action or the resource
 * fails when the request has none (INV-QD-011) used to be written per leaf and per
 * interpreter, with a check order that differed between leaves. The table below
 * says, per leaf, which input it reads itself and whether its matcher is asked what
 * it references; {@link absenceOf} applies one rule to a row, and {@link errorOf}
 * says which error each absence becomes. Package-private, out of the barrel
 * (ADR-QD-099), and stated as a table so that a leaf added to the policy is a
 * compile error here until it has a row (ADR-QD-163 applying ADR-QD-152, ARCH-97).
 *
 * The rule: a leaf's own input first, then what its matcher references, the action
 * before the resource. A matcher holds at most one reference, so the second half of
 * "action before resource" never decides between two matcher references; it is the
 * own-before-matcher half that a request missing both inputs can see.
 */
import * as Match from "effect/Match";
import type { AuthSubject } from "./AuthSubject.ts";
import { MissingAction, MissingResource, MissingResourceId } from "./Errors.ts";
import type { Matcher } from "./Matcher.ts";
import { referencesAction, referencesResource } from "./Matcher.ts";
import { permissionKey } from "./Permission.ts";
import type { LeafPolicy } from "./Policy.ts";

type LeafTag = LeafPolicy["_tag"];

/** A leaf that carries a matcher, and so a name for the attribute it reads. */
type MatcherLeaf = Extract<LeafPolicy, { readonly matcher: Matcher }>;

/** The leaf that names the action itself. */
type ActionLeaf = Extract<LeafPolicy, { readonly _tag: "HasAction" }>;

/** What one leaf needs from the request. */
export interface LeafNeed {
  /** What the leaf itself reads, whatever its matcher says; checked first. */
  readonly own: "Nothing" | "Action" | "Resource";
  /** Whether its matcher is asked what it references; checked after `own`. */
  readonly matcher: boolean;
  /** Whether it asks a port about one resource, which `readScoped` enforces. */
  readonly resourceId: "Never" | "Always" | "ByScope";
}

/**
 * One row per leaf tag. A missing row is TS2741 and an extra one TS2353, so a new
 * leaf cannot ship without saying what it needs (INV-QD-345).
 *
 * Rows equal in content stay separate, keyed rows: the key is the leaf, not the
 * shape of its need.
 */
export const LEAF_NEEDS = {
  HasPermission: { own: "Nothing", matcher: false, resourceId: "Never" },
  HasRole: { own: "Nothing", matcher: false, resourceId: "Never" },
  HasAttribute: { own: "Nothing", matcher: true, resourceId: "Never" },
  HasResourceAttribute: { own: "Resource", matcher: true, resourceId: "Never" },
  HasRelationship: { own: "Nothing", matcher: false, resourceId: "Always" },
  HasAction: { own: "Action", matcher: false, resourceId: "Never" },
  HasActed: { own: "Nothing", matcher: false, resourceId: "ByScope" },
  HasNotActed: { own: "Nothing", matcher: false, resourceId: "ByScope" },
  HasCustom: { own: "Nothing", matcher: false, resourceId: "Never" },
  HasSignature: { own: "Nothing", matcher: false, resourceId: "ByScope" },
} as const satisfies { readonly [K in LeafTag]: LeafNeed };

/** What a request supplied, as far as an interpreter knows it. */
export interface Supplied<Resource extends boolean = boolean> {
  readonly action: boolean;
  readonly resource: Resource;
}

/** The action a leaf read and the request did not carry. */
export interface ActionAbsence {
  readonly _tag: "Action";
  /** The action the leaf required, when it named one. */
  readonly expected?: string;
}

/** The resource a leaf read and the request did not carry. */
export interface ResourceAbsence {
  readonly _tag: "Resource";
  readonly attribute: string;
}

/** The resource id a scoped port read needed and the resource did not have. */
export interface ResourceIdAbsence {
  readonly _tag: "ResourceId";
  readonly relation: string;
}

/** What a request can be missing. */
export type Absence = ActionAbsence | ResourceAbsence | ResourceIdAbsence;

const isMatcherLeaf = (leaf: LeafPolicy): leaf is MatcherLeaf => LEAF_NEEDS[leaf._tag].matcher;

const isActionLeaf = (leaf: LeafPolicy): leaf is ActionLeaf => LEAF_NEEDS[leaf._tag].own === "Action";

const MISSING_ACTION: ActionAbsence = { _tag: "Action" };

/**
 * What the request is missing for this leaf, or `undefined`.
 */
export function absenceOf(
  leaf: LeafPolicy,
  supplied: Supplied<true>,
): ActionAbsence | undefined;
export function absenceOf(
  leaf: LeafPolicy,
  supplied: Supplied,
): ActionAbsence | ResourceAbsence | undefined;
export function absenceOf(
  leaf: LeafPolicy,
  supplied: Supplied,
): ActionAbsence | ResourceAbsence | undefined {
  const need = LEAF_NEEDS[leaf._tag];
  if (need.own === "Action" && !supplied.action) {
    return isActionLeaf(leaf) ? { _tag: "Action", expected: leaf.action } : MISSING_ACTION;
  }
  if (isMatcherLeaf(leaf)) {
    if (need.own === "Resource" && !supplied.resource) {
      return { _tag: "Resource", attribute: leaf.attribute };
    }
    if (!supplied.action && referencesAction(leaf.matcher)) return MISSING_ACTION;
    if (!supplied.resource && referencesResource(leaf.matcher)) {
      return { _tag: "Resource", attribute: leaf.attribute };
    }
  }
  return undefined;
}

export function errorOf(absence: ActionAbsence): MissingAction;
export function errorOf(absence: ResourceAbsence): MissingResource;
export function errorOf(absence: ResourceIdAbsence): MissingResourceId;
export function errorOf(
  absence: ActionAbsence | ResourceAbsence,
): MissingAction | MissingResource;
export function errorOf(absence: Absence): MissingAction | MissingResource | MissingResourceId;
export function errorOf(absence: Absence): MissingAction | MissingResource | MissingResourceId {
  return Match.value(absence).pipe(
    Match.tagsExhaustive({
      Action: (a) => (a.expected === undefined ? new MissingAction({}) : new MissingAction({ expected: a.expected })),
      Resource: (a) => new MissingResource({ attribute: a.attribute }),
      ResourceId: (a) => new MissingResourceId({ relation: a.relation }),
    }),
  );
}

/** Whether the subject holds the role a `HasRole` leaf names. */
export const holdsRole = (
  subject: AuthSubject,
  leaf: Extract<LeafPolicy, { readonly _tag: "HasRole" }>,
): boolean => subject.roles.has(leaf.role);

/** Whether the subject holds the permission a `HasPermission` leaf names. */
export const holdsPermission = (
  subject: AuthSubject,
  leaf: Extract<LeafPolicy, { readonly _tag: "HasPermission" }>,
): boolean => subject.permissions.has(permissionKey(leaf.permission));

/** Whether the request's action is the one a `HasAction` leaf names. */
export const holdsAction = (leaf: ActionLeaf, action: string | undefined): boolean =>
  action === leaf.action;
