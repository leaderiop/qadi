/**
 * The entity being authorized.
 *
 * `permissions` is a pre-flattened set of `"resource:action"` keys so that a
 * `HasPermission` check is O(1) and needs no role traversal at evaluation time.
 * Role inheritance is resolved once, when the subject is built.
 */
import type { PermissionKey } from "./Permission.ts";
import { permissionKey } from "./Permission.ts";
import type { Permission } from "./Permission.ts";
import type { Role } from "./Role.ts";
import { flattenAll, roleNames } from "./Role.ts";

export interface AuthSubject {
  readonly id: string;
  /** Every role name the subject holds, including inherited ones. */
  readonly roles: ReadonlySet<string>;
  /** Pre-flattened `"resource:action"` keys. */
  readonly permissions: ReadonlySet<PermissionKey>;
  readonly attributes: Readonly<Record<string, unknown>>;
}

/** Builds a subject from explicit permission keys. */
export const makeSubject = (config: {
  readonly id: string;
  readonly roles?: Iterable<string>;
  readonly permissions?: Iterable<PermissionKey>;
  readonly attributes?: Readonly<Record<string, unknown>>;
}): AuthSubject => ({
  id: config.id,
  roles: new Set(config.roles ?? []),
  permissions: new Set(config.permissions ?? []),
  attributes: config.attributes ?? {},
});

/**
 * Builds a subject from roles, flattening inherited permissions and role names.
 *
 * Both the role set and the permission set are transitive, so a subject holding
 * `Admin` (which inherits `Editor`) satisfies `hasRole("Editor")` as well.
 */
export const fromRoles = (config: {
  readonly id: string;
  readonly roles: ReadonlyArray<Role>;
  readonly permissions?: ReadonlyArray<Permission>;
  readonly attributes?: Readonly<Record<string, unknown>>;
}): AuthSubject => {
  const names = new Set<string>();
  for (const r of config.roles) for (const n of roleNames(r)) names.add(n);

  const keys = new Set<PermissionKey>(flattenAll(config.roles));
  for (const p of config.permissions ?? []) keys.add(permissionKey(p));

  return {
    id: config.id,
    roles: names,
    permissions: keys,
    attributes: config.attributes ?? {},
  };
};

/** An unauthenticated subject holding nothing. */
export const anonymous: AuthSubject = {
  id: "anonymous",
  roles: new Set(),
  permissions: new Set(),
  attributes: {},
};

/** A copy of the subject with additional attributes merged in. */
export const withAttributes = (
  self: AuthSubject,
  attributes: Readonly<Record<string, unknown>>,
): AuthSubject => ({
  ...self,
  attributes: { ...self.attributes, ...attributes },
});
