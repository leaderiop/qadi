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
 *
 * **`guardRoute` runs once, at connect — and again, periodically, for as long
 * as the connection stays open, when `reauth` is given.** Without it, a
 * revoked or logged-out principal whose connection is still open keeps
 * receiving every decision this process makes for as long as the stream
 * stays up, since nothing short of the client disconnecting or the process
 * restarting would end it. `reauth` closes that window: on the interval it
 * names, this route re-extracts the subject from the *same* request — which,
 * for a real `SubjectExtractor` backed by a token/session lookup, is exactly
 * where a revocation becomes visible, since the lookup runs again rather than
 * reusing whatever it answered at connect — and re-evaluates the policy
 * against the fresh subject. A failed lookup or a denial ends the stream;
 * `EventSource`'s own automatic reconnect is what recovers, going through
 * `guardRoute`'s full check again on the new connection, with no protocol of
 * ours. Off by default: it is meaningless without a `SubjectExtractor` whose
 * `lookup` actually consults something that can change (a real deployment's
 * does; `subjectExtractorNone`/an in-memory test double does not), so an
 * interval a caller did not ask for would only be needless load for one that
 * has no revocation source to notice.
 */
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import type * as Filter from "effect/Filter";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as Schedule from "effect/Schedule";
import * as Stream from "effect/Stream";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import type { CurrentSubject, EvaluationServices, Permission, Policy, Resource, SinkRecord } from "@qadi/core";
import { currentSubjectLayer, evaluate, isAllowed, isJsonSafe, toWire } from "@qadi/core";
import { guardRoute } from "./GuardRoute.ts";
import { PermissionRegistry } from "./PermissionRegistry.ts";
import { SubjectExtractor } from "./SubjectExtractor.ts";

/**
 * One record as an SSE frame: `data: <json>\n\n` — or filtered out when its
 * resource has no safe durable representation.
 *
 * A caller's resource is arbitrary `unknown`; a circular reference or a
 * `BigInt` used to throw a raw `TypeError` out of `JSON.stringify` inside
 * `Stream.map`, killing this SSE connection — and every other subscriber's,
 * since they all read the same stream — over one bad decision. `isJsonSafe`
 * is `@qadi/audit`'s own guard for exactly this value, shared from
 * `@qadi/core` rather than duplicated (`SinkCodec.ts`). Refusing just the one
 * frame rather than the whole feed matches how this route already behaves
 * under backpressure: `decisionSinkFeed` drops the oldest entry rather than
 * blocking, so a record failing to reach a subscriber is not a new failure
 * mode here, only a new reason for it.
 *
 * A `Filter`, not a plain function returning `Option`: `Stream.filterMap`
 * takes a `Filter` in this Effect version — `Result.succeed` keeps a value,
 * `Result.fail` drops it (`effect/Filter`'s own doc comment).
 *
 * Exported so the refusal can be tested directly against a plain
 * `SinkRecord`, rather than through a live SSE connection.
 */
export const frame: Filter.Filter<SinkRecord, Uint8Array> = (record) => {
  const resource = record._tag === "Decision" ? record.resource : undefined;
  if (resource !== undefined && !isJsonSafe(resource)) return Result.fail(record);
  return Result.succeed(new TextEncoder().encode(`data: ${JSON.stringify(toWire(record))}\n\n`));
};

export interface DecisionStreamOptions {
  /**
   * Re-authorizes an open connection on an interval, ending it the moment
   * that check no longer passes. See this module's own doc comment for what
   * this does and does not protect against. Absent means the connect-time
   * check is the only one — the previous, and still default, behavior.
   */
  readonly reauth?: {
    readonly interval: Duration.Input;
  };
}

