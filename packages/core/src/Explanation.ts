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
import { isFieldStrategy } from "./FieldLattice.ts";
import type { Trace } from "./Decision.ts";
import { foldMatcherCases } from "./Matcher.ts";
import type { Matcher, MatcherCases, ValueRef } from "./Matcher.ts";
import type { Obligation } from "./Obligation.ts";
import { permissionKey } from "./Permission.ts";
import { defaultFieldStrategy, foldPolicyCases } from "./Policy.ts";
import { effectiveCombining, isCombining } from "./ShortCircuit.ts";
import { childKey } from "./TraceKey.ts";
import { foldTree, foldTreeBy } from "./TreeFold.ts";
import { defaultTerm, fieldsClause } from "./Wording.ts";
import type { Combining, FieldStrategy, Policy, PolicyCases } from "./Policy.ts";

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

/**
 * An explanation node's immediate children: an `All`/`Any`'s parts, a wrapper's
 * one part, a `Table`'s row conditions in row order, and none for a `Requirement`.
 *
 * Mirrors `childrenOf` (`Policy.ts`) for the output tree, and for the same
 * reason: `Match.tagsExhaustive` makes a new `Explanation` tag a compile error.
 */
const explanationChildrenOf: (self: Explanation) => ReadonlyArray<Explanation> =
  Match.type<Explanation>().pipe(
    Match.tagsExhaustive({
      Requirement: () => [],
      All: (e) => e.parts,
      Any: (e) => e.parts,
      Negated: (e) => [e.part],
      Named: (e) => [e.part],
      Owing: (e) => [e.part],
      Table: (e) => e.rows.map((row) => row.condition),
    }),
  );

/**
 * Folds an explanation bottom-up, without native recursion.
 *
 * The `Explanation` twin of `foldPolicy`: `combine` receives a node and its
 * children's results in `explanationChildrenOf` order, a subtree shared by
 * identity folds once, and a cyclic tree throws. A thin adapter over the
 * internal `TreeFold.ts` — `explain` is stack-safe, so what reads its output
 * has to be too (ARCH-02 N1).
 *
 * Use this for a fold that treats children alike. A fold that reads a child by
 * position belongs on {@link foldExplanationCases} (ARCH-17).
 */
export const foldExplanation = <R>(
  self: Explanation,
  combine: (node: Explanation, children: ReadonlyArray<R>) => R,
): R => foldTree(self, explanationChildrenOf, combine);

/** One `Table` row paired with its condition's result, in row order. */
export interface RowResult<R> {
  readonly row: Row;
  readonly result: R;
}

/**
 * One arm per `Explanation` tag, each receiving its children's results in the
 * shape the tag gives them.
 *
 * `Negated`/`Named`/`Owing` receive their one part as `R`, `All`/`Any` a
 * `ReadonlyArray<R>`, a `Table` one {@link RowResult} per row. The `Explanation`
 * twin of `PolicyCases` (ARCH-17).
 */
export interface ExplanationCases<R> {
  readonly Requirement: (node: Requirement) => R;
  readonly All: (node: All, parts: ReadonlyArray<R>) => R;
  readonly Any: (node: Any, parts: ReadonlyArray<R>) => R;
  readonly Negated: (node: Negated, part: R) => R;
  readonly Named: (node: Named, part: R) => R;
  readonly Owing: (node: Owing, part: R) => R;
  readonly Table: (node: Table, rows: ReadonlyArray<RowResult<R>>) => R;
}

type ExplanationStep = <R>(
  cases: ExplanationCases<R>,
  resultOf: (child: Explanation) => R,
) => R;

/**
 * Reads exactly what `explanationChildrenOf` lists, in the shape each tag gives it.
 *
 * The partner of `explanationChildrenOf`; `Explanation.test.ts`'s lockstep
 * property keeps the two in agreement.
 */
const explanationStep: (node: Explanation) => ExplanationStep = Match.type<Explanation>().pipe(
  Match.tagsExhaustive({
    Requirement: (e): ExplanationStep => (cases) => cases.Requirement(e),
    All: (e): ExplanationStep => (cases, resultOf) => cases.All(e, e.parts.map(resultOf)),
    Any: (e): ExplanationStep => (cases, resultOf) => cases.Any(e, e.parts.map(resultOf)),
    Negated: (e): ExplanationStep => (cases, resultOf) => cases.Negated(e, resultOf(e.part)),
    Named: (e): ExplanationStep => (cases, resultOf) => cases.Named(e, resultOf(e.part)),
    Owing: (e): ExplanationStep => (cases, resultOf) => cases.Owing(e, resultOf(e.part)),
    Table: (e): ExplanationStep => (cases, resultOf) =>
      cases.Table(
        e,
        e.rows.map((row) => ({ row, result: resultOf(row.condition) })),
      ),
  }),
);

