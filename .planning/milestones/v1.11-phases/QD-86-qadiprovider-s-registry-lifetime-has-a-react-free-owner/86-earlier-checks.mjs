// Re-runs Phase 82's and Phase 85's checks from scratch copies and compares each run with a ledger measured on this phase's
// base.
//
// The earlier phases' directories are only read: the scripts they run (`82-check.mjs`, `82-mutation.mjs`, `82-01-SUMMARY.md`,
// `82-RED-EVIDENCE.md`; `85-check.mjs`, `85-pinned-check.mjs`, `85-mutation.mjs`, `85-earlier-checks.mjs`, `85-01-SUMMARY.md`,
// `85-RED-EVIDENCE.md`) are copied to `<scratch>/p82/` and `<scratch>/p85/`, because each derives its own directory from its
// location and must neither write into, nor be run from, `.planning/milestones/` or Phase 85's directory. A directory is
// found by its name prefix (`QD-82-`, `QD-85-`) under `.planning/phases/` or `.planning/milestones/*-phases/`, so the script
// keeps working when a phase is archived. `85-earlier-checks.mjs` computes the repository root from its own location, which a
// copy breaks, so only its `--self-test` runs.
//
// The ledger is not "every check exits 0". It is what each run printed on this phase's base, and a changed exit status or a
// changed line is a finding to explain, never a row to widen. Two rows are not one fact each:
//   - `82-check.mjs single-owner` has a row for each state of `packages/react/src/QadiProvider.tsx`. The archived judge
//     requires the provider to build the registry's lease itself (`makeRegistryLease(` once, `AtomRegistry.make(` at least
//     once). Phase 86 moves that into a React-free owner and the provider forwards to it, so once the provider differs from its
//     text on `phase_base` the same judge exits 1 and its first line is `QadiProvider.tsx does not build one lease`: the one
//     reason a provider that forwards to the owner gives it. That is the extension of ADR-QD-195 decision 2 (the lease is built
//     once, now by the owner), expected and written down before the move. The row is chosen by whether the provider equals its
//     `phase_base` text (`when: "base"`) or not (`when: "moved"`), never by what the run printed.
//   - `82-check.mjs base` exits 0, not on ancestry: Phase 82's base was squash-merged as `ac7578f3`, but its `base` mode only
//     prints the base its copied summary records and checks no ancestry from a scratch copy, so the row is that printed base.
// Every other row is the line measured on the tree when the provider still equals `phase_base`, and stays the same after the
// move: the 85 tree-only modes, its pinned check and the self-tests.
// The line compared is the last stdout line when the run exits 0, and otherwise the first stderr line that is not blank, not
// indented and does not begin `node:` (Node's own stack header).
//
// Prints `<check>: exit <n>: <line>` for each run and exits 0 only when every run matches its row. From the repository root:
//   node <phase 86 directory>/86-earlier-checks.mjs
//   node <this file> --self-test
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(realpathSync(process.env.TMPDIR || "/tmp"), "qd86");
const PHASE_BASE = "41c53c65c3ceb60f974650dd374f391c81db56e7";
const PROVIDER = "packages/react/src/QadiProvider.tsx";
const P82_COPIED = ["82-check.mjs", "82-mutation.mjs", "82-01-SUMMARY.md", "82-RED-EVIDENCE.md"];
const P85_COPIED = ["85-check.mjs", "85-pinned-check.mjs", "85-mutation.mjs", "85-earlier-checks.mjs", "85-01-SUMMARY.md", "85-RED-EVIDENCE.md"];
const SINGLE_OWNER = "single-owner: the registry's lifetime is decided once, in RegistryLease.ts";

