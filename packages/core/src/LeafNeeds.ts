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
import type { ActedResult } from "./DecisionHistory.ts";
import { MissingAction, MissingResource, MissingResourceId } from "./Errors.ts";
import type { Matcher, MatcherContext, Verdict } from "./Matcher.ts";
import { judgeMatcher, referencesAction, referencesResource } from "./Matcher.ts";
import { permissionKey } from "./Permission.ts";
import type { LeafPolicy } from "./Policy.ts";
import type { RelatedResult } from "./RelationshipResolver.ts";
import type { SignatureAnswer } from "./SignatureHistory.ts";

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
  /**
   * Whether it asks a port about one resource. Declarative: `readScoped` enforces
   * the need and does not read this column; the type ties it to the leaf's tag and
   * `LeafNeeds.test.ts` ties it to what `readScoped` does.
   */
  readonly resourceId: "Never" | "Always" | "ByScope";
}

/** The leaves that read the action themselves. */
type ReadsAction = "HasAction";

/** The leaves that read an attribute of the resource themselves. */
type ReadsResource = "HasResourceAttribute";

/** The leaves that read neither input themselves; a matcher may still reference one. */
type ReadsNothing =
  | "HasPermission"
  | "HasRole"
  | "HasAttribute"
  | "HasRelationship"
  | "HasActed"
  | "HasNotActed"
  | "HasCustom"
  | "HasSignature";

/**
 * The `own` a leaf tagged `Tag` must state, from three closed tag lists.
 *
 * A leaf's type does not show which input it reads (`HasAttribute` and
 * `HasResourceAttribute` have the same fields), so each tag is classified by name,
 * and a tag in none of the lists is `never`: a new leaf's row is TS2322 until
 * someone states what it reads, rather than defaulting to "reads nothing" and
 * failing open.
 */
type OwnOf<Tag extends string> = Tag extends ReadsAction
  ? "Action"
  : Tag extends ReadsResource
    ? "Resource"
    : Tag extends ReadsNothing
      ? "Nothing"
      : never;

/** The leaves that always ask a port about one resource. */
type AsksAlways = "HasRelationship";

/** The leaves that ask about one resource when their `scope` names it. */
type AsksByScope = "HasActed" | "HasNotActed" | "HasSignature";

/** The leaves that never ask a port about one resource. */
type AsksNever =
  | "HasPermission"
  | "HasRole"
  | "HasAttribute"
  | "HasResourceAttribute"
  | "HasAction"
  | "HasCustom";

/**
 * The `resourceId` a leaf tagged `Tag` must state; an unlisted tag is `never`, as
 * in {@link OwnOf}.
 */
type ResourceIdOf<Tag extends string> = Tag extends AsksAlways
  ? "Always"
  : Tag extends AsksByScope
    ? "ByScope"
    : Tag extends AsksNever
      ? "Never"
      : never;

/**
 * `unknown` when no tag is in two of one column's lists, `never` when one is.
 *
 * {@link OwnOf} and {@link ResourceIdOf} are conditional chains, so a tag listed
 * twice would silently take the first list's classification; `LEAF_NEEDS`
 * satisfies this too, so the duplicate is a compile error at the table instead.
 */
type Disjoint<A extends string, B extends string, C extends string> = [
  Extract<A, B> | Extract<A, C> | Extract<B, C>,
] extends [never]
  ? unknown
  : never;

/** Both columns' lists are disjoint ({@link Disjoint}). */
type ListsDisjoint = Disjoint<ReadsAction, ReadsResource, ReadsNothing> &
  Disjoint<AsksAlways, AsksByScope, AsksNever>;

/**
 * The only row a leaf variant `V` can have: `own` and `resourceId` are its tag's
 * classifications ({@link OwnOf}, {@link ResourceIdOf}), and `matcher` is `true`
 * exactly when the variant carries a matcher, read from its shape.
 *
 * Generic over the variant, not the tag, so a test can build a leaf the policy does
 * not have yet and see that no row fits it.
 */
export type LeafNeedOfVariant<V extends { readonly _tag: string }> = LeafNeed & {
  readonly own: OwnOf<V["_tag"]>;
  readonly matcher: V extends { readonly matcher: Matcher } ? true : false;
  readonly resourceId: ResourceIdOf<V["_tag"]>;
};

/**
 * The only row the leaf tagged `K` can have ({@link LeafNeedOfVariant}).
 *
 * A row that disagrees with its leaf is a compile error rather than a check that
 * never fires: `absenceOf`'s two guards trust the table, and this is what makes
 * them sound.
 */
export type LeafNeedOf<K extends LeafTag> = LeafNeedOfVariant<
  Extract<LeafPolicy, { readonly _tag: K }>
>;

/**
 * One row per leaf tag. A missing row is TS2741 and an extra one TS2353, so a new
 * leaf cannot ship without saying what it needs (INV-QD-345); a row whose `own` or
 * `resourceId` disagrees with its tag's classification, or whose `matcher`
 * disagrees with its leaf's shape, is TS2322 ({@link LeafNeedOf}), and so is any
 * row for a tag no classification names. A tag in two lists of one column makes
 * the whole table fail to compile ({@link Disjoint}).
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
} as const satisfies { readonly [K in LeafTag]: LeafNeedOf<K> } & ListsDisjoint;

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

/** The outcome of a leaf whose answer is a yes or a no. */
export type BinaryOutcome = "Held" | "NotHeld";

/**
 * The outcome of a relationship leaf: held, known not to hold, or nothing could
 * confirm it (`RelatedResult`'s `Unknown`, which is not "unrelated").
 */
export type RelationshipOutcome = "Held" | "Unrelated" | "Unknown";

