// Re-runs Phase 85's and Phase 86's checks from scratch copies and compares each run with a ledger measured on this phase's
// base.
//
// The earlier phases' directories are only read: the scripts they run (`85-check.mjs`, `85-pinned-check.mjs`, `85-mutation.mjs`,
// `85-earlier-checks.mjs`, `85-01-SUMMARY.md`, `85-RED-EVIDENCE.md`; `86-check.mjs`, `86-pinned-check.mjs`, `86-mutation.mjs`,
// `86-earlier-checks.mjs`, `86-01-SUMMARY.md`, `86-RED-EVIDENCE.md`, `86-mutation-base.json`, `86-mutation-close.json`) are
// copied to `<scratch>/p85/` and `<scratch>/p86/`, because each derives its own directory from its location and must neither
// write into, nor be run from, `.planning/milestones/` or the earlier phases' directories. A directory is found by its name
// prefix (`QD-85-`, `QD-86-`) under `.planning/phases/` or `.planning/milestones/*-phases/`, so the script keeps working when
// a phase is archived. `85-earlier-checks.mjs` and `86-earlier-checks.mjs` compute the repository root from their own location,
// which a copy breaks, so only their `--self-test` runs.
//
// The ledger is not "every check exits 0". It is what each run printed while `packages/*/src` still equalled `phase_base`, and a
// changed exit status or a changed line is a finding to explain, never a row to widen. Every row is a single fact, and no row
// carries a `when`: the move's files were each read against the judges and none is read in a way the move changes.
//   - 85's `three-predicates` reads `DockModel.ts` and `HydrationView.ts`, `panel-decides-nothing` reads `QuestionsPanel.tsx`
//     and `frame-reads-status` reads `DevtoolsDock.tsx` and `useStoreSnapshot.ts` (and counts `useSyncExternalStore` across
//     `src/react`, which the Simulator keeps at zero); none is a moved file.
//   - 85's `no-react-in-model` reads every model file for a React import, which the new model files hold none of.
//   - 85's and 86's `records` read the pinned-by paragraphs of BEH-QD-699, 700, 735, 742, 761 to 765 and 747 to 750, 766, 767 and
//     the test titles they quote; the moved tests are not among those files. `85-pinned-check.mjs` holds eighteen devtools tests
//     and `86-pinned-check.mjs` every react test, and the two edits this phase declares (`SupersedingRun.test.ts`,
//     `builtFeeds.ts`) are in neither set.
//   - the scans judge the added lines of the whole tree against each earlier base, so the moved code is held to the earlier
//     phases' forbidden forms, which is what they are re-run for.
// Two rows are the one measured finding, not a pass: `85-check.mjs scan-ids` and `86-check.mjs scan-ids` exit 1 on the tree as
// it is on the base. Five comments of this phase's born test files (`DiagnosticsFeed.stop.test.ts`, `StatedRun.characterisation
// .test.ts` three times, `TimelineFeed.stop.test.ts`) say a feed `publishes from now on`, a status tape's own subscription
// time, and the earlier phases' phrase list reads `from now on` as phase-relative wording. The files are held byte for byte, so
// the lines are not reworded, and the earlier scripts are not edited; this phase's own `scan-ids` carries the reviewed
// exception (`87-check.mjs`), and the row records what the earlier rule says. A third line changing it, or the exit becoming 0,
// is a finding too.
// The line compared is the last stdout line when the run exits 0, and otherwise the first stderr line that is not blank, not
// indented and does not begin `node:` (Node's own stack header).
//
// Prints `<check>: exit <n>: <line>` for each run and exits 0 only when every run matches its row. From the repository root:
//   node <phase 87 directory>/87-earlier-checks.mjs
//   node <this file> --self-test
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(realpathSync(process.env.TMPDIR || "/tmp"), "qd87");
const P85_COPIED = ["85-check.mjs", "85-pinned-check.mjs", "85-mutation.mjs", "85-earlier-checks.mjs", "85-01-SUMMARY.md", "85-RED-EVIDENCE.md"];
const P86_COPIED = ["86-check.mjs", "86-pinned-check.mjs", "86-mutation.mjs", "86-earlier-checks.mjs", "86-01-SUMMARY.md", "86-RED-EVIDENCE.md", "86-mutation-base.json", "86-mutation-close.json"];

