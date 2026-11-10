/**
 * The port route family and the client layer, end to end over
 * `HttpRouter.toWebHandler` (ARCH-31 T6, ADR-QD-107).
 *
 * The client's `FetchHttpClient.Fetch` is provided as the web handler, so what
 * crosses is exactly an HTTP request and response. For every port in the
 * registry: answered, unavailable (503), another subject (403), malformed
 * (400), not served (404) and unencodable (500); the asker sees the port's own
 * error carrying the matching remote failure, and no server cause text.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Record from "effect/Record";
import * as Result from "effect/Result";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServer from "effect/http/HttpServer";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import {
  anonymous,
  EvaluationIdLive,
  forEveryPort,
  hasPermission,
  makeResourceId,
  makeSubject,
  makeSubjectId,
  permission,
  permissionKey,
  PORTS,
  portsLayer,
  PortReply,
  scriptedPort,
} from "@qadi/core";
import type {
  AnswerOf,
  ArgsOf,
  AuthSubject,
  DescriptionOf,
  PortName,
  PortServices,
  PortServing,
  PortServingOf,
  PortTypes,
} from "@qadi/core";
import { collectingLogger } from "@qadi/testing";
import { permissionRegistryRouteUnguarded } from "../src/PermissionRegistry.ts";
import { PORT_REPLY_STATUS, portRoutes, portRoutesUnguarded } from "../src/PortRoutes.ts";
import type { PortRoutesOptions } from "../src/PortRoutes.ts";
import { PORT_ROUTE_PREFIX, portPath } from "../src/PortRouteAddress.ts";
import { remotePortsLayer } from "../src/RemotePorts.ts";
import { SubjectExtractionFailed, subjectExtractorBearer } from "../src/SubjectExtractor.ts";
import { stack } from "./fixtures/stack.ts";

const readPorts = permission("ports", "read");
const readPolicy = hasPermission(readPorts);
const aliceId = makeSubjectId("alice");
const bobId = makeSubjectId("bob");
const alice = makeSubject({
  id: "alice",
  roles: ["editor"],
  permissions: [permissionKey(readPorts)],
  attributes: {},
});
const bob = makeSubject({ id: "bob", roles: [], permissions: [], attributes: {} });
const doc = makeResourceId("doc-1");

const lookup = (token: string): Effect.Effect<AuthSubject> =>
  Effect.succeed(token === "alice-token" ? alice : bob);
const subjects = subjectExtractorBearer(lookup);

interface Case<K extends PortName> {
  readonly args: ArgsOf<PortTypes[K]>;
  readonly answer: AnswerOf<PortTypes[K]>;
  readonly other: ArgsOf<PortTypes[K]>;
  readonly serving: PortServingOf<K>;
  readonly unserved: PortServingOf<K> | undefined;
}

const CASES: { readonly [K in PortName]: Case<K> } = {
  AttributeResolver: {
    args: [aliceId, "clearance"],
    answer: { level: 3 },
    other: [bobId, "clearance"],
    serving: { attributes: ["clearance"] },
    unserved: { attributes: ["constructor"] },
  },
  DecisionHistory: {
    args: [{ subjectId: aliceId, event: "approved", resourceId: doc }],
    answer: "Acted",
    other: [{ subjectId: bobId, event: "approved", resourceId: doc }],
    serving: { events: ["approved"] },
    unserved: { events: ["rejected"] },
  },
  RelationshipResolver: {
    args: [{ subjectId: aliceId, relation: "owner", resourceId: doc, depth: 2 }],
    answer: "Related",
    other: [{ subjectId: bobId, relation: "owner", resourceId: doc, depth: 2 }],
    serving: { relations: ["owner"] },
    unserved: { relations: [] },
  },
  CustomPredicate: {
    args: ["isOwner", alice, { id: "doc-1" }, { strict: true }],
    answer: true,
    other: ["isOwner", bob, { id: "doc-1" }, { strict: true }],
    serving: { names: ["isOwner"] },
    unserved: { names: ["isEditor"] },
  },
  SignatureHistory: {
    args: [{ subjectId: aliceId, resourceId: doc }],
    answer: [{ signerId: aliceId, meaning: "approved", signedAt: 0 }],
    other: [{ subjectId: bobId, resourceId: doc }],
    serving: { signatures: "own-records" },
    unserved: undefined,
  },
};

type Form = "guarded" | "unguarded";

/** The route family over `store`, as a web handler. */
const serve = (
  store: Layer.Layer<PortServices>,
  serving: PortServing,
  form: Form,
  options?: PortRoutesOptions,
) => {
  const routes =
    form === "guarded"
      ? portRoutes(readPorts, readPolicy, serving, options)
      : portRoutesUnguarded("test: answers only about the session's own subject", serving, options);
  return HttpRouter.toWebHandler(
    stack(routes, subjects, Layer.merge(store, EvaluationIdLive)),
    { disableLogger: true },
  );
};

