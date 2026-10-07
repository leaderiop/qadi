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
  AttributeResolveError,
  Decided,
  DecisionRecord,
  DecisionSink,
  EvaluationIdLive,
  Failed,
  EvaluationServicesNone,
  ObligationRecord,
  RelationshipResolver,
  decisionSinkForwarding,
  encodeStoredRecordString,
  gte,
  hasAttribute,
  hasCustom,
  hasPermission,
  hasRelationship,
  makeDecisionLog,
  makeResourceId,
  makeSubject,
  makeSubjectId,
  obligation,
  obliged,
  permission,
  permissionKey,
  portsLayer,
  scriptedPort,
  PortReply,
  attributeResolverPort,
  stampRecord,
  decodeStoredRecordString,
} from "@qadi/core";
import type { AuthSubject, DecisionLogReader, SinkRecord, SinkRecordNotEncodable, StoredRecord, Trace } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as TestClock from "effect/testing/TestClock";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as References from "effect/References";
import * as Result from "effect/Result";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Sse from "effect/encoding/Sse";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServer from "effect/http/HttpServer";
import * as HttpServerRequest from "effect/http/HttpServerRequest";
import {
  decisionFrames,
  decisionStreamRoute,
  DecisionStreamSynced,
  frame,
  reauthCheck,
  syncedFrame,
} from "../src/DecisionStreamRoute.ts";
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

/**
 * A `Failed` record whose resolver error carries `cause` — the shape an
 * attribute-store outage produces, and the one position in a record the
 * resource/policy guard never walked (ARCH-09 C3/C4).
 */
const failedWithCause = (cause: unknown, evaluationId = "poisoned") =>
  new DecisionRecord({
    evaluationId,
    at: 1_000,
    subjectId: makeSubjectId("alice"),
    policy: readPolicy,
    outcome: new Failed({ error: new AttributeResolveError({ attribute: "clearance", cause }) }),
  });

/**
 * The error an axios-style HTTP client throws: an `Error` whose own enumerable
 * `config`/`request` properties point back into each other. Used as an
 * HTTP-backed resolver's `cause`, it is the realistic way a reference cycle
 * reaches a decision record (ARCH-09 probe 9).
 */
const httpClientError = (): Error => {
  const config: { url: string; request?: unknown } = { url: "https://attributes.internal/x" };
  const request = { config };
  config.request = request;
  return Object.assign(new Error("Request failed with status code 503"), { config, request });
};

// Composed through named intermediate steps, deliberately: chaining every
// `Layer.provideMerge` inline in one expression is an instantiation-depth
// failure mode this codebase has already hit once (see http.test.ts's
// `RoutesLayer`/`WithRegistry`/`WithSubjects` comment) — TypeScript can
// silently mis-infer the result's remaining requirement rather than raising
// a diagnostic at the chain itself, only surfacing downstream (as it did
// here, at the one call site that runs `Layer.build` directly on `layer`).
const EvaluationServicesTest = EvaluationServicesNone;

/** A record as a log on this server would hold it. */
const stored = (record: SinkRecord, environment = "Server"): StoredRecord => stampRecord(record, environment);

/** A reader that holds nothing and streams nothing: for routes this file only constructs. */
const emptyReader: DecisionLogReader = {
  read: Effect.succeed({ backlog: [], live: Stream.empty }),
  readEntries: () => Effect.succeed({ backlog: [], live: Stream.empty }),
};

/** The `data:` of a frame — the text after `data: `, up to the blank line. */
const dataOf = (framed: string): string => framed.split("\n").find((line) => line.startsWith("data: "))?.slice(6) ?? "";

/** The `event:` of a frame, or `message` when the line is omitted (SSE's default). */
const eventOf = (framed: string): string =>
  framed.split("\n").find((line) => line.startsWith("event: "))?.slice(7) ?? "message";

