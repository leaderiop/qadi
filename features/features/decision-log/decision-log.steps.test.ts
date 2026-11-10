/**
 * Steps for `decision-log.feature`.
 *
 * End to end through the public interface of three packages: a `@qadi/core`
 * decision log, `@qadi/http`'s devtools routes serving it through a real
 * `HttpRouter` web handler, and `@qadi/devtools`' `sourceFromEventSource`
 * reading the route's response bytes through an `EventSource` stand-in that
 * parses them with `effect/encoding/Sse`'s own parser. The reader's url and the
 * routes' prefix both come from `devtoolsPath`, so a reader that asks anywhere
 * else gets the router's 404. Nothing between the log and the reader is faked,
 * so "the reader over SSE sees what a reader in the process sees" is the
 * differential ARCH-11 asks for: the same log read in the process and over the
 * wire must hold the same records.
 *
 * A dedicated `Context.Service` World, scoped to this Feature only — the same
 * reasoning as `merged-sources.steps.test.ts`. The reader's scope lives in the
 * World across steps and is closed in `After`, which closes the connection.
 */
import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import * as Sse from "effect/encoding/Sse";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServer from "effect/http/HttpServer";
import {
  currentSubjectLayer,
  DecisionStreamEvent,
  EvaluationServicesNone,
  evaluate,
  hasPermission,
  makeDecisionLog,
  makeSubject,
  ObligationRecord,
  permission,
  permissionKey,
} from "@qadi/core";
import type { AuthSubject, DecisionLog, StoredRecord } from "@qadi/core";
import { sourceFromEventSource } from "@qadi/devtools";
import type { DecisionEventSource, SourceRead } from "@qadi/devtools";
import { devtoolsPath, devtoolsRoutes, PermissionRegistryLive, subjectExtractorBearer } from "@qadi/http";

const feature = await loadFeature(fileURLToPath(new URL("./decision-log.feature", import.meta.url)));

const readDevtools = permission("devtools", "read");
const canReadDevtools = hasPermission(readDevtools);
const reader = makeSubject({ id: "reader", permissions: [permissionKey(readDevtools)] });
const asked = permission("doc", "read");
const author = makeSubject({ id: "author", permissions: [permissionKey(asked)] });

const isDecisionEvent = Schema.is(DecisionStreamEvent);

/**
 * The devtools routes over `log`, mounted under `prefix`, as a web handler a `fetch`-shaped caller
 * can drive: the real router, so a request at any other path is its 404.
 */
const serve = (log: DecisionLog, prefix?: `/${string}`) => {
  const route = devtoolsRoutes(readDevtools, canReadDevtools, log, { prefix });
  const withRegistry = route.pipe(Layer.provideMerge(PermissionRegistryLive));
  const withSubjects = withRegistry.pipe(
    Layer.provideMerge(subjectExtractorBearer((): Effect.Effect<AuthSubject> => Effect.succeed(reader))),
  );
  const withServices = withSubjects.pipe(Layer.provideMerge(EvaluationServicesNone));
  return HttpRouter.toWebHandler(withServices.pipe(Layer.provideMerge(HttpServer.layerServices))).handler;
};

/**
 * An `EventSource` that reads `handler`'s response: the bytes are parsed with
 * the platform's own SSE parser and each event is handed to its listener, as a
 * browser would. Closing interrupts the read, which cancels the body.
 *
 * With `dropAfterBacklog`, the first connection drops right after that many
 * `backlog` events — the rest of its bytes are never delivered — and the source
 * reconnects at once, sending the last event id it saw as `Last-Event-ID`, as a
 * browser does.
 */
