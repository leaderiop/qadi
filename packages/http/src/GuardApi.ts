/**
 * The one layer that guards an `HttpApi`: it provides `RequirePermission` for that API and, by
 * being built, registers every endpoint it will enforce.
 *
 * Two layers used to do this, composed independently: `RequirePermissionLive` enforced and
 * `registerApi` described, so an application that forgot the second enforced endpoints
 * `/__permissions` did not list (CCR-QD-311, ARCH-36 C2), and one that attached the middleware
 * wrongly was *listed* as guarded while Effect served it to anyone (C3: `HttpApi.middleware`
 * applies only to endpoints already added). `guardApi` is the seam: whatever is enforced through
 * it was registered by it, so "listed iff enforced" holds by construction (INV-QD-180). The
 * bare-route side already had this shape, `addGuardedRoute`.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import type * as HttpApi from "effect/http-api/HttpApi";
import type * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint";
import type * as HttpApiGroup from "effect/http-api/HttpApiGroup";
import type { StandingEvaluationServices } from "@qadi/core";
import { planApi } from "./AccessPlan.ts";
import type { ApiGuardRefusal } from "./AccessPlan.ts";
import { PermissionRegistry } from "./PermissionRegistry.ts";
import { RequirePermission } from "./RequirePermission.ts";
import { makeRequirePermission } from "./RequirePermissionMiddleware.ts";
import type { SubjectExtractor } from "./SubjectExtractor.ts";

// Public through this module, as `NO_RESOURCE` is through `RequirePermission.ts`; everything else in
// `AuthorizeRequest.ts` (the request-enforcement module) is package-private (ADR-QD-099, ADR-QD-108).
export { authorizeRequest } from "./AuthorizeRequest.ts";
export type { AuthorizedRequest } from "./AuthorizeRequest.ts";

// Public through this module; the rest of `AccessPlan.ts` (the plan itself) is package-private.
export { AccessNotDeclared, MisplacedAccessDeclaration, RequirePermissionNotAttached } from "./AccessPlan.ts";
export type { AccessDeclarationKey, ApiGuardRefusal } from "./AccessPlan.ts";

/**
 * The identifiers of the endpoints in `Groups` that `RequirePermission` is not attached to, or
 * `never`.
 *
 * Written over `HttpApiGroup.Endpoints` and `HttpApiEndpoint.Middleware` with an unconstrained
 * `infer`, deliberately: constraining through `HttpApiGroup.Top`/`HttpApiEndpoint.Top` silently
 * matches nothing, the same options-less-endpoint assignability gap `AnnotatedEndpoint` documents.
 */
export type UnguardedEndpoints<Groups> = Groups extends unknown
  ? HttpApiGroup.Endpoints<Groups> extends infer E
    ? E extends { readonly identifier: infer I }
      ? [RequirePermission] extends [HttpApiEndpoint.Middleware<E>]
        ? never
        : I
      : never
    : never
  : never;

/**
 * `unknown` when every endpoint of `Groups` carries `RequirePermission`, otherwise an object type
 * naming the identifiers that do not.
 *
 * Intersected into {@link guardApi}'s parameter, so an API with an unguarded endpoint is a compile
 * error whose message names it.
 */
export type EveryEndpointGuarded<Groups> = [UnguardedEndpoints<Groups>] extends [never]
  ? unknown
  : { readonly "qadi: endpoints without RequirePermission": UnguardedEndpoints<Groups> };

/**
 * A layer that provides `RequirePermission` for `api` and registers every endpoint it enforces
 * with `PermissionRegistry` when it is built.
 *
 * Registration is a consequence of building this layer, not a second call: `/__permissions` lists
 * what this enforces and nothing else (INV-QD-180). Building fails, registering nothing, with
 * `MisplacedAccessDeclaration` for a declaration on a group or the API,
 * `RequirePermissionNotAttached` for an endpoint the middleware does not cover (also a compile
 * error where the type is precise, {@link EveryEndpointGuarded}), or `AccessNotDeclared` for an
 * endpoint that declares neither a requirement nor `publicEndpoint`, in that precedence. At request
 * time the middleware looks the served endpoint *value* up in the plan built from `api`: one that is
 * not in it, even one reusing `api`'s group and endpoint names, is refused with a 500 and one log
 * line.
 *
 * One `guardApi` serves one API: compose APIs with `HttpApi.addHttpApi`, or provide each
 * `guardApi` to its own `HttpApiBuilder.layer` with `Layer.provide`. A surface this package does not
 * ship authorizes with `authorizeRequest` and registers with `PermissionRegistry.register`.
 *
 * Generic over `Id`/`Groups`, deliberately, rather than typed to accept `HttpApi.Top`: an `HttpApi`
 * built from an endpoint with no `params`/`query` options is not actually assignable to it.
 */
export const guardApi = <Id extends string, Groups extends HttpApiGroup.Constraint>(
  api: HttpApi.HttpApi<Id, Groups> & EveryEndpointGuarded<Groups>,
): Layer.Layer<RequirePermission, ApiGuardRefusal, SubjectExtractor | StandingEvaluationServices | PermissionRegistry> =>
  Layer.effect(
    RequirePermission,
    Effect.gen(function* () {
      const planned = planApi(api);
      if (Result.isFailure(planned)) return yield* Effect.fail(planned.failure);
      const plan = planned.success;
      const registry = yield* PermissionRegistry;
      for (const [permission, descriptor] of plan.registrations) yield* registry.register(permission, descriptor);
      return yield* makeRequirePermission(plan);
    }),
  );
