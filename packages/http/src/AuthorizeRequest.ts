/**
 * The request-enforcement module: everything `@qadi/http` does to a request before
 * and around its handler. It extracts the subject, loads the resource, makes the
 * edge decision, provides `CurrentSubject`, runs the handler and turns every
 * enforcement failure into the caller's own answer.
 *
 * ARCH-19 (CCR-QD-197) introduced the edge step, `authorizeRequest`. ARCH-46
 * (ADR-QD-108) made this file own the whole chain, because every surface repeated
 * the handler-denial tap and the projection catch by hand, and one surface, the
 * unguarded port route, dropped the extraction log. A caller now supplies only
 * what differs, its projection (`EnforcementProjection`), and the rest is here.
 *
 * Package-private since ADR-QD-099: `authorizeRequest` and `AuthorizedRequest`
 * are public through `GuardApi.ts`, and every other export is for this package.
 */
import * as Effect from "effect/Effect";
import type * as HttpServerRequest from "effect/http/HttpServerRequest";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import type { unhandled } from "effect/Types";
import type {
  Authorized,
  AuthSubject,
  Permission,
  Policy,
  Resource,
  StandingEvaluationServices,
} from "@qadi/core";
import { CurrentSubject, ENFORCEMENT_DENIAL_TAGS, guard } from "@qadi/core";
import type { HttpEnforcementFailure } from "./QadiHttpError.ts";
import { HTTP_ENFORCEMENT_TAGS, logSubjectExtractionFailed, toResponse } from "./QadiHttpError.ts";
import { logDenialAt } from "./DenialLog.ts";
import { loadNoResource } from "./NoResource.ts";
import { SubjectExtractor } from "./SubjectExtractor.ts";

/** The key of one endpoint of a guarded `HttpApi`: `<group identifier>/<endpoint identifier>`. */
export type EndpointMemberKey = `${string}/${string}`;

/**
 * The key that names one endpoint of a guarded `HttpApi`: its group's identifier and its own.
 *
 * `guardApi`'s walk registers it and `RequirePermission`'s middleware checks it, so what is
 * enforced is exactly what was registered only while both spell it the same way (ENF-05, D-05,
 * ADR-QD-108). It lives in this module, not `GuardApi.ts`, because `GuardApi.ts` value-imports
 * `makeRequirePermission` from `RequirePermissionMiddleware.ts`: the middleware importing the key
 * from `GuardApi.ts` would be a `GuardApi` and `RequirePermissionMiddleware` cycle that
 * `pnpm circular` (madge) refuses. Both files already import this one.
 */
export const endpointMemberKey = (
  group: { readonly identifier: string },
  endpoint: { readonly identifier: string },
): EndpointMemberKey => `${group.identifier}/${endpoint.identifier}`;

/** What an allowed request carries forward: the witness, the resource it was checked against, and who asked. */
export interface AuthorizedRequest<P extends Permission, A extends Resource> {
  readonly authorized: Authorized<P>;
  /** The resource that was evaluated. A surface must use this one and never load it again (INV-QD-032). */
  readonly resource: A;
  readonly subject: AuthSubject;
}

/**
 * How a surface answers an enforcement failure: `toResponse` on a bare route,
 * `projectHttpEnforcementFailure` in the `HttpApi` middleware's error channel,
 * the stream's own class on a recheck (ADR-QD-108).
 *
 * The one thing a caller of this module supplies that the module cannot decide.
 */
export type EnforcementProjection<B, E, R> = (error: HttpEnforcementFailure) => Effect.Effect<B, E, R>;

/** The bare-route projection: the failure's `toResponse`, shared by `guardRoute` and both port-route forms. */
export const answerWithResponse: EnforcementProjection<HttpServerResponse.HttpServerResponse, never, never> = (
  error,
) => Effect.succeed(toResponse(error));

/**
 * Extracts the subject, logging an extraction failure once.
 *
 * The one place `logSubjectExtractionFailed` is applied, so a path that extracts
 * cannot forget the line: the unguarded port route did (ARCH-46, ENF-03).
 */
const extractSubject = (request: HttpServerRequest.HttpServerRequest) =>
  SubjectExtractor.extract(request).pipe(
    Effect.tapErrorTag("SubjectExtractionFailed", logSubjectExtractionFailed),
  );