const appLayer = Effect.gen(function* () {
  const log = yield* makeDecisionLog({ environment: "Server" });
  const route = decisionStreamRoute(readPermission, readPolicy, log);

  const withRegistry = route.pipe(Layer.provideMerge(PermissionRegistryLive));
  const withSubjects = withRegistry.pipe(Layer.provideMerge(subjectExtractorBearer(lookupSubject)));
  const withServices = withSubjects.pipe(Layer.provideMerge(EvaluationServicesTest));
  const layer = withServices.pipe(Layer.provideMerge(HttpServer.layerServices));

  return { log, layer };
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
      // No `connection: keep-alive` (TS-04): that is a hop-by-hop header the
      // platform server owns, not this route's to set.
      assert.isNull(response.headers.get("connection"));
    }));

  it.effect(
    "builds the reauth-guarded stream when options.reauth is given, not just the bare feed",
    () =>
      Effect.gen(function* () {
        // Branch coverage only — this exercises `decisionStreamRoute`'s
        // `options?.reauth === undefined ? frames : frames.pipe(Stream
        // .mergeEffect(...))` ternary's *other* arm, the one call site that
        // wires `reauthCheck` into a live route. It is deliberately not
        // asking the recheck to actually fire: `HttpServerResponse.stream`'s
        // bridge to a web `ReadableStream` runs `Schedule.spaced` on real
        // wall-clock time, not `TestClock` (confirmed above, in the "reauth"
        // describe block's closing comment) — an interval far longer than
        // this test's own runtime keeps that firing outside the window a
        // fast, deterministic test can afford, while still exercising the
        // branch that builds the merge. `reauthCheck` and the merge
        // mechanism's actual recheck-driven behavior are already covered
        // directly, on `TestClock`, by the "reauth" describe block above.
        const log = yield* makeDecisionLog({ environment: "Server" });
        const route = decisionStreamRoute(readPermission, readPolicy, log, {
          reauth: { interval: "1 hour" },
        });
        const withRegistry = route.pipe(Layer.provideMerge(PermissionRegistryLive));
        const withSubjects = withRegistry.pipe(Layer.provideMerge(subjectExtractorBearer(lookupSubject)));
        const withServices = withSubjects.pipe(Layer.provideMerge(EvaluationServicesTest));
        const layer = withServices.pipe(Layer.provideMerge(HttpServer.layerServices));
        const { handler } = HttpRouter.toWebHandler(layer);

        const response = yield* Effect.promise(() =>
          handler(new Request("http://localhost/__decisions", { headers: bearer(ALICE) })),
        );

        assert.strictEqual(response.status, 200);
        assert.include(response.headers.get("content-type") ?? "", "text/event-stream");
        yield* Effect.promise(() => response.body?.cancel() ?? Promise.resolve());
      }),
  );

  it(
    "throws synchronously, at route construction, for a zero reauth interval",
    () => {
      // Issue #107: `Schedule.spaced(0)` would fire immediately, then
      // immediately again, forever, per open connection — a tight spin per
      // client rather than the periodic recheck this option promises.
      // Failing here, at route construction, turns that into an immediate
      // startup error instead of every open `/__decisions` connection
      // quietly pegging a core.
      assert.throws(
        () =>
          decisionStreamRoute(readPermission, readPolicy, emptyReader, {
            reauth: { interval: 0 },
          }),
        // The exact offending value, not just the sentence's opening clause —
        // an operator reading this needs to see what was actually passed.
        "decisionStreamRoute: reauth.interval must be a positive duration, got 0ms.",
      );
    },
  );

  it("throws synchronously for a negative reauth interval too", () => {
    assert.throws(
      () =>
        decisionStreamRoute(readPermission, readPolicy, emptyReader, {
          reauth: { interval: -1 },
        }),
      "decisionStreamRoute: reauth.interval must be a positive duration, got -1ms.",
    );
  });

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
      const body: ReadonlyArray<{
        readonly permission: string;
        readonly endpoints: ReadonlyArray<{
          readonly method: string;
          readonly path: string;
          readonly group?: string;
        }>;
      }> = yield* Effect.promise(() => response.json());
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

      const layer = Layer.mergeAll(subjectExtractorBearer(lookup), EvaluationServicesNone);

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
      const logs: Array<unknown> = [];
      const request = HttpServerRequest.fromWeb(
        new Request("http://localhost/__decisions", { headers: bearer(ALICE) }),
      );
      const brokenStore = subjectExtractorBearer(() =>
        Effect.fail(new SubjectExtractionFailed({ reason: "token service unreachable" })),
      );
      const layer = Layer.mergeAll(brokenStore, EvaluationServicesNone);
      const result = yield* reauthCheck(request, readPolicy, {}).pipe(
        Effect.provide(layer),
        Effect.provide(Logger.layer([Logger.make((options) => logs.push(options.message))])),
        Effect.result,
      );
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") assert.strictEqual(result.failure, "extraction-failed");
      // Logged before being collapsed to the "extraction-failed" literal
      // (this module's own doc comment on `reauthCheck`), mirroring
      // `GuardRoute.ts`/`RequirePermission.ts`'s own `SubjectExtractionFailed`
      // logging.
      assert.deepStrictEqual(logs, [
        ["qadi/http: subject extraction failed during reauth — token service unreachable"],
      ]);
    }));

  it.effect(
    "an evaluator outage during recheck ends the stream, but is reported as an " +
      "outage, not a denial (GR-01, TS-01)",
    () =>
      Effect.gen(function* () {
        // `hasPermission` never consults an `AttributeResolver`, so a broken one
        // would not observably change anything checked against `readPolicy` —
        // an attribute-based policy is what actually exercises `evaluate`'s own
        // failure channel, distinct from a decision that merely denies.
        const attributePolicy = hasAttribute("clearance", gte(1));
        const request = HttpServerRequest.fromWeb(
          new Request("http://localhost/__decisions", { headers: bearer(ALICE) }),
        );
        const logs: Array<unknown> = [];
        // `attributePolicy` asks for `clearance`, so the error names it.
        const brokenResolver = scriptedPort(attributeResolverPort, () => PortReply.fail("down")).layer;
        // Deliberately not `EvaluationServicesNone`: this test needs a broken
        // `AttributeResolver` in its slot, every other port at its default.
        const layer = Layer.mergeAll(
          portsLayer({ AttributeResolver: brokenResolver }),
          subjectExtractorBearer(lookupSubject),
          EvaluationIdLive,
        );
        const result = yield* reauthCheck(request, attributePolicy, {}).pipe(
          Effect.provide(layer),
          Effect.provide(Logger.layer([Logger.make((options) => logs.push(options.message))])),
          Effect.result,
        );
        assert.strictEqual(result._tag, "Failure");
        // Fails closed the same as a denial would — but labeled "outage", not
        // "denied": a consumer reading this feed must be able to tell a
        // revoked subject apart from a broken attribute store.
        if (result._tag === "Failure") assert.strictEqual(result.failure, "outage");
        // Logged with both the real failure's tag AND the classification it
        // was reduced to — an operator reading this line can tell exactly
        // which port broke, not only that the stream ended.
        assert.deepStrictEqual(logs, [
          ["qadi/http: reauth check failed (AttributeResolveError), reporting outage"],
        ]);
      }),
  );

  it.effect(
    "threads the given resource through to assert, rather than a stand-in — a HasRelationship " +
      "policy needs the real resource.id to ever reach the resolver",
    () =>
      Effect.gen(function* () {
        const request = HttpServerRequest.fromWeb(
          new Request("http://localhost/__decisions", { headers: bearer(ALICE) }),
        );
        const ownerPolicy = hasRelationship("owner");
        const relationshipResolver = Layer.succeed(RelationshipResolver, {
          check: (check) =>
            Effect.succeed(check.resourceId === makeResourceId("doc-1") ? "Related" : "Unrelated"),
        });
        const layer = Layer.mergeAll(
          portsLayer({ RelationshipResolver: relationshipResolver }),
          subjectExtractorBearer(lookupSubject),
          EvaluationIdLive,
        );

        // With the real resource threaded through, the resolver sees
        // `resourceId: "doc-1"` and answers "Related" — the check succeeds.
        const withResource = yield* reauthCheck(request, ownerPolicy, { id: "doc-1" }).pipe(
          Effect.provide(layer),
          Effect.result,
        );
        assert.strictEqual(withResource._tag, "Success");

        // A resource with no `id` at all reaches `HasRelationship`'s own
        // `MissingResourceId` failure (a wiring mistake, not a denial) —
        // exactly what happens if `assert` were called against an empty
        // stand-in resource instead of the one this function was actually
        // given.
        const withoutResource = yield* reauthCheck(request, ownerPolicy, {}).pipe(
          Effect.provide(layer),
          Effect.result,
        );
        assert.strictEqual(withoutResource._tag, "Failure");
        if (withoutResource._tag === "Failure") assert.strictEqual(withoutResource.failure, "wiringMistake");
      }),
  );

  it.effect("a merged stream ends once the periodic recheck starts failing, not before", () =>
    Effect.scoped(Effect.gen(function* () {
      let revoked = false;
      const lookup = (token: string): Effect.Effect<AuthSubject> =>
        Effect.succeed(revoked ? bob : token === ALICE ? alice : bob);
      const request = HttpServerRequest.fromWeb(
        new Request("http://localhost/__decisions", { headers: bearer(ALICE) }),
      );

      const layer = Layer.mergeAll(subjectExtractorBearer(lookup), EvaluationServicesNone);

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

  it.effect(
    "refuses a binding obligation the recheck cannot discharge — the same semantics " +
      "connect-time guardRoute already enforces",
    () =>
      Effect.gen(function* () {
        // `isAllowed`-based semantics would have succeeded here: the decision
        // IS an allow. `reauthCheck` is now built on `assert`, which refuses an
        // allow carrying a binding obligation nobody discharged — matching
        // what `guardRoute`'s `@qadi/core` `guard` already does at connect, so
        // the two enforcement points can no longer disagree about the same
        // `Obliged` policy.
        const obligedPolicy = obliged(obligation("must-log"), readPolicy);
        const request = HttpServerRequest.fromWeb(
          new Request("http://localhost/__decisions", { headers: bearer(ALICE) }),
        );
        const layer = Layer.mergeAll(
          subjectExtractorBearer(lookupSubject),
          EvaluationServicesNone,
        );

        const result = yield* reauthCheck(request, obligedPolicy, {}).pipe(
          Effect.provide(layer),
          Effect.result,
        );
        assert.strictEqual(result._tag, "Failure");
        if (result._tag === "Failure") assert.strictEqual(result.failure, "denied");
      }),
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
 * `frame` directly, rather than through a live SSE connection: it is a plain,
 * exported, synchronous function, so its refusal behavior is fully covered
 * without a transport. (A response body *can* be read here — "the backlog
 * travels on the stream" below reads the route's prelude through
 * `toWebHandler` — but a refusal is a property of one record, not of a
 * connection.)
 */
describe("frame", () => {
  it("encodes a Decision record with a JSON-safe resource", () => {
    const encoded = frame("message")(stored(decisionRecord("good", { a: 1 })));
    assert.isTrue(Result.isSuccess(encoded));
    const text = Result.isSuccess(encoded) ? encoded.success : "";
    assert.include(text, '"evaluationId":"good"');
    assert.include(text, '{"environment":"Server","record":{');
    assert.match(text, /^data: .*\n\n$/);
  });

  it("a backlog frame names its event; a live frame leaves it to SSE's default", () => {
    const record = stored(decisionRecord("named"));
    const backlog = Result.getOrUndefined(frame("backlog")(record)) ?? "";
    const live = Result.getOrUndefined(frame("message")(record)) ?? "";
    assert.match(backlog, /^event: backlog\ndata: /);
    assert.strictEqual(eventOf(live), "message");
    assert.notInclude(live, "event:");
    assert.strictEqual(dataOf(backlog), dataOf(live));
  });

  it("frames through the platform's own SSE encoder (Sse.encoder.write), not a hand-built template", () => {
    // H6 / ADR-QD-072: the `data: ${json}\n\n` template string is gone.
    // `frame` now builds an `Sse.Event` and hands it to `Sse.encoder.write` —
    // the same function `HttpApiBuilder`'s own SSE stream encoder calls
    // internally. Proven by construction: this asserts `frame`'s output is
    // *exactly* what calling the real encoder on the equivalent event
    // produces, not merely a string that happens to look similar.
    const record = stored(decisionRecord("matches-real-encoder", { a: 1 }));
    const encoded = frame("message")(record);
    assert.isTrue(Result.isSuccess(encoded));
    const expected = Sse.encoder.write({
      _tag: "Event",
      event: "message",
      id: undefined,
      data: Result.match(encodeStoredRecordString(record), {
        onSuccess: (data) => data,
        onFailure: () => assert.fail("refused"),
      }),
    });
    assert.strictEqual(Result.isSuccess(encoded) ? encoded.success : undefined, expected);
  });

  it("drops a Decision record whose resource is not JSON-safe, rather than throwing", () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    assert.doesNotThrow(() => frame("message")(stored(decisionRecord("bad", circular))));
    const framed = frame("message")(stored(decisionRecord("bad", circular)));
    assert.isTrue(Result.isFailure(framed));
    if (Result.isFailure(framed)) {
      assert.strictEqual(framed.failure._tag, "SinkRecordNotEncodable");
      assert.strictEqual(framed.failure.refusal._tag, "Circular");
    }
  });

  it("encodes a Decision record with no resource at all", () => {
    assert.isTrue(Result.isSuccess(frame("message")(stored(decisionRecord("no-resource")))));
  });

  it(
    "drops a Decision record whose POLICY carries a JSON-unsafe HasCustom.params, " +
      "even when the resource itself is safe",
    () => {
      // The defect three separate audit tickets (148, 154, 159) found: the old
      // guard checked only `record.resource`, but the frame's stringify also
      // serialized the raw `policy` — and `HasCustom.params` is
      // `Schema.Unknown`, so a circular value there threw the same raw
      // `TypeError` out of `Stream.filterMap` a bad resource used to, killing
      // the shared feed for every subscriber. `frame` now makes one
      // `encodeSinkRecordString` call, whose walk covers the whole record.
      const circular: Record<string, unknown> = { a: 1 };
      circular.self = circular;
      const record = new DecisionRecord({
        evaluationId: "bad-policy",
        at: 1_000,
        subjectId: makeSubjectId("alice"),
        policy: hasCustom("weird-check", circular),
        resource: { a: 1 }, // JSON-safe on its own — the old guard would have passed this through
        outcome: new Decided({
          decision: new Allow({
            evaluationId: "bad-policy",
            subjectId: makeSubjectId("alice"),
            durationMillis: 1,
            trace: allowTrace,
            visibleFields: undefined,
            obligations: [],
          }),
        }),
      });

      assert.doesNotThrow(() => frame("message")(stored(record)));
      const framed = frame("message")(stored(record));
      assert.isTrue(Result.isFailure(framed));
      if (Result.isFailure(framed)) assert.strictEqual(framed.failure.refusal._tag, "Circular");
    },
  );

  it("encodes a non-Decision SinkRecord (Obligations)", () => {
    const obligations = new ObligationRecord({
      evaluationId: "obl-1",
      at: 1_000,
      outcome: "Discharged",
      obligationIds: ["o1"],
    });

    assert.isTrue(Result.isSuccess(frame("message")(stored(obligations, "Edge"))));
  });
});

/**
 * One record can never end the stream (ARCH-09 T1). A record `frame` cannot
 * render must drop only its own frame: every subscriber reads the same log, so
 * a throw inside the frame filter would end every open `/__decisions`
 * connection at once.
 */
describe("one record cannot end the feed", () => {
  /** A log holding `good-1`, `poisoned`, `good-2`, recorded through its sink. */
  const logWith = (poisoned: DecisionRecord) =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord("good-1"));
        yield* sink.record(poisoned);
        yield* sink.record(decisionRecord("good-2"));
      }).pipe(Effect.provide(log.layer));
      return log;
    });

  const twoSubscribersSee = (poisoned: DecisionRecord) =>
    Effect.gen(function* () {
      const log = yield* logWith(poisoned);
      const subscriber = Effect.scoped(
        Effect.flatMap(log.read, ({ backlog }) =>
          Stream.runCollect(Stream.filterMap(Stream.fromIterable(backlog), frame("backlog")))),
      );
      return yield* Effect.all([Effect.exit(subscriber), Effect.exit(subscriber)], { concurrency: 2 });
    });

  it.effect(
    "a Failed record whose cause is an HTTP-client error with a reference cycle does not end the feed: " +
      "both subscribers receive the next record",
    () =>
      Effect.gen(function* () {
        const exits = yield* twoSubscribersSee(failedWithCause(httpClientError()));
        for (const exit of exits) {
          assert.strictEqual(exit._tag, "Success");
          if (exit._tag !== "Success") continue;
          assert.strictEqual(exit.value.length, 3);
          assert.include(exit.value[0] ?? "", '"evaluationId":"good-1"');
          // The cause crosses through `Schema.Defect()`, cycle dropped: the
          // outage record is framed, not refused, and nothing after it is lost.
          assert.include(
            exit.value[1] ?? "",
            '"cause":{"name":"Error","message":"Request failed with status code 503"}',
          );
          assert.include(exit.value[2] ?? "", '"evaluationId":"good-2"');
        }
      }),
  );

  it.effect("a BigInt cause does not end the feed", () =>
    Effect.gen(function* () {
      const exits = yield* twoSubscribersSee(failedWithCause(10n));
      for (const exit of exits) {
        assert.strictEqual(exit._tag, "Success");
        if (exit._tag !== "Success") continue;
        assert.strictEqual(exit.value.length, 3);
        assert.include(exit.value[1] ?? "", '"cause":"10n"');
        assert.include(exit.value[2] ?? "", '"evaluationId":"good-2"');
      }
    }));

  it.effect("an Error cause reaches the frame as {name, message} — the same bytes forwarding sends", () =>
    Effect.gen(function* () {
      const record = failedWithCause(new Error("db down"), "error-cause");
      const sent: Array<unknown> = [];
      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(record);
      }).pipe(
        Effect.provide(
          decisionSinkForwarding({
            send: (encoded) =>
              Effect.sync(() => {
                sent.push(encoded);
              }),
          }),
        ),
      );
      assert.strictEqual(sent.length, 1);

      const framed = frame("message")(stored(record));
      assert.isTrue(Result.isSuccess(framed));
      const expected = Sse.encoder.write({
        _tag: "Event",
        event: "message",
        id: undefined,
        data: JSON.stringify({ environment: "Server", record: sent[0] }),
      });
      assert.strictEqual(Result.isSuccess(framed) ? framed.success : undefined, expected);
      assert.include(expected, '"cause":{"name":"Error","message":"db down"}');
    }));

  /** The route's own body stream, read by two subscribers of one log. */
  const twoRouteSubscribersSee = (poisoned: DecisionRecord, onRefused?: (refusal: SinkRecordNotEncodable) => void) =>
    Effect.gen(function* () {
      const log = yield* logWith(poisoned);
      const subscriber = Effect.scoped(
        Effect.flatMap(log.readEntries(), (read) =>
          Stream.runCollect(
            Stream.take(decisionFrames(read, onRefused === undefined ? undefined : { onRefused }), 3),
          )),
      );
      return yield* Effect.all([Effect.exit(subscriber), Effect.exit(subscriber)], { concurrency: 2 });
    });

  it.effect("through the route's own stream, a cyclic or BigInt cause ends no subscriber", () =>
    Effect.gen(function* () {
      for (const cause of [httpClientError(), 10n]) {
        const exits = yield* twoRouteSubscribersSee(failedWithCause(cause), () => undefined);
        for (const exit of exits) {
          assert.strictEqual(exit._tag, "Success");
          if (exit._tag === "Success") assert.include(exit.value[2] ?? "", '"evaluationId":"good-2"');
        }
      }
    }));

  it.effect("a refused record calls onRefused once and the subscriber still receives the next record", () =>
    Effect.gen(function* () {
      const cyclic: Record<string, unknown> = { id: "doc-1" };
      cyclic.self = cyclic;
      const refused: Array<SinkRecordNotEncodable> = [];
      const log = yield* makeDecisionLog({ environment: "Server" });
      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord("before"));
        yield* sink.record(decisionRecord("refused", cyclic));
        yield* sink.record(decisionRecord("after"));
      }).pipe(Effect.provide(log.layer));

      const frames = yield* Effect.scoped(
        Effect.flatMap(log.readEntries(), (read) =>
          Stream.runCollect(
            Stream.take(decisionFrames(read, { onRefused: (refusal) => void refused.push(refusal) }), 3),
          )),
      );
      assert.strictEqual(frames.length, 3);
      assert.include(frames[1] ?? "", '"evaluationId":"after"');
      // The count is the backlog frames actually sent, after the refusal.
      assert.strictEqual(frames[2], syncedFrame(2));
      assert.strictEqual(refused.length, 1);
      assert.strictEqual(refused[0]?.evaluationId, "refused");
      assert.strictEqual(refused[0]?.refusal._tag, "Circular");
    }));

  it.effect("a throwing onRefused is reported and the next record is still framed", () =>
    Effect.gen(function* () {
      const logs: Array<{ message: unknown; annotations: Record<string, unknown> }> = [];
      const log = yield* makeDecisionLog({ environment: "Server" });
      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord("refused", { tags: new Set(["finance"]) }));
        yield* sink.record(decisionRecord("after"));
      }).pipe(Effect.provide(log.layer));

      const frames = yield* Effect.scoped(
        Effect.flatMap(log.readEntries(), (read) =>
          Stream.runCollect(
            Stream.take(
              decisionFrames(read, {
                onRefused: () => {
                  throw new Error("hook bug");
                },
              }),
              2,
            ),
          )),
      ).pipe(
        Effect.provide(
          Logger.layer([
            Logger.make((o) => {
              logs.push({ message: o.message, annotations: o.fiber.getRef(References.CurrentLogAnnotations) });
            }),
          ]),
        ),
      );
      assert.strictEqual(frames.length, 2);
      assert.include(frames[0] ?? "", '"evaluationId":"after"');
      assert.strictEqual(frames[1], syncedFrame(1));
      assert.strictEqual(logs.length, 1);
      assert.include(String(logs[0]?.message), "hook threw");
      assert.strictEqual(logs[0]?.annotations["qadi.refusal"], "Opaque");
      assert.strictEqual(logs[0]?.annotations["evaluationId"], "refused");
    }));

  it.effect("with no onRefused, the refusal is logged with its reason and path", () =>
    Effect.gen(function* () {
      const logs: Array<{ message: unknown; annotations: Record<string, unknown> }> = [];
      const log = yield* makeDecisionLog({ environment: "Server" });
      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord("refused", { tags: new Set(["finance"]) }));
        yield* sink.record(decisionRecord("after"));
      }).pipe(Effect.provide(log.layer));

      const frames = yield* Effect.scoped(
        Effect.flatMap(log.readEntries(), (read) => Stream.runCollect(Stream.take(decisionFrames(read), 1))),
      ).pipe(
        Effect.provide(
          Logger.layer([
            Logger.make((o) => {
              logs.push({
                message: o.message,
                annotations: o.fiber.getRef(References.CurrentLogAnnotations),
              });
            }),
          ]),
        ),
      );
      assert.include(frames[0] ?? "", '"evaluationId":"after"');
      assert.strictEqual(logs.length, 1);
      assert.include(String(logs[0]?.message), "could not be framed");
      assert.strictEqual(logs[0]?.annotations["qadi.refusal"], "Opaque");
      assert.strictEqual(logs[0]?.annotations["qadi.path"], "resource.tags");
      assert.strictEqual(logs[0]?.annotations["evaluationId"], "refused");
    }));

  it.effect("a refusal with no path (EncodeFailed) is logged with an empty path", () =>
    Effect.gen(function* () {
      const logs: Array<{ annotations: Record<string, unknown> }> = [];
      const log = yield* makeDecisionLog({ environment: "Server" });
      // A getter that throws while the codec inspects the resource: the refusal
      // is `EncodeFailed`, which carries a message and no path.
      const hostile = {
        get boom(): unknown {
          throw new Error("getter exploded");
        },
      };
      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord("refused", { nested: hostile }));
        yield* sink.record(decisionRecord("after"));
      }).pipe(Effect.provide(log.layer));

      const frames = yield* Effect.scoped(
        Effect.flatMap(log.readEntries(), (read) => Stream.runCollect(Stream.take(decisionFrames(read), 1))),
      ).pipe(
        Effect.provide(
          Logger.layer([
            Logger.make((o) => {
              logs.push({ annotations: o.fiber.getRef(References.CurrentLogAnnotations) });
            }),
          ]),
        ),
      );
      assert.include(frames[0] ?? "", '"evaluationId":"after"');
      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0]?.annotations["qadi.refusal"], "EncodeFailed");
      assert.strictEqual(logs[0]?.annotations["qadi.path"], "");
    }));
});

