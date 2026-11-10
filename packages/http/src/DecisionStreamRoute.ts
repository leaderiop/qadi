/**
 * `/__decisions` — this process's decision log, as Server-Sent Events: what it
 * already holds, then what it decides next.
 *
 * **What a reader receives, in order** (ADR-QD-097). One `log.read` per
 * connection — subscribe, then snapshot — so the two halves cannot lose or
 * repeat a record between them:
 *
 * 1. one `event: backlog` frame per record the log retained, in cursor
 *    (arrival) order — the order is `@qadi/core`'s `encodeDecisionStream`, so ids
 *    rise along a connection and `Last-Event-ID` is the reader's highest
 *    position; a reader presents them in `storedRecordOrder` (ARCH-60);
 * 2. one `event: synced` frame whose data is `{"backlog":n}`
 *    (`@qadi/core`'s `DecisionStreamSynced`), `n` the backlog frames actually sent —
 *    sent even when `n` is 0, so a reader can tell "no history" from "an older
 *    server that sends none";
 * 3. a default (`message`) frame per record made after that.
 *
 * **Every `backlog` and `message` frame has an SSE `id`**, the record's
 * `LogCursor` as `<epoch>.<seq>`; `synced` has none, so the last id a reader saw
 * is always a record's. A reconnecting `EventSource` sends it back as
 * `Last-Event-ID`, and when it names this log's epoch the prelude holds only
 * what followed it — a reconnect costs what was missed, not the whole backlog
 * again. An unparseable header, or another epoch's (a restarted process), gets
 * the full backlog.
 *
 * Every `backlog` and `message` frame's data is a stored-record envelope,
 * `{ environment, record }` (`@qadi/core`'s `encodeStoredRecordString`): the
 * producer's label travels with the record, so a reader never states it
 * again, and an `Edge` record an aggregator ingested arrives labelled `Edge`.
 * A reader older than the envelope ignores the named events and reports each
 * `message` frame as `not-a-record` through its `onMalformed` — loudly, not as
 * silently mislabelled rows.
 *
 * **SSE rather than a WebSocket**, and the reasoning is the traffic, not taste.
 * Records flow one way; a reader never sends a decision back. SSE is plain HTTP,
 * so it goes through the same `HttpRouter`, the same middleware and the same
 * `guardRoute` as every other route here — a socket would need an upgrade path
 * outside all three, and would have to re-answer authorization on its own terms.
 * `EventSource` also reconnects by itself, and a reconnect reads the backlog
 * again, so a dropped connection recovers with the minimal protocol above and
 * nothing more.
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
import * as Schedule from "effect/Schedule";
import * as Stream from "effect/Stream";
import * as HttpServerRequest from "effect/http/HttpServerRequest";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import type {
  DecisionLogReader,
  EnforcementErrorClass,
  Permission,
  Policy,
  StandingEvaluationServices,
} from "@qadi/core";
import { encodeDecisionStream } from "@qadi/core";
import { enforceRequest } from "./AuthorizeRequest.ts";
import type { EnforcementProjection } from "./AuthorizeRequest.ts";
import { recordData, sseText } from "./DecisionLogHttp.ts";
import type { DecisionLogServeOptions } from "./DecisionLogHttp.ts";
import { loadNoResource } from "./NoResource.ts";
import { addGuardedRoute } from "./PermissionRegistry.ts";
import { classifyHttpEnforcementFailure } from "./QadiHttpError.ts";
import type { SubjectExtractor } from "./SubjectExtractor.ts";

export interface DecisionStreamOptions extends DecisionLogServeOptions {
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
 * How the recheck answers an enforcement failure: one closure line naming the tag
 * and the class, then the failure's class.
 *
 * The stream's own projection (D-02, ADR-QD-108), the third beside
 * `answerWithResponse` and `answerInChannel`: a stream that is already open has no
 * response to send, so the failure ends it, labelled through
 * `classifyHttpEnforcementFailure`, the table the connect path's status comes from.
 * A closed connection is a fact of its own, and an outage that ends a stream stays
 * visible (the edge step itself logs only a denial and an extraction failure).
 */
