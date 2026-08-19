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
import { makeRoleName } from "./Policy.ts";
import type { RoleName } from "./Policy.ts";
import type { Role } from "./Role.ts";
import { flattenAll, roleNames } from "./Role.ts";

// `subject.roles.has(policy.role)` (`Evaluate.ts`) compares against
// `policy.role`, which is branded `RoleName` and validated at `Policy`'s
// `Schema` decode boundary — non-empty, no `:` (`Policy.ts`'s
// `SEGMENT_PATTERN`). Before this brand, `subject.roles` stayed plain
// `string`, so a subject could hold a role name — one containing `:`, say —
// that could never appear as a valid `Policy.role` at all, a mismatch
// nothing surfaced. Branding here with `Policy.ts`'s own `makeRoleName` —
// the same total (non-throwing) conversion `hasRole` itself uses, not a
// second independent one — makes both sides of that comparison the same
// validated vocabulary constructed the same way; the identity provider still
// supplies plain strings, and this conversion never fails.

export interface AuthSubject {
  readonly id: string;
  /** Every role name the subject holds, including inherited ones. */
  readonly roles: ReadonlySet<RoleName>;
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
  roles: new Set([...(config.roles ?? [])].map(makeRoleName)),
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
  const names = new Set<RoleName>();
  for (const r of config.roles) for (const n of roleNames(r)) names.add(makeRoleName(n));

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
