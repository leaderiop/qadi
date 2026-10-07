/**
 * Pins what `authorizeRequest` asks of its caller (ARCH-19): the standing
 * services and a `SubjectExtractor`, never `CurrentSubject` (it provides that to
 * the guard itself), and a loader's own requirements carried through unchanged.
 */
import { expect, test } from "tstyche";
import type * as Effect from "effect/Effect";
import type * as HttpServerRequest from "effect/http/HttpServerRequest";
import type { CurrentSubject, StandingEvaluationServices } from "@qadi/core";
import { hasPermission, permission } from "@qadi/core";
import { authorizeRequest } from "../src/AuthorizeRequest.ts";
import type { HttpEnforcementFailure } from "../src/QadiHttpError.ts";
import type { SubjectExtractor } from "../src/SubjectExtractor.ts";

type RequirementsOf<T> = T extends Effect.Effect<infer _A, infer _E, infer R> ? R : never;
type ErrorOf<T> = T extends Effect.Effect<infer _A, infer E, infer _R> ? E : never;

const readPermission = permission("document", "read");
const readPolicy = hasPermission(readPermission);

declare const request: HttpServerRequest.HttpServerRequest;
declare const loadClean: (request: HttpServerRequest.HttpServerRequest) => Effect.Effect<{ id: string }, never, never>;
declare const loadNeedingSubject: (
  request: HttpServerRequest.HttpServerRequest,
) => Effect.Effect<{ id: string }, never, CurrentSubject>;

test("without a loader, it needs the standing services and an extractor, and no CurrentSubject", () => {
  const step = authorizeRequest(readPermission, readPolicy)(request);
  expect<RequirementsOf<typeof step>>().type.toBe<StandingEvaluationServices | SubjectExtractor>();
  expect<Extract<RequirementsOf<typeof step>, CurrentSubject>>().type.toBe<never>();
});

test("it fails with the closed HttpEnforcementFailure union", () => {
  const step = authorizeRequest(readPermission, readPolicy, loadClean)(request);
  expect<ErrorOf<typeof step>>().type.toBe<HttpEnforcementFailure>();
});

test("a loader's requirements are carried through, CurrentSubject included", () => {
  const step = authorizeRequest(readPermission, readPolicy, loadNeedingSubject)(request);
  expect<Extract<RequirementsOf<typeof step>, CurrentSubject>>().type.toBe<CurrentSubject>();
});

test("the evaluated resource keeps the loader's type", () => {
  const step = authorizeRequest(readPermission, readPolicy, loadClean)(request);
  type Value = typeof step extends Effect.Effect<infer A, infer _E, infer _R> ? A : never;
  expect<Value["resource"]>().type.toBe<{ id: string }>();
});