/** A client layer whose `fetch` is `handler`, authenticated as `token`. */
const clientFor = (
  handler: (request: Request) => Promise<Response>,
  ports: ReadonlyArray<PortName>,
  token: string,
  prefix?: PortRoutesOptions["prefix"],
) =>
  remotePortsLayer({ baseUrl: "http://srv.test", ports, prefix }).pipe(
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(
      Layer.succeed(FetchHttpClient.Fetch, (input, init) => handler(new Request(input, init))),
    ),
    Layer.provide(
      Layer.succeed(FetchHttpClient.RequestInit, { headers: { authorization: `Bearer ${token}` } }),
    ),
  );

const rendered = (error: unknown): string =>
  `${String(Reflect.get(Object(error), "message"))} ${JSON.stringify(error)}`;

const post = (
  handler: (request: Request) => Promise<Response>,
  port: PortName,
  body: string,
  token?: string,
  prefix = "/__ports",
) =>
  Effect.promise(() =>
    handler(
      new Request(`http://srv.test${prefix}/${port}`, {
        method: "POST",
        body,
        headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
      }),
    ),
  );

const routeCase = <K extends PortName>(d: DescriptionOf<K>, c: Case<K>) => {
  const answering = portsLayer({ [d.port]: scriptedPort(d, () => PortReply.answer(c.answer)).layer });

  const run = <A, E>(
    form: Form,
    store: Layer.Layer<PortServices>,
    serving: PortServing,
    args: ArgsOf<PortTypes[K]>,
    use: (effect: Effect.Effect<AnswerOf<PortTypes[K]>, unknown>) => Effect.Effect<A, E>,
  ) =>
    Effect.acquireUseRelease(
      Effect.sync(() => serve(store, serving, form)),
      ({ handler }) =>
        Effect.scoped(
          Effect.gen(function* () {
            const context = yield* Layer.build(clientFor(handler, [d.port], "alice-token"));
            const shape = Context.get(context, d.service);
            return yield* use(d.invoke(shape)(...args));
          }),
        ),
      ({ dispose }) => Effect.promise(dispose),
    );

  const servingOf = (declared: PortServingOf<K>): PortServing => ({ [d.port]: declared });

  for (const form of ["guarded", "unguarded"] as const) {
    describe(`${d.port}, ${form}`, () => {
      it.effect("answered", () =>
        run(form, answering, servingOf(c.serving), c.args, (ask) => ask).pipe(
          Effect.map((answer) => assert.deepStrictEqual(answer, c.answer)),
        ));

      it.effect("an outage is the port's own error, 503 on the wire, no server cause", () =>
        run(
          form,
          portsLayer({ [d.port]: scriptedPort(d, () => PortReply.fail("the-secret-store-is-down")).layer }),
          servingOf(c.serving),
          c.args,
          Effect.flip,
        ).pipe(
          Effect.map((error) => {
            assert.strictEqual(Reflect.get(Object(error), "_tag"), d.failure(c.args, "x")._tag);
            assert.include(rendered(error), "Unavailable");
            assert.notInclude(rendered(error), "the-secret-store-is-down");
          }),
        ));

      it.effect("a question about another subject is refused", () =>
        run(form, answering, servingOf(c.serving), c.other, Effect.flip).pipe(
          Effect.map((error) => assert.include(rendered(error), "SubjectMismatch")),
        ));

      it.effect("a question outside the declaration is refused", () =>
        c.unserved === undefined
          ? Effect.void
          : run(form, answering, servingOf(c.unserved), c.args, Effect.flip).pipe(
              Effect.map((error) => assert.include(rendered(error), "NotServed")),
            ));
    });
  }
};