/**
 * Folds an explanation bottom-up with one arm per tag, each receiving its
 * children in the tag's own shape.
 *
 * The same loop as {@link foldExplanation}, with the arity checked by the
 * compiler: a `Table` arm receives one {@link RowResult} per row, so a rendering
 * cannot read a condition out of step with its row (ARCH-17). Use
 * {@link foldExplanation} for a fold that treats children alike.
 */
export const foldExplanationCases = <R>(self: Explanation, cases: ExplanationCases<R>): R =>
  foldTreeBy<Explanation, R>(self, explanationChildrenOf, (node, resultOf) =>
    explanationStep(node)(cases, resultOf),
  );

/**
 * One position in an explanation tree, with the trace node an evaluation left
 * there.
 *
 * `trace` is `undefined` when evaluation never reached the position: a branch a
 * short-circuit skipped, everything beneath it, or no trace at all. `key` is the
 * position's canonical address, equal to `tracePathKey` of the path that reaches
 * it. `effect` is the row's effect when the position is a `Table` row's
 * condition, and `undefined` anywhere else.
 */
export interface AlignedNode {
  readonly explanation: Explanation;
  readonly trace: Trace | undefined;
  readonly key: string;
  readonly effect: Row["effect"] | undefined;
}

/**
 * Folds an explanation and one evaluation's trace together, position by position,
 * bottom-up and without native recursion.
 *
 * `combine` receives each position's {@link AlignedNode} and its children's
 * results, in `explanationChildrenOf` order. It is how the two artifacts of
 * ADR-QD-027 are read side by side without being merged: `evaluateNode` emits one
 * trace node per policy node it evaluates, in declaration order, and `explain`
 * mirrors the policy, so the trace's `i`th child is the `i`th part's (INV-QD-103).
 * A part beyond the trace's children was never examined (INV-QD-005, INV-QD-020):
 * its node has `trace: undefined`, and so does everything beneath it. Trace
 * children beyond the parts are ignored.
 *
 * **`combine` runs once per position, not once per node.** `explain` shares a
 * subtree by identity (`anyOf([not(p), p])` has one `p` explanation reached by two
 * paths), and a fold memoised by node would hand the second occurrence the first
 * one's result: the first occurrence's trace and key. The positions folded here
 * are fresh objects, so the identity memo inside `foldTree` never merges two of
 * them (ARCH-22 N1).
 *
 * The pairing is by construction and is not checked at runtime: a trace that does
 * not belong to the explanation yields a fold over a mismatched pair, not an
 * error. Stack-safe at any depth (INV-QD-090).
 *
 * @param explanation - The explanation to fold, usually `explain(policy)`.
 * @param trace - The trace one evaluation of that policy produced, if there is one.
 * @param combine - Builds a position's result from it and its children's results.
 */
export const foldAligned = <R>(
  explanation: Explanation,
  trace: Trace | undefined,
  combine: (node: AlignedNode, children: ReadonlyArray<R>) => R,
): R =>
  foldTree<AlignedNode, R>(
    { explanation, trace, key: "$", effect: undefined },
    (node) =>
      explanationChildrenOf(node.explanation).map((part, i) => ({
        explanation: part,
        trace: node.trace?.children[i],
        key: childKey(node.key, i),
        effect: node.explanation._tag === "Table" ? node.explanation.rows[i]?.effect : undefined,
      })),
    combine,
  );

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

/**
 * One matcher node's phrase, from its already-phrased wrapped matcher — the
 * recursive tags read their one child's text instead of calling back into
 * themselves.
 */
const matcherTextCases: MatcherCases<string> = {
  Eq: (m) => `equals ${refText(m.ref)}`,
  Neq: (m) => `differs from ${refText(m.ref)}`,
  In: (m) => `is one of ${JSON.stringify(m.values)}`,
  Exists: () => "is present",
  Gte: (m) => `is at least ${m.value}`,
  Lt: (m) => `is below ${m.value}`,
  Contains: (m) => `contains ${JSON.stringify(m.value)}`,
  Dominates: (m) => `dominates ${refText(m.ref)}`,
  Size: (_m, text) => `has a size that ${text}`,
  FieldMatch: (m, text) => `has ${m.field} that ${text}`,
  SomeMatch: (_m, text) => `has an entry that ${text}`,
  EveryMatch: (_m, text) => `has every entry that ${text}`,
};