/**
 * Each frame is written as wire version 2 (ADR-QD-096). The obligation
 * record's bytes are short enough to pin whole.
 */
describe("decisionFrames writes wire version 2", () => {
  const record = new ObligationRecord({ evaluationId: "g", at: 1, outcome: "Discharged", obligationIds: ["audit.log"] });
  const V2 = '{"_tag":"Obligations","version":2,"evaluationId":"g","at":1,"outcome":"Discharged","obligationIds":["audit.log"]}';

  it.effect("a frame's data is the record's version-2 bytes in the envelope, the same frame as `frame`", () =>
    Effect.gen(function* () {
      const cursor = { epoch: 1_700, seq: 4 };
      const framed = Array.from(
        yield* Stream.runCollect(
          decisionFrames({ backlog: [], live: Stream.make({ cursor, record: stored(record, "Edge") }) }),
        ),
      );
      assert.deepStrictEqual(framed, [
        `event: synced\ndata: {"backlog":0}\n\n`,
        `id: 1700.4\ndata: {"environment":"Edge","record":${V2}}\n\n`,
      ]);
      assert.deepStrictEqual(framed[1], Result.getOrUndefined(frame("message", cursor)(stored(record, "Edge"))));
    }));
});

/**
 * What a reader receives, in order (ADR-QD-097): the backlog as `backlog`
 * frames, one `synced`, then live `message` frames — each an envelope naming
 * its producer. Read through `decisionFrames` over a real log's `read`, which
 * is exactly the route's body; the last case reads the route's own response.
 */
