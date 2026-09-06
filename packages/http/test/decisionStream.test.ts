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
  AttributeResolverNone,
  CustomPredicateNone,
  SignatureHistoryNone,
  Decided,
  DecisionHistoryUnknown,
  DecisionRecord,
  EvaluationIdLive,
  RelationshipResolverNever,
  decisionSinkFeed,
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
import { subjectExtractorBearer } from "../src/SubjectExtractor.ts";

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

const appLayer = Effect.gen(function* () {
  const feed = yield* decisionSinkFeed({ replay: 8 });
  const route = decisionStreamRoute(readPermission, readPolicy, feed.stream);

  const layer = route.pipe(
    Layer.provideMerge(subjectExtractorBearer(lookupSubject)),
    Layer.provideMerge(
      Layer.mergeAll(
        AttributeResolverNone,
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        EvaluationIdLive,
        CustomPredicateNone,
        SignatureHistoryNone,
      ),
    ),
    Layer.provideMerge(HttpServer.layerServices),
  );

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
      assert.strictEqual(response.headers.get("x-accel-buffering"), "no");
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
