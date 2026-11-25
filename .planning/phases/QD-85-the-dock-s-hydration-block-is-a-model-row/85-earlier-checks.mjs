// Re-runs Phase 84's checks, and Phase 80's pinned check, from scratch copies and compares each run with a ledger measured on
// this phase's base.
//
// The earlier phases' directories are only read: the scripts they run (`84-check.mjs`, `84-pinned-check.mjs`,
// `84-mutation.mjs`, `84-earlier-checks.mjs`, `84-01-SUMMARY.md`, `84-RED-EVIDENCE.md`, and Phase 80's `80-pinned-check.mjs`) are
// copied to `<scratch>/p84/` and `<scratch>/p80/`, because each derives its own directory from its location and must neither
// write into, nor be run from, `.planning/milestones/`. A directory is found by its name prefix (`QD-84-`, `QD-80-`) under
// `.planning/phases/` or `.planning/milestones/*-phases/`, so the script keeps working when a phase is archived.
// `84-earlier-checks.mjs` computes the repository root as three levels above itself, which a copy breaks, so only its
// `--self-test` runs.
//
// The ledger is not "every check exits 0". It is what each run printed on this phase's base, and a changed exit status or a
// changed first line is a finding to explain, never a row to widen:
//   - `84-check.mjs base` and `84-pinned-check.mjs` exit 1 on `phase_base is not an ancestor of HEAD`: Phase 84's base was
//     squash-merged into `main` as `ac7578f3` (#165), so the commit it names is no longer reachable from HEAD.
//   - `80-pinned-check.mjs` exits 1 for a different reason: it reads `80-check.mjs` from the path its phase had before the
//     milestone was archived, which no longer exists.
//   - `QuestionsPanel.test.tsx` is the file both pinned checks hold and this phase edits; the edit is declared in
//     `85-pinned-check.mjs`, and each row's `holds` is checked against the script's own text so the claim cannot go stale.
//   - The tree-only modes of `84-check.mjs` and the four self-tests exit 0.
// The line compared is the last stdout line when the run exits 0, and otherwise the first stderr line that is not blank, not
// indented and does not begin `node:` (Node's own stack header).
//
// Prints `<check>: exit <n>: <line>` for each run and exits 0 only when every run matches its row. From the repository root:
//   node <phase 85 directory>/85-earlier-checks.mjs
//   node <this file> --self-test
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(realpathSync(process.env.TMPDIR || "/tmp"), "qd85");
const HELD_FILE = "QuestionsPanel.test.tsx";
const P84_COPIED = ["84-check.mjs", "84-pinned-check.mjs", "84-mutation.mjs", "84-earlier-checks.mjs", "84-01-SUMMARY.md", "84-RED-EVIDENCE.md"];
const P80_COPIED = ["80-pinned-check.mjs"];
const NO_ANCESTOR = "phase_base is not an ancestor of HEAD";

/** The runs, in the order they print. `<root>` stands for the repository root in a line. */
const LEDGER = [
  { label: "84-check.mjs base", copy: "p84", file: "84-check.mjs", args: ["base"], exit: 1, line: NO_ANCESTOR },
  { label: "84-check.mjs no-adapter", copy: "p84", file: "84-check.mjs", args: ["no-adapter"], exit: 0, line: "no-adapter: useConfigured takes a value that has configure, and no adapter is left" },
  { label: "84-check.mjs no-restated-set", copy: "p84", file: "84-check.mjs", args: ["no-restated-set"], exit: 0, line: "no-restated-set: every move goes through the store's set, and choose arms before it" },
  { label: "84-check.mjs one-path", copy: "p84", file: "84-check.mjs", args: ["one-path"], exit: 0, line: "one-path: the lens adapter reads the guards from its one subscription and from the store" },
  { label: "84-check.mjs one-ledger", copy: "p84", file: "84-check.mjs", args: ["one-ledger"], exit: 0, line: "one-ledger: one stop ledger, in useStopNotice, called once per feed" },
  { label: "84-check.mjs records", copy: "p84", file: "84-check.mjs", args: ["records"], exit: 0, line: "records: the adapter row and the pinned-by lists name tests that exist" },
  { label: "84-check.mjs records --close", copy: "p84", file: "84-check.mjs", args: ["records", "--close"], exit: 0, line: "records: the adapter row and the pinned-by lists name tests that exist, and every reserved record is written" },
  { label: "84-pinned-check.mjs", copy: "p84", file: "84-pinned-check.mjs", args: [], exit: 1, line: NO_ANCESTOR, holds: HELD_FILE },
  {
    label: "80-pinned-check.mjs",
    copy: "p80",
    file: "80-pinned-check.mjs",
    args: [],
    exit: 1,
    line: "Error: Cannot find module '<root>/.planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-check.mjs'",
    holds: HELD_FILE,
  },
  { label: "84-check.mjs --self-test", copy: "p84", file: "84-check.mjs", args: ["--self-test"], exit: 0, line: "self-test: 216 passed" },
  { label: "84-pinned-check.mjs --self-test", copy: "p84", file: "84-pinned-check.mjs", args: ["--self-test"], exit: 0, line: "self-test: 38 passed" },
  { label: "84-mutation.mjs --self-test", copy: "p84", file: "84-mutation.mjs", args: ["--self-test"], exit: 0, line: "self-test: 44 passed" },
  { label: "84-earlier-checks.mjs --self-test", copy: "p84", file: "84-earlier-checks.mjs", args: ["--self-test"], exit: 0, line: "self-test: 8 passed" },
];

