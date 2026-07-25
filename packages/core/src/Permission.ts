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
 */
const SEGMENT_PATTERN = /^[^:]+$/;

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
