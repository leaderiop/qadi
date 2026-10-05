/**
 * What the dock's Log shows of the server's decision log.
 *
 * The page copy at `/edge/double-count` tells a reader to "look for an **Edge**
 * row in the dock's Log" after calling `/api/edge/decide`. The aggregator
 * ingested that record into its ring, the dock read the server only over SSE,
 * and the feed behind SSE never saw an ingested record — so no such row could
 * appear by any path (ARCH-11 C10).
 */
import { expect, test } from "@playwright/test";

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
  test.fail("an Edge-ingested record appears in the dock's Log", async ({ context, page }) => {
    // The chief editor holds `devtools:read`, so `/__decisions` is not refused.
    await context.addCookies(as("hakim"));
    await page.goto("/edge/double-count");

    await page.click('[data-testid="edge-call"]');
    await expect(page.getByTestId("edge-result")).toContainText("forward failures 0", {
      timeout: 15_000,
    });

    await expect.poll(() => rowsFrom(page, "Edge"), { timeout: 5_000 }).toBeGreaterThan(0);
  });
});