/** The line a run is judged by: see the header. */
const lineOf = (status, stdout, stderr) => {
  if (status === 0) return stdout.split("\n").filter((l) => l.trim() !== "").at(-1) ?? "";
  return stderr.split("\n").find((l) => l.trim() !== "" && !/^\s/.test(l) && !l.startsWith("node:")) ?? "";
};

/** The ledger with `<root>` replaced by the repository root. */
const expand = (ledger, root) => ledger.map((row) => ({ ...row, line: row.line.replaceAll("<root>", root) }));

/** The reasons the runs are not the ledger's rows: a missing run, a changed exit status, a changed line, a run no row names. */
const judgeLedger = (runs, ledger) => {
  const reasons = [];
  for (const row of ledger) {
    const run = runs.find((r) => r.label === row.label);
    if (run === undefined) reasons.push(`missing run: ${row.label}`);
    else if (run.status !== row.exit) reasons.push(`${row.label}: expected exit ${row.exit}, got exit ${run.status}: ${run.line}`);
    else if (run.line !== row.line) reasons.push(`${row.label}: expected the line "${row.line}", got "${run.line}"`);
  }
  for (const run of runs) if (!ledger.some((row) => row.label === run.label)) reasons.push(`unexpected run: ${run.label}`);
  return reasons;
};

/** The reasons a script's text no longer names the file the ledger says it holds. */
const judgeHolds = (label, text, name) => (text.includes(name) ? [] : [`${label}: its text no longer names ${name}`]);

/** The reasons `names` (the directories whose name starts with `prefix`) are not exactly one. */
const judgePick = (prefix, names) => (names.length === 1 ? [] : [`${names.length} directories start with ${prefix}, not one`]);