/** A matcher's phrase, folded so a deeply nested matcher cannot overflow the stack. */
const matcherText = (self: Matcher): string => foldMatcherCases(self, matcherTextCases);

// ---------------------------------------------------------------------------
// Explanation
// ---------------------------------------------------------------------------

const requirement = (
  kind: RequirementKind,
  detail: string,
  fields?: ReadonlyArray<string>,
): Requirement => ({ _tag: "Requirement", kind, detail, fields });

/**
 * One node's `Explanation` from its own **already-explained** children, each
 * arm receiving them in the tag's own shape (`PolicyCases`).
 *
 * A leaf computes its own `Requirement` directly; a wrapper receives its one
 * explained child, a `Rules` table one explained row per rule. There is no
 * "exactly one child" check and no row-alignment check to write: the arity is the
 * type (ARCH-17).
 */
const explainCases: PolicyCases<Explanation> = {
  HasPermission: (p) =>
    requirement("permission", permissionKey(p.permission), p.fields),

  HasRole: (p) => requirement("role", p.role, p.fields),

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

  AllOf: (p, parts): All => ({ _tag: "All", parts, fieldStrategy: p.fieldStrategy }),

  AnyOf: (p, parts): Any => ({ _tag: "Any", parts, fieldStrategy: p.fieldStrategy }),

  Not: (_p, part): Negated => ({ _tag: "Negated", part }),

  Labeled: (p, part): Named => ({ _tag: "Named", label: p.label, part }),

  Obliged: (p, part): Owing => ({ _tag: "Owing", part, obligation: p.obligation }),

  Rules: (p, rows): Table => ({
    _tag: "Table",
    rows: rows.map(({ rule, result }) => ({ effect: rule.effect, condition: result })),
    combining: p.combining,
  }),
};

/**
 * Describes a policy without evaluating it.
 *
 * Total by construction: `PolicyCases` (below, `explainCases`) is exhaustive,
 * so a new policy variant is a compile error here rather than a silently
 * unexplained node. Unlike `toPredicate`, which refuses what it cannot
 * translate, this refuses nothing — a policy a reviewer cannot read is worse
 * than one they can only partly act on.
 *
 * Folds through `foldPolicyCases` rather than recursing natively. A decoded policy's
 * nesting is bounded by `MAX_DECODE_DEPTH`, but a policy assembled
 * programmatically never crosses that boundary, and `explain` is reachable
 * directly on a caller-held `Policy` with no prior decode step at all (RP-01,
 * 100-lens audit).
 */
export const explain = (policy: Policy): Explanation => foldPolicyCases(policy, explainCases);

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

export interface RenderOptions {
  /** Wraps a term — a permission key, a role name — for emphasis. Defaults to backticks. */
  readonly term?: (text: string) => string;
}

/**
 * A value outside its closed union, shown as it is: a string quoted, so `""`
 * and `"__proto__"` read as values and not as missing words, and anything else
 * — an untyped caller's `42` or `null` — through `String`. An object is named
 * rather than converted, because converting one can itself throw
 * (`Object.create(null)` has no `toString`), and rendering must not.
 */
const verbatim = (value: unknown): string =>
  typeof value === "string"
    ? JSON.stringify(value)
    : typeof value === "object" && value !== null
      ? "an object"
      : String(value);

/** What each algorithm in the closed union means, in words. */
const knownCombiningText = (self: Combining): string =>
  Match.value(self).pipe(
    Match.when("FirstApplicable", () => "the first row that applies decides"),
    Match.when("DenyOverrides", () => "any applying deny row wins"),
    Match.when("PermitOverrides", () => "any applying permit row wins"),
    Match.exhaustive,
  );

/**
 * A rule table's algorithm in words — and, for a value outside the closed
 * union, that value verbatim and the algorithm the table is actually walked
 * under.
 *
 * Decode rejects such a value (ADR-QD-006), so only a policy built in code
 * carries one. The `Match.exhaustive` above used to receive it and throw a
 * `MatchError` out of a function that must not fail (BEH-QD-141). The fallback
 * is not restated here: `effectiveCombining` (`ShortCircuit.ts`) is what both
 * interpreters walk the table under, so the sentence names whatever it answers
 * (ADR-QD-092 amendment, CCR-QD-183).
 */
