/**
 * A role's inheritance, and where each of its permissions came from.
 *
 * **An indented tree rather than a drawn graph**, and the choice is about
 * legibility rather than about the absence of a charting library. A role graph
 * is a DAG, and the question a reviewer actually brings to it is *why does this
 * role have this permission* — which is a path, and reads better as one. A
 * node-and-edge diagram answers *what is the shape of my catalogue*, which is a
 * rarer question and a poor use of a short dock.
 *
 * Nothing here re-derives what the evaluator computes.
 * `permissionProvenance` already returns every permission with the role that
 * granted it and the path walked to reach it, and it is held in agreement with
 * `flattenPermissions` by
 * [INV-QD-038](../../../../spec/invariants.md#inv-qd-038-provenance-and-flattening-agree) —
 * so a screen built on it cannot show a different set from the one that decides.
 */
import {
  flattenPermissions,
  permissionKey,
  permissionProvenance,
  RoleStep,
  roleWalk,
} from "@qadi/core";
import type { PermissionGrant, PermissionKey, Role } from "@qadi/core";

/** One row of the inheritance tree: one step of the role walk, in walk order. */
export interface RoleRow {
  readonly name: string;
  /**
   * This row's step in the role walk: unique in the tree and stable for one
   * role, so it is the React key. An index rather than an address from the root,
   * whose total size is quadratic in depth.
   */
  readonly index: number;
  /** Edges from the queried role, which is at depth 0: the row's indent. */
  readonly depth: number;
  /** Permissions this role's own `permissions` list contains. */
  readonly own: ReadonlyArray<PermissionKey>;
  /**
   * This role object was already reached by an earlier path.
   *
   * A diamond's second arm: the edge is shown, as a leaf, but the permissions
   * beneath it were already counted once, and a reader adding up the tinted rows
   * would otherwise double-count. Keyed on identity: a distinct role that only
   * shares a name is not repeated. `permissionProvenance` resolves the same way:
   * first path wins.
   */
  readonly repeated: boolean;
  /** For a repeated row, the `index` of the role's first occurrence, where its subtree is shown. */
  readonly first: number | undefined;
}

export interface RoleSummary {
  readonly role: Role;
  /**
   * The tree as a flat list, a parent before its children, each row carrying its
   * depth. Flat so that a screen draws siblings rather than one element nested
   * per level, which a deep catalogue overflowed.
   */
  readonly rows: ReadonlyArray<RoleRow>;
  /** Every permission with the role that granted it and the path walked. */
  readonly grants: ReadonlyArray<PermissionGrant>;
  /** Granted by this role's own list rather than inherited. */
  readonly ownCount: number;
  readonly inheritedCount: number;
}

export const roleSummary = (self: Role): RoleSummary => {
  const grants = permissionProvenance(self);
  // A single-element path means the queried role granted it directly; anything
  // longer reads as "via …".
  const ownCount = grants.filter((grant) => grant.path.length === 1).length;

  return {
    role: self,
    rows: rowsOf(self),
    grants,
    ownCount,
    inheritedCount: grants.length - ownCount,
  };
};

/** How a grant should read: `own`, or the roles walked to reach it. */
export const grantPath = (grant: PermissionGrant): string =>
  grant.path.length === 1 ? "own" : `via ${grant.path.slice(1).join(" → ")}`;

/**
 * The permissions this role actually decides with.
 *
 * Exposed so a screen can assert against the set the evaluator uses rather than
 * against its own sum of the rows it drew — INV-QD-038 is the property, and
 * showing it is how a reader knows the two agree.
 */
export const decidingSet = (self: Role): ReadonlySet<PermissionKey> => flattenPermissions(self);

/**
 * The tree, one row per step of `roleWalk`, which is already in pre-order with
 * depths, so no tree is built and nothing recurses.
 *
 * A repeated role is a leaf that points at its first occurrence rather than a
 * second copy of its subtree (decision 16-01 T1 = A). Every edge of the graph is
 * still drawn, and the subtree is shown once, at the first occurrence, the same
 * rule `permissionProvenance` follows. Re-walking it instead grew about 2^k
 * rows for k stacked diamonds.
 */
const rowsOf = (self: Role): ReadonlyArray<RoleRow> =>
  roleWalk(self).map((step) => {
    const first = RoleStep.$match(step, { Visit: () => undefined, Revisit: (s) => s.first });
    return {
      name: step.role.name,
      index: step.index,
      depth: step.depth,
      own: step.role.permissions.map(permissionKey),
      repeated: first !== undefined,
      first,
    };
  });

/** Whether two roles are the same role: by name, which is what a host rebuilding its list keeps. */
export const sameRole = (a: Role, b: Role): boolean => a.name === b.name;
