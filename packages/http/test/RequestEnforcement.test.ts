/**
 * Every caller of `@qadi/http`'s request-enforcement module × every failure: the line it
 * logs, or none, and what it answers.
 *
 * One table instead of a log assertion per route (ARCH-46, D-07). BEH-QD-321's rule, that a
 * failure is "logged exactly once, by the step that turned it into a response", is a property of
 * the module and not of any one route, so it is pinned once for all five callers: a sixth caller,
 * a regressed log or a doubled line fails here without anyone remembering which per-route test to
 * copy. Each cell drives the caller's real route over `HttpRouter.toWebHandler`.
 *
 * `TABLE` is a mapped type over caller × column, so a new caller or column is a compile error,
 * and a cell that cannot occur is an explicit `NotApplicable` carrying its reason. A route's own
 * response shape (a body's keys, a header, the client's decoded error) is not asserted here; those
 * tests stay with the route (`http.test.ts`, `PortRoutes.test.ts`).
 */
import { assert, describe, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpApi from "effect/http-api/HttpApi";
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder";
import * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint";
import * as HttpApiGroup from "effect/http-api/HttpApiGroup";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import {
  EvaluationIdLive,
  attributeResolverPort,
  gte,
  guard,
  hasAttribute,
  hasPermission,
  makeDecisionLog,
  makeSubject,
  obligation,
  obliged,
  permission,
  permissionKey,
  portsLayer,
  PortReply,
  scriptedPort,
} from "@qadi/core";
import type { AuthSubject, Policy } from "@qadi/core";
import { collectingLogger } from "@qadi/testing";
import type { CapturedLog } from "@qadi/testing";
import {
  RequiredPermission,
  RequirePermission,
  SubjectExtractionFailed,
  addGuardedRoute,
  guardApi,
  requiresPermission,
  subjectExtractorBearer,
} from "../src/index.ts";
import { decisionStreamRoute } from "../src/DecisionStreamRoute.ts";
import { portRoutes, portRoutesUnguarded } from "../src/PortRoutes.ts";
import { stack } from "./fixtures/stack.ts";

const readPermission = permission("devtools", "read");
const readPolicy = hasPermission(readPermission);
const writePermission = permission("devtools", "write");
const writePolicy = hasPermission(writePermission);

const alice = makeSubject({ id: "alice", permissions: [permissionKey(readPermission)] });
const bob = makeSubject({ id: "bob" });

const TOKEN = "any-token";
const bearer = { authorization: `Bearer ${TOKEN}` };

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

const CALLERS = ["guard", "middleware", "streamRecheck", "guardedPort", "unguardedPort"] as const;
type Caller = (typeof CALLERS)[number];

const COLUMNS = [
  "extractionFailure",
  "edgeDenial",
  "edgeObligation",
  "edgeOutage",
  "handlerDenial",
  "success",
] as const;
type Column = (typeof COLUMNS)[number];

/** One enforcement line a cell expects: its level, its text and, for a denial, the step that logged it. */
interface ExpectedLine {
  readonly level: string;
  readonly message: string;
  readonly site?: "edge" | "handler";
}

type Cell =
  | {
      readonly _tag: "Expect";
      /** The HTTP status, or for the recheck the closure's `"<Tag>, <class>"` (or `carried on`). */
      readonly result: number | string;
      readonly lines: ReadonlyArray<ExpectedLine>;
    }
  | { readonly _tag: "NotApplicable"; readonly reason: string };

const expectCell = (result: number | string, ...lines: ReadonlyArray<ExpectedLine>): Cell => ({
  _tag: "Expect",
  result,
  lines,
});
const notApplicable = (reason: string): Cell => ({ _tag: "NotApplicable", reason });

const extractionLine: ExpectedLine = {
  level: "Error",
  message: "qadi/http: subject extraction failed — token service unreachable",
};
const bobDenied: ExpectedLine = {
  level: "Warn",
  message: `qadi/http: request denied (ACL001) — subject "bob": subject lacks permission 'devtools:read'`,
  site: "edge",
};
const obligationRefused: ExpectedLine = {
  level: "Warn",
  message: `qadi/http: request denied (ACL010) — subject "alice": undischarged obligation(s) must-log`,
  site: "edge",
};
const aliceDeniedWrite: ExpectedLine = {
  level: "Warn",
  message: `qadi/http: request denied (ACL001) — subject "alice": subject lacks permission 'devtools:write'`,
  site: "handler",
};
const closure = (tag: string, cls: string): ExpectedLine => ({
  level: "Warn",
  message: `qadi/http: /__decisions recheck ended the stream (${tag}, ${cls})`,
});

const UNGUARDED_APPLIES_NO_POLICY = "the subject-only mode applies no policy, so there is no edge decision to fail";
const PORT_HANDLER_NEVER_FAILS =
  "the port handler, `answerRemotely`, has error channel `never`: it answers a failure as a reply, never as a denial";

const TABLE: { readonly [C in Caller]: { readonly [K in Column]: Cell } } = {
  guard: {
    extractionFailure: expectCell(502, extractionLine),
    edgeDenial: expectCell(403, bobDenied),
    edgeObligation: expectCell(403, obligationRefused),
    edgeOutage: expectCell(502),
    handlerDenial: expectCell(403, aliceDeniedWrite),
    success: expectCell(200),
  },
  middleware: {
    extractionFailure: expectCell(502, extractionLine),
    edgeDenial: expectCell(403, bobDenied),
    edgeObligation: expectCell(403, obligationRefused),
    edgeOutage: expectCell(502),
    handlerDenial: expectCell(403, aliceDeniedWrite),
    success: expectCell(204),
  },
  streamRecheck: {
    extractionFailure: expectCell("SubjectExtractionFailed, outage", extractionLine, closure("SubjectExtractionFailed", "outage")),
    edgeDenial: expectCell("AccessDenied, denied", bobDenied, closure("AccessDenied", "denied")),
    edgeObligation: notApplicable(
      "an `Obliged` policy refuses at connect, so the recheck is never reached with one",
    ),
    edgeOutage: expectCell("AttributeResolveError, outage", closure("AttributeResolveError", "outage")),
    handlerDenial: notApplicable("the recheck runs no handler"),
    success: expectCell("carried on"),
  },
  guardedPort: {
    extractionFailure: expectCell(502, extractionLine),
    edgeDenial: expectCell(403, bobDenied),
    edgeObligation: expectCell(403, obligationRefused),
    edgeOutage: expectCell(502),
    handlerDenial: notApplicable(PORT_HANDLER_NEVER_FAILS),
    success: expectCell(200),
  },
  unguardedPort: {
    extractionFailure: expectCell(502, extractionLine),
    edgeDenial: notApplicable(UNGUARDED_APPLIES_NO_POLICY),
    edgeObligation: notApplicable(UNGUARDED_APPLIES_NO_POLICY),
    edgeOutage: notApplicable(UNGUARDED_APPLIES_NO_POLICY),
    handlerDenial: notApplicable(PORT_HANDLER_NEVER_FAILS),
    success: expectCell(200),
  },
};

// ---------------------------------------------------------------------------
// Scenarios: what each column feeds a driver
// ---------------------------------------------------------------------------

type Who = "alice" | "bob" | "broken";

interface Scenario {
  /** The edge policy of the route under test. */
  readonly policy: Policy;
  /** Who the credential store answers as. The recheck's connect-time lookup is always alice. */
  readonly who: Who;
  /** The attribute resolver fails (from the recheck's second read, on the recheck row). */
  readonly resolverFails: boolean;
  /** The handler runs a nested `guard` the subject fails. */
  readonly handlerRaises: boolean;
}

const clearancePolicy = hasAttribute("clearance", gte(1));

const SCENARIOS: { readonly [K in Column]: Scenario } = {
  extractionFailure: { policy: readPolicy, who: "broken", resolverFails: false, handlerRaises: false },
  edgeDenial: { policy: readPolicy, who: "bob", resolverFails: false, handlerRaises: false },
  edgeObligation: {
    policy: obliged(obligation("must-log"), readPolicy),
    who: "alice",
    resolverFails: false,
    handlerRaises: false,
  },
  edgeOutage: { policy: clearancePolicy, who: "alice", resolverFails: true, handlerRaises: false },
  handlerDenial: { policy: readPolicy, who: "alice", resolverFails: false, handlerRaises: true },
  success: { policy: readPolicy, who: "alice", resolverFails: false, handlerRaises: false },
};

const SUBJECTS: { readonly [W in Who]: Effect.Effect<AuthSubject, SubjectExtractionFailed> } = {
  alice: Effect.succeed(alice),
  bob: Effect.succeed(bob),
  broken: Effect.fail(new SubjectExtractionFailed({ reason: "token service unreachable" })),
};

/**
 * A credential store answering as `who` on every lookup, or, with `passFirst`, as alice on the
 * first (the recheck row's connect-time extraction) and as `who` from the second on.
 * `onSecond` runs at the second lookup, before it answers.
 */
const extractorFor = (who: Who, passFirst: boolean, onSecond: Effect.Effect<void> = Effect.void) => {
  let lookups = 0;
  return subjectExtractorBearer(() =>
    Effect.suspend(() => {
      lookups += 1;
      const answer = passFirst && lookups === 1 ? SUBJECTS.alice : SUBJECTS[who];
      return lookups === 2 ? Effect.andThen(onSecond, answer) : answer;
    }),
  );
};

/**
 * The evaluation services: an attribute resolver that answers 1, except that it fails on every
 * read after the first `answers` ones when the scenario has an outage. `answers` is 0 on a route
 * that reads once per request, and 1 on the recheck row, where connect reads first.
 */
const servicesFor = (scenario: Scenario, answers: number) => {
  let reads = 0;
  return Layer.merge(
    portsLayer({
      AttributeResolver: scriptedPort(attributeResolverPort, () => {
        reads += 1;
        return scenario.resolverFails && reads > answers ? PortReply.fail("down") : PortReply.answer(1);
      }).layer,
    }),
    EvaluationIdLive,
  );
};

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

/** What a driver saw: what the caller answered, and the enforcement lines it logged. */
interface Observed {
  readonly result: number | string;
  readonly lines: ReadonlyArray<CapturedLog>;
}

type Driver = (scenario: Scenario) => Effect.Effect<Observed>;

interface Web {
  readonly handler: (request: Request) => Promise<Response>;
  readonly dispose: () => Promise<void>;
}

const textOf = (line: CapturedLog): string =>
  Array.isArray(line.message) ? line.message.join(" ") : String(line.message);

const ENFORCEMENT_PREFIXES = [
  "qadi/http: subject extraction failed",
  "qadi/http: request denied",
  "qadi/http: /__decisions recheck ended",
];

/**
 * Only the enforcement lines, so the unguarded routes' construction-time warning, the
 * middleware's wiring refusals and the stream's refused-frame warnings stay out, while a
 * duplicated enforcement line still fails.
 */
const enforcementLines = (lines: ReadonlyArray<CapturedLog>): ReadonlyArray<CapturedLog> =>
  lines.filter((line) => ENFORCEMENT_PREFIXES.some((prefix) => textOf(line).startsWith(prefix)));

/** Builds a web handler logging into `logger`, asks it, and reports the answer with the lines logged. */
const observing = (build: (logger: Layer.Layer<never>) => Web, ask: (web: Web) => Effect.Effect<number | string>) => {
  const { lines, layer } = collectingLogger();
  return Effect.acquireUseRelease(
    Effect.sync(() => build(layer)),
    (web) => Effect.map(ask(web), (result): Observed => ({ result, lines: enforcementLines(lines) })),
    ({ dispose }) => Effect.promise(dispose),
  );
};

const statusOf = (request: Request) => (web: Web) =>
  Effect.map(
    Effect.promise(() => web.handler(request)),
    (response) => response.status,
  );

const getRequest = (path: string) => new Request(`http://srv.test${path}`, { headers: bearer });

/** The handler's own `guard`: one the subject fails when the scenario says so, one it passes otherwise. */
const nestedGuard = (handlerRaises: boolean) =>
  handlerRaises
    ? guard(writePermission, writePolicy)({}, () => Effect.void)
    : guard(readPermission, readPolicy)({}, () => Effect.void);

const guardDriver: Driver = (scenario) =>
  observing(
    (logger) => {
      const route = addGuardedRoute(
        "GET",
        "/guarded",
        readPermission,
        scenario.policy,
        () => Effect.succeed({}),
      )((_authorized, resource) =>
        Effect.as(
          guard(
            scenario.handlerRaises ? writePermission : readPermission,
            scenario.handlerRaises ? writePolicy : readPolicy,
          )(resource, () => Effect.void),
          HttpServerResponse.text("ok"),
        ),
      );
      return HttpRouter.toWebHandler(
        stack(route, extractorFor(scenario.who, false), servicesFor(scenario, 0)).pipe(Layer.provideMerge(logger)),
        { disableLogger: true },
      );
    },
    statusOf(getRequest("/guarded")),
  );

const middlewareDriver: Driver = (scenario) =>
  observing(
    (logger) => {
      const Group = HttpApiGroup.make("probe").add(
        HttpApiEndpoint.get("probe", "/probe").pipe((endpoint) =>
          endpoint.annotate(
            RequiredPermission,
            requiresPermission(endpoint, { permission: readPermission, policy: scenario.policy }),
          ),
        ),
      );
      const Api = HttpApi.make("probe").add(Group).middleware(RequirePermission);
      const Handlers = HttpApiBuilder.group(Api, "probe", (handlers) =>
        handlers.handle("probe", () => nestedGuard(scenario.handlerRaises)),
      );
      const routes = HttpApiBuilder.layer(Api).pipe(Layer.provide(Handlers), Layer.provide(guardApi(Api)));
      return HttpRouter.toWebHandler(
        stack(routes, extractorFor(scenario.who, false), servicesFor(scenario, 0)).pipe(Layer.provideMerge(logger)),
        { disableLogger: true },
      );
    },
    statusOf(getRequest("/probe")),
  );

const PORT_SERVING = { AttributeResolver: { attributes: ["clearance"] } };

const portRequest = () =>
  new Request("http://srv.test/__ports/AttributeResolver", {
    method: "POST",
    body: JSON.stringify({ subjectId: "alice", attribute: "clearance" }),
    headers: bearer,
  });

const guardedPortDriver: Driver = (scenario) =>
  observing(
    (logger) =>
      HttpRouter.toWebHandler(
        stack(
          portRoutes(readPermission, scenario.policy, PORT_SERVING),
          extractorFor(scenario.who, false),
          servicesFor(scenario, 0),
        ).pipe(Layer.provideMerge(logger)),
        { disableLogger: true },
      ),
    (web) => statusOf(portRequest())(web),
  );

const unguardedPortDriver: Driver = (scenario) =>
  observing(
    (logger) =>
      HttpRouter.toWebHandler(
        stack(
          portRoutesUnguarded("test: answers only about the session's own subject", PORT_SERVING),
          extractorFor(scenario.who, false),
          servicesFor(scenario, 0),
        ).pipe(Layer.provideMerge(logger)),
        { disableLogger: true },
      ),
    (web) => statusOf(portRequest())(web),
  );

const CLOSURE_LINE = /recheck ended the stream \((.+)\)$/;

/** The recheck's projected result: the closure line's `"<Tag>, <class>"`, or `carried on` when it logged none. */
const closureResult = (lines: ReadonlyArray<CapturedLog>): string =>
  lines.flatMap((line) => {
    const matched = CLOSURE_LINE.exec(textOf(line));
    return matched?.[1] === undefined ? [] : [matched[1]];
  })[0] ?? "carried on";

/**
 * The recheck row. `Effect.repeat` runs its first iteration as soon as the body is pulled, so the
 * connect-time extraction and the recheck's are the first and second lookups, no clock needed.
 * A scenario that ends the stream is drained to its end; one that must carry on waits for the
 * second lookup, lets the recheck finish, then cancels the body, so an absent line is a recheck
 * that ran and logged nothing rather than one that never ran.
 */
const streamRecheckDriver: Driver = (scenario) =>
  Effect.gen(function* () {
    const { lines, layer: logger } = collectingLogger();
    const rechecked = yield* Deferred.make<void>();
    const log = yield* makeDecisionLog({ environment: "Server" });
    const route = decisionStreamRoute(readPermission, scenario.policy, log, { reauth: { interval: "1 hour" } });
    const holds = scenario.who === "alice" && !scenario.resolverFails;
    return yield* Effect.acquireUseRelease(
      Effect.sync(() =>
        HttpRouter.toWebHandler(
          stack(
            route,
            extractorFor(scenario.who, true, Deferred.succeed(rechecked, undefined).pipe(Effect.asVoid)),
            servicesFor(scenario, 1),
          ).pipe(Layer.provideMerge(logger)),
          { disableLogger: true },
        ),
      ),
      ({ handler }) =>
        Effect.gen(function* () {
          const response = yield* Effect.promise(() => handler(getRequest("/__decisions")));
          assert.strictEqual(response.status, 200, "the connect-time check passes, so the stream opens");
          if (holds) {
            yield* Deferred.await(rechecked);
            for (let turn = 0; turn < 20; turn += 1) yield* Effect.yieldNow;
            yield* Effect.promise(() => response.body?.cancel() ?? Promise.resolve());
          } else {
            yield* Effect.ignore(Effect.tryPromise(() => response.text()));
          }
          const seen = enforcementLines(lines);
          return { result: closureResult(seen), lines: seen } satisfies Observed;
        }),
      ({ dispose }) => Effect.promise(dispose),
    );
  });

const DRIVERS: { readonly [C in Caller]: Driver } = {
  guard: guardDriver,
  middleware: middlewareDriver,
  streamRecheck: streamRecheckDriver,
  guardedPort: guardedPortDriver,
  unguardedPort: unguardedPortDriver,
};

// ---------------------------------------------------------------------------
// The suite
// ---------------------------------------------------------------------------

/** A line as the table states it: level, text and the denial site, `undefined` when it has none. */
const stated = (line: ExpectedLine) => ({ level: line.level, message: line.message, site: line.site });

const observed = (line: CapturedLog) => ({
  level: line.level,
  message: textOf(line),
  site: line.annotations["qadi.denial_site"],
});

/** Every cell the table marks not applicable, as `"<caller> × <column>"`. */
const notApplicableCells = (): ReadonlyArray<string> =>
  CALLERS.flatMap((caller) =>
    COLUMNS.flatMap((column) => (TABLE[caller][column]._tag === "NotApplicable" ? [`${caller} × ${column}`] : [])),
  );

describe("the request-enforcement module, every caller × every failure", () => {
  for (const caller of CALLERS) {
    for (const column of COLUMNS) {
      const cell = TABLE[caller][column];
      if (cell._tag === "NotApplicable") continue;
      it.effect(`${caller} × ${column}`, () =>
        Effect.gen(function* () {
          const seen = yield* DRIVERS[caller](SCENARIOS[column]);
          assert.deepStrictEqual(seen.result, cell.result);
          assert.deepStrictEqual(seen.lines.map(observed), cell.lines.map(stated));
        }),
      );
    }
  }

  it("the cells that cannot occur are exactly these seven, each with its reason", () => {
    assert.deepStrictEqual(notApplicableCells(), [
      "streamRecheck × edgeObligation",
      "streamRecheck × handlerDenial",
      "guardedPort × handlerDenial",
      "unguardedPort × edgeDenial",
      "unguardedPort × edgeObligation",
      "unguardedPort × edgeOutage",
      "unguardedPort × handlerDenial",
    ]);
    for (const caller of CALLERS) {
      for (const column of COLUMNS) {
        const cell = TABLE[caller][column];
        if (cell._tag === "NotApplicable") assert.isAbove(cell.reason.length, 20);
      }
    }
  });
});
