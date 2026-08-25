import { defineConfig, devices } from "@playwright/test";

/**
 * Chromium only, against a production build.
 *
 * A real engine is here for exactly one reason that happy-dom cannot cover: the
 * lens measures a `display: contents` marker with `Range.selectNodeContents`,
 * and happy-dom has no layout, so `packages/devtools/test/react/Lens.test.ts`
 * stubs the measurement. The one claim that needs a browser was therefore the
 * one nothing had ever run in one.
 *
 * The rest of the suite reads **served HTML** rather than racing hydration —
 * `page.goto` with JavaScript disabled where the assertion is about what the
 * server sent. That is the only honest way to test "no flash", and it has no
 * timing dependency at all.
 *
 * `next start`, not `next dev`: the production build is what the claims are
 * about, and dev-mode double rendering would make every count assertion a
 * negotiation.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: process.env["CI"] === "true",
  retries: 0,
  reporter: process.env["CI"] === "true" ? "line" : "list",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3211",
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "next start --port 3211",
    url: "http://127.0.0.1:3211",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
