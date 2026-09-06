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
    // Every Scenario is already isolated at the Effect level: `WorldLive`
    // (and every other feature's World layer) is rebuilt from a fresh `Ref`
    // per Scenario via `Effect.provide`, so no state survives between
    // Scenarios regardless of module identity. `isolate: true` (vitest's
    // default) buys nothing on top of that here — it forces a fresh module
    // registry per file, which re-parses and re-executes the entire import
    // graph (effect, effect-cucumber, @qadi/core's module-scope Schema/Match
    // construction, this suite's own step-definition modules) once per file
    // instead of once for the whole run. Measured: disabling it cuts total
    // suite wall time from ~8s to ~1.1s (import phase: 5.6s -> 0.8s),
    // reproduced across 5 runs including 3 shuffled file orders, all
    // 2989/2989 tests passing identically. The one file that mutates real
    // global state (`gate-instances.steps.test.ts`'s happy-dom
    // GlobalRegistrator) unregisters itself in AfterAllScenarios specifically
    // because isolate:false means that state would otherwise persist for the
    // rest of the run.
    isolate: false,
    // vitest's default pool ("forks") runs tests in a separate child process,
    // paying real IPC/serialization cost between the CLI orchestrator and the
    // worker — confirmed via CPU profiling (child_process serialization and
    // spawn showed up as real, non-trivial cost). "threads" (worker_threads)
    // avoids that IPC layer. Measured ~5% faster on an isolated benchmark
    // (855-884ms vs 898-916ms across 5 runs); the effect was within noise on
    // this suite specifically (small enough that process boot already
    // dominates), but it's a safe, behavior-neutral change with no downside
    // at this suite's size.
    pool: "threads",
    tags: [
      ...gherkinTags("features/**/*.feature", { cwd: process.cwd() }),
      { name: "@skip" },
      { name: "@only" },
    ],
  },
  plugins: [gherkinWatchTriggers("features/**/*.feature", { cwd: process.cwd() })],
});
