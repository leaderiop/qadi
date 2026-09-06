/**
 * `/__decisions` — that it streams, and that it refuses.
 *
 * The second is the point. This route publishes decisions: subject ids,
 * verdicts, resources, and whatever a `Trace` names about why. It is strictly
 * more disclosure than `/__permissions`, which publishes only the topology.
 */
import { assert, describe, it } from "@effect/vitest";
import {
  Allow,
  AttributeResolver,
  AttributeResolveError,
  AttributeResolverNone,
  CustomPredicateNone,
  SignatureHistoryNone,
  Decided,
  DecisionHistoryUnknown,
  DecisionRecord,
  EvaluationIdLive,
  RelationshipResolverNever,
  decisionSinkFeed,
  gte,
  hasAttribute,
  hasPermission,
  makeSubject,
  makeSubjectId,
  permission,
  permissionKey,
} from "@qadi/core";
import type { AuthSubject, Trace } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as TestClock from "effect/testing/TestClock";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as Schedule from "effect/Schedule";
import * as Stream from "effect/Stream";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import { decisionStreamRoute, frame, reauthCheck } from "../src/DecisionStreamRoute.ts";
import { PermissionRegistryLive, permissionRegistryRouteUnguarded } from "../src/PermissionRegistry.ts";
import { SubjectExtractionFailed, subjectExtractorBearer } from "../src/SubjectExtractor.ts";

const readPermission = permission("devtools", "read");
const readPolicy = hasPermission(readPermission);

const ALICE = "alice-token";
const BOB = "bob-token";

const alice = makeSubject({ id: "alice", permissions: [permissionKey(readPermission)] });
const bob = makeSubject({ id: "bob" });

const lookupSubject = (token: string): Effect.Effect<AuthSubject> =>
  token === ALICE
    ? Effect.succeed(alice)
    : token === BOB
      ? Effect.succeed(bob)
      : Effect.die(new Error(`unknown token: ${token}`));

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const allowTrace: Trace = {
  policyTag: "HasPermission",
  allowed: true,
  children: [],
  obligations: [],
};

const decisionRecord = (evaluationId: string, resource?: Record<string, unknown>) =>
  new DecisionRecord({
    evaluationId,
    at: 1_000,
    subjectId: makeSubjectId("alice"),
    policy: readPolicy,
    ...(resource === undefined ? {} : { resource }),
    outcome: new Decided({
      decision: new Allow({
        evaluationId,
        subjectId: makeSubjectId("alice"),
        durationMillis: 1,
        trace: allowTrace,
        visibleFields: undefined,
        obligations: [],
      }),
    }),
  });

// Composed through named intermediate steps, deliberately: chaining every
// `Layer.provideMerge` inline in one expression is an instantiation-depth
// failure mode this codebase has already hit once (see http.test.ts's
// `RoutesLayer`/`WithRegistry`/`WithSubjects` comment) — TypeScript can
// silently mis-infer the result's remaining requirement rather than raising
// a diagnostic at the chain itself, only surfacing downstream (as it did
// here, at the one call site that runs `Layer.build` directly on `layer`).
const EvaluationServicesTest = Layer.mergeAll(
  AttributeResolverNone,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  CustomPredicateNone,
  SignatureHistoryNone,
);

const appLayer = Effect.gen(function* () {
  const feed = yield* decisionSinkFeed({ replay: 8 });
  const route = decisionStreamRoute(readPermission, readPolicy, feed.stream);

  const withRegistry = route.pipe(Layer.provideMerge(PermissionRegistryLive));
  const withSubjects = withRegistry.pipe(Layer.provideMerge(subjectExtractorBearer(lookupSubject)));
  const withServices = withSubjects.pipe(Layer.provideMerge(EvaluationServicesTest));
  const layer = withServices.pipe(Layer.provideMerge(HttpServer.layerServices));

  return { feed, layer };
});