describe("the port routes (ADR-QD-107)", () => {
  const RUN: { readonly [K in PortName]: () => void } = {
    AttributeResolver: () => routeCase(PORTS.AttributeResolver, CASES.AttributeResolver),
    DecisionHistory: () => routeCase(PORTS.DecisionHistory, CASES.DecisionHistory),
    RelationshipResolver: () => routeCase(PORTS.RelationshipResolver, CASES.RelationshipResolver),
    CustomPredicate: () => routeCase(PORTS.CustomPredicate, CASES.CustomPredicate),
    SignatureHistory: () => routeCase(PORTS.SignatureHistory, CASES.SignatureHistory),
  };
  for (const run of Record.values(RUN)) run();
});

describe("the address (ARCH-52)", () => {
  it("the default prefix is /__ports and a path is <prefix>/<PortName>", () => {
    assert.strictEqual(PORT_ROUTE_PREFIX, "/__ports");
    assert.strictEqual(portPath(undefined, "AttributeResolver"), "/__ports/AttributeResolver");
    assert.strictEqual(portPath("/x/ports", "SignatureHistory"), "/x/ports/SignatureHistory");
  });

  it("a trailing slash on the prefix never yields a // in the path", () => {
    assert.strictEqual(portPath("/x/ports/", "SignatureHistory"), "/x/ports/SignatureHistory");
    assert.strictEqual(portPath("/x/ports//", "SignatureHistory"), "/x/ports/SignatureHistory");
    assert.strictEqual(portPath("/", "AttributeResolver"), "/AttributeResolver");
  });
});

