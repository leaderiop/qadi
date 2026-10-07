/**
 * `/__decisions` — this process's decision log, as Server-Sent Events: what it
 * already holds, then what it decides next.
 *
 * **What a reader receives, in order** (ADR-QD-097). One `log.read` per
 * connection — subscribe, then snapshot — so the two halves cannot lose or
 * repeat a record between them:
 *
 * 1. one `event: backlog` frame per record the log retained, oldest first in
 *    `storedRecordOrder`;
 * 2. one `event: synced` frame whose data is `{"backlog":n}`
 *    ({@link DecisionStreamSynced}), `n` the backlog frames actually sent —
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
import type * as Filter from "effect/Filter";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Sse from "effect/encoding/Sse";
import * as HttpServerRequest from "effect/http/HttpServerRequest";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import type {
  DecisionLogReader,
  EnforcementErrorClass,
  LogCursor,
  LogEntry,
  Permission,
  Policy,
  Resource,
  SinkRecordNotEncodable,
  StandingEvaluationServices,
  StoredRecord,
} from "@qadi/core";
import {
  assert,
  classifyEnforcementError,
  CurrentSubject,
  encodeStoredRecordString,
  formatLogCursor,
  parseLogCursor,
  reportEncodeRefusal,
} from "@qadi/core";
import { addGuardedRoute } from "./PermissionRegistry.ts";
import { NO_RESOURCE } from "./RequirePermission.ts";
import { SubjectExtractor } from "./SubjectExtractor.ts";

/**
 * The SSE event a stored record is framed as: `backlog` for a record the log
 * already held when the reader connected, `message` (SSE's default) for one
 * made after. A closed union — a reader branches on it.
 */
export type DecisionFrameEvent = "backlog" | "message";

/**
 * The `synced` frame's data: how many `backlog` frames preceded it.
 *
 * Its own schema rather than an ad hoc object, so a reader can decode it as
 * untrusted input like any other frame.
 */
export const DecisionStreamSynced = Schema.Struct({ backlog: Schema.Number });

export type DecisionStreamSynced = typeof DecisionStreamSynced.Type;

/**
 * One stored record as an SSE frame of the given event — `event: backlog` /
 * `data: <envelope>`, or `data: <envelope>` alone for `message`, with an `id:`
 * line when a cursor is given (ARCH-11 D-11-g) — produced by
 * `effect/encoding/Sse`'s own `encoder.write` rather than a hand-built template
 * string (H6, ADR-QD-072). That is the same encoder `HttpApiBuilder`'s
 * `HttpApiSchema.StreamSse` machinery calls internally; the machinery itself is
 * inseparable from the full `HttpApi` pipeline, and this route's `reauth`
 * recheck is a `Stream.mergeEffect` over the response stream with no
 * `HttpApiMiddleware` equivalent, so the encoder is reused directly.
 *
 * For `message`, `Sse.encoder.write` omits the `event:` line, so a live frame
 * is `data: <json>\n\n` — what an `EventSource`'s `message` listener reads.
 *
 * **One call, to `@qadi/core`'s `encodeStoredRecordString`.** The frame's data
 * is the stored-record envelope `{ environment, record }`, whose `record` is the
 * same bytes forwarding sends and an audit row stores; every rule about what can
 * cross lives in the codec, over the whole encoded record (ARCH-09). A refused
 * record drops only its own frame: the refusal is the filter's failure value,
 * reported by {@link decisionFrames}, and the stream carries on.
 *
 * A `Filter`: `Result.succeed` keeps a value, `Result.fail` drops it
 * (`effect/Filter`'s own doc comment). Exported so the refusal can be tested
 * directly against a plain record.
 */
export const frame =
  (event: DecisionFrameEvent, cursor?: LogCursor): Filter.Filter<StoredRecord, string, SinkRecordNotEncodable> =>
  (stored) =>
    Result.map(encodeStoredRecordString(stored), (data) =>
      Sse.encoder.write({
        _tag: "Event",
        event,
        id: cursor === undefined ? undefined : formatLogCursor(cursor),
        data,
      }),
    );

/** The `synced` frame: the backlog is over, and how many frames it was. */
export const syncedFrame = (backlog: number): string =>
  Sse.encoder.write({
    _tag: "Event",
    event: "synced",
    id: undefined,
    data: JSON.stringify(Schema.encodeSync(DecisionStreamSynced)({ backlog })),
  });

/**
 * Reports one refused record, then drops its frame: `onRefused` when the
 * caller supplied one, otherwise a warning naming the refusal, where in the
 * record it was found, and the evaluation. Runs only on the refusal branch,
 * so a framed record pays for no span.
 */
const reportRefused = Effect.fn("qadi.http.decisionStream.refused")(function* (
  refusal: SinkRecordNotEncodable,
  onRefused: ((refusal: SinkRecordNotEncodable) => void) | undefined,
) {
  yield* reportEncodeRefusal(refusal, { message: "qadi/http: a decision record could not be framed", onRefused });
  return Result.fail(refusal);
});

/**
 * One read of a decision log as SSE frames: each backlog entry as a `backlog`
 * frame, then {@link syncedFrame}, then each live entry as a `message` frame,
 * every record frame carrying its entry's cursor as its SSE `id`.
 * A refused record is reported (`onRefused`, else a warning) and dropped, so
 * one record never ends the stream; the `synced` count is the backlog frames
 * actually sent.
 *
 * Exported for the same reason `frame` and `reauthCheck` are: the route's body
 * is this stream, UTF-8 encoded, and it is tested directly as well as through
 * the route.
 */
