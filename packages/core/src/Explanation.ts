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
  /** `"permission"`, `"role"`, `"attribute"`, `"relationship"`, `"action"`, `"history"`. */
  readonly kind: string;
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
    EveryMatch: (m) => `has every entry ${matcherText(m.matcher)}`,
  }),
);

// ---------------------------------------------------------------------------
// Explanation
// ---------------------------------------------------------------------------

const requirement = (
  kind: string,
  detail: string,
  fields?: ReadonlyArray<string>,
): Requirement => ({ _tag: "Requirement", kind, detail, fields });

/**
 * Describes a policy without evaluating it.
 *
 * Total by construction: `Match.tagsExhaustive` makes a fourteenth policy variant
 * a compile error here rather than a silently unexplained node. Unlike
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

    HasRelationship: (p) =>
      requirement("relationship", `the subject is ${p.relation} of the resource`, p.fields),

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
 * One English rendering. Deliberately the only place in the library where prose
 * about a policy is assembled.
 */
export const renderExplanation = (
  explanation: Explanation,
  options?: RenderOptions,
): string => {
  const term = options?.term ?? ((t: string) => `\`${t}\``);

  const fieldsText = (fields: ReadonlyArray<string> | undefined) =>
    fields === undefined ? "" : `, exposing only ${fields.map(term).join(", ")}`;

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
            : e.parts.map(go).join(" and "),

        Any: (e) =>
          e.parts.length === 0
            ? "never allows (an empty disjunction)"
            : `either ${e.parts.map(go).join(" or ")}`,

        Negated: (e) => `does not hold that ${go(e.part)}`,

        Named: (e) => `${go(e.part)} (${term(e.label)})`,

        Owing: (e) =>
          `${go(e.part)}, and owes ${term(e.obligation.id)}${
            e.obligation.advisory ? " (advisory)" : ""
          }`,

        Table: (e) =>
          e.rows.length === 0
            ? "never allows (an empty rule table)"
            : `a rule table where ${combiningText(e.combining)}: ${e.rows
                .map((r, i) => `[${i}] ${r.effect.toLowerCase()} when ${go(r.condition)}`)
                .join("; ")}`,
      }),
    );

  return go(explanation);
};
