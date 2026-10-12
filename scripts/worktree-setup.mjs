#!/usr/bin/env node
/**
 * Makes a fresh git worktree runnable: dependencies installed, packages built.
 *
 *   pnpm worktree:setup
 *
 * A new worktree has no `node_modules` and no `lib/`, and the example app and
 * every cross-package import resolve `@qadi/*` through `lib/`. Eight of the
 * agents that implemented the wave-4 plans each found that out separately and
 * ran the same two commands. It is idempotent: a step whose result is already
 * there is skipped, so it is safe to run first in any checkout.
 *
 * The install is `--frozen-lockfile --offline`: a worktree must match the
 * lockfile exactly, and the pnpm store is shared, so nothing is downloaded. If
 * the store lacks a package the install fails loudly rather than resolving a
 * different version.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;

const run = (label, command) => {
  console.log(`worktree-setup: ${label}`);
  const result = spawnSync(command, { shell: true, cwd: root, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`worktree-setup: \`${command}\` failed (exit ${result.status ?? result.signal}).`);
    process.exit(result.status ?? 1);
  }
};

if (existsSync(join(root, "node_modules"))) {
  console.log("worktree-setup: node_modules present, install skipped");
} else {
  run("installing from the lockfile", "pnpm install --frozen-lockfile --offline");
}

if (existsSync(join(root, "packages", "core", "lib"))) {
  console.log("worktree-setup: packages built, build skipped");
} else {
  run("building the packages", "pnpm build");
}

console.log("worktree-setup: ready");