export const decisionFrames = (
  read: {
    readonly backlog: ReadonlyArray<LogEntry>;
    readonly live: Stream.Stream<LogEntry>;
  },
  options?: Pick<DecisionStreamOptions, "onRefused">,
): Stream.Stream<string> => {
  const onRefused = options?.onRefused;
  const framed =
    (event: DecisionFrameEvent) =>
    (entry: LogEntry): Effect.Effect<Result.Result<string, SinkRecordNotEncodable>> =>
      Result.match(frame(event, entry.cursor)(entry.record), {
        onSuccess: (data) => Effect.succeed(Result.succeed(data)),
        onFailure: (refusal) => reportRefused(refusal, onRefused),
      });
  const prelude: Effect.Effect<ReadonlyArray<string>> = Effect.map(
    Effect.forEach(read.backlog, (entry) => framed("backlog")(entry)),
    (results) => results.flatMap((result) => (Result.isSuccess(result) ? [result.success] : [])),
  );
  return Stream.unwrap(
    Effect.map(prelude, (frames) =>
      Stream.fromIterable([...frames, syncedFrame(frames.length)]).pipe(
        Stream.concat(Stream.filterMapEffect(read.live, framed("message"))),
      )),
  );
};

/**
 * `reauthCheck` classifies an `assert` failure through
 * {@link classifyEnforcementError} (`@qadi/core`'s `Errors.ts`) rather than collapsing
 * every one of these to a single "denied" literal, which is exactly the
 * failure/denial conflation
 * [INV-QD-006](../../../spec/invariants.md#inv-qd-006-failure-is-not-denial)
 * forbids everywhere else: an `AttributeResolveError` mid-stream is a
 * resolver outage, not a revoked subject, and a consumer building the
 * documented dashboard (ADR-QD-046) needs to tell "you lost access" apart
 * from "this feed is temporarily unavailable, retry." (GR-01/TS-01)
 *
 * This module used to carry its own copy of that same three-bucket
 * partition, independently matched over the same `EnforcementError` tags `toResponse`
 * (`QadiHttpError.ts`) sorts to pick an HTTP status — two exhaustive matches
 * that could each compile cleanly while silently disagreeing with each other
 * on a moved or added tag. The classification then moved into `QadiHttpError.ts`,
 * and now lives in `@qadi/core`'s `ENFORCEMENT_ERROR_CLASSES`, beside
 * `ERROR_CODES`: there is exactly one place that decides which bucket a tag
 * falls into, and it is not specific to HTTP.
 */

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
  /**
   * Called once for each record that cannot be framed — `encodeStoredRecordString`
   * refused it — in place of the default warning. The record's frame is dropped
   * either way, and the stream carries on: one record never ends it.
   */
  readonly onRefused?: (refusal: SinkRecordNotEncodable) => void;
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
 * `assert`'s failure is classified through {@link classifyEnforcementError}
 * rather than collapsed to a single `"denied"` literal (GR-01, TS-01): an
 * `AccessDenied` or `UndischargedObligation` is a real denial, but an
 * `AttributeResolveError`
 * or similar port failure is an **outage**, and reporting an outage as a
 * denial is exactly the conflation INV-QD-006 forbids everywhere else in
 * this library. The stream still fails closed either way — only the label
 * stops lying about which one happened.
 *
 * Exported for the same reason `frame` is: a recheck is driven by a schedule,
 * and through a real SSE response that schedule runs on wall-clock time — this
 * is a plain `Effect`, testable directly against `TestClock` without one.
 */
export const reauthCheck = (
  request: HttpServerRequest.HttpServerRequest,
  policy: Policy,
  resource: Resource,
): Effect.Effect<
  void,
  EnforcementErrorClass | "extraction-failed",
  StandingEvaluationServices | SubjectExtractor
> =>
  SubjectExtractor.extract(request).pipe(
    Effect.tapError((error) =>
      Effect.logError(`qadi/http: subject extraction failed during reauth — ${error.reason}`),
    ),
    Effect.mapError(() => "extraction-failed" as const),
    Effect.flatMap((subject) =>
      assert(policy, { resource }).pipe(
        Effect.provideService(CurrentSubject, subject),
        Effect.tapError((error) =>
          Effect.logError(
            `qadi/http: reauth check failed (${error._tag}), reporting ` +
              `${classifyEnforcementError(error)}`,
          ),
        ),
        Effect.mapError((error) => classifyEnforcementError(error)),
      ),
    ),
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
 * `/__permissions`'s own claim to list "every permission this application
 * enforces, and the routes that require it" would be false of exactly the
 * one route that publishes decisions rather than the topology.
 *
 * **Throws synchronously** (`RequirePermission.ts`'s `requiresPermission`
 * precedent for a caller programming error, not a runtime authorization
 * outcome) when `options.reauth.interval` decodes to `0` or a negative
 * duration. `Schedule.spaced` accepts either without complaint, and a
 * `0`-interval reauth loop is a tight spin — one `reauthCheck` call, then
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
    () => Effect.succeed(NO_RESOURCE),
  )(() =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      // `Stream.encodeText` — UTF-8 bytes, the same final step
      // `HttpApiBuilder`'s own `encodeSseStream` ends with — rather than each
      // frame carrying its own `TextEncoder.encode` call.
      // A reconnecting `EventSource` names the last record it received; a
      // header that is not one of this log's cursors is no cursor at all.
      const after = Option.getOrUndefined(
        Option.flatMap(Option.fromNullishOr(request.headers["last-event-id"]), parseLogCursor),
      );
      // `Stream.unwrap` gives the read the response stream's scope: the
      // subscription opens when the body is first pulled and closes with it.
      const frames = Stream.unwrap(
        Effect.map(log.readEntries(after), (read) => decisionFrames(read, options)),
      ).pipe(Stream.encodeText);
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
