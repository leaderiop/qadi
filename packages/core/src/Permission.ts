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
import * as Record from "effect/Record";
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
 * A string literal type containing `:`, rejected to `never`.
 *
 * A non-literal `string` is never assignable to the `` `${string}:${string}` ``
 * pattern, so this only ever rejects a literal that actually contains a
 * colon — a variable typed as plain `string` (a dynamically constructed
 * segment) passes through unconstrained, exactly as {@link permission}'s own
 * doc explains.
 */
type NoColon<S extends string> = S extends `${string}:${string}` ? never : S;

/**
 * Builds a permission token, preserving literal types.
 *
 * Total by design: segment validity is enforced at the trust boundary by
 * {@link PermissionSchema} during decoding, not here. Callers writing a colon
 * literal in source — `permission("a:b", "c")` — get a compile error instead:
 * `NoColon` rejects a `TResource`/`TAction` inferred as a literal containing
 * `:` to `never`, so the argument is no longer assignable. A segment built at
 * runtime from a non-literal `string` carries no such guarantee and must go
 * through {@link PermissionSchema} to be validated — this constrains only
 * what the compiler can see.
 */
export const permission = <const TResource extends string, const TAction extends string>(
  resource: NoColon<TResource>,
  action: NoColon<TAction>,
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
  // `Record.fromIterableWith`, not the `Record.fromIterable` AGENTS.md's issue
  // #107 originally named — that exact export does not exist in
  // `effect@4.0.0-rc.112`'s `effect/Record`; `fromIterableWith` is the real API
  // for "project each element to a `[key, value]` pair", which is what this
  // needs since the value (`permission(resource, action)`) is derived, not the
  // source element itself the way `fromIterableBy` (key only) would assume.
  return Record.fromIterableWith(actions, (action) => [action, permission(resource, action)]);
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