const combiningText = (self: Combining): string => {
  if (isCombining(self)) return knownCombiningText(self);
  const walkedUnder = effectiveCombining(self);
  return (
    `the combining algorithm ${verbatim(self)} is outside the closed union and is ` +
    `evaluated under ${walkedUnder}, so ${knownCombiningText(walkedUnder)}`
  );
};

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
 * override. Two composites that agree on the strategy actually in force are
 * the same rule however they got there, so only a departure from this default
 * needs a word in the sentence.
 *
 * Reads `Policy.ts`'s `defaultFieldStrategy` rather than restating "Intersection
 * for allOf, First for anyOf" a second time — this file's own copy of that
 * sentence, and `Evaluate.ts`'s independent, semantic `exhaustive` check, are
 * the "three places" EK-04 found this fact encoded (`defaultFieldStrategy`'s
 * own doc comment has the full history). This file's `"All" | "Any"` kind
 * labels are `Explanation`'s own vocabulary, not `Policy`'s `_tag`s, hence the
 * translation at the call site below.
 */
const isDefaultFieldStrategy = (kind: "All" | "Any", strategy: FieldStrategy): boolean =>
  strategy === defaultFieldStrategy(kind === "All" ? "AllOf" : "AnyOf");

/**
 * The clause an `All`/`Any` carries when its `fieldStrategy` is outside the
 * closed union, or nothing for one of the three strategies.
 *
 * Such a strategy merges to `[]` — `FieldLattice.ts`'s fail-closed row — so the
 * composite exposes no fields whatever its parts grant, and none of the
 * lattice's laws hold for it. That is why this clause, unlike the known
 * strategies', is said for every part count: one part is *not* itself under it
 * (`singletonIsIdentity` is false), and an empty `allOf` grants no fields, not
 * every field. Leaving it out would render ``exposing only `a` `` for a policy
 * that exposes nothing — the understated restriction BEH-QD-139 exists to
 * forbid. Membership is `FieldLattice.ts`'s own `isFieldStrategy`, the test its
 * law lookup uses, so the sentence and the evaluator cannot disagree about which
 * values are outside (ADR-QD-092 amendment, CCR-QD-183).
 */
const outsideStrategyClause = (strategy: FieldStrategy): string =>
  isFieldStrategy(strategy)
    ? ""
    : `, but exposing no fields: its field strategy ${verbatim(strategy)} is outside the ` +
      `closed union and is evaluated fail-closed`;

/**
 * The clause naming a composite's `fieldStrategy`, or nothing when it would
 * describe a difference that cannot exist.
 *
 * Two conditions must both hold before the strategy is worth a word: fewer
 * than two parts and `FieldLattice.ts` already agrees on every result
 * regardless of strategy — merging no field set is top under all three, and
 * merging one discloses exactly it (the `singletonIsIdentity` law) under
 * `Intersection`, `Union` and `First` alike — so a single-part composite's
 * strategy is not a real difference to report. And the default
 * strategy needs no mention because that is what a bare "and"/"either…or" has
 * always meant; only a departure from it changes what the sentence must say
 * to keep two non-equivalent policies from rendering identically.
 *
 * Both conditions are facts about the three known strategies only. A value
 * outside the union gets {@link outsideStrategyClause} at every part count, and
 * {@link fieldStrategyText}'s `Match.exhaustive` is reached only past that guard.
 */
const fieldStrategyClause = (
  kind: "All" | "Any",
  e: { readonly fieldStrategy: FieldStrategy; readonly parts: ReadonlyArray<Explanation> },
): string =>
  !isFieldStrategy(e.fieldStrategy)
    ? outsideStrategyClause(e.fieldStrategy)
    : e.parts.length < 2 || isDefaultFieldStrategy(kind, e.fieldStrategy)
      ? ""
      : `, ${fieldStrategyText(e.fieldStrategy)}`;

/**
 * Whether this node reads as one unit and so needs no parentheses as a child.
 *
 * A `Requirement` is a single clause. The three empty composites render fixed
 * sentences — "always allows (an empty conjunction)" — that no following word
 * can attach to. Everything else spans several clauses, and a reader has no way
 * to see where it ends — including an empty `All` whose `fieldStrategy` is
 * outside the closed union, which carries a trailing clause saying so.
 *
 * Hoisted to module scope, per AGENTS.md §5a's preferred form: unlike the
 * dispatchers inside {@link renderExplanation}, this one closes over nothing.
 */