describe("one address on both sides (ARCH-52)", () => {
  // The prefix is a literal here, and so is every URL below: the address module is the thing both
  // adapters share, so a test that took its answer from it could not tell the adapters apart.
  const PREFIX = "/x/ports";
  const ALL_PORTS = forEveryPort((d): PortName => d.port);

  const store = portsLayer({
    AttributeResolver: scriptedPort(PORTS.AttributeResolver, () => PortReply.answer(CASES.AttributeResolver.answer))
      .layer,
    DecisionHistory: scriptedPort(PORTS.DecisionHistory, () => PortReply.answer(CASES.DecisionHistory.answer))
      .layer,
    RelationshipResolver: scriptedPort(PORTS.RelationshipResolver, () =>
      PortReply.answer(CASES.RelationshipResolver.answer),
    ).layer,
    CustomPredicate: scriptedPort(PORTS.CustomPredicate, () => PortReply.answer(CASES.CustomPredicate.answer))
      .layer,
    SignatureHistory: scriptedPort(PORTS.SignatureHistory, () => PortReply.answer(CASES.SignatureHistory.answer))
      .layer,
  });
  const serving: PortServing = {
    AttributeResolver: CASES.AttributeResolver.serving,
    DecisionHistory: CASES.DecisionHistory.serving,
    RelationshipResolver: CASES.RelationshipResolver.serving,
    CustomPredicate: CASES.CustomPredicate.serving,
    SignatureHistory: CASES.SignatureHistory.serving,
  };

  /** Asks one port through the built client and requires exactly the scripted answer. */
  const asking =
    <K extends PortName>(d: DescriptionOf<K>, c: Case<K>) =>
    (context: Context.Context<PortServices>): Effect.Effect<void, unknown> =>
      d.invoke(Context.get(context, d.service))(...c.args).pipe(
        Effect.map((answer) => assert.deepStrictEqual(answer, c.answer)),
      );

  const ASK: { readonly [K in PortName]: (context: Context.Context<PortServices>) => Effect.Effect<void, unknown> } =
    {
      AttributeResolver: asking(PORTS.AttributeResolver, CASES.AttributeResolver),
      DecisionHistory: asking(PORTS.DecisionHistory, CASES.DecisionHistory),
      RelationshipResolver: asking(PORTS.RelationshipResolver, CASES.RelationshipResolver),
      CustomPredicate: asking(PORTS.CustomPredicate, CASES.CustomPredicate),
      SignatureHistory: asking(PORTS.SignatureHistory, CASES.SignatureHistory),
    };

  const aliceQuestion = JSON.stringify({ subjectId: "alice", attribute: "clearance" });

  for (const form of ["guarded", "unguarded"] as const) {
    it.effect(`${form}: every port answers under ${PREFIX}, asked by a client on the same prefix`, () =>
      Effect.acquireUseRelease(
        Effect.sync(() => serve(store, serving, form, { prefix: PREFIX })),
        ({ handler }) =>
          Effect.scoped(
            Effect.gen(function* () {
              const context = yield* Layer.build(clientFor(handler, ALL_PORTS, "alice-token", PREFIX));
              for (const ask of Record.values(ASK)) yield* ask(context);
            }),
          ),
        ({ dispose }) => Effect.promise(dispose),
      ));

    it.effect(`${form}: the routes are at ${PREFIX} and nowhere else`, () =>
      Effect.acquireUseRelease(
        Effect.sync(() => serve(store, serving, form, { prefix: PREFIX })),
        ({ handler }) =>
          Effect.gen(function* () {
            const there = yield* post(handler, "AttributeResolver", aliceQuestion, "alice-token", PREFIX);
            assert.strictEqual(there.status, 200);
            const defaultPrefix = yield* post(handler, "AttributeResolver", aliceQuestion, "alice-token");
            assert.strictEqual(defaultPrefix.status, 404);
          }),
        ({ dispose }) => Effect.promise(dispose),
      ));

    it.effect(`${form}: a client left on the default prefix gets the port's own error, never an answer`, () =>
      Effect.acquireUseRelease(
        Effect.sync(() => serve(store, serving, form, { prefix: PREFIX })),
        ({ handler }) =>
          Effect.scoped(
            Effect.gen(function* () {
              const context = yield* Layer.build(clientFor(handler, ["AttributeResolver"], "alice-token"));
              const d = PORTS.AttributeResolver;
              const error = yield* d
                .invoke(Context.get(context, d.service))(...CASES.AttributeResolver.args)
                .pipe(Effect.flip);
              assert.strictEqual(
                Reflect.get(Object(error), "_tag"),
                d.failure(CASES.AttributeResolver.args, "x")._tag,
              );
            }),
          ),
        ({ dispose }) => Effect.promise(dispose),
      ));
  }

  it.effect("guarded: a subject without the permission is still denied under the prefix", () =>
    Effect.acquireUseRelease(
      Effect.sync(() => serve(store, serving, "guarded", { prefix: PREFIX })),
      ({ handler }) =>
        Effect.gen(function* () {
          const body = JSON.stringify({ subjectId: "bob", attribute: "clearance" });
          assert.strictEqual((yield* post(handler, "AttributeResolver", body, "bob-token", PREFIX)).status, 403);
        }),
      ({ dispose }) => Effect.promise(dispose),
    ));
});

