/**
 * What a policy *says*, as opposed to what it decided.
 *
 * `Trace` answers "why was this denied". This answers "what does this rule
 * require", which is the question a security reviewer asks first and the one an
 * administrative interface listing policies has to answer without evaluating
 * anything.
 *
 * A **tree**, not a string. Qadi owns no dialect
 * ([ADR-QD-027](../../../spec/decisions/027-policy-explanation.md)) — the same
 * argument that made `Predicate` abstract. `renderExplanation` is the one place
 * English appears, and a caller wanting links, chips or another language renders
 * the tree themselves.
 *
 * Takes **no subject**, and its signature cannot express one. An explanation that
 * varied by subject would be a trace, and showing one on an admin screen would
 * leak whether the viewer satisfies a policy they are only meant to read.
 */
import * as Match from "effect/Match";
import type { Matcher, ValueRef } from "./Matcher.ts";
import type { Obligation } from "./Obligation.ts";
import { permissionKey } from "./Permission.ts";
import type { Combining, FieldStrategy, Policy } from "./Policy.ts";

/** What kind of leaf a {@link Requirement} came from. */
export type RequirementKind =
  | "permission"
  | "role"
  | "attribute"
  | "relationship"
  | "action"
  | "history"
  | "custom"
  | "signature";

/**
 * A term: what one leaf of a policy asks for.
 *
 * `detail` is the leaf's own words — a permission key, a role name, an attribute
 * comparison — already flattened to a string, because a matcher is a value
 * grammar rather than a policy and rendering it structurally would double the
 * size of this union for no reader's benefit.
 */
export interface Requirement {
  readonly _tag: "Requirement";
  readonly kind: RequirementKind;
  readonly detail: string;
  /**
   * Present when the leaf narrows what is visible.
   *
   * Load-bearing: rendering `hasPermission(read, { fields: ["id"] })` as
   * "requires permission doc:read" **overstates the grant**, and understating a
   * restriction is the direction a reviewer would act on.
   */
  readonly fields: ReadonlyArray<string> | undefined;
}

/** Every child must hold. */
export interface All {
  readonly _tag: "All";
  readonly parts: ReadonlyArray<Explanation>;
  readonly fieldStrategy: FieldStrategy;
}

/** At least one child must hold. */
export interface Any {
  readonly _tag: "Any";
  readonly parts: ReadonlyArray<Explanation>;
  readonly fieldStrategy: FieldStrategy;
}

/** The child must not hold. */
export interface Negated {
  readonly _tag: "Negated";
  readonly part: Explanation;
}

/** The child, carrying a name the author gave it. */
export interface Named {
  readonly _tag: "Named";
  readonly label: string;
  readonly part: Explanation;
}

/**
 * The child, plus the duty the caller owes if it allows.
 *
 * Singular, mirroring the `Obliged` variant: stacking duties is expressed by
 * nesting `obliged`, and flattening them here would hide that structure from a
 * reviewer reading which requirement carries which obligation.
 */
export interface Owing {
  readonly _tag: "Owing";
  readonly part: Explanation;
  readonly obligation: Obligation;
}

/** One row of a rule table. */
export interface Row {
  readonly effect: "Permit" | "Deny";
  readonly condition: Explanation;
}

/** An ordered rule table under a combining algorithm. */
export interface Table {
  readonly _tag: "Table";
  readonly rows: ReadonlyArray<Row>;
  readonly combining: Combining;
}

export type Explanation = Requirement | All | Any | Negated | Named | Owing | Table;

// ---------------------------------------------------------------------------
// Value grammar
// ---------------------------------------------------------------------------

const refText: (self: ValueRef) => string = Match.type<ValueRef>().pipe(
  Match.tagsExhaustive({
    SubjectRef: (r) => `the subject's ${r.path}`,
    SubjectIdRef: () => "the subject's id",
    ResourceRef: (r) => `the resource's ${r.path}`,
    ActionRef: () => "the action",
    LiteralRef: (r) => JSON.stringify(r.value),
  }),
);