describe("the backlog travels on the stream", () => {
  const obligations = (evaluationId: string, at = 1) =>
    new ObligationRecord({ evaluationId, at, outcome: "Discharged", obligationIds: ["o"] });

  /** Every frame of one read: `count` of them, all already available. */
  const framesOf = (log: DecisionLogReader, count: number, after?: Effect.Effect<void>) =>
    Effect.scoped(
      Effect.gen(function* () {
        const read = yield* log.readEntries();
        if (after !== undefined) yield* after;
        return Array.from(yield* Stream.runCollect(Stream.take(decisionFrames(read), count)));
      }),
    );

  const environmentOf = (framed: string) =>
    Result.match(decodeStoredRecordString(dataOf(framed)), {
      onSuccess: (record) => `${record.evaluationId}@${record.environment}`,
      onFailure: (error) => `refused:${error.refusal._tag}`,
    });

  it.effect("a reader receives the backlog, then synced, then live frames", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      yield* log.ingest(obligations("b", 2));
      yield* log.ingest(obligations("a", 1));

      const frames = yield* framesOf(log, 4, log.ingest(obligations("live", 3)));

      assert.deepStrictEqual(frames.map(eventOf), ["backlog", "backlog", "synced", "message"]);
      // The backlog is in `storedRecordOrder`, not arrival order.
      assert.deepStrictEqual(
        [frames[0], frames[1], frames[3]].map((f) => environmentOf(f ?? "")),
        ["a@Server", "b@Server", "live@Server"],
      );
      const synced = Schema.decodeUnknownSync(Schema.fromJsonString(DecisionStreamSynced))(dataOf(frames[2] ?? ""));
      assert.deepStrictEqual(synced, { backlog: 2 });
    }));

  it.effect("an empty log still sends synced with backlog: 0", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      const frames = yield* framesOf(log, 1);
      assert.deepStrictEqual(frames, [syncedFrame(0)]);
      assert.strictEqual(dataOf(frames[0] ?? ""), '{"backlog":0}');
    }));

  it.effect("a record made while the prelude is being sent arrives once, live", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      yield* log.ingest(obligations("old"));
      // Made after `read` subscribed and took its snapshot, before any frame
      // was pulled: not in the prelude, so exactly once, live.
      const frames = yield* framesOf(log, 3, log.ingest(obligations("during")));
      assert.deepStrictEqual(frames.map(eventOf), ["backlog", "synced", "message"]);
      assert.deepStrictEqual([frames[0], frames[2]].map((f) => environmentOf(f ?? "")), ["old@Server", "during@Server"]);
    }));

  it.effect("an ingested Edge record is framed with environment: \"Edge\" (C10)", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      const frames = yield* framesOf(log, 2, log.ingest(obligations("edge-1"), "Edge"));
      assert.include(dataOf(frames[1] ?? ""), '"environment":"Edge"');
      assert.strictEqual(environmentOf(frames[1] ?? ""), "edge-1@Edge");
    }));

  it.effect("through the route: a permitted caller's response starts with the prelude", () =>
    Effect.gen(function* () {
      const { log, layer } = yield* appLayer;
      yield* log.ingest(obligations("past"), "Edge");
      const { handler } = HttpRouter.toWebHandler(layer);

      const response = yield* Effect.promise(() =>
        handler(new Request("http://localhost/__decisions", { headers: bearer(ALICE) })),
      );
      const body = response.body;
      assert.isNotNull(body);
      if (body === null) return;
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      // Read until the `synced` frame has arrived — bounded: the prelude is
      // finite and already available, so this never waits on a live record.
      while (!text.includes("event: synced")) {
        const chunk = yield* Effect.promise(() => reader.read());
        if (chunk.done) break;
        text += decoder.decode(chunk.value);
      }
      yield* Effect.promise(() => reader.cancel());

      const frames = text.split("\n\n").filter((f) => f.length > 0);
      assert.deepStrictEqual(frames.map(eventOf), ["backlog", "synced"]);
      assert.strictEqual(environmentOf(frames[0] ?? ""), "past@Edge");
    }));
});

