/**
 * Folds a finite tree bottom-up without native recursion.
 *
 * `foldTree` is the one post-order loop behind `foldPolicy` (`Policy.ts`),
 * `foldExplanation` (`Explanation.ts`) and `foldMatcher` (`Matcher.ts`). Each of
 * those supplies only its ADT's `childrenOf`; this owns the stack, the memo and
 * the traversal-order invariants, so a caller sees none of them.
 *
 * It exists because a `Policy`, `Explanation` or `Matcher` assembled in process
 * has no `MAX_DECODE_DEPTH` bound — a loop of `not()` builds a tree exactly as
 * deep as the loop runs — and a pure walk that recurses natively raises a raw
 * `RangeError`, which inside an `Effect` becomes a defect rather than a typed
 * failure (AGENTS.md §4). Three modules had each hand-written the same loop
 * (ARCH-02 C2), and three more recursed natively.
 *
 * **Nodes are memoised by identity.** A child object reachable by two paths is
 * combined once and its result reused, so a shared subtree costs once and every
 * occurrence receives the *same* result reference. `childrenOf` is called exactly
 * once per distinct node, and the array it returns is read once, through an
 * iterator, so a `childrenOf` that allocates (or even varies) cannot make the fold
 * inconsistent and a very wide node is never spread into an argument list.
 *
 * **A cycle throws.** A node met again while it is still open is a cycle, which
 * only in-process mutation can produce (decoding cannot). Without the check the
 * stack grows without bound; with it a hang becomes an immediate, named defect.
 *
 * Package-private (AGENTS.md §9, ADR-QD-099): shared scaffolding, not exported
 * from the barrel or any entry point.
 * `@qadi/devtools` keeps a package-private twin rather than importing it
 * (ARCH-02 D-02-d).
 *
 * @param root - The tree to fold.
 * @param childrenOf - A node's children, in the order `combine` should see their results.
 * @param combine - Builds a node's result from the node and its children's results.
 */
export const foldTree = <N extends object, R>(
  root: N,
  childrenOf: (node: N) => ReadonlyArray<N>,
  combine: (node: N, children: ReadonlyArray<R>) => R,
): R => walk(root, childrenOf, combine);

/**
 * Folds a finite tree bottom-up, handing `combine` a way to read a child's
 * result *by naming the child* instead of a positional array.
 *
 * The same loop as {@link foldTree} (one seam, ADR-QD-090): `foldTree` and this
 * are two projections of one private `walk`. What differs is only what `combine`
 * is given. A named read lets an adapter that knows its ADT's arity — `Not` has
 * one child, a `Rules` row has one condition — receive each child's result in the
 * shape of the field it came from, so a case that treats a wrapper's child as an
 * array is a compile error and "the fold supplied fewer children than rows" is
 * unrepresentable (ARCH-17).
 *
 * The one check that remains is `resultOf` on a node `childrenOf` did not list
 * for the node being combined: it throws, because the loop memoises only what it
 * has walked. That is the single reachable guard — it fires when an adapter's
 * dispatcher and its `childrenOf` drift apart, and a lockstep property test
 * keeps them in agreement.
 *
 * @param root - The tree to fold.
 * @param childrenOf - A node's children; every one `combine` reads must be listed.
 * @param combine - Builds a node's result from the node and a reader of its children's results.
 */
export const foldTreeBy = <N extends object, R>(
  root: N,
  childrenOf: (node: N) => ReadonlyArray<N>,
  combine: (node: N, resultOf: (child: N) => R) => R,
): R => {
  // Boxed so a stored `undefined` result needs no sentinel and no cast.
  const memo = new Map<N, { readonly value: R }>();
  // One reader per call, so a node's `combine` allocates nothing to read its
  // children by name.
  const resultOf = (child: N): R => {
    const known = memo.get(child);
    if (known === undefined) {
      throw new Error("foldTree: combine read a node that was not folded as a child");
    }
    return known.value;
  };
  return walk<N, R>(root, childrenOf, (node) => combine(node, resultOf), memo);
};

/**
 * The one loop behind both folds. {@link foldTree} passes its `combine` straight
 * through, so the array form allocates nothing for the named read; {@link foldTreeBy}
 * hands in the memo it reads children from (ARCH-17 T1: a reader closure built per
 * call inside this loop cost the array form ≈40% on a leaf-only `referencesAction`).
 */
const walk = <N extends object, R>(
  root: N,
  childrenOf: (node: N) => ReadonlyArray<N>,
  finish: (node: N, results: ReadonlyArray<R>) => R,
  // Boxed so a stored `undefined` result needs no sentinel and no cast.
  memo: Map<N, { readonly value: R }> = new Map(),
): R => {
  interface Frame {
    readonly node: N;
    readonly pending: Iterator<N>;
    readonly results: Array<R>;
  }

  const onPath = new Set<N>();

  const open = (node: N): Frame => {
    onPath.add(node);
    return { node, pending: childrenOf(node)[Symbol.iterator](), results: [] };
  };

  // The open frame is held in `frame`; its ancestors wait on `ancestors`. The
  // root is finished exactly when no ancestor is left.
  const ancestors: Array<Frame> = [];
  let frame = open(root);

  for (;;) {
    const next = frame.pending.next();
    if (!next.done) {
      const child = next.value;
      const known = memo.get(child);
      if (known !== undefined) {
        frame.results.push(known.value);
      } else if (onPath.has(child)) {
        throw new Error("foldTree: the tree contains a cycle");
      } else {
        ancestors.push(frame);
        frame = open(child);
      }
      continue;
    }

    // `onPath` is never cleared: a finished node is in `memo`, which is checked
    // first, so a node still in `onPath` but not in `memo` is exactly one still open.
    const value = finish(frame.node, frame.results);
    memo.set(frame.node, { value });
    const parent = ancestors.pop();
    if (parent === undefined) return value;
    parent.results.push(value);
    frame = parent;
  }
};