const selfTest = () => {
  const ledger = expand(LEDGER, "/r");
  const ok = ledger.map((row) => ({ label: row.label, status: row.exit, line: row.line }));
  const swap = (i, patch) => ok.map((r, j) => (j === i ? { ...r, ...patch } : r));
  const cases = [
    ["a matching set of runs passes", judgeLedger(ok, ledger).length === 0],
    ["a changed exit status fails, naming the run and both statuses", judgeLedger(swap(1, { status: 1, line: "x" }), ledger).join() === "84-check.mjs no-adapter: expected exit 0, got exit 1: x"],
    ["an exit that was 1 now 0 fails", judgeLedger(swap(0, { status: 0 }), ledger).join().startsWith("84-check.mjs base: expected exit 1, got exit 0")],
    ["a changed line at the same status fails, naming both lines", judgeLedger(swap(5, { line: "records: changed" }), ledger).join() === `84-check.mjs records: expected the line "${ledger[5].line}", got "records: changed"`],
    ["a changed self-test count fails", judgeLedger(swap(9, { line: "self-test: 215 passed" }), ledger).length === 1],
    ["a missing run fails, naming it", judgeLedger(ok.slice(1), ledger).join() === "missing run: 84-check.mjs base"],
    ["a run no row names fails", judgeLedger([...ok, { label: "extra", status: 0, line: "x" }], ledger).join() === "unexpected run: extra"],
    ["the root placeholder is replaced in the Phase 80 row", ledger[8].line.startsWith("Error: Cannot find module '/r/.planning/phases/QD-80-") && !ledger[8].line.includes("<root>")],
    ["a run that exits 0 is judged by its last stdout line", lineOf(0, "a\nb\n\n", "ignored") === "b"],
    ["a run that fails is judged by its first plain stderr line", lineOf(1, "out", "\nnode:internal/x:1\n  throw err;\n  ^\n\nError: gone\n  at y\n") === "Error: gone"],
    ["a failing run with only Node's header and an indented stack has no line", lineOf(1, "", "node:internal/x:1\n  throw err;\n") === ""],
    ["a failing run keeps a first line that is plain text", lineOf(1, "", `${NO_ANCESTOR}\nnode:internal/errors:999\n`) === NO_ANCESTOR],
    ["a script that names the held file holds it", judgeHolds("c", `x ${HELD_FILE} y`, HELD_FILE).length === 0],
    ["a script that no longer names the held file fails", judgeHolds("c", "x", HELD_FILE).join() === `c: its text no longer names ${HELD_FILE}`],
    ["one matching directory passes, none or two fail", judgePick("QD-1-", ["a"]).length === 0 && judgePick("QD-1-", []).length === 1 && judgePick("QD-1-", ["a", "b"]).length === 1],
    ["the ledger has thirteen distinct runs, three of them at exit 1", LEDGER.length === 13 && new Set(LEDGER.map((r) => r.label)).size === 13 && LEDGER.filter((r) => r.exit === 1).length === 3],
    ["only the two pinned checks claim the held file", LEDGER.filter((r) => r.holds !== undefined).map((r) => r.label).join() === "84-pinned-check.mjs,80-pinned-check.mjs"],
  ];
  const failed = cases.filter(([, passed]) => !passed).map(([name]) => name);
  if (failed.length > 0) {
    process.stderr.write(`self-test failed: ${failed.join("; ")}\n`);
    process.exit(1);
  }
  process.stdout.write(`self-test: ${cases.length} passed\n`);
};

const fail = (reasons) => {
  console.error(reasons.join("\n"));
  process.exit(1);
};

/** The one directory whose name starts with `prefix`, under `.planning/phases/` or `.planning/milestones/*-phases/`. */
const findPhase = (root, prefix) => {
  const parents = [join(root, ".planning/phases")];
  const milestones = join(root, ".planning/milestones");
  for (const name of readdirSync(milestones, { withFileTypes: true })) if (name.isDirectory() && name.name.endsWith("-phases")) parents.push(join(milestones, name.name));
  const found = parents.flatMap((parent) => readdirSync(parent, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name.startsWith(prefix)).map((e) => join(parent, e.name)));
  const reasons = judgePick(prefix, found);
  if (reasons.length > 0) fail(reasons);
  return found[0];
};

const run = () => {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: here, encoding: "utf8" }).trim();
  const copies = { p84: { from: findPhase(root, "QD-84-"), files: P84_COPIED }, p80: { from: findPhase(root, "QD-80-"), files: P80_COPIED } };
  for (const [name, { from, files }] of Object.entries(copies)) {
    rmSync(join(OUT, name), { recursive: true, force: true });
    mkdirSync(join(OUT, name), { recursive: true });
    for (const file of files) copyFileSync(join(from, file), join(OUT, name, file));
  }
  const ledger = expand(LEDGER, root);
  const reasons = judgeHolds("85-pinned-check.mjs", readFileSync(join(here, "85-pinned-check.mjs"), "utf8"), HELD_FILE);
  const runs = [];
  for (const row of ledger) {
    const script = join(OUT, row.copy, row.file);
    if (row.holds !== undefined) reasons.push(...judgeHolds(row.label, readFileSync(script, "utf8"), row.holds));
    const r = spawnSync("node", [script, ...row.args], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const result = { label: row.label, status: r.status, line: lineOf(r.status, r.stdout, r.stderr) };
    console.log(`${result.label}: exit ${result.status}: ${result.line}`);
    runs.push(result);
  }
  reasons.push(...judgeLedger(runs, ledger));
  if (reasons.length > 0) fail(reasons);
};

if (process.argv.includes("--self-test")) selfTest();
else run();