const matcherText: (self: Matcher) => string = Match.type<Matcher>().pipe(
  Match.tagsExhaustive({
    Eq: (m) => `equals ${refText(m.ref)}`,
    Neq: (m) => `differs from ${refText(m.ref)}`,
    In: (m) => `is one of ${JSON.stringify(m.values)}`,
    Exists: () => "is present",
    Gte: (m) => `is at least ${m.value}`,
    Lt: (m) => `is below ${m.value}`,
    Contains: (m) => `contains ${JSON.stringify(m.value)}`,
    Dominates: (m) => `dominates ${refText(m.ref)}`,
    Size: (m) => `has a size that ${matcherText(m.matcher)}`,
    FieldMatch: (m) => `has ${m.field} that ${matcherText(m.matcher)}`,
    SomeMatch: (m) => `has an entry that ${matcherText(m.matcher)}`,
    EveryMatch: (m) => `has every entry that ${matcherText(m.matcher)}`,
  }),
);

// ---------------------------------------------------------------------------
// Explanation
// ---------------------------------------------------------------------------

const requirement = (
  kind: RequirementKind,
  detail: string,
  fields?: ReadonlyArray<string>,
): Requirement => ({ _tag: "Requirement", kind, detail, fields });

/**
 * Describes a policy without evaluating it.
 *
 * Total by construction: `Match.tagsExhaustive` makes a new policy variant a
 * compile error here rather than a silently unexplained node. Unlike
 * `toPredicate`, which refuses what it cannot translate, this refuses nothing — a
 * policy a reviewer cannot read is worse than one they can only partly act on.
 */
export const explain: (policy: Policy) => Explanation = Match.type<Policy>().pipe(
  Match.tagsExhaustive({
    HasPermission: (p) =>
      requirement("permission", permissionKey(p.permission), p.fields),

    HasRole: (p) => requirement("role", p.role),

    HasAttribute: (p) =>
      requirement("attribute", `the subject's ${p.attribute} ${matcherText(p.matcher)}`, p.fields),

    HasResourceAttribute: (p) =>
      requirement(
        "attribute",
        `the resource's ${p.attribute} ${matcherText(p.matcher)}`,
        p.fields,
      ),

    // `depth` is part of the question, not decoration, the same reason
    // `HasActed`/`HasNotActed` state their scope below: `hasRelationship("owner")`
    // and `hasRelationship("owner", { depth: 1 })` are different policies — one
    // traverses as far as the resolver decides, the other stops at a direct
    // edge — and dropping the bound would render both to one sentence
    // (INV-QD-031).
    HasRelationship: (p) =>
      requirement(
        "relationship",
        `the subject is ${p.relation} of the resource` +
          (p.depth === undefined ? "" : ` within a traversal depth of ${p.depth}`),
        p.fields,
      ),

    HasAction: (p) => requirement("action", p.action, p.fields),

    // Scope is part of the question, not decoration: "ever, at all" and "to this
    // resource" are different claims and a reviewer needs to see which.
    HasActed: (p) =>
      requirement(
        "history",
        `the subject has ${p.event} ${p.scope === "Any" ? "anything" : "this resource"}`,
        p.fields,
      ),

    HasNotActed: (p) =>
      requirement(
        "history",
        `the subject has not ${p.event} ${p.scope === "Any" ? "anything" : "this resource"}`,
        p.fields,
      ),

    // Opaque by design: this names the registered check without pretending to
    // decompose logic it cannot see (ADR-QD-055).
    HasCustom: (p) => requirement("custom", `custom predicate '${p.name}'`, p.fields),

    // Decomposable, unlike HasCustom: meaning/signerRole/scope are public
    // policy fields, not opaque externally-registered logic.
    HasSignature: (p) =>
      requirement(
        "signature",
        `the subject has a signature meaning '${p.meaning}'` +
          (p.signerRole === undefined ? "" : ` from a '${p.signerRole}'`) +
          ` for ${p.scope === "Any" ? "anything" : "this resource"}`,
        p.fields,
      ),

    AllOf: (p): All => ({
      _tag: "All",
      parts: p.policies.map(explain),
      fieldStrategy: p.fieldStrategy,
    }),

    AnyOf: (p): Any => ({
      _tag: "Any",
      parts: p.policies.map(explain),
      fieldStrategy: p.fieldStrategy,
    }),

    Not: (p): Negated => ({ _tag: "Negated", part: explain(p.policy) }),

    Labeled: (p): Named => ({ _tag: "Named", label: p.label, part: explain(p.policy) }),

    Obliged: (p): Owing => ({
      _tag: "Owing",
      part: explain(p.policy),
      obligation: p.obligation,
    }),

    Rules: (p): Table => ({
      _tag: "Table",
      rows: p.rules.map((r) => ({ effect: r.effect, condition: explain(r.condition) })),
      combining: p.combining,
    }),
  }),
);

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