/**
 * The outcome of an acted leaf. `Performed` and `NotPerformed` say which opposite
 * answer came back (Acted to a `HasNotActed` leaf, NotActed to a `HasActed` one),
 * so a denial can name it without the walk knowing either polarity.
 */
export type ActedOutcome = "Held" | "Unknown" | "Performed" | "NotPerformed";

/** The outcome of a signature leaf: held, none on file at all, or none matching. */
export type SignatureOutcome = "Held" | "NoneOnFile" | "NoneMatching";

/** Every outcome a leaf's row can give. */
export type LeafOutcome =
  | Verdict
  | BinaryOutcome
  | RelationshipOutcome
  | ActedOutcome
  | SignatureOutcome;

/**
 * Whether an outcome holds: `Held`, and nothing else.
 *
 * The one test of a row's outcome that `evaluate` and `toPredicate` share, so no
 * other outcome (an `Unknown` answer included) can read as an allow in one and a
 * denial in the other. `Compare.ts`'s `holds` is the same test over `Verdict`
 * alone; its parameter cannot take the wider union.
 */
export const isHeld = (outcome: LeafOutcome): outcome is "Held" => outcome === "Held";

const binary = (held: boolean): BinaryOutcome => (held ? "Held" : "NotHeld");

/**
 * An acted leaf's row: `Held` for the answer it wants, `Unknown` for no answer, and
 * `opposite` for the other one.
 *
 * Written once for `HasActed` and `HasNotActed`, which differ only in the answer
 * they want. `Unknown` is neither, so both polarities deny under an unwired port;
 * that is why the port is three-valued rather than boolean (ADR-QD-020).
 */
function actedRow(
  wanted: Exclude<ActedResult, "Unknown">,
  opposite: Exclude<ActedOutcome, "Held" | "Unknown">,
) {
  return (answer: ActedResult): ActedOutcome =>
    answer === wanted ? "Held" : answer === "Unknown" ? "Unknown" : opposite;
}

/**
 * One verdict row's signature per leaf tag.
 *
 * A row takes what its verdict reads: the leaf when the verdict reads the leaf's
 * fields, and the port's answer when it reads only that. A row returns a closed
 * outcome for its leaf, so the walk can choose its sentence and `toPredicate` its
 * fold without either one comparing an answer itself.
 */
export interface LeafVerdictRows {
  readonly HasPermission: (
    leaf: Extract<LeafPolicy, { readonly _tag: "HasPermission" }>,
    subject: AuthSubject,
  ) => BinaryOutcome;
  readonly HasRole: (
    leaf: Extract<LeafPolicy, { readonly _tag: "HasRole" }>,
    subject: AuthSubject,
  ) => BinaryOutcome;
  readonly HasAttribute: (
    leaf: Extract<LeafPolicy, { readonly _tag: "HasAttribute" }>,
    value: unknown,
    context: MatcherContext,
  ) => Verdict;
  readonly HasResourceAttribute: (
    leaf: Extract<LeafPolicy, { readonly _tag: "HasResourceAttribute" }>,
    value: unknown,
    context: MatcherContext,
  ) => Verdict;
  readonly HasRelationship: (related: RelatedResult) => RelationshipOutcome;
  readonly HasAction: (leaf: ActionLeaf, action: string | undefined) => BinaryOutcome;
  readonly HasActed: (answer: ActedResult) => ActedOutcome;
  readonly HasNotActed: (answer: ActedResult) => ActedOutcome;
  readonly HasCustom: (allowed: boolean) => BinaryOutcome;
  readonly HasSignature: (answer: SignatureAnswer) => SignatureOutcome;
}

/** The only row the leaf tagged `Tag` can have; an unlisted tag is `never`, as in {@link OwnOf}. */
export type LeafVerdictOf<Tag extends string> = Tag extends keyof LeafVerdictRows
  ? LeafVerdictRows[Tag]
  : never;

/** One row per leaf tag, each its tag's ({@link LeafVerdictOf}). */
export type LeafVerdicts = { readonly [K in LeafTag]: LeafVerdictOf<K> };

/**
 * What each leaf's answer decides, stated once (ARCH-101, ADR-QD-167 extending
 * ADR-QD-163).
 *
 * `evaluate` turns an outcome into a sentence and `toPredicate` into a fold, and
 * each used to compare the answer itself: the acted polarity map and the
 * `answer === wanted` test were written in both. A row here maps a leaf's answer to
 * a closed outcome; `isHeld` is the one test both read. A missing row is TS2741, an
 * extra one TS2353 and a row of the wrong shape TS2322, so a leaf cannot ship
 * without saying what its answer decides. Every row returns a string literal and
 * allocates nothing, and `actedRow` runs twice at module load.
 */
export const LEAF_VERDICTS = {
  HasPermission: (leaf, subject) => binary(holdsPermission(subject, leaf)),
  HasRole: (leaf, subject) => binary(holdsRole(subject, leaf)),
  HasAttribute: (leaf, value, context) => judgeMatcher(leaf.matcher, value, context),
  HasResourceAttribute: (leaf, value, context) => judgeMatcher(leaf.matcher, value, context),
  HasRelationship: (related) => (related === "Related" ? "Held" : related),
  HasAction: (leaf, action) => binary(holdsAction(leaf, action)),
  HasActed: actedRow("Acted", "NotPerformed"),
  HasNotActed: actedRow("NotActed", "Performed"),
  HasCustom: binary,
  HasSignature: ({ matched, onFile }) =>
    matched ? "Held" : onFile === 0 ? "NoneOnFile" : "NoneMatching",
} satisfies LeafVerdicts;