/** The runs, in the order they print. `<root>` stands for the repository root in a line; `when` picks a row by a file's state. */
const LEDGER = [
  { label: "85-check.mjs base", copy: "p85", file: "85-check.mjs", args: ["base"], exit: 0, line: "2741584f50d176281038b478d0350dc35f174cc2" },
  { label: "85-check.mjs scan-ids", copy: "p85", file: "85-check.mjs", args: ["scan-ids"], exit: 1, line: "packages/devtools/test/model/DiagnosticsFeed.stop.test.ts:35 has phase-relative wording: /** The status tag of every notification a feed publishes from now on, in order. */" },
  { label: "85-check.mjs scan-forbidden", copy: "p85", file: "85-check.mjs", args: ["scan-forbidden"], exit: 0, line: "scan-forbidden: no forbidden form in added lines" },
  { label: "85-check.mjs trailers", copy: "p85", file: "85-check.mjs", args: ["trailers"], exit: 0, line: "trailers: 33 plan commits, each with the one trailer" },
  { label: "85-check.mjs no-react-in-model", copy: "p85", file: "85-check.mjs", args: ["no-react-in-model"], exit: 0, line: "no-react-in-model: the hydration view is pure, and no model file imports React" },
  { label: "85-check.mjs three-predicates", copy: "p85", file: "85-check.mjs", args: ["three-predicates"], exit: 0, line: "three-predicates: the questions guard, the one shared reader and the hydration key stay distinct" },
  { label: "85-check.mjs panel-decides-nothing", copy: "p85", file: "85-check.mjs", args: ["panel-decides-nothing"], exit: 0, line: "panel-decides-nothing: the panel renders the hydration view and decides nothing" },
  { label: "85-check.mjs frame-reads-status", copy: "p85", file: "85-check.mjs", args: ["frame-reads-status"], exit: 0, line: "frame-reads-status: the dock frame reads the poll's status alone" },
  { label: "85-check.mjs records", copy: "p85", file: "85-check.mjs", args: ["records"], exit: 0, line: "records: the pinned-by lists name tests that exist" },
  { label: "85-check.mjs records --close", copy: "p85", file: "85-check.mjs", args: ["records", "--close"], exit: 0, line: "records: the pinned-by lists name tests that exist, and every reserved record is written" },
  { label: "85-pinned-check.mjs", copy: "p85", file: "85-pinned-check.mjs", args: [], exit: 0, line: "pinned: 18 files hold their base text, 1 of 1 born files held, 1 of 1 declared edits applied" },
  { label: "86-check.mjs base", copy: "p86", file: "86-check.mjs", args: ["base"], exit: 0, line: "41c53c65c3ceb60f974650dd374f391c81db56e7" },
  { label: "86-check.mjs scan-ids", copy: "p86", file: "86-check.mjs", args: ["scan-ids"], exit: 1, line: "packages/devtools/test/model/DiagnosticsFeed.stop.test.ts:35 has phase-relative wording: /** The status tag of every notification a feed publishes from now on, in order. */" },
  { label: "86-check.mjs scan-forbidden", copy: "p86", file: "86-check.mjs", args: ["scan-forbidden"], exit: 0, line: "scan-forbidden: no forbidden form in added lines" },
  { label: "86-check.mjs trailers", copy: "p86", file: "86-check.mjs", args: ["trailers"], exit: 0, line: "trailers: 22 plan commits, each with the one trailer" },
  { label: "86-check.mjs owner-shape", copy: "p86", file: "86-check.mjs", args: ["owner-shape"], exit: 0, line: "owner-shape: the registry's lifetime is kept by one React-free module" },
  { label: "86-check.mjs provider-forwards-only", copy: "p86", file: "86-check.mjs", args: ["provider-forwards-only"], exit: 0, line: "provider-forwards-only: the provider builds the owner once and only forwards to it" },
  { label: "86-check.mjs records", copy: "p86", file: "86-check.mjs", args: ["records"], exit: 0, line: "records: the pinned-by lists name tests that exist" },
  { label: "86-check.mjs records --close", copy: "p86", file: "86-check.mjs", args: ["records", "--close"], exit: 0, line: "records: the pinned-by lists name tests that exist, and every reserved record is written" },
  { label: "86-pinned-check.mjs", copy: "p86", file: "86-pinned-check.mjs", args: [], exit: 0, line: "pinned: 59 files hold their base text, 1 of 1 born files held" },
  { label: "85-check.mjs --self-test", copy: "p85", file: "85-check.mjs", args: ["--self-test"], exit: 0, line: "self-test: 245 passed" },
  { label: "85-pinned-check.mjs --self-test", copy: "p85", file: "85-pinned-check.mjs", args: ["--self-test"], exit: 0, line: "self-test: 37 passed" },
  { label: "85-mutation.mjs --self-test", copy: "p85", file: "85-mutation.mjs", args: ["--self-test"], exit: 0, line: "self-test: 57 passed" },
  { label: "85-earlier-checks.mjs --self-test", copy: "p85", file: "85-earlier-checks.mjs", args: ["--self-test"], exit: 0, line: "self-test: 17 passed" },
  { label: "86-check.mjs --self-test", copy: "p86", file: "86-check.mjs", args: ["--self-test"], exit: 0, line: "self-test: 262 passed" },
  { label: "86-pinned-check.mjs --self-test", copy: "p86", file: "86-pinned-check.mjs", args: ["--self-test"], exit: 0, line: "self-test: 18 passed" },
  { label: "86-mutation.mjs --self-test", copy: "p86", file: "86-mutation.mjs", args: ["--self-test"], exit: 0, line: "self-test: 64 passed" },
  { label: "86-earlier-checks.mjs --self-test", copy: "p86", file: "86-earlier-checks.mjs", args: ["--self-test"], exit: 0, line: "self-test: 21 passed" },
];

