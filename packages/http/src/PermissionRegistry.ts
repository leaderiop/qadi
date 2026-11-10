/**
 * A queryable registry of which permission each endpoint requires, exposed
 * as the `/__permissions` introspection route.
 *
 * Populated from two mechanisms feeding one model, per ADR-QD-036 Rev 1.6:
 * `guardApi` (`GuardApi.ts`) registers its access plan's `Required`
 * endpoints (`AccessPlan.ts`) when the layer that provides `RequirePermission` is built, and
 * `addGuardedRoute` pushes a descriptor at the point a bare `HttpRouter`
 * route registers — forced apart only because `HttpApiEndpoint` carries an
 * annotation slot and a bare `HttpRouter.Route` does not. Each registers as a
 * consequence of guarding, never as a second call to remember. Both
 * write through the same `register` method on the same `Ref`-backed
 * `Context.Service`, ordered by `Layer` composition rather than a plain
 * mutable module-level collection, so the registry provably cannot be read
 * before every route that populates it has run.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServerRequest from "effect/http/HttpServerRequest";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import type { PathInput } from "effect/http/HttpRouter";
import type { Authorized, Permission, PermissionKey, Policy, Resource } from "@qadi/core";
import { permissionKey } from "@qadi/core";
import { loadNoResource } from "./NoResource.ts";
import { guardRoute } from "./GuardRoute.ts";
import type { HttpEnforcementFailure } from "./QadiHttpError.ts";
import { unguardedRoutes } from "./UnguardedRoute.ts";

/** One route that requires a permission, as recorded in `PermissionRegistry`. */
export interface EndpointDescriptor {
  readonly method: string;
  readonly path: string;
  readonly group: string | undefined;
}

export type PermissionRegistryData = HashMap.HashMap<PermissionKey, ReadonlyArray<EndpointDescriptor>>;

const addDescriptor = (
  data: PermissionRegistryData,
  key: PermissionKey,
  descriptor: EndpointDescriptor,
): PermissionRegistryData =>
  HashMap.modifyAt(
    data,
    key,
    Option.match({
      onNone: () => Option.some<ReadonlyArray<EndpointDescriptor>>([descriptor]),
      onSome: (existing) => Option.some([...existing, descriptor]),
    }),
  );

export interface PermissionRegistryShape {
  readonly register: (permission: Permission, descriptor: EndpointDescriptor) => Effect.Effect<void>;
  readonly snapshot: Effect.Effect<PermissionRegistryData>;
}

export class PermissionRegistry extends Context.Service<PermissionRegistry, PermissionRegistryShape>()(
  "qadi/http/PermissionRegistry",
) {
  static readonly register = (permission: Permission, descriptor: EndpointDescriptor) =>
    PermissionRegistry.use((r) => r.register(permission, descriptor));
  static readonly snapshot = PermissionRegistry.use((r) => r.snapshot);
}

/**
 * The registry's base layer: an empty `Ref`-backed store. Sufficient on its
 * own: `guardApi` registers the endpoints it planned from an `HttpApi` into it and
 * `addGuardedRoute` a bare route, so every stack that guards anything provides
 * this layer.
 */
export const PermissionRegistryLive: Layer.Layer<PermissionRegistry> = Layer.effect(
  PermissionRegistry,
  Effect.gen(function* () {
    const ref = yield* Ref.make<PermissionRegistryData>(HashMap.empty());
    return {
      register: (permission, descriptor) =>
        Ref.update(ref, (data) => addDescriptor(data, permissionKey(permission), descriptor)),
      snapshot: Ref.get(ref),
    };
  }),
);

type RouteMethod = "*" | "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

type GuardedHandler<P extends Permission, A, R> = (
  authorized: Authorized<P>,
  resource: A,
) => Effect.Effect<HttpServerResponse.HttpServerResponse, HttpEnforcementFailure, R>;

