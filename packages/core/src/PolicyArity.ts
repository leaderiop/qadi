/**
 * How many children each `Policy` tag has, stated once.
 *
 * `POLICY_ARITY` says, per tag, whether its node has no children (`Leaf`), exactly
 * one (`Wrapper`) or any number (`Many`). `childrenOf` and `LeafPolicy` in
 * `Policy.ts` are typed against it and `Decision.ts`'s trace fold reads it, so a
 * tag moved here and not in an arm is a compile error rather than a fold that
 * silently drops or invents a child (ARCH-98, ADR-QD-164 applying ADR-QD-152).
 *
 * A sibling module and out of the barrel (ADR-QD-099): `index.ts` re-exports every
 * export of `Policy.ts`, so a record declared there would be public API. It imports
 * nothing, because madge counts an `import type` as an edge and `Policy.ts` must be
 * able to import this module; `Policy.ts` therefore closes the record over its own
 * tag union (a tag the record lacks, or one the union lacks, does not compile).
 */

/** The three shapes a tag's children take. */
export type Arity = "Leaf" | "Wrapper" | "Many";

/** Each `Policy` tag's arity, in `POLICY_TAGS`'s order. */
export const POLICY_ARITY = {
  HasPermission: "Leaf",
  HasRole: "Leaf",
  HasAttribute: "Leaf",
  HasResourceAttribute: "Leaf",
  HasRelationship: "Leaf",
  HasAction: "Leaf",
  HasActed: "Leaf",
  HasNotActed: "Leaf",
  HasCustom: "Leaf",
  HasSignature: "Leaf",
  Not: "Wrapper",
  Obliged: "Wrapper",
  Labeled: "Wrapper",
  AllOf: "Many",
  AnyOf: "Many",
  Rules: "Many",
} as const satisfies { readonly [tag: string]: Arity };

/**
 * What an arm of arity `A` may return as children of type `Child`.
 *
 * The `Many` type carries `{ readonly 0?: never }` on purpose: an array literal whose
 * contextual type has a `0` property is typed as a tuple, and a tuple's `0` is not
 * assignable to `never`, so a `Wrapper` arm (`[p.policy]`) left behind when its tag
 * moves to `Many` fails with `is not assignable to type 'never'`, while an existing
 * array (`p.policies`) is accepted. A `Many` arm may be empty, so `Leaf` to `Many` is
 * the one move this cannot see; `LeafPolicy`'s readers catch it. A `Many` arm with a
 * fixed number of children returns a non-literal array, e.g. `Array.of(a, b)`, because
 * a literal `[a, b]` is a tuple and is refused with the same `never` error.
 */
export type ChildrenOf<A extends Arity, Child> = A extends "Leaf"
  ? readonly []
  : A extends "Wrapper"
    ? readonly [Child]
    : A extends "Many"
      ? ReadonlyArray<Child> & { readonly 0?: never }
      : never;

/** One arm per tag of `Node`, each returning the children its arity in `R` allows. */
export type ChildArms<
  Node extends { readonly _tag: string },
  R extends { readonly [K in Node["_tag"]]: Arity },
> = {
  readonly [K in Node["_tag"]]: (
    p: Extract<Node, { readonly _tag: K }>,
  ) => ChildrenOf<R[K], Node>;
};
