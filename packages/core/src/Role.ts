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
 */
export const resolveRoleGraph = Effect.fn("qadi.resolveRoleGraph")(function* (
  definitions: ReadonlyArray<RoleDefinition>,
) {
  const byName = new Map(definitions.map((d) => [d.name, d]));
  const resolved = new Map<string, Role>();

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
    if (definition === undefined) return Effect.succeed(undefined);

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
  return out;
});