describe("/__decisions", () => {
  it.effect("refuses an anonymous caller", () =>
    Effect.gen(function* () {
      const { layer } = yield* appLayer;
      const { handler } = HttpRouter.toWebHandler(layer);

      const response = yield* Effect.promise(() =>
        handler(new Request("http://localhost/__decisions")),
      );

      assert.strictEqual(response.status, 403);
    }));

  it.effect("refuses an authenticated caller without the permission", () =>
    Effect.gen(function* () {
      // Bob authenticates and is still refused, so the guard is a policy
      // decision rather than a credential check.
      const { layer } = yield* appLayer;
      const { handler } = HttpRouter.toWebHandler(layer);

      const response = yield* Effect.promise(() =>
        handler(new Request("http://localhost/__decisions", { headers: bearer(BOB) })),
      );

      assert.strictEqual(response.status, 403);
    }));

  it.effect("serves an event stream to a permitted caller", () =>
    Effect.gen(function* () {
      const { layer } = yield* appLayer;
      const { handler } = HttpRouter.toWebHandler(layer);

      const response = yield* Effect.promise(() =>
        handler(new Request("http://localhost/__decisions", { headers: bearer(ALICE) })),
      );

      assert.strictEqual(response.status, 200);
      assert.include(response.headers.get("content-type") ?? "", "text/event-stream");
      // Without these a proxy buffers the stream and the feed looks hung.
      assert.strictEqual(response.headers.get("cache-control"), "no-cache");
      assert.strictEqual(response.headers.get("connection"), "keep-alive");
      assert.strictEqual(response.headers.get("x-accel-buffering"), "no");
    }));

  it.effect("registers with PermissionRegistry, so /__permissions is not silently incomplete", () =>
    Effect.gen(function* () {
      // `Layer.build` + `Context.get` doesn't work here: `HttpRouter.add`'s
      // handler requirement is tracked as a `Request<"Requires", _>`-branded
      // entry in the layer's requirement channel — a per-route marker only
      // `HttpRouter.toWebHandler` (and the request-driven pattern the rest of
      // this codebase's `/__permissions` assertions already use, e.g.
      // http.test.ts) knows how to resolve; `Layer.build` demands it be
      // satisfied literally, which no ordinary `Layer.provide` call can do.
      // So this asks the same question `/__permissions` itself answers,
      // through an actual request to that route, exactly like every other
      // registry assertion in this package.
      const { layer: decisionsLayer } = yield* appLayer;
      const layer = Layer.merge(decisionsLayer, permissionRegistryRouteUnguarded("test"));
      const { handler } = HttpRouter.toWebHandler(layer);

      const response = yield* Effect.promise(() => handler(new Request("http://localhost/__permissions")));
      const body = (yield* Effect.promise(() => response.json())) as ReadonlyArray<{
        readonly permission: string;
        readonly endpoints: ReadonlyArray<{
          readonly method: string;
          readonly path: string;
          readonly group?: string;
        }>;
      }>;
      const entry = body.find((row) => row.permission === permissionKey(readPermission));

      assert.isDefined(entry);
      if (entry !== undefined) {
        // `group: undefined` doesn't survive `jsonUnsafe`'s JSON.stringify —
        // an absent key round-trips, not a `group: undefined` key.
        assert.deepStrictEqual(entry.endpoints, [{ method: "GET", path: "/__decisions" }]);
      }
    }));
});

/**
 * `reauthCheck` and the merged-stream mechanism `decisionStreamRoute` builds
 * from it — directly, for the same reason `frame` is tested directly below
 * rather than through a live SSE connection.
 */
