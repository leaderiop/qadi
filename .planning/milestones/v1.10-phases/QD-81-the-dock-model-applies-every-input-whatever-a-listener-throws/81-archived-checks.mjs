// Runs the archived record checks of the two earlier phases whose scripts hard-code a phase directory that has moved to
// the archive. Each script is copied into `<scratch>/v19/` with only that directory constant repointed (a copy in which the
// constant does not occur exactly once is refused), and the copies run from the repository root, stdin closed. The archive
// is read and never written. Prints, for each check, `<script args>: exit <n>: <last stdout or stderr line>` and exits 0
// only when every check exits 0. From the repository root:
//   node <this directory>/81-archived-checks.mjs
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const ARCHIVE = ".planning/milestones/v1.9-phases";
const P79 = `${ARCHIVE}/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure`;
const P80 = `${ARCHIVE}/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved`;
const OLD79 = ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure";
const OLD80 = ".planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/";
const OUT = join(realpathSync(process.env.TMPDIR || "/tmp"), "qd81", "v19");

/** Each script, where it sits in the archive, and the one declaration its directory constant is repointed by (none: it holds no directory). */
const COPIES = [
  { dir: P79, file: "79-pinned-check.mjs", from: `const DIR = "${OLD79}";`, to: `const DIR = "${P79}";` },
  { dir: P79, file: "79-characterisation-check.mjs" },
  { dir: P80, file: "80-check.mjs", from: `const D = "${OLD80}";`, to: `const D = "${P80}/";` },
  { dir: P80, file: "80-characterisation-check.mjs", from: `const D = "${OLD80}";`, to: `const D = "${P80}/";` },
  { dir: P80, file: "80-pinned-check.mjs", from: `const DIR = "${OLD80}";`, to: `const DIR = "${OUT}/";` },
];

/** The checks, in order: the copy's name and its arguments. */
const RUNS = [
  ["79-pinned-check.mjs"],
  ["79-characterisation-check.mjs"],
  ["80-pinned-check.mjs", "--all-applied"],
  ["80-characterisation-check.mjs", "--all-flipped"],
  ["80-characterisation-check.mjs", "--red-recorded"],
];

/** The copy of a script's text with its constant repointed, or undefined when the old constant is not there exactly once. */
const repoint = (text, from, to) => (from === undefined ? text : text.split(from).length === 2 ? text.replace(from, () => to) : undefined);

const lastLine = (text) => text.split("\n").filter((l) => l.trim() !== "").at(-1) ?? "";

const run = () => {
  mkdirSync(OUT, { recursive: true });
  for (const { dir, file, from, to } of COPIES) {
    const copy = repoint(readFileSync(resolve(root, dir, file), "utf8"), from, to);
    if (copy === undefined) {
      console.error(`cannot repoint ${file}`);
      process.exit(1);
    }
    writeFileSync(join(OUT, file), copy);
  }
  let failed = 0;
  for (const [file, ...args] of RUNS) {
    const r = spawnSync("node", [join(OUT, file), ...args], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const line = lastLine(r.stdout) || lastLine(r.stderr);
    console.log(`${[file, ...args].join(" ")}: exit ${r.status}: ${line}`);
    if (r.status !== 0) failed++;
  }
  process.exit(failed === 0 ? 0 : 1);
};

run();