export interface RenderOptions {
  /** Wraps a term — a permission key, a role name — for emphasis. Defaults to backticks. */
  readonly term?: (text: string) => string;
}

const combiningText: (self: Combining) => string = (self) =>
  Match.value(self).pipe(
    Match.when("FirstApplicable", () => "the first row that applies decides"),
    Match.when("DenyOverrides", () => "any applying deny row wins"),
    Match.when("PermitOverrides", () => "any applying permit row wins"),
    Match.exhaustive,
  );

/**
 * How a composite's `fieldStrategy` merges its parts' visible fields — the
 * detail an `All`/`Any` node's own rendering used to drop entirely (the defect
 * this fixes, INV-QD-031: two policies differing only in this field rendered
 * to the same sentence, since neither arm mentioned it at all).
 */
const fieldStrategyText: (self: FieldStrategy) => string = (self) =>
  Match.value(self).pipe(
    Match.when("Intersection", () => "keeping only fields every part grants"),
    Match.when("Union", () => "combining every part's granted fields"),
    Match.when("First", () => "keeping the first allowing part's fields"),
    Match.exhaustive,
  );

/**
 * What `fieldStrategy` a bare `allOf`/`anyOf` call implies absent an explicit
 * override (`Policy.ts`'s `CombinatorOptions` doc: `Intersection` for `allOf`,
 * `First` for `anyOf`). Two composites that agree on the strategy actually in
 * force are the same rule however they got there, so only a departure from
 * this default needs a word in the sentence.
 */
const isDefaultFieldStrategy = (kind: "All" | "Any", strategy: FieldStrategy): boolean =>
  kind === "All" ? strategy === "Intersection" : strategy === "First";

/**
 * The clause naming a composite's `fieldStrategy`, or nothing when it would
 * describe a difference that cannot exist.
 *
 * Two conditions must both hold before the strategy is worth a word: fewer
 * than two parts and `mergeFields` (`Evaluate.ts`) already agrees on every
 * result regardless of strategy — merging zero or one field set is the same
 * answer under `Intersection`, `Union` and `First` alike — so a single-part
 * composite's strategy is not a real difference to report. And the default
 * strategy needs no mention because that is what a bare "and"/"either…or" has
 * always meant; only a departure from it changes what the sentence must say
 * to keep two non-equivalent policies from rendering identically.
 */
const fieldStrategyClause = (
  kind: "All" | "Any",
  e: { readonly fieldStrategy: FieldStrategy; readonly parts: ReadonlyArray<Explanation> },
): string =>
  e.parts.length < 2 || isDefaultFieldStrategy(kind, e.fieldStrategy)
    ? ""
    : `, ${fieldStrategyText(e.fieldStrategy)}`;

