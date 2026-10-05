/**
 * An opt-in structural transform: the same rule, fewer nodes.
 *
 * Policies assembled from helpers accumulate structure that means nothing — an
 * `allOf` of one child, an `allOf` directly inside an `allOf`. This removes exactly
 * that and nothing else.
 *
 * Notably **not** double negation, which is unsound here. See the `Not` arm.
 *
 * **Nothing calls it.** Not `evaluate`, not `check`, not `toPredicate`, not
 * `explain`. A simplified policy produces a shallower **trace**, and the trace is
 * what a reviewer reads to see the rule an author wrote — so rewriting it silently
 * would make `explain` describe a policy nobody stored
 * ([ADR-QD-030](../../../spec/decisions/030-policy-simplification.md)).
 *
 * Verdict-preserving, field-preserving, obligation-preserving. Trace-changing, by
 * definition.
 */
import * as Match from "effect/Match";
import { fieldStrategyLaws } from "./FieldLattice.ts";
import type { FieldStrategy, Policy } from "./Policy.ts";
import { foldPolicy } from "./Policy.ts";

/**
 * Whether a composite's children can be absorbed into a parent of the same tag.
 *
 * **The condition is the whole correctness argument.** Consider
 * `allOf([a, allOf([b, c], { fieldStrategy: "Union" })], { fieldStrategy: "Intersection" })`:
 * the outer intersects `a`'s fields with the inner's result, and the inner *unions*
 * `b`'s and `c`'s. Flattened under `Intersection`, all three are intersected — the
 * same verdict and a **different field set**.
 *
 * So an unconditional flatten would be verdict-preserving and
 * *disclosure-changing*: it would widen or narrow what a caller may read while
 * every allow-or-deny assertion still passed. Field visibility is the reason this
 * library exists, which makes this the failure mode that matters most and the one
 * an "obviously safe" rewrite walks into.
 *
 * Equal strategies are necessary, because each merge is associative:
 * intersection and union both are, and `First` takes the first child's set
 * either way. They are **not sufficient** when the absorbed child is **empty**.
 * An empty `allOf` allows with `undefined` — what a merge of no inputs grants,
 * the lattice's top — and top is `Intersection`'s unit but `Union`'s
 * *absorbing* element, and `First` has no unit at all. So
 * `allOf([allOf([], { fieldStrategy: "Union" }), x], { fieldStrategy: "Union" })`
 * grants every field, and flattening it to `x` granted only `x`'s (CCR-QD-174,
 * ARCH-12 C4). An empty child is absorbed only where top is the merge's unit
 * — `FieldLattice.ts`'s `emptyIsUnit` law, true for `Intersection` alone — or
 * under `anyOf`, where an empty child denies and so contributes no field set to
 * merge at all. That last clause is a fact about the combinator, not the
 * lattice, so it stays here. A strategy outside the union has no law that
 * holds, and its non-empty children were never safe to absorb either: the
 * parent merges to `[]` whatever its children are, and so does the flattened
 * one — it is the unwrap below that the unknown strategy forbids.
 */
const absorbable = (
  child: Policy,
  tag: "AllOf" | "AnyOf",
  fieldStrategy: FieldStrategy,
): child is Extract<Policy, { _tag: "AllOf" | "AnyOf" }> =>
  child._tag === tag &&
  child.fieldStrategy === fieldStrategy &&
  (tag === "AnyOf" || child.policies.length > 0 || fieldStrategyLaws(fieldStrategy).emptyIsUnit);

/**
 * Whether a one-child composite may be replaced by its child: when the merge of
 * one input discloses exactly that input — `FieldLattice.ts`'s
 * `singletonIsIdentity` law, true for the three known strategies.
 *
 * A strategy outside the union merges to `[]` — no fields — so replacing its
 * one-child composite with the child would widen from none to that child's
 * (CCR-QD-174, ARCH-12 C4).
 */
const unwrappable = (fieldStrategy: FieldStrategy): boolean =>
  fieldStrategyLaws(fieldStrategy).singletonIsIdentity;

const flatten = (
  policies: ReadonlyArray<Policy>,
  tag: "AllOf" | "AnyOf",
  fieldStrategy: FieldStrategy,
): ReadonlyArray<Policy> =>
  policies.flatMap((child) =>
    absorbable(child, tag, fieldStrategy) ? child.policies : [child],
  );

/**
 * `childrenOf`'s single-child tags (`Not`/`Labeled`/`Obliged`) always produce
 * exactly one entry, by construction — but a generic `ReadonlyArray<Policy>`
 * parameter can't carry that in its type, and AGENTS.md §6 bans `children[0]!`
 * as the way around it. Failing loudly on the invariant instead (rather than
 * silently falling back to some other `Policy`) keeps a future bug in
 * `rebuild`'s wiring a thrown error, not a policy quietly rewritten wrong.
 */
const expectOne = (tag: string, children: ReadonlyArray<Policy>): Policy => {
  const [only, ...rest] = children;
  if (only === undefined || rest.length !== 0) {
    throw new Error(`simplify: ${tag} expected exactly one child, got ${children.length}`);
  }
  return only;
};

/**
 * Rebuilds one node from its own **already-simplified** children, supplied in
 * the same order `childrenOf` produced them — the one piece of state
 * `simplify`'s explicit-stack walk (below) passes in that this function's
 * previous native-recursion form got by calling itself directly instead.
 *
 * Two rewrites and nothing clever: single-child composites, and nesting of a
 * composite inside the same composite **under the same field strategy**.
 *
 * An **empty** `allOf` or `anyOf` is left alone. They are not redundant — one always
 * allows and the other never does — so "simplifying" them would be replacing them.
 *
 * `labeled` is never removed, which is what keeps a denial's attribution intact
 * through the transform.
 */