/** The runs, in the order they print. `<root>` stands for the repository root in a line; `when` picks a row by the provider. */
const LEDGER = [
  { label: "82-check.mjs single-owner", when: "base", copy: "p82", file: "82-check.mjs", args: ["single-owner"], exit: 0, line: SINGLE_OWNER },
  { label: "82-check.mjs single-owner", when: "moved", copy: "p82", file: "82-check.mjs", args: ["single-owner"], exit: 1, line: "QadiProvider.tsx does not build one lease" },
  { label: "82-check.mjs base", copy: "p82", file: "82-check.mjs", args: ["base"], exit: 0, line: "16f09f776fbb9c8c8c2b9b9452e7cf6994a727e3" },
  { label: "85-check.mjs base", copy: "p85", file: "85-check.mjs", args: ["base"], exit: 0, line: "2741584f50d176281038b478d0350dc35f174cc2" },
  { label: "85-check.mjs scan-ids", copy: "p85", file: "85-check.mjs", args: ["scan-ids"], exit: 0, line: "scan-ids: no id or phase wording in added lines" },
  { label: "85-check.mjs scan-forbidden", copy: "p85", file: "85-check.mjs", args: ["scan-forbidden"], exit: 0, line: "scan-forbidden: no forbidden form in added lines" },
  { label: "85-check.mjs trailers", copy: "p85", file: "85-check.mjs", args: ["trailers"], exit: 0, line: "trailers: 33 plan commits, each with the one trailer" },
  { label: "85-check.mjs no-react-in-model", copy: "p85", file: "85-check.mjs", args: ["no-react-in-model"], exit: 0, line: "no-react-in-model: the hydration view is pure, and no model file imports React" },
  { label: "85-check.mjs three-predicates", copy: "p85", file: "85-check.mjs", args: ["three-predicates"], exit: 0, line: "three-predicates: the questions guard, the one shared reader and the hydration key stay distinct" },
  { label: "85-check.mjs panel-decides-nothing", copy: "p85", file: "85-check.mjs", args: ["panel-decides-nothing"], exit: 0, line: "panel-decides-nothing: the panel renders the hydration view and decides nothing" },
  { label: "85-check.mjs frame-reads-status", copy: "p85", file: "85-check.mjs", args: ["frame-reads-status"], exit: 0, line: "frame-reads-status: the dock frame reads the poll's status alone" },
  { label: "85-check.mjs records", copy: "p85", file: "85-check.mjs", args: ["records"], exit: 0, line: "records: the pinned-by lists name tests that exist" },
  { label: "85-check.mjs records --close", copy: "p85", file: "85-check.mjs", args: ["records", "--close"], exit: 0, line: "records: the pinned-by lists name tests that exist, and every reserved record is written" },
  { label: "85-pinned-check.mjs", copy: "p85", file: "85-pinned-check.mjs", args: [], exit: 0, line: "pinned: 18 files hold their base text, 1 of 1 born files held, 1 of 1 declared edits applied" },
  { label: "82-check.mjs --self-test", copy: "p82", file: "82-check.mjs", args: ["--self-test"], exit: 0, line: "self-test: 147 passed" },
  { label: "82-mutation.mjs --self-test", copy: "p82", file: "82-mutation.mjs", args: ["--self-test"], exit: 0, line: "self-test: 49 passed" },
  { label: "85-check.mjs --self-test", copy: "p85", file: "85-check.mjs", args: ["--self-test"], exit: 0, line: "self-test: 245 passed" },
  { label: "85-pinned-check.mjs --self-test", copy: "p85", file: "85-pinned-check.mjs", args: ["--self-test"], exit: 0, line: "self-test: 37 passed" },
  { label: "85-mutation.mjs --self-test", copy: "p85", file: "85-mutation.mjs", args: ["--self-test"], exit: 0, line: "self-test: 57 passed" },
  { label: "85-earlier-checks.mjs --self-test", copy: "p85", file: "85-earlier-checks.mjs", args: ["--self-test"], exit: 0, line: "self-test: 17 passed" },
];

/** The line a run is judged by: see the header. */
const lineOf = (status, stdout, stderr) => {
  if (status === 0) return stdout.split("\n").filter((l) => l.trim() !== "").at(-1) ?? "";
  return stderr.split("\n").find((l) => l.trim() !== "" && !/^\s/.test(l) && !l.startsWith("node:")) ?? "";
};

/** The ledger with `<root>` replaced by the repository root. */
const expand = (ledger, root) => ledger.map((row) => ({ ...row, line: row.line.replaceAll("<root>", root) }));

/** The rows that apply: a row with a `when` is kept only when it names the provider's state (`moved` is true when it differs). */
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

