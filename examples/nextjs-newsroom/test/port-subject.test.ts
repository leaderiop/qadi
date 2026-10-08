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

const route = (path: string, user: string) =>
  handler(new Request(`http://newsroom.test${path}`, { headers: { cookie: `${SESSION_COOKIE}=${user}` } }));

const asked = [
  "/ports/relationship?subjectId=nadia&relation=author-of&resourceId=night-shift",
  "/ports/history?subjectId=nadia&event=legal-review&resourceId=night-shift",
  "/ports/attribute?subjectId=nadia&attribute=clearance",
];

describe("a question about another subject is a 403 that names no one's answer", () => {
  for (const path of asked) {
    it(path, async () => {
      const response = await route(path, "yasmine");
      expect(response.status).toBe(403);
      const body = await response.text();
      expect(body).not.toMatch(/Related|Unrelated|Acted|level|value/);
    });
  }
});

describe("a question without a subjectId is refused, not answered about the cookie", () => {
  it("relationship", async () => {
    expect((await route("/ports/relationship?relation=author-of&resourceId=night-shift", "nadia")).status).toBe(403);
  });
});

describe("a question about the session's own subject is answered", () => {
  it("relationship", async () => {
    const response = await route(asked[0] ?? "", "nadia");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ related: "Related" });
  });
});
