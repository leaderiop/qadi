// @vitest-environment node
/**
 * A port route answers only about the session's own subject (ARCH-31 T2, D-31-b).
 *
 * A route that took the cookie's subject and answered under the asked subject's
 * name gave a confident answer to a question nobody asked: Nadia's relationship
 * asked with Yasmine's cookie came back `Unrelated`. The question carries its
 * `subjectId` and the route compares it with the session's, refusing a mismatch.
 * Real ports, so this file has no `vi.mock`.
 */
import { afterAll, describe, expect, it } from "vitest";
import * as HttpRouter from "effect/http/HttpRouter";
import { SESSION_COOKIE } from "../src/server/session.ts";

const { ApiLayer } = await import("../src/server/api.ts");

const { handler, dispose } = HttpRouter.toWebHandler(ApiLayer, { disableLogger: true });
afterAll(() => dispose());

const ask = (port: string, body: unknown, user: string) =>
  handler(
    new Request(`http://newsroom.test/ports/${port}`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { cookie: `${SESSION_COOKIE}=${user}` },
    }),
  );

const asked: ReadonlyArray<readonly [string, unknown]> = [
  ["RelationshipResolver", { subjectId: "nadia", relation: "author-of", resourceId: "night-shift" }],
  ["DecisionHistory", { subjectId: "nadia", event: "legal-review", resourceId: "night-shift" }],
  ["AttributeResolver", { subjectId: "nadia", attribute: "clearance" }],
];

describe("a question about another subject is a 403 that names no one's answer", () => {
  for (const [port, question] of asked) {
    it(port, async () => {
      const response = await ask(port, question, "yasmine");
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ _tag: "Refused", reason: "SubjectMismatch" });
    });
  }
});

describe("a question without a subjectId is refused, not answered about the cookie", () => {
  it("relationship", async () => {
    const response = await ask("RelationshipResolver", { relation: "author-of", resourceId: "night-shift" }, "nadia");
    expect(response.status).toBe(400);
  });
});

describe("a question no policy asks is not served", () => {
  it("an attribute the catalogue never reads, including a prototype key", async () => {
    for (const attribute of ["constructor", "__proto__", "salary"]) {
      expect((await ask("AttributeResolver", { subjectId: "nadia", attribute }, "nadia")).status).toBe(404);
    }
  });
});

describe("a question about the session's own subject is answered", () => {
  it("relationship", async () => {
    const response = await ask("RelationshipResolver", asked[0]?.[1], "nadia");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ _tag: "Answered", answer: "Related" });
  });
});
