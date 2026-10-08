/**
 * The `RequirePermission` middleware's implementation: who is asking, what the endpoint
 * declares, and the answer.
 *
 * Package-private (not in the barrel, ADR-QD-099). The only way to obtain it is `guardApi`
 * (`GuardApi.ts`), which registers every endpoint of the API this middleware serves before it
 * hands the middleware back, so what is enforced is always what `/__permissions` lists.
 *
 * Moved here verbatim from `RequirePermission.ts`'s `RequirePermissionLive` (ARCH-36 T5),
 * including `enforce`'s handler-denial log (ARCH-45), so the class stays the declaration and this
 * module is the behavior. See `RequirePermission`'s doc comment for why the standing services are
 * captured at build time rather than declared as a `requires`.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as HttpServerRequest from "effect/http/HttpServerRequest";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import type { unhandled } from "effect/Types";
import type { StandingEvaluationServices } from "@qadi/core";
import { anonymous, CurrentSubject, ENFORCEMENT_DENIAL_TAGS } from "@qadi/core";
import { authorizeRequest } from "./AuthorizeRequest.ts";
import { logDenialAt } from "./DenialLog.ts";
import {
  HTTP_ENFORCEMENT_TAGS,
  projectHttpEnforcementFailure,
} from "./QadiHttpError.ts";
import type { HttpEnforcementFailure } from "./QadiHttpError.ts";
import { endpointAccess, misplacedDeclarations } from "./RequirePermission.ts";
import type { RequirePermission, RequiredPermissionShape } from "./RequirePermission.ts";
import type { SubjectExtractor } from "./SubjectExtractor.ts";

/**
 * Builds the middleware for the endpoints named by `members` (`"<group>/<endpoint>"` keys).
 *
 * An endpoint outside `members` is refused with a 500 and one error log, never served: it was not
 * part of the API `guardApi` registered.
 */
export const makeRequirePermission = Effect.fn("qadi.http.makeRequirePermission")(function* (
  members: ReadonlySet<string>,
) {
  // Resolved once, here, at layer-build time — see `RequirePermission`'s
  // own doc comment for why this replaces a `requires` declaration on the
  // middleware class itself. Re-provided per request below, inside the
  // returned closure, so `guard`'s own `evaluate` call finds them exactly
  // as it would have found them via an ambient per-request `requires`.
  // `SubjectExtractor` rides along because `authorizeRequest` reads it from
  // context.
  const evaluationServices = yield* Effect.context<StandingEvaluationServices | SubjectExtractor>();

  // The enforcement half: extract, guard, log, project. Kept apart from the
  // dispatch above so it can be replaced without touching how access is read.
  const enforce = (
    requirement: RequiredPermissionShape,
    // `unhandled` is the middleware's own error slot; the union names the
    // enforcement failures a handler's `guard` can raise through it, so the
    // denial tap below can read their tags.
    httpEffect: Effect.Effect<
      HttpServerResponse.HttpServerResponse,
      unhandled | HttpEnforcementFailure,
      CurrentSubject
    >,
  ) => {
    const { permission, policy } = requirement;

    // Every failure the edge step can produce is projected in-channel to the
    // redacted wire value its declared schema describes
    // (`projectHttpEnforcementFailure`, `QadiHttpError.ts`), and
    // `HttpApiMiddleware`'s response encoder then builds the response from
    // the matching schema's `httpApiStatus`. `RequirePermission`'s own doc
    // comment explains why `AccessDenied`'s `trace` and the resolver
    // `cause`s must not reach a body: redaction is the per-tag `project`,
    // typed to return exactly the schema's `Type`.
    //
    // Extraction, the edge guard and their log lines are `authorizeRequest`'s
    // (ARCH-19). The standing services and the projection below wrap
    // `httpEffect` too, deliberately: a defense-in-depth `guard` inside a
    // handler finds the services this layer captured, and the enforcement
    // failure it raises is projected rather than escaping as an
    // undeclared error. A denial that `guard` raises is logged here, on the
    // handler's effect alone, annotated `"handler"` (ARCH-45 I3, BEH-QD-321):
    // the edge denial above has already logged itself, so tapping the whole
    // pipeline would log it twice.
    return Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const { subject } = yield* authorizeRequest(permission, policy)(request);
      return yield* Effect.provideService(httpEffect, CurrentSubject, subject).pipe(
        Effect.tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenialAt("handler")),
      );
    }).pipe(
      Effect.provide(evaluationServices),
      // One projection for every tag (ARCH-04, ADR-QD-081). The tag
      // list is `QadiHttpError.ts`'s, so a tag added to `EnforcementError`
      // cannot reach `HttpApiMiddleware`'s encoder as an undeclared failure.
      Effect.catchTag(HTTP_ENFORCEMENT_TAGS, (error) =>
        Effect.fail(projectHttpEnforcementFailure(error)),
      ),
    );
  };

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
    // Only an endpoint of the API this middleware was built for was registered, checked for
    // misplaced declarations and found to carry the middleware. Anything else was never
    // vetted by `guardApi`, so serving it would reopen the omission `guardApi` exists to close
    // (ARCH-36, D-36-e).
    if (!members.has(`${group.identifier}/${endpoint.identifier}`)) {
      return refuse(
        `qadi/http: endpoint "${endpoint.identifier}" of group "${group.identifier}" is not part of the ` +
          "HttpApi this RequirePermission was built for, so it was never registered and is refused. " +
          "Provide guardApi(<that api>) to the HttpApiBuilder.layer that serves it.",
      );
    }

    // Only an endpoint declares access (`endpointAccess`'s doc comment). A
    // group carrying a declaration is a wiring mistake the middleware can
    // see, so it refuses every endpoint under it rather than ignore it.
    const misplaced = misplacedDeclarations(group.annotations);
    if (misplaced.length > 0) {
      return refuse(
        `qadi/http: group "${group.identifier}" carries ${misplaced.join(" and ")}, which only an ` +
          `endpoint may declare, so endpoint "${endpoint.identifier}" is refused. Declare it on each ` +
          "endpoint, or use HttpApiGroup.annotateEndpoints.",
      );
    }

    // Absence is refusal, not permission. An endpoint reachable without
    // authorization says so with `publicEndpoint`; one that says nothing is
    // a wiring mistake, and a wiring mistake on an authorization path must
    // not resolve to "allowed" (ADR-QD-036, INV-QD-034).
    return Match.valueTags(endpointAccess(endpoint.annotations), {
      Undeclared: () =>
        refuse(
          `qadi/http: endpoint "${endpoint.identifier}" declares neither a permission ` +
            "requirement nor `publicEndpoint(...)`, so it is refused. Annotate it with " +
            "RequiredPermission, or with PublicEndpoint if it is meant to be reachable " +
            "without authorization.",
        ),
      Public: () => Effect.provideService(httpEffect, CurrentSubject, anonymous),
      Required: ({ requirement }) => enforce(requirement, httpEffect),
    });
  };
  return middleware;
});
