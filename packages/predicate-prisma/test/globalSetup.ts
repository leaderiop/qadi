/**
 * Makes sure the fixture Prisma client exists before any test imports it.
 *
 * `prisma/generated/` is gitignored (what `prisma generate` produces from the
 * committed fixture schema is not source), and a clean checkout gets it from the
 * root `prepare` script. This covers the one place that script does not run:
 * Stryker's sandbox (`.stryker-tmp`), which copies the tree but not ignored
 * files — without it every engine test would fail to import there.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default function setup(): void {
  const packageRoot = fileURLToPath(new URL("..", import.meta.url));
  if (existsSync(fileURLToPath(new URL("../prisma/generated/index.js", import.meta.url)))) return;
  execFileSync("pnpm", ["exec", "prisma", "generate"], {
    cwd: packageRoot,
    env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "1", CHECKPOINT_DISABLE: "1" },
    stdio: "inherit",
  });
}
