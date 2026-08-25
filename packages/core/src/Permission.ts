/**
 * Permission tokens.
 *
 * A permission is a `resource` + `action` pair. Literal type parameters are
 * preserved so `Permission<"doc", "read">` and `Permission<"doc", "write">` are
 * structurally incompatible at compile time.
 *
 * The runtime lookup key is `` `${resource}:${action}` ``. Because that key is
 * used for O(1) set membership against a subject, `:` is forbidden inside
 * either segment — otherwise `{ resource: "a:b", action: "c" }` and
 * `{ resource: "a", action: "b:c" }` would collide on the same key and grant
 * each other's permissions. The predecessor did not enforce this.
 */
import * as Schema from "effect/Schema";

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

/**
 * A permission segment: at least one character, no `:`.
 *
 * Non-empty and colon-free in a single constraint — an empty segment would make
 * `":read"` and `"doc:"` valid keys, and a colon would make the key ambiguous.
 *
 * Exported so other domain strings needing the same shape of constraint — a
 * `Policy`-ADT field branded via `Schema.brand`, say — validate against the
 * same rule rather than a hand-copied one that could drift from it.
 */
export const SEGMENT_PATTERN = /^[^:]+$/;

/** True when a segment is usable as half of a permission key. */
export const isValidSegment = (value: string): boolean => SEGMENT_PATTERN.test(value);

/**
 * Builds a permission token, preserving literal types.
 *
 * Total by design: segment validity is enforced at the trust boundary by
 * {@link PermissionSchema} during decoding, not here. Callers writing literals
 * in source get the compile-time guarantee instead.
 */
export const permission = <const TResource extends string, const TAction extends string>(
  resource: TResource,
  action: TAction,
): Permission<TResource, TAction> => ({ resource, action });

/** Formats a permission as its runtime lookup key. */
export const permissionKey = <TResource extends string, TAction extends string>(
  self: Permission<TResource, TAction>,
): PermissionKey<TResource, TAction> => `${self.resource}:${self.action}`;

/** One resource's actions, each mapped to its own {@link Permission} token. */
export type PermissionGroup<TResource extends string, TActions extends ReadonlyArray<string>> = {
  readonly [K in TActions[number]]: Permission<TResource, K>;
};

/**
 * Builds a `Permission` per action for one resource, keyed by action name.
 *
 * Ergonomics only: `createPermissionGroup("doc", ["read", "write"])` is
 * `{ read: permission("doc", "read"), write: permission("doc", "write") }`
 * spelled once instead of once per action. Segment validity is unchecked
 * here for the same reason `permission` leaves it unchecked above — enforced
 * at the trust boundary by {@link PermissionSchema}, not at construction.
 *
 * The public overload preserves literal types via `const` type parameters;
 * the implementation signature below is intentionally wider; only the
 * overload above is visible to callers.
 *
 * Named `createPermissionGroup`, not `makePermissionGroup` (AGENTS.md §8's
 * documented builder prefix): this is the exact identifier two independent
 * `wayfinder:map` issues used for this out-of-scope, build-directly item —
 * keeping it lets a reader land on this export from either map's text.
 */
export function createPermissionGroup<
  const TResource extends string,
  const TActions extends ReadonlyArray<string>,
>(resource: TResource, actions: TActions): PermissionGroup<TResource, TActions>;
export function createPermissionGroup(
  resource: string,
  actions: ReadonlyArray<string>,
): Record<string, Permission<string, string>> {
  const result: Record<string, Permission<string, string>> = {};
  for (const action of actions) {
    result[action] = permission(resource, action);
  }
  return result;
}

/**
 * Wire format for a permission.
 *
 * Encoded as a struct rather than a joined `"resource:action"` string so that
 * decoding needs no delimiter parsing — the predecessor split on the first
 * colon, which silently mangled any segment containing one.
 */
export const PermissionSchema = Schema.Struct({
  resource: Schema.String.check(Schema.isPattern(SEGMENT_PATTERN)),
  action: Schema.String.check(Schema.isPattern(SEGMENT_PATTERN)),
});

/** Infers the resource segment of a permission type. */
export type InferResource<P extends Permission> = P extends Permission<infer R, string> ? R
  : never;

/** Infers the action segment of a permission type. */
export type InferAction<P extends Permission> = P extends Permission<string, infer A> ? A
  : never;

/** Infers the formatted key of a permission type. */
export type InferKey<P extends Permission> = P extends Permission<infer R, infer A>
  ? PermissionKey<R, A>
  : never;
