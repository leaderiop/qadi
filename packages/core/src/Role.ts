/**
 * Roles and inheritance.
 *
 * A role names a set of permissions and may inherit from other roles. Parents
 * are held **by value**, so a role cannot reference one that does not yet
 * exist — the inheritance graph is a DAG by construction and {@link
 * flattenPermissions} is total.
 *
 * The predecessor returned a `Result` from role construction to report cycles.
 * That error was unreachable for by-value graphs; it is needed only when a role
 * graph is reconstructed from serialized form, where parents are named rather
 * than referenced. That path lives in {@link resolveRoleGraph}.
 */
import * as Effect from "effect/Effect";
import { CircularRoleInheritance } from "./Errors.ts";
import type { Permission, PermissionKey } from "./Permission.ts";
import { permissionKey } from "./Permission.ts";

export interface Role<TName extends string = string> {
  readonly name: TName;
  readonly permissions: ReadonlyArray<Permission>;
  readonly inherits: ReadonlyArray<Role>;
}

/** Builds a role. Total: the by-value `inherits` list cannot form a cycle. */
export const role = <const TName extends string>(config: {
  readonly name: TName;
  readonly permissions?: ReadonlyArray<Permission>;
  readonly inherits?: ReadonlyArray<Role>;
}): Role<TName> => ({
  name: config.name,
  permissions: config.permissions ?? [],
  inherits: config.inherits ?? [],
});

/**
 * All permission keys granted by a role, including inherited ones.
 *
 * Depth-first with a visited set, so a diamond (two parents sharing a
 * grandparent) is walked once rather than exponentially.
 */
export const flattenPermissions = (self: Role): ReadonlySet<PermissionKey> => {
  const keys = new Set<PermissionKey>();
  const seen = new Set<string>();

  const visit = (current: Role): void => {
    if (seen.has(current.name)) return;
    seen.add(current.name);
    for (const p of current.permissions) keys.add(permissionKey(p));
    for (const parent of current.inherits) visit(parent);
  };

  visit(self);
  return keys;
};

/** One permission, and the inheritance path that granted it. */
export interface PermissionGrant {
  readonly permission: PermissionKey;
  /** The role whose own `permissions` list contains it. */
  readonly grantedBy: string;
  /**
   * Roles walked from the queried role to `grantedBy`, both included.
   *
   * A single-element path means the queried role granted it directly; anything
   * longer is inherited, and reads as "via …".
   */
  readonly path: ReadonlyArray<string>;
}

/**
 * Every permission a role grants, with the path that granted it.
 *
 * {@link flattenPermissions} computes exactly this and discards all of it — its
 * `visit` closure holds the granting role's name and calls `keys.add` without
 * it. So "own permissions tinted, inherited ones gray, with the path" could not
 * be answered by anything except a caller re-walking the graph and re-deriving a
 * traversal order that might not match.
 *
 * **Kept separate from `flattenPermissions` rather than replacing it.** That one
 * runs inside `makeSubject`, once per subject — per request, on a server — and
 * allocating a path array per permission there would make every caller pay for
 * what only an explorer wants. Two functions, one traversal shape.
 *
 * The two are held in agreement instead: the permissions reported here are
 * exactly the set `flattenPermissions` returns, asserted in `Role.test.ts`, so a
 * screen built on this cannot show a different set from the one that decides.
 *
 * Diamonds resolve the same way they do there — first path wins, by the shared
 * visited-set walk. A role reachable twice is reported once, by the route
 * depth-first order reached first.
 */
export const permissionProvenance = (self: Role): ReadonlyArray<PermissionGrant> => {
  const grants: Array<PermissionGrant> = [];
  const seen = new Set<string>();

  const visit = (current: Role, path: ReadonlyArray<string>): void => {
    if (seen.has(current.name)) return;
    seen.add(current.name);
    const here = [...path, current.name];
    for (const p of current.permissions) {
      grants.push({ permission: permissionKey(p), grantedBy: current.name, path: here });
    }
    for (const parent of current.inherits) visit(parent, here);
  };

  visit(self, []);
  return grants;
};