describe("reauth", () => {
  it.effect("succeeds while the subject still holds the permission, fails the moment it does not", () =>
    Effect.gen(function* () {
      let revoked = false;
      const lookup = (token: string): Effect.Effect<AuthSubject> =>
        Effect.succeed(revoked ? bob : token === ALICE ? alice : bob);
      const request = HttpServerRequest.fromWeb(
        new Request("http://localhost/__decisions", { headers: bearer(ALICE) }),
      );

      const layer = Layer.mergeAll(
        subjectExtractorBearer(lookup),
        AttributeResolverNone,
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        EvaluationIdLive,
        CustomPredicateNone,
        SignatureHistoryNone,
      );

      const check = reauthCheck(request, readPolicy, {}).pipe(Effect.provide(layer));
      const first = yield* Effect.result(check);
      assert.strictEqual(first._tag, "Success");

      revoked = true; // the lookup now answers as if alice's token had been revoked
      const second = yield* Effect.result(check);
      assert.strictEqual(second._tag, "Failure");
      if (second._tag === "Failure") assert.strictEqual(second.failure, "denied");
    }));

  it.effect("distinguishes a broken credential store from a denial — extraction-failed, not denied", () =>
    Effect.gen(function* () {
      const request = HttpServerRequest.fromWeb(
        new Request("http://localhost/__decisions", { headers: bearer(ALICE) }),
      );
      const brokenStore = subjectExtractorBearer(() =>
        Effect.fail(new SubjectExtractionFailed({ reason: "token service unreachable" })),
      );
      const layer = Layer.mergeAll(
        brokenStore,
        AttributeResolverNone,
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        EvaluationIdLive,
        CustomPredicateNone,
        SignatureHistoryNone,
      );
      const result = yield* reauthCheck(request, readPolicy, {}).pipe(Effect.provide(layer), Effect.result);
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") assert.strictEqual(result.failure, "extraction-failed");
    }));

  it.effect("an evaluator outage during recheck fails the same way a denial does", () =>
    Effect.gen(function* () {
      // `hasPermission` never consults an `AttributeResolver`, so a broken one
      // would not observably change anything checked against `readPolicy` —
      // an attribute-based policy is what actually exercises `evaluate`'s own
      // failure channel, distinct from a decision that merely denies.
      const attributePolicy = hasAttribute("clearance", gte(1));
      const request = HttpServerRequest.fromWeb(
        new Request("http://localhost/__decisions", { headers: bearer(ALICE) }),
      );
      const brokenResolver = Layer.succeed(AttributeResolver, {
        resolve: () => Effect.fail(new AttributeResolveError({ attribute: "clearance", cause: "down" })),
      });
      const layer = Layer.mergeAll(
        subjectExtractorBearer(lookupSubject),
        brokenResolver,
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        EvaluationIdLive,
        CustomPredicateNone,
        SignatureHistoryNone,
      );
      const result = yield* reauthCheck(request, attributePolicy, {}).pipe(Effect.provide(layer), Effect.result);
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") assert.strictEqual(result.failure, "denied");
    }));

  it.effect("a merged stream ends once the periodic recheck starts failing, not before", () =>
    Effect.scoped(Effect.gen(function* () {
      let revoked = false;
      const lookup = (token: string): Effect.Effect<AuthSubject> =>
        Effect.succeed(revoked ? bob : token === ALICE ? alice : bob);
      const request = HttpServerRequest.fromWeb(
        new Request("http://localhost/__decisions", { headers: bearer(ALICE) }),
      );

      const layer = Layer.mergeAll(
        subjectExtractorBearer(lookup),
        AttributeResolverNone,
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        EvaluationIdLive,
        CustomPredicateNone,
        SignatureHistoryNone,
      );

      // An infinite content stream — the recheck loop is the only thing
      // that can ever end this merge, exactly as decisionStreamRoute builds
      // it (Stream.mergeEffect over Effect.repeat on a schedule).
      const content = Stream.repeat(Stream.make(1), Schedule.forever);
      const guarded = content.pipe(
        Stream.mergeEffect(
          Effect.repeat(reauthCheck(request, readPolicy, {}), Schedule.spaced("10 seconds")),
        ),
      );

      const fiber = yield* Effect.forkChild(Stream.runDrain(guarded).pipe(Effect.provide(layer)));
      yield* TestClock.adjust("9 seconds"); // before the first recheck interval elapses

      revoked = true;
      yield* TestClock.adjust("2 seconds"); // past the 10-second mark, now revoked
      const result = yield* Fiber.join(fiber).pipe(Effect.result);
      assert.strictEqual(result._tag, "Failure");
    })),
  );

  // `decisionStreamRoute`'s own `options?.reauth === undefined ? frames : ...`
  // branch — the one call site that actually wires `reauthCheck` into a live
  // route, as opposed to the two tests above, which exercise `reauthCheck` and
  // a bare `Stream.mergeEffect` directly — is deliberately not driven through a
  // real `HttpRouter.toWebHandler` response here. Tried it: `HttpServerResponse
  // .stream`'s bridge to a web `ReadableStream` runs the merge's
  // `Schedule.spaced` recheck on real wall-clock time, not `TestClock` —
  // confirmed by running it with a 15s test timeout, which took a genuine
  // ~10 real seconds and then surfaced the recheck's failure as an unhandled
  // defect from a fiber the test does not own, rather than closing the
  // response cleanly. Forcing that into a passing test would mean a slow,
  // wall-clock-timed test, which is exactly what `TestClock` exists to avoid
  // (AGENTS.md §6). This module's own doc comment already names the reason:
  // "testing the merged `Stream` through a real, live SSE connection has no
  // existing pattern in this repo." The wiring itself is one ternary with two
  // arms, each independently proven correct by the tests above; what remains
  // unverified is only that request-time branch selecting between them.
});

/**
 * `frame` directly, rather than through a live SSE connection — this repo has
 * no existing pattern for reading a real streamed HTTP response body in a
 * test, and `effect/unstable/http`'s web-handler bridge does not appear to
 * drive a `Response`'s `ReadableStream` under this test runner without a real
 * transport. `frame` is a plain, exported, synchronous function, so its
 * refusal behavior is fully covered without depending on that.
 */
describe("frame", () => {
  it("encodes a Decision record with a JSON-safe resource", () => {
    const encoded = frame(decisionRecord("good", { a: 1 }));
    assert.isTrue(Result.isSuccess(encoded));
    const text = Result.isSuccess(encoded) ? new TextDecoder().decode(encoded.success) : "";
    assert.include(text, '"evaluationId":"good"');
    assert.match(text, /^data: .*\n\n$/);
  });

  it("drops a Decision record whose resource is not JSON-safe, rather than throwing", () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    assert.doesNotThrow(() => frame(decisionRecord("bad", circular)));
    assert.isTrue(Result.isFailure(frame(decisionRecord("bad", circular))));
  });

  it("encodes a Decision record with no resource at all", () => {
    assert.isTrue(Result.isSuccess(frame(decisionRecord("no-resource"))));
  });
});