const rebuild: (node: Policy) => (children: ReadonlyArray<Policy>) => Policy = Match.type<Policy>().pipe(
  Match.tagsExhaustive({
    // Leaves have no structure to remove, and no children to rebuild from.
    HasPermission: (p) => () => p,
    HasRole: (p) => () => p,
    HasAttribute: (p) => () => p,
    HasResourceAttribute: (p) => () => p,
    HasRelationship: (p) => () => p,
    HasAction: (p) => () => p,
    HasActed: (p) => () => p,
    HasNotActed: (p) => () => p,
    HasCustom: (p) => () => p,
    HasSignature: (p) => () => p,

    AllOf: (p) => (simplifiedChildren: ReadonlyArray<Policy>) => {
      const children = flatten(simplifiedChildren, "AllOf", p.fieldStrategy);
      // One child means the merge has one input, so every known strategy yields
      // that child's own field set and the wrapper carries nothing — but only a
      // known one: outside the union the merge is `[]` (`unwrappable`).
      //
      // Deliberately `[only, ...rest]`, not `children[0]` plus a length check:
      // TS can't correlate "`children.length === 1`" with "`children[0]` is
      // defined" (`noUncheckedIndexedAccess` types the latter as possibly
      // `undefined` regardless), so any form that re-derives "exactly one"
      // from a length comparison alone leaves one arm unreachable-but-not-
      // provably-so — which mutation testing confirmed twice, turning a real
      // check into dead code no test could distinguish from its mutant.
      // Destructuring keeps `only`'s definedness and "there was exactly one"
      // tied to the same fact, at the cost of one small discarded array.
      const [only, ...rest] = children;
      return only !== undefined && rest.length === 0 && unwrappable(p.fieldStrategy)
        ? only
        : { ...p, policies: children };
    },

    AnyOf: (p) => (simplifiedChildren: ReadonlyArray<Policy>) => {
      const children = flatten(simplifiedChildren, "AnyOf", p.fieldStrategy);
      const [only, ...rest] = children;
      return only !== undefined && rest.length === 0 && unwrappable(p.fieldStrategy)
        ? only
        : { ...p, policies: children };
    },

    /**
     * **Double negation is NOT eliminated, and that is a finding rather than an
     * omission.**
     *
     * `not(not(p))` is not `p` in this ADT. A negation carries
     * `visibleFields: undefined` — the top of the lattice, meaning *all* fields —
     * and no obligations, because knowing a policy did not hold says nothing about
     * which fields are safe to expose (ADR-QD-019). So:
     *
     *   - `not(not(hasPermission(read, { fields: ["id"] })))` allows with **every**
     *     field, where the inner policy allows with `["id"]`.
     *   - `not(not(obliged(audit, p)))` allows owing **nothing**, where the inner
     *     policy allows owing `audit`.
     *
     * Both differences are in the *safe* direction for the rewrite — it narrows
     * fields and adds duties — but they are differences, and this transform
     * promises to change neither. A property over generated policies and four
     * subjects caught it; the textbook rewrite is unsound here.
     */
    Not: (p) => (children: ReadonlyArray<Policy>) => ({ ...p, policy: expectOne("Not", children) }),

    // A label is the author's name for a branch and the only thing a denial can be
    // attributed to. Removing one would silently change what a trace can say.
    Labeled: (p) => (children: ReadonlyArray<Policy>) => ({
      ...p,
      policy: expectOne("Labeled", children),
    }),

    Obliged: (p) => (children: ReadonlyArray<Policy>) => ({
      ...p,
      policy: expectOne("Obliged", children),
    }),

    // Row order is semantic and the deciding row is chosen by index, so rows are
    // simplified individually and never reordered, merged or dropped.
    Rules: (p) => (children: ReadonlyArray<Policy>) => {
      if (children.length !== p.rules.length) {
        throw new Error(
          `simplify: Rules expected ${p.rules.length} children, got ${children.length}`,
        );
      }
      const rules: Array<(typeof p.rules)[number]> = [];
      for (let i = 0; i < p.rules.length; i++) {
        const rule = p.rules[i];
        const condition = children[i];
        // Both indices are in range by the length check above;
        // `noUncheckedIndexedAccess` still types each lookup as possibly
        // `undefined`, so this is that same check, not a new one.
        if (rule === undefined || condition === undefined) {
          throw new Error(`simplify: Rules children misaligned at index ${i}`);
        }
        rules.push({ ...rule, condition });
      }
      return { ...p, rules };
    },
  }),
);

/**
 * Rewrites a policy to an equivalent one with fewer nodes.
 *
 * Folds through `foldPolicy` rather than recursing natively, so it cannot
 * overflow the stack: a decoded policy's nesting is bounded by
 * `MAX_DECODE_DEPTH`, but a policy assembled programmatically never crosses that
 * boundary — the smart constructors do not depth-check, so a loop of `not()`
 * builds a tree exactly as deep as the loop runs — and this function is
 * reachable directly on a caller-held `Policy` with no prior decode step at all.
 */
export const simplify = (policy: Policy): Policy =>
  foldPolicy<Policy>(policy, (node, children) => rebuild(node)(children));
