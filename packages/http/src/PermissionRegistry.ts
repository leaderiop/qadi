/**
 * A queryable registry of which permission each endpoint requires, exposed
 * as the `/__permissions` introspection route.
 *
 * Populated from two independent mechanisms feeding one model, per
 * ADR-QD-036: `registerApi` walks an already-built `HttpApi`'s
 * `RequiredPermission` annotations, and
 * `addGuardedRoute` pushes a descriptor at the point a bare `HttpRouter`
 * route registers — forced apart only because `HttpApiEndpoint` carries an
 * annotation slot and a bare `HttpRouter.Route` does not. Both mechanisms
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
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import type { PathInput } from "effect/unstable/http/HttpRouter";
import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import type * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";
import type { Authorized, Permission, PermissionKey, Policy, Resource } from "@qadi/core";
import { permissionKey } from "@qadi/core";
import { guardRoute } from "./GuardRoute.ts";
import { RequiredPermission } from "./RequirePermission.ts";

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
 * own for an application that only ever calls `addGuardedRoute` — compose
 * `registerApi` on top when any `HttpApi` endpoints also carry a
 * `requiresPermission` requirement.
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

/**
 * The `HttpApi`-sourced half of the registry: walks `api`'s endpoints once
 * at `Layer`-build time and pushes every `RequiredPermission` annotation
 * found through `PermissionRegistry.register` — the same write path
 * `addGuardedRoute` uses, so both sources land in the same store rather
 * than two collections a consumer would have to merge themselves.
 * `HttpApi.reflect`'s `mergedAnnotations` already resolves API-, group-, and
 * endpoint-level annotations together, so this needs no separate handling
 * for where on the API tree `requiresPermission` was called.
 *
 * Generic over `Id`/`Groups`, deliberately, rather than typed to accept
 * `HttpApi.Top` — the same finding `RequirePermission.ts`'s
 * `AnnotatedEndpoint` documents applies one level up: an `HttpApi` built
 * from an endpoint with no `params`/`query` options is not actually
 * assignable to `HttpApi.Top`. `HttpApi.reflect` is itself generic over
 * `Id`/`Groups`, so staying generic here and forwarding `api` straight
 * through avoids ever needing that assignability check at all.
 */
export const registerApi = <Id extends string, Groups extends HttpApiGroup.Constraint>(
  api: HttpApi.HttpApi<Id, Groups>,
): Layer.Layer<never, never, PermissionRegistry> =>
  Layer.effectDiscard(
    Effect.gen(function* () {
      const registry = yield* PermissionRegistry;
      const found: Array<[Permission, EndpointDescriptor]> = [];
      HttpApi.reflect(api, {
        onGroup: () => {},
        onEndpoint: ({ endpoint, group, mergedAnnotations }) => {
          const required = Context.getOption(mergedAnnotations, RequiredPermission);
          if (Option.isNone(required)) return;
          found.push([
            required.value.permission,
            { method: endpoint.method, path: endpoint.path, group: group.identifier },
          ]);
        },
      });
      yield* Effect.forEach(found, ([permission, descriptor]) => registry.register(permission, descriptor), {
        discard: true,
      });
    }),
  );

/**
 * `HttpRouter.add`, plus the registration-time push into `PermissionRegistry`
 * that gives a bare-`HttpRouter` route the same audit visibility an
 * `HttpApi` endpoint gets for free from its own annotations — the
 * `HttpRouter`-sourced half of the registry's two population mechanisms.
 * Wraps `guardRoute` rather than duplicating its enforcement, so
 * `loadResource` and `handler` carry the same `never`-error-channel
 * constraint `GuardRoute.ts` documents.
 */
export const addGuardedRoute =
  <P extends Permission, A extends Resource, LR = never>(
    method: "*" | "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS",
    path: PathInput,
    permission: P,
    policy: Policy,
    loadResource: (request: HttpServerRequest.HttpServerRequest) => Effect.Effect<A, never, LR>,
  ) =>
  <R>(
    handler: (
      authorized: Authorized<P>,
      resource: A,
    ) => Effect.Effect<HttpServerResponse.HttpServerResponse, never, R>,
  ) =>
    Layer.merge(
      HttpRouter.add(method, path, guardRoute(permission, policy, loadResource)(handler)),
      Layer.effectDiscard(PermissionRegistry.register(permission, { method, path, group: undefined })),
    );

/**
 * The introspection payload: every permission this application enforces, and
 * the routes that require it.
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
 */
export const permissionRegistryRoute = <P extends Permission>(permission: P, policy: Policy) =>
  HttpRouter.add(
    "GET",
    "/__permissions",
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      return yield* guardRoute(
        permission,
        policy,
        () => Effect.succeed({}),
      )(() => snapshotResponse)(request);
    }),
  );

/**
 * The `/__permissions` route with **no** guard, which must be chosen explicitly.
 *
 * The `reason` is never read. It exists so that publishing the authorization
 * topology unauthenticated is something a reviewer can see somebody decided —
 * the same role `publicEndpoint(reason)` plays for an endpoint.
 *
 * Logged at warning level on every request, not once at construction: a local
 * development choice that reaches production should be visible in the logs of
 * the environment it is wrong in, not only in the one where it was made.
 */
export const permissionRegistryRouteUnguarded = (reason: string) =>
  HttpRouter.add(
    "GET",
    "/__permissions",
    Effect.gen(function* () {
      yield* Effect.logWarning(
        "qadi/http: serving /__permissions unguarded — the full authorization " +
          `topology is public. Reason given: ${reason}`,
      );
      return yield* snapshotResponse;
    }),
  );