const buildGuardedRoute = <P extends Permission, A extends Resource, LR, R>(
  method: RouteMethod,
  path: PathInput,
  permission: P,
  policy: Policy,
  loadResource: (request: HttpServerRequest.HttpServerRequest) => Effect.Effect<A, never, LR>,
  handler: GuardedHandler<P, A, R>,
) =>
  Layer.merge(
    HttpRouter.add(method, path, guardRoute(permission, policy, loadResource)(handler)),
    Layer.effectDiscard(PermissionRegistry.register(permission, { method, path, group: undefined })),
  );

/**
 * `HttpRouter.add`, plus the registration-time push into `PermissionRegistry`
 * that gives a bare-`HttpRouter` route the same audit visibility an
 * `HttpApi` endpoint gets for free from its own annotations — the
 * `HttpRouter`-sourced half of the registry's two population mechanisms.
 * Wraps `guardRoute` rather than duplicating its enforcement, so
 * `loadResource` and `handler` carry the same `never`-error-channel
 * constraint `GuardRoute.ts` documents.
 *
 * Omit `loadResource` to evaluate against `NO_RESOURCE` (BEH-QD-178), as
 * `authorizeRequest` does: the handler then receives a plain `Resource`.
 *
 * Two overloads rather than a default parameter, because a default cannot keep
 * the loader's own resource type `A` for the five-argument form. ARCH-19's
 * progress log recorded "no cast-free way" to make the loader optional; lost
 * ARCH-57's probe (`4b1ed49`) refuted that with these overloads, which need no
 * cast (ARCH-61).
 */
export function addGuardedRoute<P extends Permission>(
  method: RouteMethod,
  path: PathInput,
  permission: P,
  policy: Policy,
): <R>(handler: GuardedHandler<P, Resource, R>) => ReturnType<typeof buildGuardedRoute<P, Resource, never, R>>;
export function addGuardedRoute<P extends Permission, A extends Resource, LR = never>(
  method: RouteMethod,
  path: PathInput,
  permission: P,
  policy: Policy,
  loadResource: (request: HttpServerRequest.HttpServerRequest) => Effect.Effect<A, never, LR>,
): <R>(handler: GuardedHandler<P, A, R>) => ReturnType<typeof buildGuardedRoute<P, A, LR, R>>;
export function addGuardedRoute<P extends Permission, LR>(
  method: RouteMethod,
  path: PathInput,
  permission: P,
  policy: Policy,
  loadResource: (
    request: HttpServerRequest.HttpServerRequest,
  ) => Effect.Effect<Resource, never, LR> = loadNoResource,
) {
  return <R>(handler: GuardedHandler<P, Resource, R>) =>
    buildGuardedRoute(method, path, permission, policy, loadResource, handler);
}

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
 * The `/__permissions` introspection route, **behind a policy**.
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
 * Enforced through `guardRoute`, so a denial is a 403 and a broken attribute
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
export const permissionRegistryRoute = <P extends Permission>(permission: P, policy: Policy) =>
  addGuardedRoute("GET", "/__permissions", permission, policy)(() => snapshotResponse);

/**
 * The `/__permissions` route with **no** guard, which must be chosen explicitly.
 *
 * The `reason` is never read. It exists so that publishing the authorization
 * topology unauthenticated is something a reviewer can see somebody decided —
 * the same role `publicEndpoint(reason)` plays for an endpoint.
 *
 * Logged at warning level on every request (`announce: "every-request"`), not
 * once at construction as the port routes are: a local development choice that
 * reaches production should be visible in the logs of the environment it is
 * wrong in, not only in the one where it was made (BEH-QD-180). The warning text
 * and the cadence dispatch are `unguardedRoutes`' (`UnguardedRoute.ts`).
 */
export const permissionRegistryRouteUnguarded = (reason: string) =>
  unguardedRoutes(
    {
      what: "/__permissions",
      consequence: "the full authorization topology is public",
      reason,
      announce: "every-request",
    },
    [{ method: "GET", path: "/__permissions", handler: snapshotResponse }],
  );
