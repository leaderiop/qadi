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
import { CircularRoleInheritance, DuplicateRoleDefinition } from "./Errors.ts";
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
 *
 * **The visited set is keyed on identity, not on `name`.** Two distinct `Role`
 * objects that happen to share a `name` are not the same role — a by-value
 * graph has no registry forbidding it, unlike the name-indexed catalogues
 * {@link resolveRoleGraph} resolves. Keying on `name` treated the second one as
 * already visited and silently dropped its permissions from the result; keying
 * on the object itself still collapses a true diamond (the same reference
 * reached by two paths) while visiting two same-named-but-distinct roles
 * separately, as their differing permissions require.
 *
 * **Iterative, with an explicit stack.** The result is a `Set`, so the order
 * roles are visited in is not observable — only which ones are, which the
 * identity-keyed `seen` set still governs exactly as a recursive walk would.
 * A direct recursion here overflows the native call stack on a long
 * inheritance chain; an explicit array does not, since it lives on the heap
 * rather than growing a call frame per level. (Ticket 86.)
 */
export const flattenPermissions = (self: Role): ReadonlySet<PermissionKey> => {
  const keys = new Set<PermissionKey>();
  const seen = new Set<Role>();
  const stack: Array<Role> = [self];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const p of current.permissions) keys.add(permissionKey(p));
    for (const parent of current.inherits) stack.push(parent);
  }

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
 * depth-first order reached first — "reachable twice" meaning the same object
 * reached by two paths, not merely two roles sharing a `name`; the visited set
 * is keyed on identity for the same reason `flattenPermissions`'s is.
 *
 * **Iterative, with an explicit stack of frames.** Unlike `flattenPermissions`,
 * the *order* of `grants` is observable (it is what makes "first path wins"
 * meaningful), so this cannot just push work onto a stack and pop in whatever
 * order comes out — it has to reproduce the exact pre-order, depth-first,
 * parents-in-array-order traversal a direct recursion would do. Each frame
 * tracks the role it is visiting and which of its parents to descend into
 * next; a parent is only pushed as a new frame — and only then are its own
 * grants recorded — the first time it is reached, so an already-`seen` parent
 * is skipped without disturbing the current frame's position. That reproduces
 * the recursive call stack without using one, which a very deep chain would
 * overflow. (Ticket 86.)
 *
 * **The path itself is a linked list while walking, not a copied array.** The
 * recursive version's `here = [...path, current.name]` copies the whole
 * path-so-far at every node; on a chain of depth *n* that is *n* copies whose
 * lengths sum to O(n²) — invisible at any depth the native call stack could
 * reach, but the first thing this rewrite would hit once the stack limit was
 * no longer the thing stopping it. `PathLink` instead conses in O(1), and a
 * path is only flattened to the `ReadonlyArray<string>` `PermissionGrant.path`
 * wants — once — for a role that actually has permissions to report.
 */
export const permissionProvenance = (self: Role): ReadonlyArray<PermissionGrant> => {
  const grants: Array<PermissionGrant> = [];
  const seen = new Set<Role>();

  interface PathLink {
    readonly name: string;
    readonly parent: PathLink | undefined;
  }

  const toPath = (link: PathLink): ReadonlyArray<string> => {
    const names: Array<string> = [];
    for (let node: PathLink | undefined = link; node !== undefined; node = node.parent) {
      names.push(node.name);
    }
    names.reverse();
    return names;
  };

  interface Frame {
    readonly role: Role;
    readonly here: PathLink;
    nextParentIndex: number;
  }

  // Marks `role` visited, records its own grants under `path`, and returns the
  // frame to push — or `undefined` if it was already visited, mirroring the
  // recursive `visit`'s early `if (seen.has(current)) return`.
  const enter = (role: Role, parentLink: PathLink | undefined): Frame | undefined => {
    if (seen.has(role)) return undefined;
    seen.add(role);
    const here: PathLink = { name: role.name, parent: parentLink };
    if (role.permissions.length > 0) {
      const path = toPath(here);
      for (const p of role.permissions) {
        grants.push({ permission: permissionKey(p), grantedBy: role.name, path });
      }
    }
    return { role, here, nextParentIndex: 0 };
  };

  const stack: Array<Frame> = [];
  const rootFrame = enter(self, undefined);
  if (rootFrame !== undefined) stack.push(rootFrame);

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame === undefined) break;

    if (frame.nextParentIndex >= frame.role.inherits.length) {
      stack.pop();
      continue;
    }

    const parent = frame.role.inherits[frame.nextParentIndex];
    frame.nextParentIndex += 1;
    if (parent === undefined) continue;

    const parentFrame = enter(parent, frame.here);
    if (parentFrame !== undefined) stack.push(parentFrame);
  }

  return grants;
};