/** The line a run is judged by: see the header. */
const lineOf = (status, stdout, stderr) => {
  if (status === 0) return stdout.split("\n").filter((l) => l.trim() !== "").at(-1) ?? "";
  return stderr.split("\n").find((l) => l.trim() !== "" && !/^\s/.test(l) && !l.startsWith("node:")) ?? "";
};

/** The ledger with `<root>` replaced by the repository root. */
const expand = (ledger, root) => ledger.map((row) => ({ ...row, line: row.line.replaceAll("<root>", root) }));

/** The rows that apply: a row with a `when` is kept only when it names the file's state (`moved` is true when it differs). */
const chooseRows = (ledger, moved) => ledger.filter((row) => row.when === undefined || row.when === (moved ? "moved" : "base"));

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

/** The reasons `names` (the directories whose name starts with `prefix`) are not exactly one. */
const judgePick = (prefix, names) => (names.length === 1 ? [] : [`${names.length} directories start with ${prefix}, not one`]);

/** The directories whose name starts with `prefix`, under `.planning/phases/` or `.planning/milestones/*-phases/`. */
const findPhases = (root, prefix) => {
  const parents = [join(root, ".planning/phases")];
  const milestones = join(root, ".planning/milestones");
  for (const name of readdirSync(milestones, { withFileTypes: true })) if (name.isDirectory() && name.name.endsWith("-phases")) parents.push(join(milestones, name.name));
  return parents.flatMap((parent) => readdirSync(parent, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name.startsWith(prefix)).map((e) => join(parent, e.name)));
};

const fail = (reasons) => {
  console.error(reasons.join("\n"));
  process.exit(1);
};

/** The one directory whose name starts with `prefix`. */
const findPhase = (root, prefix) => {
  const found = findPhases(root, prefix);
  const reasons = judgePick(prefix, found);
  if (reasons.length > 0) fail(reasons);
  return found[0];
};