/** All permission keys granted by any of the given roles. */
export const flattenAll = (roles: ReadonlyArray<Role>): ReadonlySet<PermissionKey> => {
  const keys = new Set<PermissionKey>();
  for (const r of roles) for (const k of flattenPermissions(r)) keys.add(k);
  return keys;
};

/** The transitive set of role names a role stands for, including its own. */
export const roleNames = (self: Role): ReadonlySet<string> => {
  const names = new Set<string>();
  const visit = (current: Role): void => {
    if (names.has(current.name)) return;
    names.add(current.name);
    for (const parent of current.inherits) visit(parent);
  };
  visit(self);
  return names;
};

/** A role definition whose parents are named rather than referenced. */
export interface RoleDefinition {
  readonly name: string;
  readonly permissions?: ReadonlyArray<Permission>;
  readonly inherits?: ReadonlyArray<string>;
}

/**
 * Resolves name-referenced role definitions into by-value {@link Role} values.
 *
 * This is the only place a cycle is representable, so it is the only place that
 * can fail. An unknown parent name is treated as a cycle-free no-op rather than
 * an error: partial role catalogues are a normal deployment state, and failing
 * closed here would deny every request rather than merely granting less.
 *
 * **That drop is now reported.** Dropping is right; doing it silently was not.
 * A typo in one parent name produced a role granting fewer permissions than its
 * author wrote, with nothing said at any level — the same shape of defect
 * `dehydrateDecisions` had before it gained `onDropped`, and the same fix. The
 * names are logged at warning level, and `onUnknownParent` replaces that for a
 * caller who would rather alert on it.
 *
 * Reported once per resolve, with every unknown name, rather than once per
 * occurrence: a catalogue missing one widely-inherited role would otherwise
 * emit the same warning dozens of times and bury it.
 */
export const resolveRoleGraph = Effect.fn("qadi.resolveRoleGraph")(function* (
  definitions: ReadonlyArray<RoleDefinition>,
  options?: {
    /** Called with every parent name no definition supplied. Replaces the log. */
    readonly onUnknownParent?: (names: ReadonlyArray<string>) => void;
  },
) {
  const byName = new Map(definitions.map((d) => [d.name, d]));
  const resolved = new Map<string, Role>();
  const unknownParents = new Set<string>();

  const visit = (
    name: string,
    stack: ReadonlyArray<string>,
  ): Effect.Effect<Role | undefined, CircularRoleInheritance> => {
    const existing = resolved.get(name);
    if (existing !== undefined) return Effect.succeed(existing);

    if (stack.includes(name)) {
      return Effect.fail(
        new CircularRoleInheritance({ roleName: name, cycle: [...stack, name] }),
      );
    }

    const definition = byName.get(name);
    if (definition === undefined) {
      // Unconditionally a missing *parent*. `byName` is built from
      // `definitions` and the loop below only visits names drawn from it, so
      // every name reaching here came from an `inherits` list. A
      // `stack.length > 0` guard was written first and mutation testing removed
      // it with every test still passing — it was unreachable, not defensive.
      unknownParents.add(name);
      return Effect.succeed(undefined);
    }

    return Effect.gen(function* () {
      const parents: Array<Role> = [];
      for (const parentName of definition.inherits ?? []) {
        const parent = yield* visit(parentName, [...stack, name]);
        if (parent !== undefined) parents.push(parent);
      }
      const built: Role = {
        name: definition.name,
        permissions: definition.permissions ?? [],
        inherits: parents,
      };
      resolved.set(name, built);
      return built;
    });
  };

  const out: Array<Role> = [];
  for (const definition of definitions) {
    const built = yield* visit(definition.name, []);
    if (built !== undefined) out.push(built);
  }

  if (unknownParents.size > 0) {
    const names = [...unknownParents].sort();
    if (options?.onUnknownParent === undefined) {
      yield* Effect.logWarning("qadi: role definitions name parents that do not exist").pipe(
        Effect.annotateLogs({ "qadi.unknown_roles": names.join(",") }),
      );
    } else {
      options.onUnknownParent(names);
    }
  }

  return out;
});
