/**
 * `/__decisions` — that it streams, and that it refuses.
 *
 * The second is the point. This route publishes decisions: subject ids,
 * verdicts, resources, and whatever a `Trace` names about why. It is strictly
 * more disclosure than `/__permissions`, which publishes only the topology.
 */
import { assert, describe, it } from "@effect/vitest";
import {
  AttributeResolverNone,
  CustomPredicateNone,
  SignatureHistoryNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  decisionSinkFeed,
  hasPermission,
  makeSubject,
  permission,
  permissionKey,
} from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";
import { decisionStreamRoute } from "../src/DecisionStreamRoute.ts";
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