const isAtomic: (self: Explanation) => boolean = Match.type<Explanation>().pipe(
  Match.tagsExhaustive({
    Requirement: () => true,
    All: (e) => e.parts.length === 0 && isFieldStrategy(e.fieldStrategy),
    Any: (e) => e.parts.length === 0,
    Table: (e) => e.rows.length === 0,
    Negated: () => false,
    Named: () => false,
    Owing: () => false,
  }),
);

/** What one rendered node hands its parent: its text, and whether it needs parentheses. */
interface Piece {
  readonly text: string;
  readonly atomic: boolean;
}

/**
 * A child, parenthesised unless it reads as one unit.
 *
 * Every position that embeds a child goes through here — the alternative is
 * remembering to do it at seven call sites, and the one forgotten site is the
 * ambiguity.
 */
const embed = (piece: Piece): string => (piece.atomic ? piece.text : `(${piece.text})`);

/** What a node's own text needs beyond its children: how to wrap a term. */
interface RenderContext {
  readonly term: (text: string) => string;
}

/**
 * One node's own text, from its already-rendered children, each arm receiving
 * them in the tag's own shape.
 *
 * Built per call because the arms close over the caller's `term`; each returns a
 * {@link Piece}. Nothing here recurses — {@link renderExplanation} folds the tree
 * and this describes one node. A `Table` arm receives one {@link RowResult} per
 * row, so a condition is never read out of step with its row (ARCH-17).
 */
const renderCases = (context: RenderContext): ExplanationCases<Piece> => {
  const { term } = context;
  return {
    Requirement: (e) => ({
      text: `requires ${e.kind} ${term(e.detail)}${fieldsClause(e.fields, term)}`,
      atomic: isAtomic(e),
    }),

    // An empty `allOf` allows and an empty `anyOf` denies, which is the least
    // guessable thing about the ADT — so it is said outright rather than
    // rendered as an empty list the reader has to interpret.
    All: (e, parts) => ({
      text:
        e.parts.length === 0
          ? `always allows (an empty conjunction)${outsideStrategyClause(e.fieldStrategy)}`
          : `${parts.map(embed).join(" and ")}${fieldStrategyClause("All", e)}`,
      atomic: isAtomic(e),
    }),

    // "either" opens a disjunction but nothing closes it, so a following
    // " and …" reads as part of the last alternative rather than as a
    // sibling of the whole. That is the collision this fixes.
    Any: (e, parts) => ({
      text:
        e.parts.length === 0
          ? "never allows (an empty disjunction)"
          : `either ${parts.map(embed).join(" or ")}${fieldStrategyClause("Any", e)}`,
      atomic: isAtomic(e),
    }),

    Negated: (e, part) => ({ text: `does not hold that ${embed(part)}`, atomic: isAtomic(e) }),

    Named: (e, part) => ({
      text: `${embed(part)} (${term(e.label)})`,
      atomic: isAtomic(e),
    }),

    Owing: (e, part) => ({
      text: `${embed(part)}, and owes ${term(e.obligation.id)}${
        e.obligation.advisory ? " (advisory)" : ""
      }`,
      atomic: isAtomic(e),
    }),

    Table: (e, rows) => ({
      text:
        rows.length === 0
          ? "never allows (an empty rule table)"
          : `a rule table where ${combiningText(e.combining)}: ${rows
              .map(({ row, result }, i) => `[${i}] ${row.effect.toLowerCase()} when ${embed(result)}`)
              .join("; ")}`,
      atomic: isAtomic(e),
    }),
  };
};

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
 *
 * Folds through {@link foldExplanationCases}, so it is stack-safe for any nesting
 * depth. `explain` already was, and its output used to overflow here at about
 * 700 levels (ARCH-02 N1).
 *
 * Total over a policy built in code, too: a `fieldStrategy` or `combining`
 * outside its closed union — which decode rejects, and the smart constructors
 * do not — is named verbatim with what it is evaluated as, where it used to
 * throw a `MatchError` (ADR-QD-092 amendment, CCR-QD-183).
 */
export const renderExplanation = (
  explanation: Explanation,
  options?: RenderOptions,
): string => {
  const context: RenderContext = { term: options?.term ?? defaultTerm };

  // The top level is never wrapped: nothing follows it, so there is nothing for
  // it to run into.
  return foldExplanationCases(explanation, renderCases(context)).text;
};
