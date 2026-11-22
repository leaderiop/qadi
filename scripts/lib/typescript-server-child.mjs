/**
 * Runs a script that reads source through `typescript/unstable/sync` as a child process,
 * and leaves no TypeScript server behind when the child is killed.
 *
 * It is shared by the two gates that do (`scripts/check-package-install.mjs`, whose child
 * is `scripts/lib/probe-guard-parse.mjs`, and `scripts/check-house-style.mjs`, whose child
 * is `scripts/lib/module-state-scan.mjs`), so the fix for CCR-QD-460 lives in one place.
 *
 * The server behind the `API` has no timeout of its own and works on a request without
 * reading its pipe, so killing the Node process that started it does not end it. The child
 * names the server's pids on stderr once the `API` has started it (`nameServerPids`), and
 * the parent that kills the child kills those pids too (`runTypescriptChild`). A failure is
 * then reported by its cause (`failureCause`) and the installed TypeScript
 * (`installedTypescriptVersion`), never by the command line.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The line a child writes to stderr to name the TypeScript servers it started.
 *
 * `pgrep` is how a child finds them: without it, or before a server exists, nothing is
 * named and a kill of the child cannot reach the server.
 */
const SERVER_PIDS_LINE = /^server pids: (.+)$/m;

/**
 * Names this process's children on stderr; call it from the child once its `API` has started.
 *
 * @returns {void}
 */
export const nameServerPids = () => {
  try {
    const servers = execFileSync("pgrep", ["-P", String(process.pid)], {
      encoding: "utf8",
      timeout: 10_000,
    }).trim();
    process.stderr.write(`server pids: ${servers.split(/\s+/).join(" ")}\n`);
  } catch {
    // no `pgrep`, or no child yet: nothing to name
  }
};

/**
 * Runs `script` under `node` with `args` and a timeout, and returns what it printed.
 *
 * A failure is rethrown as `execFileSync` raised it, after the servers a killed child
 * named are killed with it. A child that exited on its own closed its server first, so no
 * pid it named is signalled then.
 *
 * @param {string} script
 * @param {ReadonlyArray<string>} args
 * @param {{ cwd?: string, timeoutMs: number }} options
 * @returns {string}
 */
export const runTypescriptChild = (script, args, { cwd, timeoutMs }) => {
  try {
    return execFileSync(process.execPath, [script, ...args], {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
      timeout: timeoutMs,
    });
  } catch (error) {
    const killed = typeof error.signal === "string";
    const named = killed ? SERVER_PIDS_LINE.exec(error.stderr ?? "")?.[1] : undefined;
    for (const pid of named?.split(" ") ?? []) {
      try {
        process.kill(Number(pid), "SIGKILL");
      } catch {
        // already gone
      }
    }
    throw error;
  }
};

/**
 * What to print for a failed `execFileSync` child: a killed child's output is empty, so its
 * cause is named first (the timeout and its bound, or the signal), then its own output. A
 * child that printed nothing says its exit status, or why it did not start: never the
 * command line, which `error.message` carries.
 *
 * @param {Error & {
 *   code?: string,
 *   signal?: string | null,
 *   status?: number | null,
 *   stdout?: string,
 *   stderr?: string,
 * }} error
 * @param {number} timeoutMs the bound the child ran under
 * @returns {string}
 */
export const failureCause = (error, timeoutMs) =>
  [
    error.code === "ETIMEDOUT"
      ? `timed out after ${timeoutMs} ms`
      : error.signal
        ? `killed by ${error.signal}`
        : undefined,
    error.stdout,
    error.stderr?.replace(SERVER_PIDS_LINE, "").trim(),
  ]
    .filter(Boolean)
    .join("\n") ||
  (typeof error.status === "number"
    ? `exited with status ${error.status}`
    : `did not run: ${error.code}`);

/**
 * The version of the `typescript` installed under `root`, whose unstable API a routine
 * upgrade can move; `"not installed"` when there is none to read, so naming it in a failure
 * cannot itself fail.
 *
 * @param {string} root
 * @returns {string}
 */
export const installedTypescriptVersion = (root) => {
  try {
    const manifest = join(root, "node_modules", "typescript", "package.json");
    return JSON.parse(readFileSync(manifest, "utf8")).version;
  } catch {
    return "not installed";
  }
};