/**
 * One re-authorization attempt: re-extract the subject from the same
 * request, re-evaluate the policy against it, succeed only on an allow.
 *
 * Re-extracting is the point, not a formality — for a `SubjectExtractor`
 * backed by a real token/session lookup, this calls that lookup again rather
 * than reusing whatever it answered at connect, which is exactly where a
 * revocation since connect becomes visible. `SubjectExtractionFailed` (the
 * credential store itself broken) ends the stream the same as a denial: an
 * outage on the recheck path is not a reason to keep serving decisions on
 * the strength of a subject this process can no longer confirm.
 *
 * Exported for the same reason `frame` is: testing the merged `Stream`
 * through a real, live SSE connection has no existing pattern in this repo
 * (`decisionStream.test.ts`'s own note) — this is a plain `Effect`, testable
 * directly against `TestClock` without one.
 */
export const reauthCheck = (
  request: HttpServerRequest.HttpServerRequest,
  policy: Policy,
  resource: Resource,
): Effect.Effect<
  void,
  "denied" | "extraction-failed",
  Exclude<EvaluationServices, CurrentSubject> | SubjectExtractor
> =>
  SubjectExtractor.extract(request).pipe(
    Effect.mapError(() => "extraction-failed" as const),
    Effect.flatMap((subject) =>
      evaluate(policy, { resource }).pipe(
        Effect.provide(currentSubjectLayer(subject)),
        Effect.mapError(() => "denied" as const),
        Effect.flatMap((decision) =>
          isAllowed(decision) ? Effect.void : Effect.fail("denied" as const),
        ),
      ),
    ),
  );

/**
 * Mounts `/__decisions`, streaming the feed to callers the policy permits.
 *
 * The `stream` comes from `decisionSinkFeed`, so records reach it without the
 * evaluation ever waiting on a reader: publishing is synchronous and drops the
 * oldest entry rather than blocking.
 *
 * Every subscriber gets its own subscription, so two open devtools pages do not
 * steal records from one another.
 *
 * Registers with `PermissionRegistry`, the same way `addGuardedRoute` does for
 * a bare `HttpRouter` route — otherwise `/__permissions`'s own claim to list
 * "every permission this application enforces, and the routes that require
 * it" would be false of exactly the one route that publishes decisions rather
 * than the topology.
 */
export const decisionStreamRoute = <P extends Permission>(
  permission: P,
  policy: Policy,
  stream: Stream.Stream<SinkRecord>,
  options?: DecisionStreamOptions,
) =>
  Layer.merge(
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
          Effect.gen(function* () {
            const frames = Stream.filterMap(stream, frame);
            // `Stream.mergeEffect`: the recheck loop runs concurrently for the
            // stream's lifetime, fails the whole stream the moment it fails,
            // and is itself interrupted the moment the stream ends for any
            // other reason (the client disconnecting) — never an orphaned
            // fiber still polling a connection nobody is reading anymore.
            const guarded =
              options?.reauth === undefined
                ? frames
                : frames.pipe(
                    Stream.mergeEffect(
                      Effect.repeat(
                        reauthCheck(request, policy, {}),
                        Schedule.spaced(options.reauth.interval),
                      ),
                    ),
                  );
            // `HttpServerResponse.stream` takes no requirement channel at
            // all — it needs a fully discharged `Stream`, unlike
            // `Effect.Effect`, which threads `R` through. The reauth loop's
            // services are already in this handler's own ambient context
            // (that is what `guardRoute`/`HttpRouter.add` provide them for),
            // so capturing and re-providing that context is what discharges
            // them here rather than leaving them for a caller who cannot see
            // this route's internals to supply.
            const context = yield* Effect.context<
              Exclude<EvaluationServices, CurrentSubject> | SubjectExtractor
            >();
            return HttpServerResponse.stream(Stream.provideContext(guarded, context), {
              contentType: "text/event-stream",
              headers: {
                // Without these a proxy will buffer the stream into oblivion and
                // the feed appears to hang rather than to work slowly.
                "cache-control": "no-cache",
                connection: "keep-alive",
                "x-accel-buffering": "no",
              },
            });
          }),
        )(request);
      }),
    ),
    Layer.effectDiscard(
      PermissionRegistry.register(permission, { method: "GET", path: "/__decisions", group: undefined }),
    ),
  );
