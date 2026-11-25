// Re-runs Phase 83's checks, which hold the files around this phase's, from a scratch copy.
//
// Phase 83's own directory is only read: its `83-pinned-check.mjs`, `83-check.mjs`, `83-earlier-checks.mjs`, `83-01-SUMMARY.md`
// and `83-RED-EVIDENCE.md` are copied to `<scratch>/p83/`, and in the copy of `83-earlier-checks.mjs` the line that computes the
// repository root from its own location is replaced by the real root (it would otherwise land in the scratch tree). Phase 83's
// directory is found as the sibling of this script's directory whose name starts `QD-83-`, so the script keeps working when
// both directories are archived together. `83-earlier-checks.mjs` itself re-runs Phase 81's, 79's and 80's checks and prints
// the one expected `79-pinned-check.mjs` line (`TF29`), which it accepts; its lines are echoed here, indented, and not judged.
//
// Prints `<check>: exit <n>: <last line>` for each of six checks and exits 0 only when each exited 0. From the repository root:
//   node <phase 84 directory>/84-earlier-checks.mjs
//   node <this file> --self-test
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const OUT = join(realpathSync(process.env.TMPDIR || "/tmp"), "qd84", "p83");
const COPIED = ["83-pinned-check.mjs", "83-check.mjs", "83-earlier-checks.mjs", "83-01-SUMMARY.md", "83-RED-EVIDENCE.md"];

const ROOT_LINE = 'const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");';

/** The text with each declared line replaced, or the file name of the first line that does not occur exactly once. */
const declare = (text, declared) => {
  let out = text;
  for (const { file, from, to } of declared) {
    if (out.split(from).length !== 2) return { refused: file };
    out = out.replace(from, () => to);
  }
  return { text: out };
};

/** The checks in the order they print. */
const EXPECTED = [
  "83-pinned-check.mjs --all-applied",
  "83-earlier-checks.mjs",
  "83-check.mjs no-store",
  "83-check.mjs single-fold",
  "83-check.mjs stale-path",
  "83-check.mjs registers",
];

const parse = (line) => {
  const m = /^(.+?): exit (-?[0-9]+|null): (.*)$/.exec(line);
  return m === null ? undefined : { check: m[1], status: m[2], rest: m[3] };
};

/** The reasons the printed lines are not six checks at exit 0. */
const judgeEarlier84 = (lines) => {
  const parsed = lines.map(parse);
  const reasons = [];
  for (const check of EXPECTED) {
    const found = parsed.filter((p) => p !== undefined && p.check === check);
    if (found.length === 0) reasons.push(`missing line: ${check}`);
    else if (found[0].status !== "0") reasons.push(`${check}: expected exit 0, got exit ${found[0].status}: ${found[0].rest}`);
  }
  for (const [i, p] of parsed.entries()) if (p === undefined || !EXPECTED.includes(p.check)) reasons.push(`unexpected line: ${lines[i]}`);
  return reasons;
};

const selfTest = () => {
  const ok = EXPECTED.map((check) => `${check}: exit 0: fine`);
  const replaced = (i, line) => ok.map((l, j) => (j === i ? line : l));
  const declared = [{ file: "a", from: "one", to: "uno" }];
  const cases = [
    ["all six at exit 0 pass", judgeEarlier84(ok).length === 0],
    ["one at exit 1 fails, naming it", judgeEarlier84(replaced(2, "83-check.mjs no-store: exit 1: x")).join() === "83-check.mjs no-store: expected exit 0, got exit 1: x"],
    ["one missing fails", judgeEarlier84(ok.slice(1)).join() === "missing line: 83-pinned-check.mjs --all-applied"],
    ["one extra fails", judgeEarlier84([...ok, "extra: exit 0: x"]).join() === "unexpected line: extra: exit 0: x"],
    ["a line that is no check line fails", judgeEarlier84([...ok, "noise"]).join() === "unexpected line: noise"],
    ["a line found once is replaced", declare("x one y", declared).text === "x uno y"],
    ["a line found twice is refused", declare("one one", declared).refused === "a"],
    ["a line not found is refused", declare("x", declared).refused === "a"],
  ];
  const failed = cases.filter(([, passed]) => !passed).map(([name]) => name);
  if (failed.length > 0) {
    process.stderr.write(`self-test failed: ${failed.join("; ")}\n`);
    process.exit(1);
  }
  process.stdout.write(`self-test: ${cases.length} passed\n`);
};

const lastLine = (text) => text.split("\n").filter((l) => l.trim() !== "").at(-1) ?? "";

/** Runs a script from the repository root with stdin closed, and returns its `<check>: exit <n>: <last line>` line and output. */
const runCheck = (label, file, args) => {
  const r = spawnSync("node", [file, ...args], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return { line: `${label}: exit ${r.status}: ${lastLine(r.stdout) || lastLine(r.stderr)}`, stdout: r.stdout };
};

const run = () => {
  const siblings = readdirSync(dirname(here)).filter((name) => name.startsWith("QD-83-"));
  if (siblings.length !== 1) {
    console.error("no Phase 83 directory beside this one");
    process.exit(1);
  }
  const p83 = join(dirname(here), siblings[0]);
  mkdirSync(OUT, { recursive: true });
  for (const name of COPIED) copyFileSync(join(p83, name), join(OUT, name));
  const copy = join(OUT, "83-earlier-checks.mjs");
  const declared = declare(readFileSync(copy, "utf8"), [{ file: "83-earlier-checks.mjs", from: ROOT_LINE, to: `const root = ${JSON.stringify(root)};` }]);
  if (declared.refused !== undefined) {
    console.error(`cannot declare ${declared.refused}`);
    process.exit(1);
  }
  writeFileSync(copy, declared.text);
  const lines = [];
  const step = (label, file, args) => {
    const { line, stdout } = runCheck(label, file, args);
    if (label === "83-earlier-checks.mjs") for (const l of stdout.split("\n").filter((x) => x !== "")) console.log(`  ${l}`);
    console.log(line);
    lines.push(line);
  };
  step("83-pinned-check.mjs --all-applied", join(OUT, "83-pinned-check.mjs"), ["--all-applied"]);
  step("83-earlier-checks.mjs", copy, []);
  for (const mode of ["no-store", "single-fold", "stale-path", "registers"]) step(`83-check.mjs ${mode}`, join(OUT, "83-check.mjs"), [mode]);
  const reasons = judgeEarlier84(lines);
  if (reasons.length > 0) {
    console.error(reasons.join("\n"));
    process.exit(1);
  }
};

if (process.argv.includes("--self-test")) selfTest();
else run();
