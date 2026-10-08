/**
 * Pins `guardApi`'s type: the compile-time half of the attachment refusal (ARCH-36, D-36-d), the
 * layer's requirements and error, and the genericity `AnnotatedEndpoint` documents — a plain,
 * options-less `HttpApi` is not assignable to `HttpApi.Top`, so a parameter typed against it would
 * silently reject the most ordinary caller.
 *
 * The runtime half (`RequirePermissionNotAttached` at layer build) is `GuardApi.test.ts`'s; this
 * file is the canary for `UnguardedEndpoints` if an `effect` upgrade reshapes
 * `HttpApiGroup.Endpoints` or `HttpApiEndpoint.Middleware`.
 */
import { expect, test } from "tstyche";
import type * as Layer from "effect/Layer";
import * as HttpApi from "effect/http-api/HttpApi";
import * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint";
import * as HttpApiGroup from "effect/http-api/HttpApiGroup";
import type { StandingEvaluationServices } from "@qadi/core";
import type { ApiGuardRefusal } from "../src/GuardApi.ts";
import { guardApi } from "../src/GuardApi.ts";
import type { PermissionRegistry } from "../src/PermissionRegistry.ts";
import { RequirePermission } from "../src/RequirePermission.ts";
import type { SubjectExtractor } from "../src/SubjectExtractor.ts";

// No `params`/`query` options: the shape that is not assignable to `HttpApiEndpoint.Top`.
const group = () => HttpApiGroup.make("g").add(HttpApiEndpoint.get("a", "/a"));
const other = () => HttpApiGroup.make("h").add(HttpApiEndpoint.get("b", "/b"));

const guardedApi = HttpApi.make("ok").add(group()).middleware(RequirePermission);

test("guardApi accepts a plain, options-less HttpApi whose endpoints carry RequirePermission", () => {
  expect(guardApi).type.toBeCallableWith(guardedApi);
});

test("guardApi accepts an API whose every group carries the middleware", () => {
  expect(guardApi).type.toBeCallableWith(
    HttpApi.make("both")
      .add(group().middleware(RequirePermission))
      .add(other().middleware(RequirePermission)),
  );
});

test("guardApi refuses middleware attached before the group was added", () => {
  expect(guardApi).type.not.toBeCallableWith(HttpApi.make("late").middleware(RequirePermission).add(group()));
});

test("guardApi refuses an API with no middleware", () => {
  expect(guardApi).type.not.toBeCallableWith(HttpApi.make("none").add(group()));
});

test("guardApi refuses an API whose middleware covers one group only", () => {
  expect(guardApi).type.not.toBeCallableWith(
    HttpApi.make("half").add(group().middleware(RequirePermission)).add(other()),
  );
});

test("guardApi's layer requires the registry, the subject extractor and the standing services, and fails with ApiGuardRefusal", () => {
  expect(guardApi(guardedApi)).type.toBe<
    Layer.Layer<
      RequirePermission,
      ApiGuardRefusal,
      SubjectExtractor | StandingEvaluationServices | PermissionRegistry
    >
  >();
});
