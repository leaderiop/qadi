/**
 * The lens, in an engine that has layout.
 *
 * This is the reason a real browser is in the merge gate at all.
 *
 * A guard's marker is a `display: contents` span. That generates **no box**,
 * which is the whole point — it changes no layout — and it is also why
 * `element.getBoundingClientRect()` returns zeroes for it. `@qadi/devtools`
 * measures a `Range` over the marker's *contents* instead. happy-dom has no
 * layout at all, so `packages/devtools/test/react/Lens.test.ts` stubs the
 * measurement and asserts the arithmetic around it: the one claim that needs an
 * engine was the one nothing had ever run in one.
 *
 * So this file asserts three things a stub cannot:
 *
 *   1. the marker really generates no box;
 *   2. a `Range` over its contents really has a non-zero one;
 *   3. `elementFromPoint` inside that box really walks up to the marker.
 *
 * It reads the DOM the guard produced rather than mounting the dock, because the
 * dock's own rendering is covered by its package's suite. What is not covered
 * anywhere else is whether the geometry these functions assume is real.
 */
import { expect, test } from "@playwright/test";

test.describe("a guard can be found on screen", () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([{
      name: "qadi-newsroom-user",
      value: "omar",
      domain: "127.0.0.1",
      path: "/",
    }]);
    await page.goto("/newsroom");
    await expect(page.getByTestId("body-the-harbour-contract")).toBeVisible();
  });

  test("instrumentation renders a marker, and it generates no box", async ({ page }) => {
    const marker = page.locator("[data-qadi-gate]").first();
    await expect(marker).toHaveCount(1);

    const display = await marker.evaluate((node) => getComputedStyle(node).display);
    expect(display).toBe("contents");

    // The property the whole design rests on: a `display: contents` element is
    // not a box, so it cannot change layout — and cannot be measured directly.
    const own = await marker.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    expect(own.width).toBe(0);
    expect(own.height).toBe(0);
  });

  test("a Range over its contents has a real box", async ({ page }) => {
    const measured = await page.locator("[data-qadi-gate]").first().evaluate((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      return { width: rect.width, height: rect.height, top: rect.top, left: rect.left };
    });

    // This is `boxOf`, run for real. If `Range.selectNodeContents` did not
    // measure through a `display: contents` element the lens would highlight
    // nothing and every test in the devtools package would still pass.
    expect(measured.width).toBeGreaterThan(0);
    expect(measured.height).toBeGreaterThan(0);
  });

  test("a point inside that box walks up to the marker", async ({ page }) => {
    const found = await page.locator("[data-qadi-gate]").first().evaluate((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();

      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      // `gateIdAt`'s walk, by identity — never by selector. A marker carries
      // `data-qadi-gate` for a human reading the DOM; the pick compares element
      // identity, so an element wearing the attribute but not registered is not
      // found (ADR-QD-053).
      let cursor: Element | null = hit;
      while (cursor !== null) {
        if (cursor === node) return true;
        cursor = cursor.parentElement;
      }
      return false;
    });

    expect(found).toBe(true);
  });

  test("uninstrumented, there is no marker at all", async ({ page }) => {
    // `/edge/unregistered` renders with `dock={false}` and instrumentation on;
    // the index renders with `instrument={false}`. Off means absent — not a
    // wrapper with a no-op style, no wrapper.
    await page.goto("/");
    await expect(page.locator("[data-qadi-gate]")).toHaveCount(0);
  });
});
