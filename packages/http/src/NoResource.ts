/**
 * The placeholder resource the edge evaluates before any real one exists, and the
 * loader that returns it. Internal: `NO_RESOURCE` is public through
 * `RequirePermission.ts`, and `loadNoResource` is the package's own default.
 */
import * as Effect from "effect/Effect";
import type { Resource } from "@qadi/core";

/**
 * The resource `RequirePermission` checks against: an empty one. This
 * middleware enforces the contract-level requirement an endpoint declares,
 * before any resource has been loaded — a resource-scoped re-check belongs in
 * the handler, via `@qadi/core`'s `guard` directly, as defense in depth.
 *
 * Empty, deliberately, rather than absent. A policy reading a resource
 * attribute here finds nothing and, for a positive matcher, **denies** (403);
 * the same policy evaluated with no resource at all *fails* with
 * `MissingResource` (500), reporting a caller's request as a server fault.
 * This comment described the former while `guard` did the latter, because the
 * resource never reached evaluation — see `guard` in `@qadi/core`.
 *
 * **That "denies" claim used not to hold for a negative matcher, and now
 * does.** `Neq` (or any matcher built on it) compared against an attribute
 * this empty resource does not have used to resolve the comparison against
 * `undefined` and read `undefined` as unequal to anything — so the matcher
 * was *true* and the policy **allowed**, the exact
 * [INV-QD-032](../../../spec/invariants.md#inv-qd-032-a-guarded-resource-is-the-evaluated-resource)
 * hazard: a resource-scoped policy meant to refuse a mismatch, evaluated
 * against no resource at all, quietly permitted instead. `Neq` now denies on
 * an absent operand the same way every other matcher already did (H2,
 * CCR-QD-112), so this middleware's `NO_RESOURCE` placeholder now denies a
 * resource-attribute-referencing policy of either polarity, not just a
 * positive one. This middleware still runs before any resource is loaded,
 * though, so a policy meant to *allow* based on the real resource's
 * attributes cannot be satisfied here regardless — a resource-scoped
 * re-check in the handler, via `@qadi/core`'s `guard` directly against the
 * real resource, remains the correct way to evaluate such a policy for
 * real, not merely defense in depth against a hazard that no longer exists.
 *
 * Exported, and the value `authorizeRequest`'s default loader returns, so
 * `RequirePermission`, `DecisionStreamRoute.ts` and `PermissionRegistry.ts`'s
 * `permissionRegistryRoute` share this exact placeholder rather than each
 * reimplementing `() => Effect.succeed({})` as their own `loadResource` — all
 * of them evaluate before any real resource exists, for the same
 * `Neq`-denies-on-absence reasoning this comment gives.
 */
export const NO_RESOURCE: Resource = {};


/**
 * `authorizeRequest`'s default loader, and the `loadResource` of every route
 * that evaluates before a resource exists. Not in the barrel: a caller of
 * `authorizeRequest` omits `loadResource` instead of naming it.
 */
export const loadNoResource = (): Effect.Effect<Resource> => Effect.succeed(NO_RESOURCE);
