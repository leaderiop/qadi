/**
 * The bare `HttpRouter` sibling of `RequirePermission.ts`'s `HttpApi`
 * middleware — same enforcement, `@qadi/core`'s `guard`, wired to a plain
 * `(request) => Effect<HttpServerResponse, never, R>` route handler instead
 * of an `HttpApiEndpoint`.
 *
 * A bare `HttpRouter` handler has no schema-fixed signature the way an
 * `HttpApiBuilder` handler does, so — unlike `RequirePermission`, which can
 * only discard the witness `guard` produces — this can hand it to the
 * wrapped handler directly, as an explicit argument. See ADR-QD-036.
 *
 * Extraction, the edge decision, the handler-denial log and the projection are the
 * request-enforcement module's (`AuthorizeRequest.ts`, ADR-QD-108); this file keeps
 * the bare-`HttpRouter` shape, and the typing contract below that
 * `GuardRoute.tst.ts` pins.
 */
import type * as Effect from "effect/Effect";
import type * as HttpServerRequest from "effect/http/HttpServerRequest";
import type * as HttpServerResponse from "effect/http/HttpServerResponse";
import type { Authorized, CurrentSubject, EvaluationServices, Permission, Policy, Resource } from "@qadi/core";
import { answerWithResponse, enforceRequest } from "./AuthorizeRequest.ts";
import type { HttpEnforcementFailure } from "./QadiHttpError.ts";
import type { SubjectExtractor } from "./SubjectExtractor.ts";

/**
 * Guards a bare `HttpRouter` handler with a policy, resolving `resource` via
 * `loadResource` and handing the wrapped handler the resulting witness.
 *
 * `loadResource` is required to resolve to `never` in its error channel and
 * `handler` to the closed `HttpEnforcementFailure` union, which is the one the
 * module accepts — deliberately, not an oversight. `Effect.catchTag`
 * narrows by excluding matched tags from the *whole* error union it's
 * applied to; when that union also contains a fully open, caller-supplied
 * type parameter, TypeScript cannot prove the open parameter doesn't itself
 * contain one of the matched tags, so it refuses to narrow at all — this is
 * a real limit hit by compiling it, not a hypothetical one, and there is no
 * cast-free way around it for a genuinely generic error channel (`AGENTS.md`
 * has no cast carve-out). A caller with its own failure modes — a 404 from
 * `loadResource`, say — resolves them to a response with its own
 * `Effect.catchAll` before handing the result here, the same way a bare
 * `HttpRouter` handler is already expected to.
 *
 * `CurrentSubject` is excluded from `R | EvaluationServices` specifically —
 * not from `LR` too, and not by excluding it from the union as a whole.
 * Only the guard and the handler run inside the `CurrentSubject` scope
 * `authorizeRequest` and this function provide; `loadResource` runs before
 * it, outside that scope. A caller's `loadResource` that genuinely depends
 * on `CurrentSubject` (unusual, but not prevented) must still see it as a
 * real requirement — an unconditional `Exclude` over the whole union would
 * silently promise a discharge that only half the body actually performs. A
 * broader version of this exact bug — `Exclude` applied to `EvaluationServices`
 * alone, leaving the caller-supplied `R` untouched — shipped first and was
 * found only by a `tstyche` type-level check exercising a real generic `R`
 * that itself required `CurrentSubject`, the same "an explicit return type
 * only checks the body is *assignable*, it doesn't correct an over-wide
 * annotation" trap as ADR-QD-036's other findings.
 */
export const guardRoute =
  <P extends Permission, A extends Resource, LR = never>(
    permission: P,
    policy: Policy,
    loadResource: (request: HttpServerRequest.HttpServerRequest) => Effect.Effect<A, never, LR>,
  ) =>
  <B, R>(
    handler: (
      authorized: Authorized<P>,
      resource: A,
    ) => Effect.Effect<B, HttpEnforcementFailure, R>,
  ) =>
  (
    request: HttpServerRequest.HttpServerRequest,
  ): Effect.Effect<
    B | HttpServerResponse.HttpServerResponse,
    never,
    Exclude<R | EvaluationServices, CurrentSubject> | LR | SubjectExtractor
  > =>
    // Extraction, loading, the guard, both log lines and the projection are the
    // request-enforcement module's; this route keeps only its answer.
    enforceRequest(
      { permission, policy, loadResource },
      answerWithResponse,
      ({ authorized, resource }) => handler(authorized, resource),
    )(request);
