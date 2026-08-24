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
import { flattenPermissions, permissionKey, permissionProvenance } from "@qadi/core";
import type { PermissionGrant, PermissionKey, Role } from "@qadi/core";

export interface RoleNode {
  readonly name: string;
  /** Address from the root, so a React key is stable and a diamond's arms differ. */
  readonly path: string;
  /** Permissions this role's own `permissions` list contains. */
  readonly own: ReadonlyArray<PermissionKey>;
  readonly children: ReadonlyArray<RoleNode>;
  /**
   * This role was already reached by an earlier path.
   *
   * A diamond's second arm. The structure is still shown — hiding it would
   * misrepresent the catalogue — but the permissions beneath it were already
   * counted once, and a reader adding up the tinted rows would otherwise
   * double-count. `permissionProvenance` resolves the same way: first path wins.
   */
  readonly repeated: boolean;
}

export interface RoleSummary {
  readonly role: Role;
  readonly tree: RoleNode;
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
    tree: nodeOf(self, "$", new Set()),
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

const nodeOf = (self: Role, path: string, seen: Set<string>): RoleNode => {
  const repeated = seen.has(self.name);
  seen.add(self.name);

  return {
    name: self.name,
    path,
    own: self.permissions.map(permissionKey),
    // A repeated role's subtree is still walked: the shape is the catalogue's,
    // and eliding it would show a reader a graph they do not have.
    children: self.inherits.map((parent, index) => nodeOf(parent, `${path}.${index}`, seen)),
    repeated,
  };
};