const pipedEventSource =
  (handler: (request: Request) => Promise<Response>, dropAfterBacklog?: number) =>
  (url: string): DecisionEventSource => {
    const listeners = new Map<DecisionStreamEvent, (data: string) => void>();
    let lastEventId: string | undefined;
    const decoder = new TextDecoder();
    const connect = (dropAfter: number | undefined): Effect.Effect<void> =>
      Effect.gen(function* () {
        let backlogSeen = 0;
        let dropped = false;
        const parser = Sse.makeParser((event) => {
          if (dropped || event._tag !== "Event" || !isDecisionEvent(event.event)) return;
          if (event.id !== undefined) lastEventId = event.id;
          listeners.get(event.event)?.(event.data);
          if (event.event === "backlog") backlogSeen += 1;
          if (backlogSeen === dropAfter) dropped = true;
        });
        const headers = new Headers({ authorization: "Bearer reader" });
        if (lastEventId !== undefined) headers.set("last-event-id", lastEventId);
        const response = yield* Effect.promise(() => handler(new Request(`http://localhost${url}`, { headers })));
        assert.equal(response.status, 200);
        const body = response.body;
        if (body === null) return false;
        const bytes = body.getReader();
        yield* Effect.addFinalizer(() => Effect.promise(() => bytes.cancel()));
        const next: Effect.Effect<boolean> = Effect.flatMap(
          Effect.promise(() => bytes.read()),
          (chunk) => {
            if (chunk.done) return Effect.succeed(false);
            parser.feed(decoder.decode(chunk.value, { stream: true }));
            return dropped ? Effect.succeed(true) : next;
          },
        );
        return yield* next;
      }).pipe(
        Effect.scoped,
        Effect.flatMap((dropped) => (dropped ? connect(undefined) : Effect.void)),
      );
    const fiber = Effect.runFork(connect(dropAfterBacklog));
    return {
      onEvent: (event, listener) => {
        listeners.set(event, listener);
      },
      onError: () => {},
      close: () => {
        Effect.runFork(Fiber.interrupt(fiber));
      },
    };
  };

interface DecisionLogWorldState {
  readonly log: DecisionLog | undefined;
  /** Where the host mounted the devtools routes; absent, at the root. */
  readonly prefix: `/${string}` | undefined;
  readonly scope: Scope.Closeable | undefined;
  readonly sse: SourceRead | undefined;
  readonly seen: ReadonlyArray<StoredRecord>;
}

const initialState: DecisionLogWorldState = { log: undefined, prefix: undefined, scope: undefined, sse: undefined, seen: [] };

export interface WorldShape {
  readonly state: Ref.Ref<DecisionLogWorldState>;
}

export class World extends Context.Service<World, WorldShape>()("features/decision-log/World") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      return World.of({ state: yield* Ref.make(initialState) });
    }),
  );
}

const state = Effect.fn("decision-log.state")(function* () {
  const { state } = yield* World;
  return yield* Ref.get(state);
});

const patch = Effect.fn("decision-log.patch")(function* (next: Partial<DecisionLogWorldState>) {
  const { state } = yield* World;
  yield* Ref.update(state, (s) => ({ ...s, ...next }));
});

const theLog = Effect.fn("decision-log.log")(function* () {
  const { log } = yield* state();
  assert.ok(log !== undefined, "no decision log yet");
  return log;
});

const theRead = Effect.fn("decision-log.read")(function* () {
  const { sse } = yield* state();
  assert.ok(sse !== undefined, "no reader has connected");
  return sse;
});

/** One real evaluation, recorded by the log. */
const decide = (log: DecisionLog) =>
  evaluate(hasPermission(asked)).pipe(
    Effect.provide(Layer.mergeAll(EvaluationServicesNone, currentSubjectLayer(author), log.layer)),
    Effect.orDie,
  );

/** The next `count` live records — all already published, so the take ends. */
const takeLive = Effect.fn("decision-log.takeLive")(function* (count: number) {
  const sse = yield* theRead();
  const got = Array.from(yield* Stream.runCollect(Stream.take(sse.live, count)));
  yield* patch({ seen: [...(yield* state()).seen, ...got] });
  return got;
});

/** A record's identity in a timeline: the slot it would occupy. */
const slot = (record: StoredRecord) => `${record._tag}|${record.environment}|${record.evaluationId}|${record.at}`;