const selfTest = () => {
  const ledger = expand(chooseRows(LEDGER, false), "/r");
  const ok = ledger.map((row) => ({ label: row.label, status: row.exit, line: row.line }));
  const swap = (i, patch) => ok.map((r, j) => (j === i ? { ...r, ...patch } : r));
  const tmp = mkdtempSync(join(realpathSync(tmpdir()), "qd86-st-"));
  mkdirSync(join(tmp, ".planning/phases/QD-1-a"), { recursive: true });
  mkdirSync(join(tmp, ".planning/milestones/v9-phases/QD-2-b"), { recursive: true });
  mkdirSync(join(tmp, ".planning/milestones/v9-phases/QD-22-c"), { recursive: true });
  mkdirSync(join(tmp, ".planning/milestones/other/QD-3-d"), { recursive: true });
  const found = [findPhases(tmp, "QD-1-"), findPhases(tmp, "QD-2-"), findPhases(tmp, "QD-3-")].map((names) => names.map((n) => n.slice(tmp.length + 1)));
  rmSync(tmp, { recursive: true, force: true });
  const cases = [
    ["a matching set of runs passes", judgeLedger(ok, ledger).length === 0],
    ["a matching exit with another line fails, naming both lines", judgeLedger(swap(3, { line: "scan-ids: changed" }), ledger).join() === `85-check.mjs scan-ids: expected the line "${ledger[3].line}", got "scan-ids: changed"`],
    ["a matching line with another exit fails, naming the run and both statuses", judgeLedger(swap(3, { status: 1 }), ledger).join() === `85-check.mjs scan-ids: expected exit 0, got exit 1: ${ledger[3].line}`],
    ["an exit that was 1 now 0 fails", judgeLedger(swap(0, { status: 0 }), expand(chooseRows(LEDGER, true), "/r")).join() === "82-check.mjs single-owner: expected exit 1, got exit 0: " + SINGLE_OWNER],
    ["a changed self-test count fails", judgeLedger(swap(ok.length - 1, { line: "self-test: 16 passed" }), ledger).length === 1],
    ["a missing run fails, naming it", judgeLedger(ok.slice(1), ledger).join() === "missing run: 82-check.mjs single-owner"],
    ["a run no row names fails", judgeLedger([...ok, { label: "extra", status: 0, line: "x" }], ledger).join() === "unexpected run: extra"],
    ["the root placeholder is replaced", expand([{ label: "x", line: "<root>/a" }], "/r")[0].line === "/r/a"],
    ["an unchanged provider picks the base row, exit 0", chooseRows(LEDGER, false).filter((r) => r.label === "82-check.mjs single-owner").map((r) => `${r.when}:${r.exit}`).join() === "base:0"],
    ["a changed provider picks the moved row, exit 1 and its one reason", chooseRows(LEDGER, true).filter((r) => r.label === "82-check.mjs single-owner").map((r) => `${r.when}:${r.exit}:${r.line}`).join() === "moved:1:QadiProvider.tsx does not build one lease"],
    ["each choice keeps every row without a when", chooseRows(LEDGER, false).length === LEDGER.length - 1 && chooseRows(LEDGER, true).length === LEDGER.length - 1],
    ["a run that exits 0 is judged by its last stdout line", lineOf(0, "a\nb\n\n", "ignored") === "b"],
    ["a run that fails is judged by its first plain stderr line", lineOf(1, "out", "\nnode:internal/x:1\n  throw err;\n  ^\n\nError: gone\n  at y\n") === "Error: gone"],
    ["a failing run with only Node's header and an indented stack has no line", lineOf(1, "", "node:internal/x:1\n  throw err;\n") === ""],
    ["a failing run keeps a first line that is plain text", lineOf(1, "", "QadiProvider.tsx does not build one lease\nnode:internal/errors:999\n") === "QadiProvider.tsx does not build one lease"],
    ["one matching directory passes, none or two fail", judgePick("QD-1-", ["a"]).length === 0 && judgePick("QD-1-", []).length === 1 && judgePick("QD-1-", ["a", "b"]).length === 1],
    ["a directory under .planning/phases resolves", found[0].join() === ".planning/phases/QD-1-a"],
    ["a directory under .planning/milestones/*-phases resolves, and a longer number does not match", found[1].join() === ".planning/milestones/v9-phases/QD-2-b"],
    ["a directory under a milestone folder that does not end in -phases is not found", found[2].length === 0],
    ["the ledger has twenty rows and nineteen labels, the one row at exit 1 being the moved provider", LEDGER.length === 20 && new Set(LEDGER.map((r) => r.label)).size === 19 && LEDGER.filter((r) => r.exit === 1).length === 1],
    ["every row names a copy the script makes", LEDGER.every((r) => (r.copy === "p82" ? P82_COPIED : P85_COPIED).includes(r.file))],
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

/** The one directory whose name starts with `prefix`. */
const findPhase = (root, prefix) => {
  const found = findPhases(root, prefix);
  const reasons = judgePick(prefix, found);
  if (reasons.length > 0) fail(reasons);
  return found[0];
};

const run = () => {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: here, encoding: "utf8" }).trim();
  const copies = { p82: { from: findPhase(root, "QD-82-"), files: P82_COPIED }, p85: { from: findPhase(root, "QD-85-"), files: P85_COPIED } };
  for (const [name, { from, files }] of Object.entries(copies)) {
    rmSync(join(OUT, name), { recursive: true, force: true });
    mkdirSync(join(OUT, name), { recursive: true });
    for (const file of files) copyFileSync(join(from, file), join(OUT, name, file));
  }
  const baseText = execFileSync("git", ["show", `${PHASE_BASE}:${PROVIDER}`], { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 });
  const moved = readFileSync(join(root, PROVIDER), "utf8") !== baseText;
  const ledger = expand(chooseRows(LEDGER, moved), root);
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
