#!/usr/bin/env node
/**
 * Runs the merge gate, optionally without its mutation step.
 *
 * `pnpm check` stays the one definition of "done" (AGENTS.md §15,
 * `spec/process/definitions-of-done.md`). This script does not restate it: it
 * reads the `check` script out of `package.json`, splits it on `&&`, and runs
 * those commands in order, so a step added to `check` is picked up here with no
 * second edit.
 *
 * `--skip-mutation` drops exactly the `pnpm mutation` step and nothing else. It
 * is what `pnpm check:pr` runs and what `.github/workflows/check.yml` runs for a
 * pull request that is not a release PR: Stryker takes most of the gate's time,
 * and a score only moves when a release is cut. It refuses to run if it cannot
 * find that one step, or finds more than one, so the flag can never quietly skip
 * something else after `check` is reshaped.
 *
 * `--tier fast` is the loop an implementer runs after every change, and it is
 * *not* a merge gate. It runs `check` minus the steps that build, instrument or
 * serve (`FAST_DROPS`), with the instrumented `pnpm coverage` swapped for the
 * same tests uninstrumented (`FAST_SWAPS`). Every named step must appear in
 * `check` exactly once, or it refuses to run, so a rename in `check` cannot
 * quietly shrink the tier. Output is quiet: one line per passing step, and for
 * the failing step the tail of its output, so the failure is the first thing
 * on screen. `pnpm check:pr` stays the gate that decides "done".
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const MUTATION = "pnpm mutation";

/** Steps the fast tier leaves to `pnpm check:pr`: each builds, instruments or serves. */
const FAST_DROPS = [MUTATION, "pnpm example", "pnpm website", "pnpm spec:package"];
/** Steps the fast tier runs in a cheaper form: the same tests, without instrumentation. */
const FAST_SWAPS = { "pnpm coverage": "pnpm vitest run" };
/** Lines of a failing step's output the fast tier prints. */
const FAILURE_TAIL_LINES = 80;

const root = new URL("..", import.meta.url);
const { scripts } = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const steps = scripts.check.split("&&").map((step) => step.trim());

const argv = process.argv.slice(2);
const skipMutation = argv.includes("--skip-mutation");
const tierIndex = argv.indexOf("--tier");
const tier = tierIndex === -1 ? undefined : argv[tierIndex + 1];

if (tier !== undefined && tier !== "fast") {
  console.error(`run-check: unknown tier "${tier}" (expected "fast").`);
  process.exit(1);
}

/** Refuses unless `step` is in `check` exactly once. */
const requireOnce = (step, why) => {
  const found = steps.filter((candidate) => candidate === step).length;
  if (found !== 1) {
    console.error(`run-check: ${why} expects exactly one "${step}" step in \`check\`, found ${found}.`);
    process.exit(1);
  }
};

if (skipMutation) requireOnce(MUTATION, "--skip-mutation");

let toRun = skipMutation ? steps.filter((step) => step !== MUTATION) : steps;

if (tier === "fast") {
  for (const step of [...FAST_DROPS, ...Object.keys(FAST_SWAPS)]) requireOnce(step, "--tier fast");
  toRun = steps
    .filter((step) => !FAST_DROPS.includes(step))
    .map((step) => FAST_SWAPS[step] ?? step);
}

const quiet = tier === "fast";

for (const [index, step] of toRun.entries()) {
  const label = `[run-check ${index + 1}/${toRun.length}] ${step}`;
  if (!quiet) console.log(`\n${label}`);
  const started = Date.now();
  const result = spawnSync(step, {
    shell: true,
    cwd: root,
    stdio: quiet ? "pipe" : "inherit",
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0) {
    if (quiet) {
      console.log(`${label}  ✖`);
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trimEnd().split("\n");
      console.log(output.slice(-FAILURE_TAIL_LINES).join("\n"));
    }
    console.error(`\nrun-check: \`${step}\` failed (exit ${result.status ?? result.signal}).`);
    process.exit(result.status ?? 1);
  }
  if (quiet) console.log(`${label}  ✔ ${((Date.now() - started) / 1000).toFixed(0)}s`);
}

if (tier === "fast") {
  console.log(
    `\nrun-check: fast tier ran ${toRun.length} of ${steps.length} steps. It is not the gate: \`pnpm check:pr\` is.`,
  );
} else if (skipMutation) {
  console.log(`\nrun-check: ran ${toRun.length} of ${steps.length} steps; "${MUTATION}" was skipped (release PRs run it).`);
}