describeFeature(feature, World.layer, ({ After, Before, Given, When, Then }) => {
  Before(function* () {
    const { state } = yield* World;
    yield* Ref.set(state, initialState);
  });

  After(function* () {
    const { scope } = yield* state();
    if (scope !== undefined) yield* Scope.close(scope, Exit.void);
  });

  Given("a server decision log holding {int} decision(s)", function* (count: number) {
    const log = yield* makeDecisionLog({ environment: "Server" });
    for (let i = 0; i < count; i += 1) yield* decide(log);
    yield* patch({ log });
  });

  Given("the devtools routes are mounted under {string}", function* (prefix: string) {
    assert.ok(prefix.startsWith("/"), "a prefix starts with a slash");
    yield* patch({ prefix: `/${prefix.slice(1)}` });
  });

  When("a devtools reader connects over SSE", function* () {
    const log = yield* theLog();
    const { prefix } = yield* state();
    const source = sourceFromEventSource({
      url: devtoolsPath("decisions", prefix),
      open: pipedEventSource(serve(log, prefix)),
    });
    const scope = yield* Scope.make();
    const sse = yield* source.read.pipe(Scope.provide(scope));
    yield* patch({ scope, sse, seen: sse.backlog ?? [] });
  });

  Given("a server decision log holding {int} records whose times run backwards", function* (count: number) {
    const log = yield* makeDecisionLog({ environment: "Server" });
    // Each arrives later and says it was decided earlier: `at` order is the reverse
    // of arrival order, as with overlapping evaluations or an Edge ingest.
    for (let i = 0; i < count; i += 1) {
      yield* log.ingest(
        new ObligationRecord({ evaluationId: `back-${i}`, at: count - i, outcome: "Discharged", obligationIds: [] }),
      );
    }
    yield* patch({ log });
  });

  When(
    "a devtools reader connects over SSE and the connection drops after {int} backlog frame(s)",
    function* (frames: number) {
      const log = yield* theLog();
      const source = sourceFromEventSource({
        url: devtoolsPath("decisions"),
        open: pipedEventSource(serve(log), frames),
      });
      const scope = yield* Scope.make();
      const sse = yield* source.read.pipe(Scope.provide(scope));
      yield* patch({ scope, sse, seen: sse.backlog ?? [] });
    },
  );

  When("the server decides again", function* () {
    yield* decide(yield* theLog());
  });

  When("the log ingests a record from {string}", function* (environment: string) {
    const log = yield* theLog();
    yield* log.ingest(
      new ObligationRecord({ evaluationId: "edge-1", at: 1, outcome: "Discharged", obligationIds: [] }),
      environment,
    );
  });

  Then("its backlog holds {int} records labelled {string}", function* (count: number, environment: string) {
    const { backlog } = yield* theRead();
    // Present, even when empty: this server can answer for its past.
    assert.ok(backlog !== undefined, "the reader has no backlog");
    assert.equal(backlog.length, count);
    assert.ok(backlog.every((record) => record.environment === environment));
  });

  Then("the reader receives {int} live record(s) labelled {string}", function* (count: number, environment: string) {
    const live = yield* takeLive(count);
    assert.equal(live.length, count);
    assert.ok(live.every((record) => record.environment === environment));
  });

  Then("no record reaches the reader twice", function* () {
    const { seen } = yield* state();
    const slots = seen.map(slot);
    assert.equal(new Set(slots).size, slots.length);
  });

  Then("the reader holds each of the {int} records once", function* (count: number) {
    const log = yield* theLog();
    const { backlog } = yield* theRead();
    // A sentinel made now ends the live read: whatever the reconnect sent live
    // arrives before it.
    yield* log.ingest(
      new ObligationRecord({ evaluationId: "sentinel", at: 0, outcome: "Discharged", obligationIds: [] }),
    );
    const sse = yield* theRead();
    const live = Array.from(
      yield* Stream.runCollect(Stream.takeUntil(sse.live, (record) => record.evaluationId === "sentinel")),
    );
    const held = [...(backlog ?? []), ...live]
      .map((record) => record.evaluationId)
      .filter((id) => id !== "sentinel")
      .sort();
    assert.deepEqual(held, Array.from({ length: count }, (_, i) => `back-${i}`));
  });

  Then("a reader at the unprefixed path gets no stream", function* () {
    const log = yield* theLog();
    const { prefix } = yield* state();
    const handler = serve(log, prefix);
    const request = new Request(`http://localhost${devtoolsPath("decisions")}`, {
      headers: { authorization: "Bearer reader" },
    });
    const response = yield* Effect.promise(() => handler(request));
    assert.equal(response.status, 404);
  });

  Then("the reader over SSE and a reader in the process hold the same records", function* () {
    const log = yield* theLog();
    const { backlog } = yield* theRead();
    const overSse = [...(backlog ?? []), ...(yield* takeLive(1))];
    const inProcess = yield* log.snapshot;
    assert.deepEqual(overSse.map(slot).sort(), inProcess.map(slot).sort());
    // The environment arrived on the wire, not from the reader: one log, two labels.
    assert.deepEqual([...new Set(overSse.map((record) => record.environment))].sort(), ["Edge", "Server"]);
  });
});
