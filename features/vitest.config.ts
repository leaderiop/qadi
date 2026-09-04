import { gherkinTags, gherkinWatchTriggers } from "@effect-cucumber/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["features/**/*.steps.test.ts"],
    // devtools-screens.steps.ts asserts against process-wide singletons in
    // @qadi/devtools (wiringReport/portActivity) that are never reset between
    // scenarios — a pre-existing, order-dependent property carried over from
    // the Cucumber CLI's single-process run. Default vitest file parallelism
    // would silently fragment that state across worker processes.
    fileParallelism: false,
    tags: [
      ...gherkinTags("features/**/*.feature", { cwd: process.cwd() }),
      { name: "@skip" },
      { name: "@only" },
    ],
  },
  plugins: [gherkinWatchTriggers("features/**/*.feature", { cwd: process.cwd() })],
});
