/**
 * Pins the request-enforcement module's three modes (ARCH-46, ADR-QD-108):
 * `enforceRequest`'s two handler-error overloads, `enforceSubject`'s
 * requirement and error channels, and `enforcePublic`'s (ARCH-61).
 *
 * What a mode asks of its caller is a type-level fact the HTTP round trips never
 * see: a closed handler error leaves the projection's error alone, an `unhandled`
 * one adds it, `CurrentSubject` is discharged from the handler but never from the
 * loader, and the subject-only mode needs no standing evaluation services.
 */
import { expect, test } from "tstyche";
import type * as Effect from "effect/Effect";
import type * as HttpServerRequest from "effect/http/HttpServerRequest";
import type * as HttpServerResponse from "effect/http/HttpServerResponse";
import type { unhandled } from "effect/Types";
import type { AuthSubject, CurrentSubject, StandingEvaluationServices } from "@qadi/core";
import { hasPermission, permission } from "@qadi/core";
import type { AuthorizedRequest, EnforcementProjection } from "../src/AuthorizeRequest.ts";
import {
  answerInChannel,
  answerWithResponse,
  enforcePublic,
  enforceRequest,
  enforceSubject,
} from "../src/AuthorizeRequest.ts";
import type { HttpEnforcementFailure, projectHttpEnforcementFailure } from "../src/QadiHttpError.ts";
import type { SubjectExtractor } from "../src/SubjectExtractor.ts";

type RequirementsOf<T> = T extends Effect.Effect<infer _A, infer _E, infer R> ? R : never;
type ErrorOf<T> = T extends Effect.Effect<infer _A, infer E, infer _R> ? E : never;

const readPermission = permission("document", "read");
const readPolicy = hasPermission(readPermission);

interface Needs {
  readonly _tag: "Needs";
}
interface Wire {
  readonly status: number;
}
interface Unreachable {
  readonly _tag: "Unreachable";
}

declare const request: HttpServerRequest.HttpServerRequest;
declare const loadClean: (request: HttpServerRequest.HttpServerRequest) => Effect.Effect<{ id: string }, never, never>;
declare const loadNeedingSubject: (
  request: HttpServerRequest.HttpServerRequest,
) => Effect.Effect<{ id: string }, never, CurrentSubject>;
declare const handlerClosed: (
  allowed: AuthorizedRequest<typeof readPermission, { id: string }>,
) => Effect.Effect<string, HttpEnforcementFailure, CurrentSubject | Needs>;
declare const handlerOpen: (
  allowed: AuthorizedRequest<typeof readPermission, { id: string }>,
) => Effect.Effect<string, HttpEnforcementFailure | unhandled, never>;
declare const handlerSubjectOnly: (
  allowed: { readonly subject: AuthSubject },
) => Effect.Effect<HttpServerResponse.HttpServerResponse, HttpEnforcementFailure, CurrentSubject | Needs>;
declare const handlerPublic: () => Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  HttpEnforcementFailure | unhandled,
  CurrentSubject
>;
declare const projectToWire: EnforcementProjection<Wire, Unreachable, never>;

test("a closed handler error leaves the bare-route projection's error channel at never", () => {
  const route = enforceRequest(
    { permission: readPermission, policy: readPolicy, loadResource: loadClean },
    answerWithResponse,
    handlerClosed,
  )(request);
  expect<ErrorOf<typeof route>>().type.toBe<never>();
  expect<RequirementsOf<typeof route>>().type.toBe<StandingEvaluationServices | SubjectExtractor | Needs>();
});

test("an unhandled handler error adds exactly unhandled to the projection's error", () => {
  const route = enforceRequest(
    { permission: readPermission, policy: readPolicy, loadResource: loadClean },
    projectToWire,
    handlerOpen,
  )(request);
  expect<ErrorOf<typeof route>>().type.toBe<Unreachable | unhandled>();
});

test("CurrentSubject is discharged from the handler but kept when the loader needs it", () => {
  const discharged = enforceRequest(
    { permission: readPermission, policy: readPolicy, loadResource: loadClean },
    answerWithResponse,
    handlerClosed,
  )(request);
  expect<Extract<RequirementsOf<typeof discharged>, CurrentSubject>>().type.toBe<never>();

  const kept = enforceRequest(
    { permission: readPermission, policy: readPolicy, loadResource: loadNeedingSubject },
    answerWithResponse,
    handlerClosed,
  )(request);
  expect<Extract<RequirementsOf<typeof kept>, CurrentSubject>>().type.toBe<CurrentSubject>();
});

test("the subject-only mode needs an extractor and the handler's own requirements, no standing services", () => {
  const route = enforceSubject(answerWithResponse, handlerSubjectOnly)(request);
  expect<RequirementsOf<typeof route>>().type.toBe<SubjectExtractor | Needs>();
  expect<ErrorOf<typeof route>>().type.toBe<never>();
});

test("the public mode discharges CurrentSubject itself and answers in-channel plus unhandled", () => {
  const route = enforcePublic(answerInChannel, handlerPublic);
  expect<RequirementsOf<typeof route>>().type.toBe<never>();
  expect<ErrorOf<typeof route>>().type.toBe<ReturnType<typeof projectHttpEnforcementFailure> | unhandled>();
});
