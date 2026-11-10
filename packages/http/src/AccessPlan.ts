/**
 * What each endpoint of one `HttpApi` value gets, decided once when `guardApi` is built.
 *
 * `planApi` walks the API, refuses every wiring mistake it can see, and returns a closed plan:
 * for each endpoint value it walked, `Required(requirement)` or `Public(declaration)`, plus the
 * registrations that follow from the `Required` ones. `guardApi` registers from the plan and the
 * `RequirePermission` middleware enforces from the same plan, so "listed iff enforced"
 * (INV-QD-180) holds because there is one reading, not because two readers were kept in step.
 *
 * Membership is by the group and endpoint *values*, not by their names. The middleware is handed
 * the very `HttpApiGroup`/`HttpApiEndpoint` objects `HttpApi.reflect` yields for the API it
 * serves, so a hit means "this exact endpoint, with these annotations and middleware, was vetted".
 * The old name-string membership let a different API value that reused a vetted one's group and
 * endpoint names be served with its own, unvetted declarations; an identity cannot be reused.
 *
 * Package-private (not in the barrel, ADR-QD-099); `GuardApi.ts` re-exports the names that are
 * public. The refusal classes live here, not in `GuardApi.ts`, because `GuardApi.ts` imports this
 * module and a class declared there would close an import cycle.
 */
import * as Data from "effect/Data";
import * as Match from "effect/Match";
import * as Result from "effect/Result";
import * as HttpApi from "effect/http-api/HttpApi";
import type * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint";
import type * as HttpApiGroup from "effect/http-api/HttpApiGroup";
import type { Permission } from "@qadi/core";
import type { EndpointDescriptor } from "./PermissionRegistry.ts";
import { endpointAccess, misplacedDeclarations, RequirePermission } from "./RequirePermission.ts";
import type { AccessDeclarationKey, EndpointAccess } from "./RequirePermission.ts";

/**
 * An endpoint of a guarded API has no `RequirePermission` middleware attached, so nothing would
 * enforce it.
 *
 * Raised by `guardApi` at layer construction. Effect's `HttpApi.middleware` applies only to
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
 * Raised by `guardApi` at layer construction, so the mistake surfaces when the application is
 * built rather than as a 500 on a first request (ARCH-18, CCR-QD-196).
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

/**
 * An endpoint of a guarded API declares neither a permission requirement nor `publicEndpoint`.
 *
 * Raised by `guardApi` at layer construction. Absence is refusal, not permission: an endpoint
 * reachable without authorization says so, and one that says nothing is a wiring mistake that must
 * not resolve to "allowed" (ADR-QD-036, INV-QD-034). It was refused with a 500 on every request;
 * the mistake is visible when the API is planned, so it fails the build for the reason
 * misplacement and attachment do.
 */
export class AccessNotDeclared extends Data.TaggedError("AccessNotDeclared")<{
  readonly group: string;
  readonly endpoint: string;
}> {
  override get message(): string {
    return (
      `endpoint "${this.endpoint}" of group "${this.group}" declares neither a permission ` +
      "requirement nor publicEndpoint(...), so guardApi refuses it. Annotate it with " +
      "RequiredPermission, or with PublicEndpoint if it is meant to be reachable without " +
      "authorization."
    );
  }
}

/** Why `guardApi` refused to build: a closed union of the wiring mistakes it can see. */
export type ApiGuardRefusal = MisplacedAccessDeclaration | RequirePermissionNotAttached | AccessNotDeclared;

/** What the plan holds for one endpoint: an endpoint that declares nothing never enters it. */
export type PlannedAccess = Exclude<EndpointAccess, { readonly _tag: "Undeclared" }>;

/** The decided access of one `HttpApi` value. */
export interface AccessPlan {
  /** Every `Required` endpoint, as the registry takes it. */
  readonly registrations: ReadonlyArray<readonly [Permission, EndpointDescriptor]>;
  /** The access decided for this exact endpoint value; `undefined` means it was never planned: refuse it. */
  readonly accessOf: (group: HttpApiGroup.Top, endpoint: HttpApiEndpoint.Top) => PlannedAccess | undefined;
}

/**
 * Reads `api` once, synchronously, and decides every endpoint's access, or fails with the first
 * wiring mistake.
 *
 * Reads exactly the scope enforcement uses: the endpoint's own annotations, never
 * `HttpApi.reflect`'s `mergedAnnotations`, which also carry API- and group-level declarations
 * (ARCH-18). A misplaced declaration (API, then groups) outranks an unattached middleware, which
 * outranks an undeclared endpoint, and any of them outranks registering anything: a
 * half-populated registry that omits the endpoints under a mistake is the audit lie `guardApi`
 * exists to prevent. Every endpoint must carry the middleware, declared or not, because an
 * endpoint of a guarded API with no middleware is served with no check at all (INV-QD-034).
 */
export const planApi = <Id extends string, Groups extends HttpApiGroup.Constraint>(
  api: HttpApi.HttpApi<Id, Groups>,
): Result.Result<AccessPlan, ApiGuardRefusal> => {
  const registrations: Array<readonly [Permission, EndpointDescriptor]> = [];
  const misplaced: Array<MisplacedAccessDeclaration> = [];
  const unattached: Array<RequirePermissionNotAttached> = [];
  const undeclared: Array<AccessNotDeclared> = [];
  const byGroup = new Map<HttpApiGroup.Top, Map<HttpApiEndpoint.Top, PlannedAccess>>();
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
      if (![...middleware].some((m) => m.key === RequirePermission.key)) {
        unattached.push(new RequirePermissionNotAttached({ group: group.identifier, endpoint: endpoint.identifier }));
        return;
      }
      const plan = (access: PlannedAccess) => {
        const endpoints = byGroup.get(group) ?? new Map<HttpApiEndpoint.Top, PlannedAccess>();
        endpoints.set(endpoint, access);
        byGroup.set(group, endpoints);
      };
      Match.valueTags(endpointAccess(endpoint.annotations), {
        Required: (access) => {
          plan(access);
          registrations.push([
            access.requirement.permission,
            { method: endpoint.method, path: endpoint.path, group: group.identifier },
          ]);
        },
        Public: plan,
        Undeclared: () => {
          undeclared.push(new AccessNotDeclared({ group: group.identifier, endpoint: endpoint.identifier }));
        },
      });
    },
  });
  const refusal = misplaced[0] ?? unattached[0] ?? undeclared[0];
  if (refusal !== undefined) return Result.fail(refusal);
  return Result.succeed({ registrations, accessOf: (group, endpoint) => byGroup.get(group)?.get(endpoint) });
};