/**
 * Authorizes one HTTP request: extracts the subject, loads the resource, and
 * guards it, logging a denial or an extraction failure once.
 *
 * It exists because three surfaces wrote this by hand — the `HttpApi`
 * middleware, `guardRoute` and the decision stream's recheck — and the third
 * copy drifted: it labelled a broken credential store with a class no table
 * contains and logged at other levels with other words (CCR-QD-197). Now the
 * order, the scope of `CurrentSubject` and the log text live here, and a surface
 * keeps only its answer.
 *
 * The subject is extracted **before** the resource is loaded, so a broken
 * credential store never pays `loadResource`'s cost. `loadResource` runs outside
 * the `CurrentSubject` scope, so one that needs it keeps it as a requirement.
 * The handler is not built until the policy allows: the surface runs it with
 * the returned witness (`guard` itself builds its handler eagerly, ADR-QD-035),
 * and with `subject` provided as `CurrentSubject`.
 *
 * The log taps for the edge check sit here: a denial logs through `logDenial`
 * (annotated `qadi.denial_site: "edge"`) and an extraction failure through
 * `logSubjectExtractionFailed`, one line each. A denial a *handler's own*
 * `guard` raises is not this step's: the surface that turns it into a response
 * logs it, annotated `"handler"` (BEH-QD-321). A resolver outage logs nothing
 * at the edge. Omit `loadResource` to evaluate
 * against `NO_RESOURCE`.
 *
 * Returns a value over a closed error union rather than taking a continuation:
 * a tap over a caller's open error type does not typecheck, the limit
 * `GuardRoute.ts` documents for `catchTag` (ADR-QD-036).
 */
export function authorizeRequest<P extends Permission>(
  permission: P,
  policy: Policy,
): (
  request: HttpServerRequest.HttpServerRequest,
) => Effect.Effect<
  AuthorizedRequest<P, Resource>,
  HttpEnforcementFailure,
  StandingEvaluationServices | SubjectExtractor
>;
export function authorizeRequest<P extends Permission, A extends Resource, LR = never>(
  permission: P,
  policy: Policy,
  loadResource: (request: HttpServerRequest.HttpServerRequest) => Effect.Effect<A, never, LR>,
): (
  request: HttpServerRequest.HttpServerRequest,
) => Effect.Effect<
  AuthorizedRequest<P, A>,
  HttpEnforcementFailure,
  StandingEvaluationServices | SubjectExtractor | LR
>;
export function authorizeRequest<P extends Permission, LR>(
  permission: P,
  policy: Policy,
  loadResource: (
    request: HttpServerRequest.HttpServerRequest,
  ) => Effect.Effect<Resource, never, LR> = loadNoResource,
) {
  return Effect.fn("qadi.http.authorizeRequest")(function* (request: HttpServerRequest.HttpServerRequest) {
    const subject = yield* extractSubject(request);
    const resource = yield* loadResource(request);
    const authorized = yield* guard(permission, policy)(resource, (witness) => Effect.succeed(witness)).pipe(
      Effect.provideService(CurrentSubject, subject),
    );
    return { authorized, resource, subject };
  }, Effect.tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenialAt("edge")));
}

/**
 * The one handler step: runs `handler` with the edge's `CurrentSubject`, logs a
 * denial the handler itself raised once, and projects every enforcement failure,
 * the edge's and the handler's, through `project` (ADR-QD-108).
 *
 * Two overloads rather than a generic handler-error parameter. `Effect.catchTag`
 * over an error typed by a constrained type parameter (`EH extends
 * HttpEnforcementFailure | unhandled`) fails with TS2345 ("not assignable to
 * ... Tags<EH>"), measured against effect@4.1.2, the limit `GuardRoute.ts`
 * documents. A closed union for a bare route and `HttpEnforcementFailure |
 * unhandled` for the `HttpApi` middleware's own error slot are the two shapes
 * callers need; the implementation is typed at the wider one and compiles
 * without a cast.
 *
 * The denial tap sits on the handler's effect only, so an edge denial is logged
 * by the edge and never twice (BEH-QD-321).
 */
function enforced<S extends { readonly subject: AuthSubject }, RE, H, R, B, EP, RP>(
  edge: Effect.Effect<S, HttpEnforcementFailure, RE>,
  project: EnforcementProjection<B, EP, RP>,
  handler: (allowed: S) => Effect.Effect<H, HttpEnforcementFailure, R>,
): Effect.Effect<H | B, EP, RE | Exclude<R, CurrentSubject> | RP>;
function enforced<S extends { readonly subject: AuthSubject }, RE, H, R, B, EP, RP>(
  edge: Effect.Effect<S, HttpEnforcementFailure, RE>,
  project: EnforcementProjection<B, EP, RP>,
  handler: (allowed: S) => Effect.Effect<H, HttpEnforcementFailure | unhandled, R>,
): Effect.Effect<H | B, EP | unhandled, RE | Exclude<R, CurrentSubject> | RP>;
function enforced<S extends { readonly subject: AuthSubject }, RE, H, R, B, EP, RP>(
  edge: Effect.Effect<S, HttpEnforcementFailure, RE>,
  project: EnforcementProjection<B, EP, RP>,
  handler: (allowed: S) => Effect.Effect<H, HttpEnforcementFailure | unhandled, R>,
): Effect.Effect<H | B, EP | unhandled, RE | Exclude<R, CurrentSubject> | RP> {
  return edge.pipe(
    Effect.flatMap((allowed) =>
      handler(allowed).pipe(
        Effect.provideService(CurrentSubject, allowed.subject),
        Effect.tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenialAt("handler")),
      ),
    ),
    Effect.catchTag(HTTP_ENFORCEMENT_TAGS, project),
  );
}

