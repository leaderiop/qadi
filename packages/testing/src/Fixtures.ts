/**
 * Ready-made subjects, permissions and policies for tests.
 *
 * Deliberately small and boring: fixtures exist so a test can say what it is
 * about, not to model a realistic domain.
 */
import { fromRoles, makeSubject, permission, role } from "@qadi/core";
import type { AuthSubject, Permission, Policy, Role } from "@qadi/core";
import { allOf, anyOf, hasPermission, hasRole } from "@qadi/core";

export const permissions = {
  readDoc: permission("doc", "read"),
  writeDoc: permission("doc", "write"),
  deleteDoc: permission("doc", "delete"),
} as const satisfies Record<string, Permission>;

/**
 * `editor` and `admin` are getters, not plain values like `viewer`, solely to
 * break the forward reference each needs to a sibling role that has not
 * finished being defined yet in this same object literal.
 *
 * **Not reference-stable.** Each access calls `role({...})` afresh, so
 * `roles.editor !== roles.editor` even though the two are structurally equal.
 * This is harmless today: `hasRole` (`@qadi/core`'s `Policy.ts`) matches by
 * the role's `name` string, never by object identity, and nothing in this
 * package's tests compares a fixture role with `===`. If a future test needs
 * the same `Role` object across accesses — e.g. to exercise
 * `flattenPermissions`'s identity-keyed diamond collapsing (see the doc
 * comment on that function in `@qadi/core`'s `Role.ts`) — memoize into a
 * local `const` instead of relying on these getters.
 */
export const roles = {
  viewer: role({ name: "viewer", permissions: [permissions.readDoc] }),
  get editor(): Role {
    return role({
      name: "editor",
      permissions: [permissions.writeDoc],
      inherits: [roles.viewer],
    });
  },
  get admin(): Role {
    return role({
      name: "admin",
      permissions: [permissions.deleteDoc],
      inherits: [roles.editor],
    });
  },
};

/** A subject holding nothing. Every policy denies. */
export const nobody: AuthSubject = makeSubject({ id: "nobody" });

/** A subject holding every fixture permission via the admin role. */
export const administrator: AuthSubject = fromRoles({
  id: "admin-1",
  roles: [roles.admin],
});

/** A read-only subject. */
export const viewer: AuthSubject = fromRoles({ id: "viewer-1", roles: [roles.viewer] });

/** Builds a subject with explicit grants. */
export const subjectWith = (config: {
  readonly id?: string;
  readonly roles?: ReadonlyArray<string>;
  readonly permissions?: ReadonlyArray<`${string}:${string}`>;
  readonly attributes?: Readonly<Record<string, unknown>>;
}): AuthSubject =>
  makeSubject({
    id: config.id ?? "test-subject",
    roles: config.roles ?? [],
    permissions: config.permissions ?? [],
    attributes: config.attributes ?? {},
  });

export const policies = {
  canRead: hasPermission(permissions.readDoc),
  canWrite: hasPermission(permissions.writeDoc),
  isAdmin: hasRole("admin"),
  canReadAndWrite: allOf([
    hasPermission(permissions.readDoc),
    hasPermission(permissions.writeDoc),
  ]),
  adminOrReader: anyOf([hasRole("admin"), hasPermission(permissions.readDoc)]),
} as const satisfies Record<string, Policy>;
