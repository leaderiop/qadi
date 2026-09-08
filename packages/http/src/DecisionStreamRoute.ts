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
 * does; an in-memory lookup test double, like `decisionStream.test.ts`'s
 * `lookupSubject`, does not), so an interval a caller did not ask for would
 * only be needless load for one that has no revocation source to notice.
 */
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import type * as Filter from "effect/Filter";
import * as Result from "effect/Result";
import * as Schedule from "effect/Schedule";
import * as Stream from "effect/Stream";
import * as Sse from "effect/unstable/encoding/Sse";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import type { CurrentSubject, EvaluationServices, Permission, Policy, Resource, SinkRecord } from "@qadi/core";
import { assert, currentSubjectLayer, isRecordJsonSafe, toWire } from "@qadi/core";
import { addGuardedRoute } from "./PermissionRegistry.ts";
import { NO_RESOURCE } from "./RequirePermission.ts";
import { SubjectExtractor } from "./SubjectExtractor.ts";

/**
 * One record as an SSE frame — `data: <json>\n\n`, produced by
 * `effect/unstable/encoding/Sse`'s own `encoder.write` rather than a hand-
 * built template string (H6, ADR-QD-072). This is the same encoder
 * `HttpApiBuilder`'s own `HttpApiSchema.StreamSse` machinery calls
 * internally (`HttpApiBuilder.ts`'s `renderSseEvent`) — reused directly here
 * rather than through `StreamSse`/`HttpApiEndpoint` themselves, because that
 * machinery is inseparable from the full `HttpApi`/`HttpApiBuilder` request
 * pipeline (confirmed by reading the source, not assumed: `makeSseEncoder`/
 * `encodeSseStream` are internal, unexported functions reached only through
 * an `HttpApiEndpoint`'s declared `success` schema). Adopting it here would
 * mean moving this route off bare `HttpRouter`/`guardRoute` entirely — the
 * same move `RequirePermission.ts`'s doc comment on `handleEnforcementErrors`
 * explains bare `HttpRouter` was never a candidate for, and this route has
 * an additional reason of its own: the `reauth` recheck loop below is a
 * `Stream.mergeEffect` over the *response* stream, wired through
 * `guardRoute`'s connect-time check and this module's own periodic one,
 * with no `HttpApiMiddleware` equivalent for a mid-stream re-authorization.
 * Reusing the platform's own frame encoder gets the real fix this section
 * asked for — no more hand-built `data: …\n\n` template — without that
 * larger, separately-scoped migration.
 *
 * `id` is always `undefined` and `event` is always `"message"` (SSE's
 * default), matching what `data:`-mode `StreamSse` produces and what this
 * route always sent before: `Sse.encoder.write` omits both the `id:` and
 * `event:` lines for that combination, leaving `data: <json>\n\n` — byte for
 * byte what the old template produced.
 *
 * A caller's resource, and a policy's `HasCustom.params`/`Obligation.attributes`,
 * are all arbitrary `unknown`; a circular reference or a `BigInt` used to throw
 * a raw `TypeError` out of `JSON.stringify` inside `Stream.map`, killing this
 * SSE connection — and every other subscriber's, since they all read the same
 * stream — over one bad decision. `isRecordJsonSafe` is `@qadi/core`'s own
 * guard for exactly this ([SinkCodec.ts](../../core/src/SinkCodec.ts)) — it
 * walks `resource` **and** `policy`, not `resource` alone, which an earlier
 * version of this guard missed: a policy's own `HasCustom.params` or an
 * `Obligation`'s `attributes` reaches the same `JSON.stringify` call and can
 * carry the same unsafe values. Refusing just the one frame rather than the
 * whole feed matches how this route already behaves under backpressure:
 * `decisionSinkFeed` drops the oldest entry rather than blocking, so a record
 * failing to reach a subscriber is not a new failure mode here, only a new
 * reason for it.
 *
 * A `Filter`, not a plain function returning `Option`: `Stream.filterMap`
 * takes a `Filter` in this Effect version — `Result.succeed` keeps a value,
 * `Result.fail` drops it (`effect/Filter`'s own doc comment).
 *
 * Exported so the refusal can be tested directly against a plain
 * `SinkRecord`, rather than through a live SSE connection. Returns the
 * framed `string` now, not a `Uint8Array` — `decisionStreamRoute` pipes the
 * whole filtered stream through `Stream.encodeText` once, the same
 * UTF-8-encoding step `HttpApiBuilder`'s own `encodeSseStream` ends with,
 * rather than each frame carrying its own `TextEncoder` call.
 */
