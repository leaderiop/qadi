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
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const MUTATION = "pnpm mutation";

const root = new URL("..", import.meta.url);
const { scripts } = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const steps = scripts.check.split("&&").map((step) => step.trim());

const skipMutation = process.argv.includes("--skip-mutation");
const skipped = steps.filter((step) => step === MUTATION);

if (skipMutation && skipped.length !== 1) {
  console.error(
    `run-check: --skip-mutation expects exactly one "${MUTATION}" step in \`check\`, found ${skipped.length}.`,
  );
  process.exit(1);
}

const toRun = skipMutation ? steps.filter((step) => step !== MUTATION) : steps;

for (const [index, step] of toRun.entries()) {
  console.log(`\n[run-check ${index + 1}/${toRun.length}] ${step}`);
  const result = spawnSync(step, { shell: true, stdio: "inherit", cwd: root });
  if (result.status !== 0) {
    console.error(`\nrun-check: \`${step}\` failed (exit ${result.status ?? result.signal}).`);
    process.exit(result.status ?? 1);
  }
}

if (skipMutation) {
  console.log(`\nrun-check: ran ${toRun.length} of ${steps.length} steps; "${MUTATION}" was skipped (release PRs run it).`);
}
