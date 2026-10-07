/**
 * The one authorization step at the HTTP edge: who is asking, against what, and
 * may they. `RequirePermission`, `guardRoute` and the decision stream's recheck
 * each end in their own answer; none of them extracts, loads or guards by hand.
 */
import * as Effect from "effect/Effect";
import type * as HttpServerRequest from "effect/http/HttpServerRequest";
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
import { logDenial, logSubjectExtractionFailed } from "./QadiHttpError.ts";
import { loadNoResource } from "./NoResource.ts";
import { SubjectExtractor } from "./SubjectExtractor.ts";

/** What an allowed request carries forward: the witness, the resource it was checked against, and who asked. */
export interface AuthorizedRequest<P extends Permission, A extends Resource> {
  readonly authorized: Authorized<P>;
  /** The resource that was evaluated. A surface must use this one and never load it again (INV-QD-032). */
  readonly resource: A;
  readonly subject: AuthSubject;
}


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
 * The log taps sit here, not on the surface: a denial logs through `logDenial`
 * and an extraction failure through `logSubjectExtractionFailed`, one line each.
 * A resolver outage logs nothing at the edge. Omit `loadResource` to evaluate
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
    const subject = yield* SubjectExtractor.extract(request);
    const resource = yield* loadResource(request);
    const authorized = yield* guard(permission, policy)(resource, (witness) => Effect.succeed(witness)).pipe(
      Effect.provideService(CurrentSubject, subject),
    );
    return { authorized, resource, subject };
  }, (self) =>
    self.pipe(
      Effect.tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenial),
      Effect.tapErrorTag("SubjectExtractionFailed", logSubjectExtractionFailed),
    ));
}
