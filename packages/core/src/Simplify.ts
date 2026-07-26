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
import type { Policy } from "./Policy.ts";

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
 * Equal strategies are safe because each merge is associative: intersection and
 * union both are, and `First` takes the first child's set either way.
 */
const absorbable = (
  child: Policy,
  tag: "AllOf" | "AnyOf",
  fieldStrategy: string,
): child is Extract<Policy, { _tag: "AllOf" | "AnyOf" }> =>
  child._tag === tag && child.fieldStrategy === fieldStrategy;

const flatten = (
  policies: ReadonlyArray<Policy>,
  tag: "AllOf" | "AnyOf",
  fieldStrategy: string,
): ReadonlyArray<Policy> =>
  policies.flatMap((child) =>
    absorbable(child, tag, fieldStrategy) ? child.policies : [child],
  );

/**
 * Rewrites a policy to an equivalent one with fewer nodes.
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
export const simplify: (policy: Policy) => Policy = Match.type<Policy>().pipe(
  Match.tagsExhaustive({
    // Leaves have no structure to remove.
    HasPermission: (p): Policy => p,
    HasRole: (p): Policy => p,
    HasAttribute: (p): Policy => p,
    HasResourceAttribute: (p): Policy => p,
    HasRelationship: (p): Policy => p,
    HasAction: (p): Policy => p,
    HasActed: (p): Policy => p,
    HasNotActed: (p): Policy => p,

    AllOf: (p): Policy => {
      const children = flatten(p.policies.map(simplify), "AllOf", p.fieldStrategy);
      // One child means the merge has one input, so every strategy yields that
      // child's own field set and the wrapper carries nothing.
      return children.length === 1
        ? children[0]!
        : { ...p, policies: children };
    },

    AnyOf: (p): Policy => {
      const children = flatten(p.policies.map(simplify), "AnyOf", p.fieldStrategy);
      return children.length === 1
        ? children[0]!
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
    Not: (p): Policy => ({ ...p, policy: simplify(p.policy) }),

    // A label is the author's name for a branch and the only thing a denial can be
    // attributed to. Removing one would silently change what a trace can say.
    Labeled: (p): Policy => ({ ...p, policy: simplify(p.policy) }),

    Obliged: (p): Policy => ({ ...p, policy: simplify(p.policy) }),

    // Row order is semantic and the deciding row is chosen by index, so rows are
    // simplified individually and never reordered, merged or dropped.
    Rules: (p): Policy => ({
      ...p,
      rules: p.rules.map((r) => ({ ...r, condition: simplify(r.condition) })),
    }),
  }),
);
