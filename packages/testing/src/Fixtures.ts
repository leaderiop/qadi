/**
 * Ready-made subjects, permissions and policies for tests.
 *
 * Deliberately small and boring: fixtures exist so a test can say what it is
 * about, not to model a realistic domain.
 */
import { fromRoles, makeSubject, permission, role } from "@guard/core";
import type { AuthSubject, Permission, Policy, Role } from "@guard/core";
import { allOf, anyOf, hasPermission, hasRole } from "@guard/core";

export const permissions = {
  readDoc: permission("doc", "read"),
  writeDoc: permission("doc", "write"),
  deleteDoc: permission("doc", "delete"),
} as const satisfies Record<string, Permission>;

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