/**
 * Resume on reconnect (ARCH-11 D-11-g): every record frame carries its cursor as
 * its SSE `id`, and a reconnect that sends one back as `Last-Event-ID` is sent
 * only what it missed. Read through the route's own response, since the header
 * is the route's input.
 */
describe("resume with Last-Event-ID", () => {
  const obligations = (evaluationId: string, at = 1) =>
    new ObligationRecord({ evaluationId, at, outcome: "Discharged", obligationIds: ["o"] });

  /** The route's response for one connection, read up to and including `synced`. */
  const prelude = (handler: (request: Request) => Promise<Response>, lastEventId?: string) =>
    Effect.gen(function* () {
      const response = yield* Effect.promise(() =>
        handler(
          new Request("http://localhost/__decisions", {
            headers: lastEventId === undefined ? bearer(ALICE) : { ...bearer(ALICE), "last-event-id": lastEventId },
          }),
        ),
      );
      const body = response.body;
      if (body === null) return assert.fail("no body");
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (!text.includes("event: synced")) {
        const chunk = yield* Effect.promise(() => reader.read());
        if (chunk.done) break;
        text += decoder.decode(chunk.value);
      }
      yield* Effect.promise(() => reader.cancel());
      return text.split("\n\n").filter((f) => f.length > 0);
    });

  const idOf = (framed: string): string | undefined =>
    framed.split("\n").find((line) => line.startsWith("id: "))?.slice(4);

  it.effect("every backlog frame carries its cursor as its id; synced carries none", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(1_700);
      const { log, layer } = yield* appLayer;
      yield* log.ingest(obligations("a"));
      yield* log.ingest(obligations("b"));
      const frames = yield* prelude(HttpRouter.toWebHandler(layer).handler);

      assert.deepStrictEqual(frames.map(idOf), ["1700.1", "1700.2", undefined]);
    }));

  it.effect("a reconnect with Last-Event-ID receives only missed records, then synced", () =>
    Effect.gen(function* () {
      const { log, layer } = yield* appLayer;
      const { handler } = HttpRouter.toWebHandler(layer);
      yield* log.ingest(obligations("seen"));
      const first = yield* prelude(handler);
      const lastSeen = idOf(first[0] ?? "");
      assert.isDefined(lastSeen);

      // The connection drops; two records are made while it is down.
      yield* log.ingest(obligations("missed-1"));
      yield* log.ingest(obligations("missed-2"));
      const resumed = yield* prelude(handler, lastSeen);

      assert.deepStrictEqual(resumed.map(eventOf), ["backlog", "backlog", "synced"]);
      assert.deepStrictEqual(
        resumed.slice(0, 2).map((f) => Result.getOrUndefined(Result.map(decodeStoredRecordString(dataOf(f)), (r) => r.evaluationId))),
        ["missed-1", "missed-2"],
      );
      assert.strictEqual(dataOf(resumed[2] ?? ""), '{"backlog":2}');
    }));

  it.effect("a Last-Event-ID that is not this log's cursor gets the full backlog", () =>
    Effect.gen(function* () {
      const { log, layer } = yield* appLayer;
      const { handler } = HttpRouter.toWebHandler(layer);
      yield* log.ingest(obligations("a"));
      yield* log.ingest(obligations("b"));

      for (const header of ["not-a-cursor", "1.1.1", "999.1"]) {
        const frames = yield* prelude(handler, header);
        assert.deepStrictEqual(frames.map(eventOf), ["backlog", "backlog", "synced"], header);
      }
    }));
});

