/**
 * Pins the `CurrentSubject`-exclusion finding from
 * `.scratch/qadi-http/issues/16-http-integration-tests.md`: `guardRoute`
 * must discharge `CurrentSubject` from a wrapped handler's own open `R` —
 * the defense-in-depth shape a handler calling `guard`/`enforce` again
 * produces — without also discharging it from `loadResource`'s `LR`, which
 * runs outside the scope that actually provides it. A prior version
 * narrowed only `EvaluationServices`, leaving the handler's `R` untouched;
 * a later, over-corrected version might narrow the whole union instead,
 * silently promising a discharge `loadResource` never gets. Both directions
 * are pinned here so a future change to `GuardRoute.ts` fails a type test
 * instead of only surfacing in a real HTTP round trip, as it did originally.
 */
import { expect, test } from "tstyche";
import * as Effect from "effect/Effect";
import type * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import type * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import type { Authorized, CurrentSubject } from "@qadi/core";
import { hasPermission, permission } from "@qadi/core";
import { guardRoute } from "../src/GuardRoute.ts";

type RequirementsOf<T> = T extends Effect.Effect<infer _A, infer _E, infer R> ? R : never;

const readPermission = permission("document", "read");
const readPolicy = hasPermission(readPermission);

declare const loadResourceClean: (
  request: HttpServerRequest.HttpServerRequest,
) => Effect.Effect<{}, never, never>;

declare const loadResourceNeedingSubject: (
  request: HttpServerRequest.HttpServerRequest,
) => Effect.Effect<{}, never, CurrentSubject>;

// Models the defense-in-depth shape: a handler whose own body calls
// `guard`/`enforce` again, so its declared `R` genuinely includes
// `CurrentSubject` before `guardRoute` ever touches it.
declare const handlerNeedingSubject: (
  authorized: Authorized<typeof readPermission>,
  resource: {},
) => Effect.Effect<HttpServerResponse.HttpServerResponse, never, CurrentSubject>;

test("guardRoute discharges CurrentSubject from the wrapped handler's own R", () => {
  const route = guardRoute(readPermission, readPolicy, loadResourceClean)(handlerNeedingSubject);
  type R = RequirementsOf<ReturnType<typeof route>>;

  expect<Extract<R, CurrentSubject>>().type.toBe<never>();
});

test("guardRoute does NOT discharge CurrentSubject from loadResource's own LR", () => {
  const route = guardRoute(readPermission, readPolicy, loadResourceNeedingSubject)(handlerNeedingSubject);
  type R = RequirementsOf<ReturnType<typeof route>>;

  // `loadResource` runs outside `guardRoute`'s own `Effect.provide`, so a
  // caller whose resource loader genuinely depends on `CurrentSubject` must
  // still see it as a real, undischarged requirement.
  expect<Extract<R, CurrentSubject>>().type.toBe<CurrentSubject>();
});