/**
 * Whether this node reads as one unit and so needs no parentheses as a child.
 *
 * A `Requirement` is a single clause. The three empty composites render fixed
 * sentences — "always allows (an empty conjunction)" — that no following word
 * can attach to. Everything else spans several clauses, and a reader has no way
 * to see where it ends.
 *
 * Hoisted to module scope, per AGENTS.md §5a's preferred form: unlike the
 * dispatchers inside {@link renderExplanation}, this one closes over nothing.
 */
const isAtomic: (self: Explanation) => boolean = Match.type<Explanation>().pipe(
  Match.tagsExhaustive({
    Requirement: () => true,
    All: (e) => e.parts.length === 0,
    Any: (e) => e.parts.length === 0,
    Table: (e) => e.rows.length === 0,
    Negated: () => false,
    Named: () => false,
    Owing: () => false,
  }),
);

/**
 * One English rendering. Deliberately the only place in the library where prose
 * about a policy is assembled.
 *
 * **A rendering denotes exactly one policy** (INV-QD-031). Composite children
 * are parenthesised, because joining them bare loses the tree: `anyOf([a,
 * allOf([b, c])])` and `allOf([anyOf([a, b]), c])` produced a byte-identical
 * sentence, and they are not the same policy — the first admits a lone `a` and
 * the second does not. Prose a reviewer cannot map back to a policy is worse
 * than no prose, which is the argument this library was built on.
 */
export const renderExplanation = (
  explanation: Explanation,
  options?: RenderOptions,
): string => {
  const term = options?.term ?? ((t: string) => `\`${t}\``);

  const fieldsText = (fields: ReadonlyArray<string> | undefined): string => {
    if (fields === undefined) return "";
    // An empty array is the bottom of the lattice, not a missing list — say
    // so outright rather than joining zero terms into a dangling
    // ", exposing only ".
    if (fields.length === 0) return ", exposing no fields";
    return `, exposing only ${fields.map(term).join(", ")}`;
  };

  const go = (self: Explanation): string =>
    Match.value(self).pipe(
      Match.tagsExhaustive({
        Requirement: (e) => `requires ${e.kind} ${term(e.detail)}${fieldsText(e.fields)}`,

        // An empty `allOf` allows and an empty `anyOf` denies, which is the least
        // guessable thing about the ADT — so it is said outright rather than
        // rendered as an empty list the reader has to interpret.
        All: (e) =>
          e.parts.length === 0
            ? "always allows (an empty conjunction)"
            : `${e.parts.map(embed).join(" and ")}${fieldStrategyClause("All", e)}`,

        // "either" opens a disjunction but nothing closes it, so a following
        // " and …" reads as part of the last alternative rather than as a
        // sibling of the whole. That is the collision this fixes.
        Any: (e) =>
          e.parts.length === 0
            ? "never allows (an empty disjunction)"
            : `either ${e.parts.map(embed).join(" or ")}${fieldStrategyClause("Any", e)}`,

        Negated: (e) => `does not hold that ${embed(e.part)}`,

        Named: (e) => `${embed(e.part)} (${term(e.label)})`,

        Owing: (e) =>
          `${embed(e.part)}, and owes ${term(e.obligation.id)}${
            e.obligation.advisory ? " (advisory)" : ""
          }`,

        Table: (e) =>
          e.rows.length === 0
            ? "never allows (an empty rule table)"
            : `a rule table where ${combiningText(e.combining)}: ${e.rows
                .map((r, i) => `[${i}] ${r.effect.toLowerCase()} when ${embed(r.condition)}`)
                .join("; ")}`,
      }),
    );

  /**
   * A child, parenthesised unless it reads as one unit.
   *
   * Every position that embeds a child goes through here — the alternative is
   * remembering to do it at seven call sites, and the one forgotten site is the
   * ambiguity.
   */
  const embed = (self: Explanation): string =>
    isAtomic(self) ? go(self) : `(${go(self)})`;

  // The top level is never wrapped: nothing follows it, so there is nothing for
  // it to run into. `go`, not `embed`.
  return go(explanation);
};
