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
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as HttpApi from "effect/http-api/HttpApi";
import type * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint";
import type * as HttpApiGroup from "effect/http-api/HttpApiGroup";
import type { Permission, StandingEvaluationServices } from "@qadi/core";
import { PermissionRegistry } from "./PermissionRegistry.ts";
import type { EndpointDescriptor } from "./PermissionRegistry.ts";
import { endpointAccess, misplacedDeclarations, RequirePermission } from "./RequirePermission.ts";
import type { AccessDeclarationKey } from "./RequirePermission.ts";
import { makeRequirePermission } from "./RequirePermissionMiddleware.ts";
import type { SubjectExtractor } from "./SubjectExtractor.ts";

/**
 * An endpoint of a guarded API has no `RequirePermission` middleware attached, so nothing would
 * enforce it.
 *
 * Raised by {@link guardApi} at layer construction. Effect's `HttpApi.middleware` applies only to
 * endpoints already added (`HttpApi.ts:100-104`), so `.middleware(RequirePermission)` before
 * `.add(group)`, no middleware, or middleware on one group only leaves the endpoint served to
 * anyone while an unconditional registry would list it as guarded (ARCH-36 defect C3,
 * CCR-QD-311).
 */
export class RequirePermissionNotAttached extends Data.TaggedError("RequirePermissionNotAttached")<{
  readonly group: string;
  readonly endpoint: string;
}> {
  override get message(): string {
    return (
      `endpoint "${this.endpoint}" of group "${this.group}" is part of a guarded API, but the ` +
      "RequirePermission middleware is not attached to it, so nothing would enforce it. Call " +
      ".middleware(RequirePermission) after the group is added (HttpApi.middleware applies only to " +
      "endpoints already added)."
    );
  }
}

/**
 * A `RequiredPermission` or `PublicEndpoint` sits on a group or an API, where
 * `RequirePermission` never reads it.
 *
 * Raised by {@link guardApi} at layer construction, so the mistake surfaces
 * when the application is built rather than as a 500 on a first request. The
 * middleware refuses the same placement at request time (ARCH-18, CCR-QD-196).
 */
export class MisplacedAccessDeclaration extends Data.TaggedError("MisplacedAccessDeclaration")<{
  readonly scope: "group" | "api";
  readonly identifier: string;
  readonly key: AccessDeclarationKey;
}> {
  override get message(): string {
    return (
      `${this.scope} "${this.identifier}" carries ${this.key}, which only an endpoint may declare. ` +
      "Declare it on each endpoint, or use HttpApiGroup.annotateEndpoints."
    );
  }
}

/** Why {@link guardApi} refused to build: a closed union of the two wiring mistakes it can see. */
export type ApiGuardRefusal = MisplacedAccessDeclaration | RequirePermissionNotAttached;

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

interface WalkedApi {
  readonly found: ReadonlyArray<readonly [Permission, EndpointDescriptor]>;
  readonly refusal: ApiGuardRefusal | undefined;
  readonly members: ReadonlySet<string>;
}

/**
 * Reads `api` once, synchronously: the declared permissions to register, the first wiring mistake,
 * and the `"<group>/<endpoint>"` key of every endpoint.
 *
 * Reads exactly the scope `RequirePermission` enforces: the endpoint's own annotations, never
 * `HttpApi.reflect`'s `mergedAnnotations`. The merge also carries API- and group-level
 * annotations, which the middleware never reads, so listing them put an endpoint in the registry
 * that enforcement served as public or refused (ARCH-18). A group-wide declaration is written with
 * `HttpApiGroup.annotateEndpoints`, which lands in each endpoint's own scope.
 *
 * A misplaced declaration outranks a missing middleware, and either outranks registering anything:
 * a half-populated registry that omits the endpoints under a mistake is the audit lie this layer
 * exists to prevent. Every endpoint must carry the middleware, declared or not, because an endpoint
 * of a guarded API with no middleware is served with no check at all (INV-QD-034).
 */
const walkApi = <Id extends string, Groups extends HttpApiGroup.Constraint>(
  api: HttpApi.HttpApi<Id, Groups>,
): WalkedApi => {
  const found: Array<readonly [Permission, EndpointDescriptor]> = [];
  const misplaced: Array<MisplacedAccessDeclaration> = [];
  const unattached: Array<RequirePermissionNotAttached> = [];
  const members = new Set<string>();
  for (const key of misplacedDeclarations(api.annotations)) {
    misplaced.push(new MisplacedAccessDeclaration({ scope: "api", identifier: api.identifier, key }));
  }
  HttpApi.reflect(api, {
    onGroup: ({ group }) => {
      for (const key of misplacedDeclarations(group.annotations)) {
        misplaced.push(new MisplacedAccessDeclaration({ scope: "group", identifier: group.identifier, key }));
      }
    },
    onEndpoint: ({ endpoint, group, middleware }) => {
      members.add(`${group.identifier}/${endpoint.identifier}`);
      if (![...middleware].some((m) => m.key === RequirePermission.key)) {
        unattached.push(new RequirePermissionNotAttached({ group: group.identifier, endpoint: endpoint.identifier }));
        return;
      }
      Match.valueTags(endpointAccess(endpoint.annotations), {
        Required: ({ requirement }) => {
          found.push([
            requirement.permission,
            { method: endpoint.method, path: endpoint.path, group: group.identifier },
          ]);
        },
        Public: () => {},
        Undeclared: () => {},
      });
    },
  });
  const [firstMisplaced] = misplaced;
  const [firstUnattached] = unattached;
  return { found, refusal: firstMisplaced ?? firstUnattached, members };
};

/**
 * A layer that provides `RequirePermission` for `api` and registers every endpoint it enforces
 * with `PermissionRegistry` when it is built.
 *
 * Registration is a consequence of building this layer, not a second call: `/__permissions` lists
 * what this enforces and nothing else (INV-QD-180). Building fails, registering nothing, with
 * {@link MisplacedAccessDeclaration} for a declaration on a group or the API, or
 * {@link RequirePermissionNotAttached} for an endpoint the middleware does not cover. The second is
 * also a compile error where the type is precise ({@link EveryEndpointGuarded}). At request time
 * the middleware refuses with a 500 and one log line an endpoint that is not part of `api`.
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
      const walked = walkApi(api);
      if (walked.refusal !== undefined) return yield* Effect.fail(walked.refusal);
      const registry = yield* PermissionRegistry;
      yield* Effect.forEach(walked.found, ([permission, descriptor]) => registry.register(permission, descriptor), {
        discard: true,
      });
      return yield* makeRequirePermission(walked.members);
    }),
  );