describe("the client reads the reply from the body, whatever the status (ARCH-52)", () => {
  /** A server whose one route, the AttributeResolver's, answers `response` and nothing else. */
  const canned = (response: HttpServerResponse.HttpServerResponse) =>
    HttpRouter.toWebHandler(
      HttpRouter.add("POST", "/__ports/AttributeResolver", response).pipe(
        Layer.provideMerge(HttpServer.layerServices),
      ),
      { disableLogger: true },
    );

  /** The AttributeResolver's `clearance` read through a client whose server sent `response`. */
  const asked = (response: HttpServerResponse.HttpServerResponse) =>
    Effect.acquireUseRelease(
      Effect.sync(() => canned(response)),
      ({ handler }) =>
        Effect.scoped(
          Effect.gen(function* () {
            const context = yield* Layer.build(clientFor(handler, ["AttributeResolver"], "alice-token"));
            const d = PORTS.AttributeResolver;
            return yield* Effect.result(d.invoke(Context.get(context, d.service))(aliceId, "clearance"));
          }),
        ),
      ({ dispose }) => Effect.promise(dispose),
    );

  const failureTag = PORTS.AttributeResolver.failure(CASES.AttributeResolver.args, "x")._tag;

  it.effect("an answer under a 503 is still read as the answer", () =>
    asked(
      HttpServerResponse.jsonUnsafe(
        { _tag: "Answered", answer: { value: { level: 3 } } },
        { status: 503 },
      ),
    ).pipe(
      Effect.map((result) => {
        assert.isTrue(Result.isSuccess(result));
        if (Result.isSuccess(result)) assert.deepStrictEqual(result.success, { level: 3 });
      }),
    ));

  it.effect("a refusal under a 200 is still the port's own error, never an answer", () =>
    asked(HttpServerResponse.jsonUnsafe({ _tag: "Refused", reason: "NotServed" }, { status: 200 })).pipe(
      Effect.map((result) => {
        assert.isTrue(Result.isFailure(result));
        if (Result.isFailure(result)) {
          assert.strictEqual(Reflect.get(Object(result.failure), "_tag"), failureTag);
          assert.include(rendered(result.failure), "NotServed");
        }
      }),
    ));

  it.effect("a proxy's HTML page under a 502 is the port's own error, never an answer", () =>
    asked(HttpServerResponse.text("<html>Bad Gateway</html>", { status: 502, contentType: "text/html" })).pipe(
      Effect.map((result) => {
        assert.isTrue(Result.isFailure(result));
        if (Result.isFailure(result)) {
          assert.strictEqual(Reflect.get(Object(result.failure), "_tag"), failureTag);
          assert.include(rendered(result.failure), "Transport");
        }
      }),
    ));
});

describe("what is on the wire", () => {
  const question = JSON.stringify({ subjectId: "alice", attribute: "clearance" });
  const store = portsLayer({
    AttributeResolver: scriptedPort(PORTS.AttributeResolver, () => PortReply.answer({ level: 3 })).layer,
  });
  const serving: PortServing = { AttributeResolver: { attributes: ["clearance"] } };

  it.effect("every reply is JSON, never cached, with the status the table says", () =>
    Effect.acquireUseRelease(
      Effect.sync(() => serve(store, serving, "guarded")),
      ({ handler }) =>
        Effect.gen(function* () {
          const ok = yield* post(handler, "AttributeResolver", question, "alice-token");
          assert.strictEqual(ok.status, 200);
          assert.strictEqual(ok.headers.get("cache-control"), "no-store");
          assert.deepStrictEqual(yield* Effect.promise(() => ok.json()), {
            _tag: "Answered",
            answer: { value: { level: 3 } },
          });

          const malformed = yield* post(handler, "AttributeResolver", "not json at all", "alice-token");
          assert.strictEqual(malformed.status, 400);
          assert.strictEqual(malformed.headers.get("cache-control"), "no-store");
          assert.deepStrictEqual(yield* Effect.promise(() => malformed.json()), {
            _tag: "Refused",
            reason: "Malformed",
          });

          const wrongSubject = yield* post(
            handler,
            "AttributeResolver",
            JSON.stringify({ subjectId: "bob", attribute: "clearance" }),
            "alice-token",
          );
          assert.strictEqual(wrongSubject.status, 403);
          assert.deepStrictEqual(yield* Effect.promise(() => wrongSubject.json()), {
            _tag: "Refused",
            reason: "SubjectMismatch",
          });

          const notServed = yield* post(
            handler,
            "AttributeResolver",
            JSON.stringify({ subjectId: "alice", attribute: "constructor" }),
            "alice-token",
          );
          assert.strictEqual(notServed.status, 404);
        }),
      ({ dispose }) => Effect.promise(dispose),
    ));

  it.effect("an unencodable answer is a 500 refusal that names nothing", () =>
    Effect.acquireUseRelease(
      Effect.sync(() =>
        serve(
          portsLayer({
            AttributeResolver: scriptedPort(PORTS.AttributeResolver, () => PortReply.answer(new Set(["a"]))).layer,
          }),
          serving,
          "guarded",
        ),
      ),
      ({ handler }) =>
        Effect.gen(function* () {
          const response = yield* post(handler, "AttributeResolver", question, "alice-token");
          assert.strictEqual(response.status, 500);
          assert.deepStrictEqual(yield* Effect.promise(() => response.json()), {
            _tag: "Refused",
            reason: "Unencodable",
          });
        }),
      ({ dispose }) => Effect.promise(dispose),
    ));

  it.effect("a port not named in the declaration has no route", () =>
    Effect.acquireUseRelease(
      Effect.sync(() => serve(store, serving, "guarded")),
      ({ handler }) =>
        Effect.gen(function* () {
          const response = yield* post(handler, "CustomPredicate", "{}", "alice-token");
          assert.strictEqual(response.status, 404);
        }),
      ({ dispose }) => Effect.promise(dispose),
    ));

  it.effect("the status table is closed over every reply", () =>
    Effect.sync(() => {
      assert.strictEqual(PORT_REPLY_STATUS({ _tag: "Answered", answer: null }), 200);
      assert.strictEqual(PORT_REPLY_STATUS({ _tag: "Unavailable" }), 503);
      assert.strictEqual(PORT_REPLY_STATUS({ _tag: "Refused", reason: "Malformed" }), 400);
      assert.strictEqual(PORT_REPLY_STATUS({ _tag: "Refused", reason: "SubjectMismatch" }), 403);
      assert.strictEqual(PORT_REPLY_STATUS({ _tag: "Refused", reason: "NotServed" }), 404);
      assert.strictEqual(PORT_REPLY_STATUS({ _tag: "Refused", reason: "Unencodable" }), 500);
    }));
});

