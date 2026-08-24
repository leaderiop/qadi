/**
 * `/__decisions` — a live feed of this process's decisions, as Server-Sent
 * Events.
 *
 * **SSE rather than a WebSocket**, and the reasoning is the traffic, not taste.
 * Records flow one way; a reader never sends a decision back. SSE is plain HTTP,
 * so it goes through the same `HttpRouter`, the same middleware and the same
 * `guardRoute` as every other route here — a socket would need an upgrade path
 * outside all three, and would have to re-answer authorization on its own terms.
 * `EventSource` also reconnects by itself, which pairs with the feed's `replay`
 * to make a dropped connection recover without any protocol of ours.
 *
 * Effect's own devtools uses a WebSocket, and that is right for what it is: a
 * bidirectional RPC channel. This is a feed.
 *
 * **Guarded, for the same reason `/__permissions` is and then some.** That route
 * publishes the authorization *topology*; this one publishes decisions — subject
 * ids, verdicts, resources, and whatever a `Trace` names about why. It is
 * strictly more disclosure, so it takes the same declare-do-not-infer shape
 * ([BEH-QD-174](../../../spec/behaviors/23-http.md)) with no unguarded variant
 * at all.
 *
 * **There is deliberately no `NODE_ENV` gate.** An environment variable deciding
 * who may read authorization data is precisely the inversion BEH-QD-174 rejects:
 * authorization comes from a policy, and an ambient value that happens to be
 * unset must never be what opens a route. A deployment that wants this off in
 * production does not mount it.
 */
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import type { Permission, Policy, SinkRecord } from "@qadi/core";
import { toWire } from "@qadi/core";
import { guardRoute } from "./GuardRoute.ts";

/** One record as an SSE frame: `data: <json>\n\n`. */
const frame = (record: SinkRecord): Uint8Array =>
  new TextEncoder().encode(`data: ${JSON.stringify(toWire(record))}\n\n`);

/**
 * Mounts `/__decisions`, streaming the feed to callers the policy permits.
 *
 * The `stream` comes from `decisionSinkFeed`, so records reach it without the
 * evaluation ever waiting on a reader: publishing is synchronous and drops the
 * oldest entry rather than blocking.
 *
 * Every subscriber gets its own subscription, so two open devtools pages do not
 * steal records from one another.
 */
export const decisionStreamRoute = <P extends Permission>(
  permission: P,
  policy: Policy,
  stream: Stream.Stream<SinkRecord>,
) =>
  HttpRouter.add(
    "GET",
    "/__decisions",
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      return yield* guardRoute(
        permission,
        policy,
        () => Effect.succeed({}),
      )(() =>
        Effect.succeed(
          HttpServerResponse.stream(Stream.map(stream, frame), {
            contentType: "text/event-stream",
            headers: {
              // Without these a proxy will buffer the stream into oblivion and
              // the feed appears to hang rather than to work slowly.
              "cache-control": "no-cache",
              connection: "keep-alive",
              "x-accel-buffering": "no",
            },
          }),
        ),
      )(request);
    }),
  );