/**
 * The subject-only mode: extracts the subject, logs an extraction failure,
 * provides `CurrentSubject` and runs `handler`, applying no policy.
 *
 * The handler never runs when extraction fails, so a broken credential store
 * fails closed. `portRoutesUnguarded` is its one caller; it routes here so an
 * unguarded route logs an extraction failure exactly as a guarded one does
 * (ARCH-46, ENF-03).
 */
export function enforceSubject<H, R, B, EP, RP>(
  project: EnforcementProjection<B, EP, RP>,
  handler: (allowed: { readonly subject: AuthSubject }) => Effect.Effect<H, HttpEnforcementFailure, R>,
): (
  request: HttpServerRequest.HttpServerRequest,
) => Effect.Effect<H | B, EP, Exclude<R, CurrentSubject> | SubjectExtractor | RP> {
  return Effect.fn("qadi.http.enforceSubject")(function* (request: HttpServerRequest.HttpServerRequest) {
    return yield* enforced(
      extractSubject(request).pipe(Effect.map((subject) => ({ subject }))),
      project,
      handler,
    );
  });
}

/**
 * What the guarded mode checks a request against: the permission it enforces,
 * the policy, and how to load the resource the policy is evaluated on.
 *
 * The loader is required, so the guarded mode has one overload axis (the
 * handler's error) and not `authorizeRequest`'s with/without-loader axis as well:
 * a caller with no resource passes `loadNoResource`.
 */
export interface RequestAccess<P extends Permission, A extends Resource, LR> {
  readonly permission: P;
  readonly policy: Policy;
  readonly loadResource: (request: HttpServerRequest.HttpServerRequest) => Effect.Effect<A, never, LR>;
}

/**
 * The guarded mode: extracts the subject, loads the resource, guards it at the
 * edge, provides `CurrentSubject`, runs `handler` with the witness, logs a
 * denial the handler itself raised and projects every enforcement failure.
 *
 * The caller supplies only the projection (ENF-04); the handler-denial tap and
 * the `HTTP_ENFORCEMENT_TAGS` catch are `enforced`'s. The handler is not built
 * until the edge allows (`guard` builds its own eagerly, ADR-QD-035). Two
 * overloads for the reason `enforced` documents: a closed handler error answers
 * with the projection's error alone, an `unhandled` one adds it.
 */
export function enforceRequest<P extends Permission, A extends Resource, LR, H, R, B, EP, RP>(
  access: RequestAccess<P, A, LR>,
  project: EnforcementProjection<B, EP, RP>,
  handler: (allowed: AuthorizedRequest<P, A>) => Effect.Effect<H, HttpEnforcementFailure, R>,
): (
  request: HttpServerRequest.HttpServerRequest,
) => Effect.Effect<
  H | B,
  EP,
  Exclude<R, CurrentSubject> | StandingEvaluationServices | SubjectExtractor | LR | RP
>;
export function enforceRequest<P extends Permission, A extends Resource, LR, H, R, B, EP, RP>(
  access: RequestAccess<P, A, LR>,
  project: EnforcementProjection<B, EP, RP>,
  handler: (allowed: AuthorizedRequest<P, A>) => Effect.Effect<H, HttpEnforcementFailure | unhandled, R>,
): (
  request: HttpServerRequest.HttpServerRequest,
) => Effect.Effect<
  H | B,
  EP | unhandled,
  Exclude<R, CurrentSubject> | StandingEvaluationServices | SubjectExtractor | LR | RP
>;
export function enforceRequest<P extends Permission, A extends Resource, LR, H, R, B, EP, RP>(
  access: RequestAccess<P, A, LR>,
  project: EnforcementProjection<B, EP, RP>,
  handler: (allowed: AuthorizedRequest<P, A>) => Effect.Effect<H, HttpEnforcementFailure | unhandled, R>,
): (
  request: HttpServerRequest.HttpServerRequest,
) => Effect.Effect<
  H | B,
  EP | unhandled,
  Exclude<R, CurrentSubject> | StandingEvaluationServices | SubjectExtractor | LR | RP
> {
  return Effect.fn("qadi.http.enforceRequest")(function* (request: HttpServerRequest.HttpServerRequest) {
    return yield* enforced(
      authorizeRequest(access.permission, access.policy, access.loadResource)(request),
      project,
      handler,
    );
  });
}
