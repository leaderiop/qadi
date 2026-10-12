// @vitest-environment node
/**
 * The three port routes, and the browser ports that call them (ARCH-31 T1).
 *
 * A store outage must reach the browser as a **failure**, never as an answer: under
 * `not(...)` a denial is a grant, so an `"Unknown"` that stands for "the store was down"
 * is the one value a negation turns into access (INV-QD-006). A malformed question is a
 * 400, not an answer. `// @vitest-environment node` because happy-dom's `Request` drops
 * the `cookie` header the routes read.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as HttpRouter from "effect/http/HttpRouter";
import * as Layer from "effect/Layer";
import {
  attributeResolverPort,
  currentSubjectLayer,
  decide,
  decisionHistoryPort,
  EvaluationIdLive,
  hasActed,
  hasRelationship,
  not,
  PortReply,
  portsLayer,
  relationshipResolverPort,
  scriptedPort,
} from "@qadi/core";
import { users } from "../src/domain/subjects.ts";
import { SESSION_COOKIE } from "../src/server/session.ts";

vi.mock("../src/server/ports.ts", () => ({
  ports: portsLayer({
    AttributeResolver: scriptedPort(attributeResolverPort, () => PortReply.fail("directory down")).layer,
    RelationshipResolver: scriptedPort(relationshipResolverPort, () => PortReply.fail("graph down")).layer,
    DecisionHistory: scriptedPort(decisionHistoryPort, () => PortReply.fail("audit log down")).layer,
  }),
}));

const { ApiLayer } = await import("../src/server/api.ts");
const { browserPorts } = await import("../src/client/ports.ts");

const nadia = users.find((user) => user.id === "nadia")?.subject;
if (nadia === undefined) throw new Error("no demo user named nadia");

const { handler, dispose } = HttpRouter.toWebHandler(ApiLayer, { disableLogger: true });
afterAll(() => dispose());

/** A question POSTed to a port route, as `user`. `body` is sent as JSON text when it is not already a string. */
const ask = (port: string, body: unknown, user = "nadia") =>
  handler(
    new Request(`http://newsroom.test/ports/${port}`, {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { cookie: `${SESSION_COOKIE}=${user}` },
    }),
  );

describe("a store outage is a 503 and an Unavailable reply, never an answer", () => {
  const cases: ReadonlyArray<readonly [string, unknown]> = [
    ["AttributeResolver", { subjectId: "nadia", attribute: "standing" }],
    ["RelationshipResolver", { subjectId: "nadia", relation: "author-of", resourceId: "a" }],
    ["DecisionHistory", { subjectId: "nadia", event: "legal-review", resourceId: "a" }],
  ];
  for (const [port, question] of cases) {
    it(port, async () => {
      const response = await ask(port, question);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ _tag: "Unavailable" });
    });
  }
});

describe("a malformed question is a 400, never an answer", () => {
  const cases: ReadonlyArray<readonly [string, unknown]> = [
    ["RelationshipResolver", {}],
    ["RelationshipResolver", "not json"],
    ["RelationshipResolver", { subjectId: "nadia", relation: "author-of", resourceId: "a", depth: "abc" }],
    ["RelationshipResolver", { subjectId: "nadia", relation: "author-of", resourceId: "a", depth: 65 }],
    ["RelationshipResolver", { subjectId: "nadia", relation: "author-of", resourceId: "a", depth: 1.5 }],
    ["RelationshipResolver", { subjectId: "nadia", relation: "author-of", resourceId: "a", depth: -1 }],
    ["DecisionHistory", { subjectId: "nadia" }],
    ["AttributeResolver", { subjectId: "nadia" }],
  ];
  for (const [port, question] of cases) {
    it(`${port} ${JSON.stringify(question)}`, async () => {
      expect((await ask(port, question)).status).toBe(400);
    });
  }
});

/** The client's evaluation with `fetch` routed straight into the real handler. */
const evaluateInBrowser = (policy: Parameters<typeof decide>[0]) => {
  vi.stubGlobal("window", { location: { origin: "http://newsroom.test" } });
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    request.headers.set("cookie", `${SESSION_COOKIE}=nadia`);
    return handler(new Request(request.url.replace("/api", ""), request));
  });
  return Effect.runPromiseExit(
    decide(policy, { resource: { id: "the-harbour-contract" } }).pipe(
      Effect.provide(Layer.mergeAll(browserPorts, currentSubjectLayer(nadia), EvaluationIdLive)),
    ),
  );
};

const failsWith = (exit: Exit.Exit<unknown, unknown>, tag: string) => {
  if (!Exit.isFailure(exit)) return false;
  const found = Cause.findErrorOption(exit.cause);
  return (
    found._tag === "Some" &&
    typeof found.value === "object" &&
    found.value !== null &&
    "_tag" in found.value &&
    found.value._tag === tag
  );
};

describe("an outage fails the browser's evaluation; it never denies or grants", () => {
  it("not(hasRelationship) does not grant", async () => {
    expect(failsWith(await evaluateInBrowser(not(hasRelationship("author-of"))), "RelationshipResolveError")).toBe(true);
  });
  it("hasRelationship does not deny", async () => {
    expect(failsWith(await evaluateInBrowser(hasRelationship("author-of")), "RelationshipResolveError")).toBe(true);
  });
  it("hasActed does not deny", async () => {
    expect(failsWith(await evaluateInBrowser(hasActed("legal-review", { scope: "Resource" })), "DecisionHistoryUnavailable")).toBe(true);
  });
  it("not(hasActed) does not grant", async () => {
    expect(failsWith(await evaluateInBrowser(not(hasActed("legal-review"))), "DecisionHistoryUnavailable")).toBe(true);
  });
});

describe("a 2xx body the client does not recognise is a failure, not Unknown", () => {
  it("relationship", async () => {
    vi.stubGlobal("window", { location: { origin: "http://newsroom.test" } });
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(JSON.stringify({ related: "maybe" }), { status: 200 })));
    const exit = await Effect.runPromiseExit(
      decide(hasRelationship("author-of"), { resource: { id: "a" } }).pipe(
        Effect.provide(Layer.mergeAll(browserPorts, currentSubjectLayer(nadia), EvaluationIdLive)),
      ),
    );
    expect(failsWith(exit, "RelationshipResolveError")).toBe(true);
  });
});
