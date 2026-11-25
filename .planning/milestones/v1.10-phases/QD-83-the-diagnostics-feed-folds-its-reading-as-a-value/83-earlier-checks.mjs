// Re-runs the checks of the earlier phase that hold the diagnostics feed's tests, with this phase's declared changes.
//
// `81-pinned-check.mjs` holds `DockModel.test.ts`, `ConfigureRule.test.ts` and `DiagnosticsFeed.test.ts` against their text
// at the base of that phase, and says nothing of the module rename's import line or of the one flip (`F2`) this phase
// makes. The check is therefore run from a copy in `<scratch>/p81/` whose three `PINNED` lines declare them; the earlier
// phase's own directory is only read, and so is the archive. `81-check.mjs single-source` and the archived record checks
// (`81-archived-checks.mjs`) run as they are. The archived run is accepted only with the lines it prints at this phase's
// base: every check exits 0 except `79-pinned-check.mjs`, whose one failing test is `TF29`, a flip that phase recorded.
//
// Prints `<check>: exit <n>: <last line>` for each check and exits 0 only when the rule above holds. From the repository root:
//   node .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-earlier-checks.mjs
//   node <this file> --self-test
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const P81 = ".planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws";
const OUT = join(realpathSync(process.env.TMPDIR || "/tmp"), "qd83", "p81");
const COPIED = ["81-pinned-check.mjs", "81-check.mjs", "81-01-SUMMARY.md", "81-RED-EVIDENCE.md"];

const edit = (name, before) => ({ name, before, after: before.replace("DiagnosticsStore.ts", "Diagnostics.ts") });
const literal = (edits) => `[${edits.map((e) => JSON.stringify(e)).join(", ")}]`;

/** The three `PINNED` lines of the earlier check this phase's rename touches, and what each is declared as in the copy. */
const DECLARED = [
  {
    file: "DockModel.test.ts",
    from: "  { file: `${TEST_DIR}DockModel.test.ts`, flips: [], added: [], edits: [] },",
    to: `  { file: \`\${TEST_DIR}DockModel.test.ts\`, flips: [], added: [], edits: ${literal([
      edit("import-WiringRead-noDiagnostics", 'import { WiringRead, noDiagnostics } from "../../src/model/DiagnosticsStore.ts";'),
      edit("import-DiagnosticsReading", 'import type { DiagnosticsReading } from "../../src/model/DiagnosticsStore.ts";'),
    ])} },`,
  },
  {
    file: "ConfigureRule.test.ts",
    from: '  { file: `${TEST_DIR}ConfigureRule.test.ts`, flips: ["CR22"], added: [], edits: [] },',
    to: `  { file: \`\${TEST_DIR}ConfigureRule.test.ts\`, flips: ["CR22"], added: [], edits: ${literal([
      edit("import-DiagnosticsOptions", 'import type { DiagnosticsOptions } from "../../src/model/DiagnosticsStore.ts";'),
    ])} },`,
  },
  {
    file: "DiagnosticsFeed.test.ts",
    from: '  { file: `${TEST_DIR}DiagnosticsFeed.test.ts`, flips: ["F31"], added: ["F33"], edits: [] },',
    to: `  { file: \`\${TEST_DIR}DiagnosticsFeed.test.ts\`, flips: ["F31", "F2"], added: ["F33"], edits: ${literal([
      edit("import-noDiagnostics", 'import { noDiagnostics } from "../../src/model/DiagnosticsStore.ts";'),
    ])} },`,
  },
];

/** The text with each declared line replaced, or the file name of the first line that does not occur exactly once. */
export const declare = (text, declared) => {
  let out = text;
  for (const { file, from, to } of declared) {
    if (out.split(from).length !== 2) return { refused: file };
    out = out.replace(from, () => to);
  }
  return { text: out };
};

/** The checks in the order they print, the first two run here and the last five by the archived run. */
const EXPECTED = [
  "81-pinned-check.mjs",
  "81-check.mjs single-source",
  "79-pinned-check.mjs",
  "79-characterisation-check.mjs",
  "80-pinned-check.mjs --all-applied",
  "80-characterisation-check.mjs --all-flipped",
  "80-characterisation-check.mjs --red-recorded",
];
const KNOWN_FAILURE = "79-pinned-check.mjs";

const parse = (line) => {
  const m = /^(.+?): exit (-?[0-9]+|null): (.*)$/.exec(line);
  return m === null ? undefined : { check: m[1], status: m[2], rest: m[3] };
};

/** The reasons the printed lines are not the base ones: every check exits 0, but `79-pinned-check.mjs` exits 1 on `TF29`. */
export const judgeEarlier = (lines) => {
  const parsed = lines.map(parse);
  const reasons = [];
  for (const check of EXPECTED) {
    const found = parsed.filter((p) => p !== undefined && p.check === check);
    if (found.length !== 1) {
      reasons.push(`${check}: ${found.length} lines, not one`);
      continue;
    }
    const { status, rest } = found[0];
    if (check !== KNOWN_FAILURE) {
      if (status !== "0") reasons.push(`${check}: exit ${status}: ${rest}`);
    } else if (status !== "1" || !rest.includes("TF29")) reasons.push(`${check}: expected exit 1 on TF29, got exit ${status}: ${rest}`);
  }
  for (const [i, p] of parsed.entries()) if (p === undefined || !EXPECTED.includes(p.check)) reasons.push(`unexpected line: ${lines[i]}`);
  return reasons;
};

