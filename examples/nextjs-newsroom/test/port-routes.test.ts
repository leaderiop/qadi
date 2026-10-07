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

const route = (path: string, user = "nadia") =>
  handler(new Request(`http://newsroom.test${path}`, { headers: { cookie: `${SESSION_COOKIE}=${user}` } }));

describe("a store outage is a 503, never an answer", () => {
  it("attribute (characterization)", async () => {
    expect((await route("/ports/attribute?attribute=standing")).status).toBe(503);
  });
  it("relationship", async () => {
    expect((await route("/ports/relationship?relation=author-of&resourceId=a")).status).toBe(503);
  });
  it("history", async () => {
    expect((await route("/ports/history?event=legal-review&resourceId=a")).status).toBe(503);
  });
});

describe("a malformed question is a 400", () => {
  const cases = [
    "/ports/relationship",
    "/ports/relationship?relation=author-of&resourceId=a&depth=abc",
    "/ports/relationship?relation=author-of&resourceId=a&depth=65",
    "/ports/relationship?relation=author-of&resourceId=a&depth=1.5",
    "/ports/relationship?relation=author-of&resourceId=a&depth=-1",
    "/ports/history",
    "/ports/attribute",
  ];
  for (const path of cases) {
    it(path, async () => {
      expect((await route(path)).status).toBe(400);
    });
  }
});

/** The client's evaluation with `fetch` routed straight into the real handler. */
const evaluateInBrowser = (policy: Parameters<typeof decide>[0]) => {
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("fetch", (input: RequestInfo | URL) => route(String(input).replace("/api", "")));
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
    expect(failsWith(await evaluateInBrowser(not(hasRelationship("banned"))), "RelationshipResolveError")).toBe(true);
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
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(JSON.stringify({ related: "maybe" }), { status: 200 })));
    const exit = await Effect.runPromiseExit(
      decide(hasRelationship("author-of"), { resource: { id: "a" } }).pipe(
        Effect.provide(Layer.mergeAll(browserPorts, currentSubjectLayer(nadia), EvaluationIdLive)),
      ),
    );
    expect(failsWith(exit, "RelationshipResolveError")).toBe(true);
  });
});