const selfTest = () => {
  const ledger = expand(chooseRows(LEDGER, false), "/r");
  const ok = ledger.map((row) => ({ label: row.label, status: row.exit, line: row.line }));
  const swap = (i, patch) => ok.map((r, j) => (j === i ? { ...r, ...patch } : r));
  const keyed = [
    { label: "a", when: "base", exit: 0, line: "x" },
    { label: "a", when: "moved", exit: 1, line: "y" },
    { label: "b", exit: 0, line: "z" },
  ];
  const tmp = mkdtempSync(join(realpathSync(tmpdir()), "qd87-st-"));
  mkdirSync(join(tmp, ".planning/phases/QD-1-a"), { recursive: true });
  mkdirSync(join(tmp, ".planning/milestones/v9-phases/QD-2-b"), { recursive: true });
  mkdirSync(join(tmp, ".planning/milestones/v9-phases/QD-22-c"), { recursive: true });
  mkdirSync(join(tmp, ".planning/milestones/other/QD-3-d"), { recursive: true });
  const found = [findPhases(tmp, "QD-1-"), findPhases(tmp, "QD-2-"), findPhases(tmp, "QD-3-")].map((names) => names.map((n) => n.slice(tmp.length + 1)));
  rmSync(tmp, { recursive: true, force: true });
  const scanIds = ledger.findIndex((r) => r.label === "85-check.mjs scan-ids");
  const cases = [
    ["a matching set of runs passes", judgeLedger(ok, ledger).length === 0],
    ["a matching exit with another line fails, naming both lines", judgeLedger(swap(0, { line: "changed" }), ledger).join() === `${ledger[0].label}: expected the line "${ledger[0].line}", got "changed"`],
    ["a matching line with another exit fails, naming the run and both statuses", judgeLedger(swap(0, { status: 1 }), ledger).join() === `${ledger[0].label}: expected exit 0, got exit 1: ${ledger[0].line}`],
    ["an exit that was 1 now 0 fails", judgeLedger(swap(scanIds, { status: 0 }), ledger).length === 1],
    ["a changed self-test count fails", judgeLedger(swap(ok.length - 1, { line: "self-test: 1 passed" }), ledger).length === 1],
    ["a missing run fails, naming it", judgeLedger(ok.slice(1), ledger).join() === `missing run: ${ledger[0].label}`],
    ["a run no row names fails", judgeLedger([...ok, { label: "extra", status: 0, line: "x" }], ledger).join() === "unexpected run: extra"],
    ["the root placeholder is replaced", expand([{ label: "x", line: "<root>/a" }], "/r")[0].line === "/r/a"],
    ["an unchanged file picks the base row", chooseRows(keyed, false).map((r) => `${r.label}:${r.when ?? "-"}:${r.exit}`).join() === "a:base:0,b:-:0"],
    ["a changed file picks the moved row", chooseRows(keyed, true).map((r) => `${r.label}:${r.when ?? "-"}:${r.exit}`).join() === "a:moved:1,b:-:0"],
    ["a ledger with no when row is kept whole either way", chooseRows(LEDGER, false).length === LEDGER.length && chooseRows(LEDGER, true).length === LEDGER.length],
    ["a run that exits 0 is judged by its last stdout line", lineOf(0, "a\nb\n\n", "ignored") === "b"],
    ["a run that fails is judged by its first plain stderr line", lineOf(1, "out", "\nnode:internal/x:1\n  throw err;\n  ^\n\nError: gone\n  at y\n") === "Error: gone"],
    ["a failing run with only Node's header and an indented stack has no line", lineOf(1, "", "node:internal/x:1\n  throw err;\n") === ""],
    ["a failing run keeps a first line that is plain text", lineOf(1, "", "a.test.ts:3 has wording\nnode:internal/errors:999\n") === "a.test.ts:3 has wording"],
    ["one matching directory passes, none or two fail", judgePick("QD-1-", ["a"]).length === 0 && judgePick("QD-1-", []).length === 1 && judgePick("QD-1-", ["a", "b"]).length === 1],
    ["a directory under .planning/phases resolves", found[0].join() === ".planning/phases/QD-1-a"],
    ["a directory under .planning/milestones/*-phases resolves, and a longer number does not match", found[1].join() === ".planning/milestones/v9-phases/QD-2-b"],
    ["a directory under a milestone folder that does not end in -phases is not found", found[2].length === 0],
    ["the ledger has twenty-eight rows with twenty-eight labels, the two at exit 1 being the earlier scan-ids", LEDGER.length === 28 && new Set(LEDGER.map((r) => r.label)).size === 28 && LEDGER.filter((r) => r.exit === 1).map((r) => r.label).join() === "85-check.mjs scan-ids,86-check.mjs scan-ids"],
    ["every row names a copy the script makes", LEDGER.every((r) => (r.copy === "p85" ? P85_COPIED : P86_COPIED).includes(r.file))],
  ];
  const failed = cases.filter(([, passed]) => !passed).map(([name]) => name);
  if (failed.length > 0) fail([`self-test failed: ${failed.join("; ")}`]);
  console.log(`self-test: ${cases.length} passed`);
};

const run = () => {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: here, encoding: "utf8" }).trim();
  const copies = { p85: { from: findPhase(root, "QD-85-"), files: P85_COPIED }, p86: { from: findPhase(root, "QD-86-"), files: P86_COPIED } };
  for (const [name, { from, files }] of Object.entries(copies)) {
    rmSync(join(OUT, name), { recursive: true, force: true });
    mkdirSync(join(OUT, name), { recursive: true });
    for (const file of files) copyFileSync(join(from, file), join(OUT, name, file));
  }
  // No row carries a `when` (see the header), so no file state picks between rows; a row that needs one reads it here.
  const ledger = expand(chooseRows(LEDGER, false), root);
  const runs = [];
  for (const row of ledger) {
    const r = spawnSync("node", [join(OUT, row.copy, row.file), ...row.args], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const result = { label: row.label, status: r.status, line: lineOf(r.status, r.stdout, r.stderr) };
    console.log(`${result.label}: exit ${result.status}: ${result.line}`);
    runs.push(result);
  }
  const reasons = judgeLedger(runs, ledger);
  if (reasons.length > 0) fail(reasons);
};

if (process.argv.includes("--self-test")) selfTest();
else run();