const selfTest = () => {
  const baseLines = [
    "81-pinned-check.mjs: exit 0: pinned: 8 files hold their base text",
    "81-check.mjs single-source: exit 0: single-source: one collect loop, in callAll",
    "79-pinned-check.mjs: exit 1: packages/devtools/test/model/TimelineFeed.test.ts: TF29: an assertion or a line other than a construction changed",
    "79-characterisation-check.mjs: exit 0: characterisation: holds",
    "80-pinned-check.mjs --all-applied: exit 0: pinned: 4 files",
    "80-characterisation-check.mjs --all-flipped: exit 0: characterisation: 1 of 1 flips applied",
    "80-characterisation-check.mjs --red-recorded: exit 0: red-recorded: every flip has its red line",
  ];
  const replaced = (i, line) => baseLines.map((l, j) => (j === i ? line : l));
  const declared = [{ file: "a", from: "one", to: "uno" }];
  const found = declare("x one y", declared);
  const twice = declare("one one", declared);
  const none = declare("x", declared);
  const second = declare("x one y two", [...declared, { file: "b", from: "two", to: "dos" }]);
  const cases = [
    ["the base lines pass", judgeEarlier(baseLines).length === 0],
    ["the earlier pinned check failing fails", judgeEarlier(replaced(0, "81-pinned-check.mjs: exit 1: x.ts: differs")).length === 1],
    ["the single-source check failing fails", judgeEarlier(replaced(1, "81-check.mjs single-source: exit 1: two loops")).length === 1],
    ["a second failing archived line fails", judgeEarlier(replaced(4, "80-pinned-check.mjs --all-applied: exit 1: x")).length === 1],
    ["TF29 passing fails, since the recorded flip moved", judgeEarlier(replaced(2, "79-pinned-check.mjs: exit 0: pinned")).length === 1],
    ["the 79 pinned check failing on another test fails", judgeEarlier(replaced(2, "79-pinned-check.mjs: exit 1: TimelineFeed.test.ts: TF30: changed")).length === 1],
    ["a missing line fails", judgeEarlier(baseLines.slice(0, 6)).some((r) => r.includes("0 lines, not one"))],
    ["a repeated line fails", judgeEarlier([...baseLines, baseLines[3]]).some((r) => r.includes("2 lines, not one"))],
    ["a line that is no check fails", judgeEarlier([...baseLines, "extra: exit 0: x"]).some((r) => r.startsWith("unexpected line"))],
    ["a line found once is replaced", found.text === "x uno y"],
    ["a line found twice is refused", twice.refused === "a"],
    ["a line not found is refused", none.refused === "a"],
    ["every declared line is replaced in turn", second.text === "x uno y dos"],
  ];
  const failed = cases.filter(([, passed]) => !passed).map(([name]) => name);
  if (failed.length > 0) {
    process.stderr.write(`self-test failed: ${failed.join("; ")}\n`);
    process.exit(1);
  }
  process.stdout.write(`self-test: ${cases.length} passed\n`);
};

const lastLine = (text) => text.split("\n").filter((l) => l.trim() !== "").at(-1) ?? "";

/** Runs a script from the repository root with stdin closed, and prints and returns its `<check>: exit <n>: <last line>` line. */
const runCheck = (label, file, args) => {
  const r = spawnSync("node", [file, ...args], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const line = `${label}: exit ${r.status}: ${lastLine(r.stdout) || lastLine(r.stderr)}`;
  console.log(line);
  return line;
};

const run = () => {
  mkdirSync(OUT, { recursive: true });
  for (const name of COPIED) copyFileSync(resolve(root, P81, name), join(OUT, name));
  const copy = join(OUT, "81-pinned-check.mjs");
  const declared = declare(readFileSync(copy, "utf8"), DECLARED);
  if (declared.refused !== undefined) {
    console.error(`cannot declare ${declared.refused} in 81-pinned-check.mjs`);
    process.exit(1);
  }
  writeFileSync(copy, declared.text);
  const lines = [
    runCheck("81-pinned-check.mjs", copy, []),
    runCheck("81-check.mjs single-source", join(OUT, "81-check.mjs"), ["single-source"]),
  ];
  const archived = spawnSync("node", [resolve(root, P81, "81-archived-checks.mjs")], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  for (const line of archived.stdout.split("\n").filter((l) => l !== "")) {
    console.log(line);
    lines.push(line);
  }
  const reasons = judgeEarlier(lines);
  if (reasons.length > 0) {
    console.error(reasons.join("\n"));
    process.exit(1);
  }
};

if (process.argv.includes("--self-test")) selfTest();
else run();
