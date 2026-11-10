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
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import { CircularRoleInheritance, DuplicateRoleDefinition } from "./Errors.ts";
import type { Permission, PermissionKey } from "./Permission.ts";
import { permissionKey } from "./Permission.ts";
import { traverseRoles, visitRoles } from "./RoleTraversal.ts";

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
 * One step of a {@link roleWalk}: a role reached for the first time, or an edge
 * into a role already reached.
 *
 * `index` is the step's position in the walk, `depth` its distance from the
 * queried role, and `parent` the index of the step that reached it (`undefined`
 * for the queried role itself). A `Revisit` names the index of the role's
 * `Visit` in `first` instead of walking its parents again. Links are indices,
 * not address strings: an address per step totals quadratic size on a deep chain.
 */
export type RoleStep = Data.TaggedEnum<{
  Visit: {
    readonly role: Role;
    readonly index: number;
    readonly depth: number;
    readonly parent: number | undefined;
  };
  Revisit: {
    readonly role: Role;
    readonly index: number;
    readonly depth: number;
    readonly parent: number | undefined;
    readonly first: number;
  };
}>;

/** Constructors and `$is`/`$match` for {@link RoleStep}. */
export const RoleStep = Data.taggedEnum<RoleStep>();

/**
 * The role walk: every role reachable from `self`, once, in the order that decides
 * which inheritance path is reported, with every second route to a role marked.
 *
 * The walk is pre-order with parents in `inherits` order, so the first path to
 * reach a role wins, as {@link permissionProvenance} reports it (INV-QD-038). It
 * keys on object identity, so two distinct roles sharing a `name` are two visits,
 * and it is iterative, so a chain tens of thousands deep does not overflow the
 * stack. It is public because a reader of the graph (`@qadi/devtools`'s role
 * tree) must draw the same walk that grants, not a fifth copy of it: the copies
 * this replaces drifted twice (ticket 86, and the name-to-identity keying fix).
 */
export const roleWalk = (self: Role): ReadonlyArray<RoleStep> => {
  const steps: Array<RoleStep> = [];
  traverseRoles([self], (role, index, depth, parent, first) => {
    steps.push(
      first === undefined
        ? RoleStep.Visit({ role, index, depth, parent })
        : RoleStep.Revisit({ role, index, depth, parent, first }),
    );
  });
  return steps;
};

/**
 * All permission keys granted by any of the given roles, including inherited
 * ones: a projection of the role walk over every root at once.
 *
 * One walk with one visited set, so a role shared by two of `roles` is visited
 * once rather than once per root, and contributes its permissions once. The
 * walk keys on identity and is iterative (`RoleTraversal.ts`), so two
 * same-named roles are both read and a long chain does not overflow the stack.
 */
export const flattenAll = (roles: ReadonlyArray<Role>): ReadonlySet<PermissionKey> => {
  const keys = new Set<PermissionKey>();
  visitRoles(roles, (role) => {
    for (const p of role.permissions) keys.add(permissionKey(p));
  });
  return keys;
};

/**
 * All permission keys granted by a role, including inherited ones.
 *
 * A projection of the role walk ({@link flattenAll} over the one root): each
 * visit adds the role's own keys, and no path is built, because this runs once
 * per subject on every request. It reads the same visits
 * {@link permissionProvenance} does, so the two report the same set by
 * construction (INV-QD-038).
 */
export const flattenPermissions = (self: Role): ReadonlySet<PermissionKey> => flattenAll([self]);

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
 * A projection of the role walk, as {@link flattenPermissions} is: the same
 * visits in the same order, so the permissions reported here are exactly the
 * set `flattenPermissions` returns, by construction rather than by a test
 * (INV-QD-038). A screen built on this cannot show a different set from the one
 * that decides. The walk's order is observable here: grants come in walk order,
 * and a role reached twice is reported once, by the path the walk reached first.
 *
 * **Only this projection builds paths.** `flattenPermissions` runs inside
 * `fromRoles`, once per subject, and allocating a path per permission there
 * would make every request pay for what only an explorer wants.
 *
 * **The path is a linked list while walking, not a copied array.** Each visit
 * conses one `PathLink` onto its parent step's link, in O(1); copying the path
 * so far at every step would total O(n²) on a chain of depth *n*. A path is
 * flattened to the `ReadonlyArray<string>` `PermissionGrant.path` wants once,
 * and only for a role that has permissions to report.
 */
export const permissionProvenance = (self: Role): ReadonlyArray<PermissionGrant> => {
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

  const grants: Array<PermissionGrant> = [];
  // Indexed by step, with a hole at each revisit. A step's `parent` is always a
  // visit, since only a visit's parents are walked, so its link is set.
  const links: Array<PathLink> = [];

  visitRoles([self], (role, index, parent) => {
    const here: PathLink = { name: role.name, parent: parent === undefined ? undefined : links[parent] };
    links[index] = here;
    if (role.permissions.length > 0) {
      const path = toPath(here);
      for (const p of role.permissions) {
        grants.push({ permission: permissionKey(p), grantedBy: role.name, path });
      }
    }
  });

  return grants;
};

/**
 * The transitive set of role names a role stands for, including its own.
 *
 * A projection of the role walk: each visit adds its role's name. The walk keys
 * on identity, so two distinct roles sharing a `name` are both walked and a role
 * reachable only through the second one is still reached.
 */
export const roleNames = (self: Role): ReadonlySet<string> => {
  const names = new Set<string>();
  visitRoles([self], (role) => {
    names.add(role.name);
  });
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
  // already trampolined and does not grow the JS stack, unlike a direct
  // recursion over `inherits` would (see `RoleTraversal.ts`). (Ticket 86.)
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
      // every name reaching here came from an `inherits` list — never a
      // top-level definition name, which would instead have hit the
      // `existing`/`resolved` check above. There is no narrower guard to
      // write here.
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
