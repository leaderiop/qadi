/**
 * Random role graphs for the role-walk properties (INV-QD-038, `roleWalk`).
 *
 * Each role inherits only roles built before it, so the graph is acyclic by
 * construction. Parents are drawn with repetition, so a diamond (one object
 * reached by two paths) is common; names are drawn partly from a two-name pool,
 * so distinct objects sharing a name are common too. The queried role is the
 * last one built, so some roles are unreachable from it.
 */
import * as FastCheck from "fast-check";
import { permission } from "../src/Permission.ts";
import type { Permission } from "../src/Permission.ts";
import { role } from "../src/Role.ts";
import type { Role } from "../src/Role.ts";

const permissionPool: ReadonlyArray<Permission> = [
  permission("doc", "read"),
  permission("doc", "write"),
  permission("doc", "publish"),
  permission("org", "admin"),
];

interface RoleSpec {
  readonly parents: ReadonlyArray<number>;
  readonly sharedName: "editor" | "viewer" | null;
  readonly permissions: ReadonlyArray<Permission>;
}

const roleSpec: FastCheck.Arbitrary<RoleSpec> = FastCheck.record({
  parents: FastCheck.array(FastCheck.nat(), { maxLength: 4 }),
  sharedName: FastCheck.option(FastCheck.constantFrom<"editor" | "viewer">("editor", "viewer")),
  permissions: FastCheck.subarray([...permissionPool]),
});

/** The queried role, and every role object built for it (reachable or not). */
export interface RoleGraph {
  readonly root: Role;
  readonly all: ReadonlyArray<Role>;
}

export const arbitraryRoleGraph: FastCheck.Arbitrary<RoleGraph> = FastCheck.array(roleSpec, {
  minLength: 5,
  maxLength: 40,
}).map((specs) => {
  const all: Array<Role> = [];
  for (const [i, spec] of specs.entries()) {
    const inherits = i === 0 ? [] : spec.parents.flatMap((p) => all[p % i] ?? []);
    all.push(
      role({ name: spec.sharedName ?? `r${i}`, permissions: spec.permissions, inherits }),
    );
  }
  const root = all[all.length - 1];
  if (root === undefined) throw new Error("minLength is 5");
  return { root, all };
});

/** The distinct role objects reachable from `root`, by a plain recursive walk. */
export const reachable = (root: Role): ReadonlySet<Role> => {
  const seen = new Set<Role>();
  const go = (r: Role): void => {
    if (seen.has(r)) return;
    seen.add(r);
    for (const parent of r.inherits) go(parent);
  };
  go(root);
  return seen;
};

/** A chain `depth` roles long, built with a loop so the fixture itself is stack-safe. */
export const chain = (depth: number): Role => {
  let current: Role = role({ name: "role-0", permissions: [permission("doc", "read")] });
  for (let i = 1; i < depth; i += 1) current = role({ name: `role-${i}`, inherits: [current] });
  return current;
};