export const frame: Filter.Filter<SinkRecord, string> = (record) => {
  if (!isRecordJsonSafe(record)) return Result.fail(record);
  return Result.succeed(
    Sse.encoder.write({
      _tag: "Event",
      event: "message",
      id: undefined,
      data: JSON.stringify(toWire(record)),
    }),
  );
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
 * request, re-check the policy against it on **`assert`'s** semantics —
 * succeed only on an allow whose obligations, if any, are discharged.
 *
 * Built on `assert` rather than `evaluate` + `isAllowed`, deliberately: the
 * latter reports whether the policy allowed and stops there, which is not
 * what connect-time `guardRoute` does — `guardRoute` enforces through
 * `@qadi/core`'s `guard`, which refuses an allow carrying a binding
 * obligation nobody discharged. An `evaluate`-based recheck and a
 * `guard`-based connect check would disagree about the same policy on the
 * same subject the moment one is `Obliged`: connect refuses, but every
 * later recheck would report the bare allow as sufficient and let the
 * connection continue past the point connecting fresh would have refused it.
 * Currently latent — no live path lets an `Obliged` policy reach this route
 * at all — but the two enforcement points must not implement different
 * semantics regardless. `assert` is `@qadi/core`'s own exported
 * enforcement-semantics primitive for exactly this: evaluate, refuse a
 * denial, discharge (or refuse) obligations, report nothing back.
 *
 * Re-extracting is the point, not a formality — for a `SubjectExtractor`
 * backed by a real token/session lookup, this calls that lookup again rather
 * than reusing whatever it answered at connect, which is exactly where a
 * revocation since connect becomes visible. `SubjectExtractionFailed` (the
 * credential store itself broken) ends the stream the same as a denial: an
 * outage on the recheck path is not a reason to keep serving decisions on
 * the strength of a subject this process can no longer confirm.
 *
 * Both failure paths are logged before being collapsed to their literal —
 * mirroring `GuardRoute.ts`/`RequirePermission.ts`'s
 * `Effect.logError(...error.reason)` for `SubjectExtractionFailed` — so an
 * outage on this path leaves a trace instead of silently ending the SSE
 * connection with zero diagnostics.
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
    Effect.tapError((error) =>
      Effect.logError(`qadi/http: subject extraction failed during reauth — ${error.reason}`),
    ),
    Effect.mapError(() => "extraction-failed" as const),
    Effect.flatMap((subject) =>
      assert(policy, { resource }).pipe(
        Effect.provide(currentSubjectLayer(subject)),
        Effect.tapError((error) =>
          Effect.logError(`qadi/http: reauth check failed (${error._tag}), reporting a denial`),
        ),
        Effect.mapError(() => "denied" as const),
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
 * Built on `addGuardedRoute`, which registers with `PermissionRegistry` the
 * same way it does for any other bare `HttpRouter` route — otherwise
 * `/__permissions`'s own claim to list "every permission this application
 * enforces, and the routes that require it" would be false of exactly the
 * one route that publishes decisions rather than the topology.
 */
export const decisionStreamRoute = <P extends Permission>(
  permission: P,
  policy: Policy,
  stream: Stream.Stream<SinkRecord>,
  options?: DecisionStreamOptions,
) =>
  addGuardedRoute(
    "GET",
    "/__decisions",
    permission,
    policy,
    () => Effect.succeed(NO_RESOURCE),
  )(() =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      // `Stream.encodeText` — UTF-8 bytes, the same final step
      // `HttpApiBuilder`'s own `encodeSseStream` ends with — rather than each
      // frame carrying its own `TextEncoder.encode` call.
      const frames = Stream.filterMap(stream, frame).pipe(Stream.encodeText);
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
                  reauthCheck(request, policy, NO_RESOURCE),
                  Schedule.spaced(options.reauth.interval),
                ),
              ),
            );
      // `HttpServerResponse.stream` takes no requirement channel at
      // all — it needs a fully discharged `Stream`, unlike
      // `Effect.Effect`, which threads `R` through. The reauth loop's
      // services are already in this handler's own ambient context
      // (that is what `guardRoute`/`HttpRouter.add` provide them for,
      // via `addGuardedRoute`), so capturing and re-providing that
      // context is what discharges them here rather than leaving them
      // for a caller who cannot see this route's internals to supply.
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
  );
