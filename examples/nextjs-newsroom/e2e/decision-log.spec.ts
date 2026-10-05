/**
 * What the dock's Log shows of the server's decision log.
 *
 * The page copy at `/edge/double-count` tells a reader to "look for an **Edge**
 * row in the dock's Log" after calling `/api/edge/decide`. Before ARCH-11 the
 * aggregator ingested that record into a ring, the dock read the server only
 * over SSE, and the feed behind SSE never saw an ingested record — so no such
 * row could appear by any path (C10). One decision log is now the sink, the
 * backlog and the live stream, and each frame names its producer.
 */
import { expect, test } from "@playwright/test";
import * as Result from "effect/Result";
import { decodeStoredRecord } from "@qadi/core";

const as = (user: string) => [{
  name: "qadi-newsroom-user",
  value: user,
  domain: "127.0.0.1",
  path: "/",
}];

/** Rows in the dock's Log whose environment badge reads `environment`. */
const rowsFrom = (page: import("@playwright/test").Page, environment: string) =>
  page
    .locator(`[data-testid="qadi-log-row"] [data-environment="${environment}"]`)
    .count();

test.describe("the server's decision log in the dock", () => {
  test("an Edge-ingested record appears in the dock's Log", async ({ context, page }) => {
    // The chief editor holds `devtools:read`, so `/__decisions` is not refused.
    await context.addCookies(as("hakim"));
    await page.goto("/edge/double-count");
    // The dock mounts client-side after hydration. Clicking before it does
    // only passes by winning that race; this test is about what the dock
    // shows, so it waits for the dock, as a reader would see the page.
    await expect(page.getByTestId("qadi-devtools")).toBeVisible();

    await page.click('[data-testid="edge-call"]');
    await expect(page.getByTestId("edge-result")).toContainText("forward failures 0", {
      timeout: 15_000,
    });

    await expect.poll(() => rowsFrom(page, "Edge"), { timeout: 5_000 }).toBeGreaterThan(0);
  });

  test("the dock shows server decisions older than any replay window", async ({ context, page, request }) => {
    // Forty server decisions before the dock opens. The feed this replaced
    // replayed 32, so a dock opened late could never show more than that; the
    // log's prelude hands over everything it retained.
    for (let i = 0; i < 40; i += 1) {
      const response = await request.get("/api/articles/the-harbour-contract", {
        headers: { cookie: "qadi-newsroom-user=hakim" },
      });
      expect(response.status()).toBe(200);
    }

    await context.addCookies(as("hakim"));
    await page.goto("/newsroom");
    await expect.poll(() => rowsFrom(page, "Server"), { timeout: 20_000 }).toBeGreaterThanOrEqual(40);
  });

  test("/api/__decisions/backlog decodes, element by element", async ({ request }) => {
    await request.get("/api/articles/the-harbour-contract", { headers: { cookie: "qadi-newsroom-user=hakim" } });

    const response = await request.get("/api/__decisions/backlog", {
      headers: { cookie: "qadi-newsroom-user=hakim" },
    });
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expect(Array.isArray(body)).toBe(true);
    const elements: ReadonlyArray<unknown> = Array.isArray(body) ? body : [];
    expect(elements.length).toBeGreaterThan(0);
    for (const element of elements) {
      const decoded = decodeStoredRecord(element);
      expect(Result.isSuccess(decoded)).toBe(true);
    }
  });

  test("/api/__decisions/backlog refuses a reader without devtools:read", async ({ request }) => {
    const response = await request.get("/api/__decisions/backlog", {
      headers: { cookie: "qadi-newsroom-user=yasmine" },
    });
    expect(response.status()).toBe(403);
  });
});
