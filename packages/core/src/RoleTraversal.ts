/**
 * The one walk of a role-inheritance graph, which every role walker projects.
 *
 * Package-private (not in the barrel, ADR-QD-099): `roleWalk` in `Role.ts` is its
 * public projection. Generic over anything with `inherits`, so it imports nothing
 * from `Role.ts` and `AuthSubject.ts` can share it without a cycle (ADR-QD-037).
 *
 * The rules it fixes once, after four hand-kept copies drifted twice (ticket 86's
 * iterative rewrite and the name-to-identity keying fix each had to be applied to
 * every copy): a role is keyed on object identity, never on `name`; the walk is
 * iterative, so a deep chain cannot overflow the native stack; it is the
 * recursive pre-order with parents in `inherits` order, so the first path to
 * reach a role wins; and every edge into an already-visited role is reported as
 * a revisit rather than walked again, so a diamond costs one step, not a subtree.
 *
 * **Iterative, with an explicit stack** (ticket 86). A direct recursion over
 * `inherits` overflows the native call stack on a long inheritance chain; an
 * explicit array lives on the heap rather than growing a call frame per level.
 * Every walker used to carry its own copy of that loop; they are projections of
 * this one now, so INV-QD-038 (provenance agrees with flatten) holds because
 * both read the same visits.
 */

/**
 * Called once per step, in walk order. `index` counts every step, visits and
 * revisits alike; `parent` is the index of the step that reached this one
 * (`undefined` for a root). `first` is the index of the role's visit, set only
 * on a revisit.
 */
export type RoleStepVisitor<R> = (
  role: R,
  index: number,
  depth: number,
  parent: number | undefined,
  first: number | undefined,
) => void;

/**
 * Walks every role reachable from `roots`, reporting each step to `onStep`.
 *
 * Parents are pushed in reverse onto a pop stack and checked when popped, which
 * is the moment a recursion would check them, so the step order is exactly the
 * recursive pre-order's (INV-QD-038's "first path wins").
 */
export const traverseRoles = <R extends { readonly inherits: ReadonlyArray<R> }>(
  roots: ReadonlyArray<R>,
  onStep: RoleStepVisitor<R>,
): void => {
  interface Pending {
    readonly role: R;
    readonly depth: number;
    readonly parent: number | undefined;
  }
  const visitedAt = new Map<R, number>();
  const stack: Array<Pending> = [];
  // The depth and parent step of the roles `push` is handed, set before each
  // `reduceRight`. One closure for the whole walk rather than one per visit:
  // `flattenPermissions` runs this on every request (Role.bench.ts).
  let depth = 0;
  let parent: number | undefined = undefined;
  const push = (none: undefined, role: R): undefined => {
    stack.push({ role, depth, parent });
    return none;
  };
  // `reduceRight` hands parents last-first, so they pop in `inherits` order, and
  // allocates nothing; it also skips the holes of a sparse array, as every
  // walker before this one did.
  roots.reduceRight(push, undefined);
  let index = 0;

  for (let next = stack.pop(); next !== undefined; next = stack.pop(), index += 1) {
    const first = visitedAt.get(next.role);
    onStep(next.role, index, next.depth, next.parent, first);
    if (first !== undefined) continue;
    visitedAt.set(next.role, index);
    depth = next.depth + 1;
    parent = index;
    next.role.inherits.reduceRight(push, undefined);
  }
};

/**
 * Walks every role reachable from `roots`, reporting only first visits: each
 * role once, with its step `index` and the index of the `parent` step that
 * reached it (`undefined` for a root).
 *
 * The projections that read only what is reached (`flattenAll`, `roleNames`,
 * `permissionProvenance`, `fromRoles`) share this one filter, so none of them
 * can count a revisit as a visit — the same grant can never arrive twice.
 */
export const visitRoles = <R extends { readonly inherits: ReadonlyArray<R> }>(
  roots: ReadonlyArray<R>,
  onVisit: (role: R, index: number, parent: number | undefined) => void,
): void =>
  traverseRoles(roots, (role, index, _depth, parent, first) => {
    if (first === undefined) onVisit(role, index, parent);
  });