const endStream: EnforcementProjection<never, EnforcementErrorClass, never> = (error) =>
  Effect.logWarning(
    `qadi/http: /__decisions recheck ended the stream (${error._tag}, ${classifyHttpEnforcementFailure(error)})`,
  ).pipe(Effect.andThen(Effect.fail(classifyHttpEnforcementFailure(error))));

/**
 * One re-authorization attempt: the request-enforcement module's guarded mode on a
 * schedule, against the same request the connect path ran, answered by `endStream`.
 *
 * Its edge step is `authorizeRequest`, so a denial or an extraction failure is
 * logged there once, then `endStream` logs the closure line. There is no handler to
 * run: success is the stream carrying on.
 */
const recheck = (permission: Permission, policy: Policy, request: HttpServerRequest.HttpServerRequest) =>
  enforceRequest({ permission, policy, loadResource: loadNoResource }, endStream, () => Effect.void)(request).pipe(
    Effect.asVoid,
  );

/**
 * Mounts `/__decisions`, streaming a decision log to callers the policy permits.
 *
 * `log` is anything that can `read` — a `DecisionLog`, or a structural fake in
 * a test — so a route cannot write to the log it serves. The log's live half
 * never makes an evaluation wait on a reader: publishing is synchronous and
 * slides out the oldest unread entry rather than blocking.
 *
 * Every connection makes its own `read`, inside the response stream's scope, so
 * two open devtools pages do not steal records from one another and a closed
 * connection releases its subscription.
 *
 * Built on `addGuardedRoute`, which registers with `PermissionRegistry` the
 * same way it does for any other bare `HttpRouter` route — otherwise
 * `/__permissions`'s own listing of every permission registered with
 * `PermissionRegistry` would omit exactly the one route that publishes
 * decisions rather than the topology.
 *
 * **Throws synchronously** (`RequirePermission.ts`'s `requiresPermission`
 * precedent for a caller programming error, not a runtime authorization
 * outcome) when `options.reauth.interval` decodes to `0` or a negative
 * duration. `Schedule.spaced` accepts either without complaint, and a
 * `0`-interval reauth loop is a tight spin — one recheck, then
 * immediately another, forever, per open connection — rather than the
 * periodic recheck this option promises (issue #107). Failing here, at
 * route construction, turns that into an immediate startup error instead of
 * every open `/__decisions` connection quietly pegging a core.
 */
export const decisionStreamRoute = <P extends Permission>(
  permission: P,
  policy: Policy,
  log: DecisionLogReader,
  options?: DecisionStreamOptions,
) => {
  if (options?.reauth !== undefined && Duration.toMillis(options.reauth.interval) <= 0) {
    throw new Error(
      `decisionStreamRoute: reauth.interval must be a positive duration, got ` +
        `${Duration.toMillis(options.reauth.interval)}ms.`,
    );
  }
  return addGuardedRoute(
    "GET",
    "/__decisions",
    permission,
    policy,
    loadNoResource,
  )(() =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      // The order and the resume are core's: a reconnecting `EventSource` names
      // the last record it received, and the read opens when the body is first
      // pulled and closes with it. This module writes SSE text, then
      // `Stream.encodeText` — UTF-8 bytes, the same final step
      // `HttpApiBuilder`'s own `encodeSseStream` ends with.
      const frames = encodeDecisionStream(log, {
        after: request.headers["last-event-id"],
        encodeRecord: recordData(options),
      }).pipe(Stream.map(sseText), Stream.encodeText);
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
                  recheck(permission, policy, request),
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
      const context = yield* Effect.context<StandingEvaluationServices | SubjectExtractor>();
      return HttpServerResponse.stream(Stream.provideContext(guarded, context), {
        contentType: "text/event-stream",
        headers: {
          // Without these a proxy will buffer the stream into oblivion and
          // the feed appears to hang rather than to work slowly. No
          // `connection: "keep-alive"` here (TS-04): `connection` is a
          // hop-by-hop header the platform server owns, and setting it at
          // the handler level is redundant at best and can conflict with
          // the server's own connection management.
          "cache-control": "no-cache",
          "x-accel-buffering": "no",
        },
      });
    }),
  );
};