describe("the guarded form", () => {
  const store = portsLayer({
    AttributeResolver: scriptedPort(PORTS.AttributeResolver, () => PortReply.answer(1)).layer,
  });
  const serving: PortServing = { AttributeResolver: { attributes: ["clearance"] } };

  it.effect("denies a subject without the permission, before the port is read", () =>
    Effect.acquireUseRelease(
      Effect.sync(() => serve(store, serving, "guarded")),
      ({ handler }) =>
        Effect.gen(function* () {
          const body = JSON.stringify({ subjectId: "bob", attribute: "clearance" });
          assert.strictEqual((yield* post(handler, "AttributeResolver", body, "bob-token")).status, 403);
          assert.strictEqual((yield* post(handler, "AttributeResolver", body)).status, 403);
        }),
      ({ dispose }) => Effect.promise(dispose),
    ));

  it.effect("is listed in the permission registry, every served path", () =>
    Effect.acquireUseRelease(
      Effect.sync(() =>
        HttpRouter.toWebHandler(
          stack(
            Layer.merge(
              portRoutes(readPorts, readPolicy, {
                AttributeResolver: { attributes: ["a"] },
                DecisionHistory: {},
              }),
              permissionRegistryRouteUnguarded("test: reading the registry"),
            ),
            subjects,
            Layer.merge(store, EvaluationIdLive),
          ),
          { disableLogger: true },
        ),
      ),
      ({ handler }) =>
        Effect.gen(function* () {
          const response = yield* Effect.promise(() => handler(new Request("http://srv.test/__permissions")));
          const registry = yield* Effect.promise(() => response.text());
          assert.include(registry, "/__ports/AttributeResolver");
          assert.include(registry, "/__ports/DecisionHistory");
          assert.notInclude(registry, "/__ports/CustomPredicate");
        }),
      ({ dispose }) => Effect.promise(dispose),
    ));

  it.effect("mounts under the prefix a host chooses", () =>
    Effect.acquireUseRelease(
      Effect.sync(() =>
        HttpRouter.toWebHandler(
          stack(
            portRoutes(readPorts, readPolicy, serving, { prefix: "/ports" }),
            subjects,
            Layer.merge(store, EvaluationIdLive),
          ),
          { disableLogger: true },
        ),
      ),
      ({ handler }) =>
        Effect.gen(function* () {
          const response = yield* Effect.promise(() =>
            handler(
              new Request("http://srv.test/ports/AttributeResolver", {
                method: "POST",
                body: JSON.stringify({ subjectId: "alice", attribute: "clearance" }),
                headers: { authorization: "Bearer alice-token" },
              }),
            ),
          );
          assert.strictEqual(response.status, 200);
        }),
      ({ dispose }) => Effect.promise(dispose),
    ));
});