/** All permission keys granted by any of the given roles. */
export const flattenAll = (roles: ReadonlyArray<Role>): ReadonlySet<PermissionKey> => {
  const keys = new Set<PermissionKey>();
  for (const r of roles) for (const k of flattenPermissions(r)) keys.add(k);
  return keys;
};

/**
 * The transitive set of role names a role stands for, including its own.
 *
 * Walked with an identity-keyed visited set, like {@link flattenPermissions} —
 * two distinct `Role` objects sharing a `name` are still two roles to walk, so
 * a role reachable only through the second one is not skipped just because its
 * name was already added to the result.
 *
 * Iterative for the same reason as {@link flattenPermissions}: the result is a
 * `Set`, so traversal order is not observable and an explicit stack can pop in
 * whatever order it likes, but a direct recursion would still overflow the
 * native call stack on a very deep chain. (Ticket 86.)
 */
export const roleNames = (self: Role): ReadonlySet<string> => {
  const names = new Set<string>();
  const seen = new Set<Role>();
  const stack: Array<Role> = [self];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    if (seen.has(current)) continue;
    seen.add(current);
    names.add(current.name);
    for (const parent of current.inherits) stack.push(parent);
  }

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
 * This is the only place a cycle or a duplicate name is representable, so it is
 * the only place that can fail on either. An unknown parent name is treated as
 * a cycle-free no-op rather than an error: partial role catalogues are a normal
 * deployment state, and failing closed here would deny every request rather
 * than merely granting less.
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
 *
 * **A repeated definition name fails outright, rather than being reported.**
 * `byName` used to be built with a `Map`, so the last definition for a repeated
 * name silently won and every earlier definition's permissions vanished with
 * nothing said. Unlike an unknown parent, there is no defensible "grant less"
 * reading here — the two definitions disagree about what the name means, and
 * silently picking one is a guess this library should not make. It fails with
 * {@link DuplicateRoleDefinition} before any resolution happens, naming every
 * repeated name at once.
 */
export const resolveRoleGraph = Effect.fn("qadi.resolveRoleGraph")(function* (
  definitions: ReadonlyArray<RoleDefinition>,
  options?: {
    /** Called with every parent name no definition supplied. Replaces the log. */
    readonly onUnknownParent?: (names: ReadonlyArray<string>) => void;
  },
) {
  const nameCounts = new Map<string, number>();
  for (const definition of definitions) {
    nameCounts.set(definition.name, (nameCounts.get(definition.name) ?? 0) + 1);
  }
  const duplicateNames = [...nameCounts]
    .filter(([, count]) => count > 1)
    .map(([name]) => name)
    .sort();
  if (duplicateNames.length > 0) {
    return yield* Effect.fail(new DuplicateRoleDefinition({ names: duplicateNames }));
  }

  const byName = new Map(definitions.map((d) => [d.name, d]));
  const resolved = new Map<string, Role>();
  const unknownParents = new Set<string>();

  // `ancestors` is the current DFS path, shared and mutated across the whole
  // recursion rather than copied at each level: a name is added on entry and
  // removed once its own recursion into its parents has finished, so a check
  // is `Set#has` rather than `Array#includes` scanning the whole path — O(1)
  // instead of O(depth) per call, which made the walk O(depth²) on a long
  // inheritance chain. This is stack *content*, not the native call stack —
  // `resolveRoleGraph`'s own recursion through `Effect.gen`/`yield*` is
  // already trampolined and does not grow the JS stack, unlike the three
  // walkers above. (Ticket 86.)
  const visit = (
    name: string,
    ancestors: Set<string>,
  ): Effect.Effect<Role | undefined, CircularRoleInheritance> => {
    const existing = resolved.get(name);
    if (existing !== undefined) return Effect.succeed(existing);

    if (ancestors.has(name)) {
      return Effect.fail(
        new CircularRoleInheritance({ roleName: name, cycle: [...ancestors, name] }),
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
      ancestors.add(name);
      const parents: Array<Role> = [];
      for (const parentName of definition.inherits ?? []) {
        const parent = yield* visit(parentName, ancestors);
        if (parent !== undefined) parents.push(parent);
      }
      ancestors.delete(name);
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
    const built = yield* visit(definition.name, new Set());
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
