/**
 * Permission tokens.
 *
 * A permission is a `resource` + `action` pair. Literal type parameters are
 * preserved so `Permission<"doc", "read">` and `Permission<"doc", "write">`
 * are structurally incompatible at compile time.
 *
 * The runtime lookup key is `` `${resource}:${action}` ``. Because that key is
 * used for O(1) set membership on a subject, `:` is forbidden inside either
 * segment — otherwise `{ resource: "a:b", action: "c" }` and
 * `{ resource: "a", action: "b:c" }` would collide on the same key.
 */

/** The `"resource:action"` string used for subject permission lookup. */
export type PermissionKey<
  TResource extends string = string,
  TAction extends string = string,
> = `${TResource}:${TAction}`;

export interface Permission<
  TResource extends string = string,
  TAction extends string = string,
> {
  readonly resource: TResource;
  readonly action: TAction;
}

/** Builds a permission token, preserving literal types. */
export const permission = <const TResource extends string, const TAction extends string>(
  resource: TResource,
  action: TAction,
): Permission<TResource, TAction> => ({ resource, action });

/** Formats a permission as its runtime lookup key. */
export const permissionKey = <TResource extends string, TAction extends string>(
  self: Permission<TResource, TAction>,
): PermissionKey<TResource, TAction> => `${self.resource}:${self.action}`;

/** Infers the resource segment of a permission type. */
export type InferResource<P extends Permission> =
  P extends Permission<infer R, string> ? R : never;

/** Infers the action segment of a permission type. */
export type InferAction<P extends Permission> = P extends Permission<string, infer A> ? A
  : never;
