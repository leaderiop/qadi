/**
 * The `RequirePermission` middleware's implementation: look the served endpoint up in the access
 * plan `guardApi` built, and answer.
 *
 * Package-private (not in the barrel, ADR-QD-099). The only way to obtain it is `guardApi`
 * (`GuardApi.ts`), which registers every endpoint of the API this middleware serves before it
 * hands the middleware back, so what is enforced is always what `/__permissions` lists. The
 * middleware reads no annotations: the plan (`AccessPlan.ts`) already decided every endpoint.
 *
 * Moved here from `RequirePermission.ts`'s `RequirePermissionLive` (ARCH-36 T5), so the class stays
 * the declaration and this module is the behavior. Its enforcement half, including the
 * handler-denial log (ARCH-45), is the request-enforcement module's since ARCH-46 (ADR-QD-108).
 * See `RequirePermission`'s doc comment for why the standing services are captured at build time
 * rather than declared as a `requires`.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as HttpServerRequest from "effect/http/HttpServerRequest";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import type { unhandled } from "effect/Types";
import type { StandingEvaluationServices } from "@qadi/core";
import { anonymous, CurrentSubject } from "@qadi/core";
import type { AccessPlan } from "./AccessPlan.ts";
import { answerInChannel, enforceRequest } from "./AuthorizeRequest.ts";
import { loadNoResource } from "./NoResource.ts";
import type { HttpEnforcementFailure } from "./QadiHttpError.ts";
import type { RequirePermission, RequiredPermissionShape } from "./RequirePermission.ts";
import type { SubjectExtractor } from "./SubjectExtractor.ts";

/**
 * Builds the middleware that enforces `plan`.
 *
 * An endpoint value outside the plan is refused with a 500 and one error log, never served: it was
 * not part of the API `guardApi` planned and registered, even when it reuses that API's names.
 */
export const makeRequirePermission = Effect.fn("qadi.http.makeRequirePermission")(function* (plan: AccessPlan) {
  // Resolved once, here, at layer-build time — see `RequirePermission`'s
  // own doc comment for why this replaces a `requires` declaration on the
  // middleware class itself. Re-provided per request below, inside the
  // returned closure, so `guard`'s own `evaluate` call finds them exactly
  // as it would have found them via an ambient per-request `requires`.
  // `SubjectExtractor` rides along because the request-enforcement module reads it from
  // context.
  const evaluationServices = yield* Effect.context<StandingEvaluationServices | SubjectExtractor>();

  // The enforcement half. The request-enforcement module (`AuthorizeRequest.ts`) runs
  // extraction, the edge decision, `CurrentSubject`, the handler-denial log (annotated
  // `"handler"`) and the projection; this middleware supplies only `answerInChannel`, the
  // `HttpApi` projection, so every failure reaches `HttpApiMiddleware`'s encoder as the redacted
  // wire value its declared schema describes (ENF-04, ADR-QD-108). `RequirePermission`'s own doc
  // comment explains why `AccessDenied`'s `trace` and the resolver `cause`s must not reach a body.
  //
  // The standing services wrap the whole of it, deliberately: a defense-in-depth `guard` inside
  // a handler finds the services this layer captured, and the enforcement failure it raises is
  // projected rather than escaping as an undeclared error. `httpEffect`'s error carries
  // `unhandled`, the middleware's own error slot, so the module's second overload keeps it.
  const enforce = (
    { permission, policy }: RequiredPermissionShape,
    httpEffect: Effect.Effect<
      HttpServerResponse.HttpServerResponse,
      unhandled | HttpEnforcementFailure,
      CurrentSubject
    >,
  ) =>
    Effect.flatMap(
      HttpServerRequest.HttpServerRequest,
      enforceRequest({ permission, policy, loadResource: loadNoResource }, answerInChannel, () => httpEffect),
    ).pipe(Effect.provide(evaluationServices));

  // The refusal and the public pass-through both provide `CurrentSubject`
  // explicitly (as `anonymous`) even though neither ever extracted a real
  // one — this middleware declares `provides: CurrentSubject`, so every
  // endpoint it guards, public or not, must actually receive one for that
  // declaration to stay honest. `anonymous` is exactly the right value for
  // "no subject was authenticated": every policy denies against it.
  const refuse = (message: string) =>
    Effect.logError(message).pipe(
      Effect.as(HttpServerResponse.empty({ status: 500 })),
      Effect.provideService(CurrentSubject, anonymous),
    );

  const middleware: Context.Service.Shape<typeof RequirePermission> = (httpEffect, { endpoint, group }) => {
    // Only an endpoint value of the API this middleware was planned from was registered, checked
    // for misplaced declarations, found to carry the middleware and to declare its access. Anything
    // else was never vetted by `guardApi`, so serving it would reopen the omission `guardApi`
    // exists to close (ARCH-36, D-36-e); that includes an API value reusing the planned names.
    const access = plan.accessOf(group, endpoint);
    if (access === undefined) {
      return refuse(
        `qadi/http: endpoint "${endpoint.identifier}" of group "${group.identifier}" is not part of the ` +
          "HttpApi this RequirePermission was built for, so it was never registered and is refused. " +
          "Provide guardApi(<that api>) to the HttpApiBuilder.layer that serves it.",
      );
    }
    return Match.valueTags(access, {
      Public: () => Effect.provideService(httpEffect, CurrentSubject, anonymous),
      Required: ({ requirement }) => enforce(requirement, httpEffect),
    });
  };
  return middleware;
});