describe("the unguarded form", () => {
  it.effect("answers an anonymous subject about itself, and only itself", () =>
    Effect.acquireUseRelease(
      Effect.sync(() =>
        serve(
          portsLayer({
            AttributeResolver: scriptedPort(PORTS.AttributeResolver, () => PortReply.answer("anon")).layer,
          }),
          { AttributeResolver: { attributes: ["clearance"] } },
          "unguarded",
        ),
      ),
      ({ handler }) =>
        Effect.gen(function* () {
          const own = yield* post(
            handler,
            "AttributeResolver",
            JSON.stringify({ subjectId: anonymous.id, attribute: "clearance" }),
          );
          assert.strictEqual(own.status, 200);
          const other = yield* post(
            handler,
            "AttributeResolver",
            JSON.stringify({ subjectId: "alice", attribute: "clearance" }),
          );
          assert.strictEqual(other.status, 403);
        }),
      ({ dispose }) => Effect.promise(dispose),
    ));

  it.effect("logs a subject extraction failure once, as a guarded route does (ENF-03)", () => {
    const { lines, layer: logger } = collectingLogger();
    const double = scriptedPort(PORTS.AttributeResolver, () => PortReply.answer(1));
    const brokenStore = subjectExtractorBearer(() =>
      Effect.fail(new SubjectExtractionFailed({ reason: "token service unreachable" })),
    );
    return Effect.acquireUseRelease(
      Effect.sync(() =>
        HttpRouter.toWebHandler(
          stack(
            portRoutesUnguarded("test: answers only about the session's own subject", {
              AttributeResolver: { attributes: ["clearance"] },
            }),
            brokenStore,
            Layer.merge(portsLayer({ AttributeResolver: double.layer }), EvaluationIdLive),
          ).pipe(Layer.provideMerge(logger)),
          { disableLogger: true },
        ),
      ),
      ({ handler }) =>
        Effect.gen(function* () {
          const response = yield* post(
            handler,
            "AttributeResolver",
            JSON.stringify({ subjectId: "alice", attribute: "clearance" }),
            "alice-token",
          );
          assert.strictEqual(response.status, 502);
          // Error level only: the route's construction-time Warn line is not under test.
          assert.deepStrictEqual(
            lines.filter((line) => line.level === "Error").map((line) => line.message),
            [["qadi/http: subject extraction failed — token service unreachable"]],
          );
          assert.strictEqual(double.calls.length, 0);
        }),
      ({ dispose }) => Effect.promise(dispose),
    );
  });
});

describe("the unguarded form's warning", () => {
  it.effect("is logged once, at construction, however many requests and ports follow", () => {
    const reason = "test: answers only about the session's own subject";
    const { lines, layer: logger } = collectingLogger();
    return Effect.acquireUseRelease(
      Effect.sync(() =>
        HttpRouter.toWebHandler(
          stack(
            portRoutesUnguarded(reason, {
              AttributeResolver: { attributes: ["clearance"] },
              CustomPredicate: { names: ["isOwner"] },
            }),
            subjects,
            Layer.merge(
              portsLayer({
                AttributeResolver: scriptedPort(PORTS.AttributeResolver, () => PortReply.answer("anon")).layer,
                CustomPredicate: scriptedPort(PORTS.CustomPredicate, () => PortReply.answer(true)).layer,
              }),
              EvaluationIdLive,
            ),
          ).pipe(Layer.provideMerge(logger)),
          { disableLogger: true },
        ),
      ),
      ({ handler }) =>
        Effect.gen(function* () {
          const ask = JSON.stringify({ subjectId: anonymous.id, attribute: "clearance" });
          assert.strictEqual((yield* post(handler, "AttributeResolver", ask)).status, 200);
          assert.strictEqual((yield* post(handler, "AttributeResolver", ask)).status, 200);
          // A second served port: the warning is the family's, not each route's.
          yield* post(handler, "CustomPredicate", "{}");
          // Filtered by text, so no other line a request might log can interfere.
          assert.deepStrictEqual(
            lines
              .map((line) => line.message)
              .filter((message) => String(message).includes("serving port routes unguarded")),
            [
              [
                "qadi/http: serving port routes unguarded — each answers only about the " +
                  `request's own subject. Reason given: ${reason}`,
              ],
            ],
          );
        }),
      ({ dispose }) => Effect.promise(dispose),
    );
  });
});
