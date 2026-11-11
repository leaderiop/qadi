/**
 * The `/__permissions` route: the registry as a guarded, or explicitly unguarded, devtools route.
 *
 * Moved out of `PermissionRegistry.ts` by ARCH-75. The guarded route is an
 * `addGuardedRoute` caller and `addGuardedRoute` writes to `PermissionRegistry`, so
 * keeping both in one module closed an import cycle (ADR-QD-037). A sibling of
 * `DecisionStreamRoute.ts` and `DecisionBacklogRoute.ts`, which are the same kind of
 * caller.
 */
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import type { Permission, Policy } from "@qadi/core";
import { devtoolsPath } from "./DevtoolsRouteAddress.ts";
import type { DevtoolsRouteOptions } from "./DevtoolsRouteAddress.ts";
import { addGuardedRoute } from "./GuardRoute.ts";
import { PermissionRegistry } from "./PermissionRegistry.ts";
import { unguardedRoutes } from "./UnguardedRoute.ts";

/**
 * The introspection payload: every permission registered with `PermissionRegistry`
 * (by `addGuardedRoute`, by `guardApi` for an `HttpApi`, or by a caller's own
 * `PermissionRegistry.register`), and the routes that require it.
 *
 * `jsonUnsafe` rather than `json`, and safely: every value here is a string this
 * module put in the registry itself — a permission key, a method, a path, a
 * group — so there is nothing unserializable to fail on, and the fallible
 * encoder would only add an error channel the routes below then have to answer
 * for.
 */
const snapshotResponse = Effect.map(PermissionRegistry.snapshot, (data) =>
  HttpServerResponse.jsonUnsafe(
    HashMap.toEntries(data).map(([permission, endpoints]) => ({ permission, endpoints })),
  ),
);

/**
 * The `/__permissions` introspection route, **behind a policy**, at
 * `devtoolsPath("permissions", options.prefix)` (`/__permissions` by default).
 *
 * This route publishes the application's entire authorization topology: every
 * guarded path, and the permission each one requires. That is a map of what to
 * attack and where, and it previously shipped as a bare `PermissionRegistryRoute`
 * constant with no guard of its own — so mounting it, which the overview
 * presented as ordinary wiring, served that map to anonymous callers.
 *
 * A route describing authorization that is not itself authorized inverts the
 * posture the rest of this package is built on, so the guard is not optional. A
 * caller who genuinely wants it open says so with
 * {@link permissionRegistryRouteUnguarded}, which is the same
 * declare-do-not-infer rule [BEH-QD-174](../../../spec/behaviors/23-http.md)
 * applies to endpoints.
 *
 * Enforced through `addGuardedRoute`, so a denial is a 403 and a broken attribute
 * store is a 502 — the introspection route obeys the same status mapping every
 * other guarded route does rather than inventing one.
 *
 * Registers its own permission with `PermissionRegistry`, the same as every
 * other guarded route here — otherwise this route's own payload, which
 * claims to list every permission registered with `PermissionRegistry`, and the
 * routes that require it, would omit the one route guaranteed to require a
 * permission: itself.
 *
 * Built on `addGuardedRoute` rather than hand-rolling the same
 * `HttpRouter.add` + `Layer.effectDiscard(PermissionRegistry.register(...))`
 * shape again — this route is exactly one more `addGuardedRoute` caller, not
 * a special case.
 */
export const permissionRegistryRoute = <P extends Permission>(
  permission: P,
  policy: Policy,
  options?: DevtoolsRouteOptions,
) =>
  addGuardedRoute("GET", devtoolsPath("permissions", options?.prefix), permission, policy)(
    () => snapshotResponse,
  );

/**
 * The `/__permissions` route with **no** guard, which must be chosen explicitly. It
 * answers at `devtoolsPath("permissions", options.prefix)`, `/__permissions` by default.
 *
 * The `reason` is never read. It exists so that publishing the authorization
 * topology unauthenticated is something a reviewer can see somebody decided —
 * the same role `publicEndpoint(reason)` plays for an endpoint.
 *
 * Logged at warning level on every request (`announce: "every-request"`), not
 * once at construction as the port routes are: a local development choice that
 * reaches production should be visible in the logs of the environment it is
 * wrong in, not only in the one where it was made (BEH-QD-180). The warning text
 * and the cadence dispatch are `unguardedRoutes`' (`UnguardedRoute.ts`). The
 * warning names the path actually served, prefix included: a warning about an
 * unguarded route that names the wrong address cannot be acted on.
 */
export const permissionRegistryRouteUnguarded = (reason: string, options?: DevtoolsRouteOptions) => {
  const path = devtoolsPath("permissions", options?.prefix);
  return unguardedRoutes(
    {
      what: path,
      consequence: "the full authorization topology is public",
      reason,
      announce: "every-request",
    },
    [{ method: "GET", path, handler: snapshotResponse }],
  );
};
