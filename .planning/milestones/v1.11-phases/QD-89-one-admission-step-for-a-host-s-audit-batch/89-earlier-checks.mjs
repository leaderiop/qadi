// Re-runs Phase 85's, 86's, 87's and 88's checks from scratch copies and compares each run with a ledger measured on this phase's
// base.
//
// The earlier phases' directories are only read: the scripts they run (`85-check.mjs`, `85-pinned-check.mjs`, `85-mutation.mjs`,
// `85-earlier-checks.mjs`, `85-01-SUMMARY.md`, `85-RED-EVIDENCE.md`; the files in `P86_COPIED`, `P87_COPIED` and `P88_COPIED`) are
// copied to `<scratch>/p85/` to `<scratch>/p88/`, because each derives its own directory from its location and must neither
// write into, nor be run from, `.planning/milestones/` or the earlier phases' directories. A directory is found by its name
// prefix (`QD-85-` to `QD-88-`) under `.planning/phases/` or `.planning/milestones/*-phases/`, so the script keeps working when a
// phase is archived. The repository root is the working directory (refused unless it holds `.planning/phases`), and this phase's
// own directory is found by its prefix `QD-89-` like the others, so a copy of this script run from the root behaves the same.
// `85-earlier-checks.mjs` to `88-earlier-checks.mjs` compute the repository root from their own location, which a copy breaks, so
// only their `--self-test` runs.
//
// The ledger is not "every check exits 0". It is what each run printed while `packages/*/src` still equalled `phase_base`, and a
// changed exit status or a changed line is a finding to explain with a fixed commit subject of this phase, or a defect to fix,
// never a row to widen. `RUNS` lists what is run and `LEDGER` what each run must print, joined by the label, so a run with no row
// and a row with no run are findings of their own. Every row is a single fact. Four kinds of row:
//   fixed      the exit status and the one line the run is judged by (see below).
//   pattern    `87-check.mjs trailers` and `88-check.mjs trailers` print a count of the commits since their phase's base, which
//              grows with every commit of this phase, so the line is matched by a regular expression, and the status must still
//              be 0: a commit with no trailer or two of them still fails the run itself.
//   reasons    `85-check.mjs scan-ids` and `86-check.mjs scan-ids` exit 1 and print five reasons; `87-pinned-check.mjs` exits 1
//              and prints one reason per file Phase 88 edited. The whole set is the row, so a sixth reason or a dropped one is a
//              finding as much as a changed first line.
//   computed   `88-check.mjs records --close` is the one row this phase moves: its explaining commits do not exist yet, so the
//              row expects the clean line while none of them does, and otherwise exactly the lines whose commit exists.
// The two `scan-ids` rows are the one measured finding of the older phases, not a pass: five comments of Phase 87's born tests
// (`DiagnosticsFeed.stop.test.ts`, `StatedRun.characterisation.test.ts` three times, `TimelineFeed.stop.test.ts`) say a feed
// `publishes from now on`, a status tape's own subscription time, and the older phases' phrase list reads `from now on` as
// phase-relative wording. The files are held byte for byte, so the lines are not reworded, and the earlier scripts are not
// edited; `87-check.mjs` carries the reviewed exception, and the rows record what the older rules say. A sixth line changing the
// set, or the exit becoming 0, is a finding too. `87-pinned-check.mjs` is a fixed `reasons` row here and not computed: the five
// test files it reports were edited by Phase 88's commits, which precede this phase's base, so its output does not move while
// this phase runs.
// The line compared is the last stdout line when the run exits 0, and otherwise the first stderr line that is not blank, not
// indented and does not begin `node:` (Node's own stack header); a `reasons` row compares every such stderr line.
//
// Prints `<check>: exit <n>: <line>` for each run and exits 0 only when every run matches its row. From the repository root:
//   node <this directory>/89-earlier-checks.mjs
//   node <this file> --self-test
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const OUT = join(realpathSync(process.env.TMPDIR || "/tmp"), "qd89");
const P85_COPIED = ["85-check.mjs", "85-pinned-check.mjs", "85-mutation.mjs", "85-earlier-checks.mjs", "85-01-SUMMARY.md", "85-RED-EVIDENCE.md"];
const P86_COPIED = ["86-check.mjs", "86-pinned-check.mjs", "86-mutation.mjs", "86-earlier-checks.mjs", "86-01-SUMMARY.md", "86-RED-EVIDENCE.md", "86-mutation-base.json", "86-mutation-close.json"];
const P87_COPIED = ["87-check.mjs", "87-pinned-check.mjs", "87-mutation.mjs", "87-earlier-checks.mjs", "87-01-SUMMARY.md", "87-RED-EVIDENCE.md", "87-mutation-base.json", "87-mutation-close.json"];
const P88_COPIED = ["88-check.mjs", "88-pinned-check.mjs", "88-mutation.mjs", "88-earlier-checks.mjs", "88-RED-EVIDENCE.md", "88-mutation-base.json", "88-mutation-close.json"];
const COPIED = { p85: P85_COPIED, p86: P86_COPIED, p87: P87_COPIED, p88: P88_COPIED };
const PHASE_PREFIX = { p85: "QD-85-", p86: "QD-86-", p87: "QD-87-", p88: "QD-88-" };

/** The five lines of Phase 87's born tests that 85's and 86's `scan-ids` read as phase-relative wording. */
const PHASE_RELATIVE = [
  "packages/devtools/test/model/DiagnosticsFeed.stop.test.ts:35 has phase-relative wording: /** The status tag of every notification a feed publishes from now on, in order. */",
  "packages/devtools/test/model/StatedRun.characterisation.test.ts:45 has phase-relative wording: /** The tag of every status a timeline feed publishes from now on, in order. */",
  "packages/devtools/test/model/StatedRun.characterisation.test.ts:54 has phase-relative wording: /** The tag of every status a diagnostics feed publishes from now on, in order. */",
  "packages/devtools/test/model/StatedRun.characterisation.test.ts:63 has phase-relative wording: /** The tag of every run state a session publishes from now on, in order. */",
  "packages/devtools/test/model/TimelineFeed.stop.test.ts:29 has phase-relative wording: /** The tag of every status a feed publishes from now on, in order. */",
];

/**
 * What `87-pinned-check.mjs` prints: one reason per file Phase 88 edited. The held set is computed from Phase 87's base, so the
 * five files differ from it by the text of Phase 88's commits, and the first line that differs is a fact of those commits.
 */
const PINNED_87 = [
  "packages/devtools/test/helpers.ts: differs from its base text at line 14",
  "packages/devtools/test/react/DiagnosticsNotice.test.tsx: differs from its base text at line 12",
  "packages/devtools/test/react/TimelineNotice.test.tsx: differs from its base text at line 14",
  "packages/devtools/test/surface.tst.ts: differs from its base text at line 312",
  "packages/devtools/test/react/Simulator.broke.test.tsx: differs from the commit that added it at line 9",
];

/** The label of the computed row. */
const CLOSE_LABEL = "88-check.mjs records --close";

/** What `88-check.mjs records --close` prints when it finds nothing to refuse. */
const CLOSE_CLEAN = "records: the pinned-by lists name tests that exist, and every reserved record is written";

/**
 * The lines `88-check.mjs records --close` prints once this phase has moved what it judges, each with the one commit subject that
 * moves it. Phase 88's close counts the changesets added since its base and wants each revised spec document exactly one revision
 * above it, so this phase's changeset makes the count two, and its edits to the three spec documents each put one at two above.
 * The subjects are written here before the commits exist, and the plans commit with exactly these.
 */
const EXPLAINING = [
  { line: "2 changesets are added since phase_base, not one", subject: "chore(89-09): add the patch changeset" },
  { line: "spec/README.md is at Revision 1.415, not 1.414", subject: "docs(89-10): record the admission step decision" },
  { line: "spec/traceability.md is at Revision 1.334, not 1.333", subject: "docs(89-10): record the admission step decision" },
  { line: "spec/invariants.md is at Revision 1.234, not 1.233", subject: "docs(89-10): state the admission rules in the behaviors and invariants" },
];

/**
 * What the computed row expects, given the subjects of the commits since `phase_base`: exit 0 and the clean line while none of
 * the explaining subjects is among them, otherwise exit 1 and exactly the lines whose subject is.
 */
const closeExpectation = (subjects) => {
  const set = EXPLAINING.filter(({ subject }) => subjects.includes(subject)).map(({ line }) => line);
  return set.length === 0 ? { exit: 0, line: CLOSE_CLEAN } : { exit: 1, reasons: true, set };
};

/** What is run, in the order the runs print: the label, the copy it runs from, the script and its arguments. A row of the ledger
 * names a run by its label, so a run no row names, and a row no run answers, are both findings. */
const RUNS = [
  { label: "85-check.mjs base", copy: "p85", file: "85-check.mjs", args: ["base"] },
  { label: "85-check.mjs scan-ids", copy: "p85", file: "85-check.mjs", args: ["scan-ids"] },
  { label: "85-check.mjs scan-forbidden", copy: "p85", file: "85-check.mjs", args: ["scan-forbidden"] },
  { label: "85-check.mjs trailers", copy: "p85", file: "85-check.mjs", args: ["trailers"] },
  { label: "85-check.mjs no-react-in-model", copy: "p85", file: "85-check.mjs", args: ["no-react-in-model"] },
  { label: "85-check.mjs three-predicates", copy: "p85", file: "85-check.mjs", args: ["three-predicates"] },
  { label: "85-check.mjs panel-decides-nothing", copy: "p85", file: "85-check.mjs", args: ["panel-decides-nothing"] },
  { label: "85-check.mjs frame-reads-status", copy: "p85", file: "85-check.mjs", args: ["frame-reads-status"] },
  { label: "85-check.mjs records", copy: "p85", file: "85-check.mjs", args: ["records"] },
  { label: "85-check.mjs records --close", copy: "p85", file: "85-check.mjs", args: ["records", "--close"] },
  { label: "85-pinned-check.mjs", copy: "p85", file: "85-pinned-check.mjs", args: [] },
  { label: "86-check.mjs base", copy: "p86", file: "86-check.mjs", args: ["base"] },
  { label: "86-check.mjs scan-ids", copy: "p86", file: "86-check.mjs", args: ["scan-ids"] },
  { label: "86-check.mjs scan-forbidden", copy: "p86", file: "86-check.mjs", args: ["scan-forbidden"] },
  { label: "86-check.mjs trailers", copy: "p86", file: "86-check.mjs", args: ["trailers"] },
  { label: "86-check.mjs owner-shape", copy: "p86", file: "86-check.mjs", args: ["owner-shape"] },
  { label: "86-check.mjs provider-forwards-only", copy: "p86", file: "86-check.mjs", args: ["provider-forwards-only"] },
  { label: "86-check.mjs records", copy: "p86", file: "86-check.mjs", args: ["records"] },
  { label: "86-check.mjs records --close", copy: "p86", file: "86-check.mjs", args: ["records", "--close"] },
  { label: "86-pinned-check.mjs", copy: "p86", file: "86-pinned-check.mjs", args: [] },
  { label: "85-check.mjs --self-test", copy: "p85", file: "85-check.mjs", args: ["--self-test"] },
  { label: "85-pinned-check.mjs --self-test", copy: "p85", file: "85-pinned-check.mjs", args: ["--self-test"] },
  { label: "85-mutation.mjs --self-test", copy: "p85", file: "85-mutation.mjs", args: ["--self-test"] },
  { label: "85-earlier-checks.mjs --self-test", copy: "p85", file: "85-earlier-checks.mjs", args: ["--self-test"] },
  { label: "86-check.mjs --self-test", copy: "p86", file: "86-check.mjs", args: ["--self-test"] },
  { label: "86-pinned-check.mjs --self-test", copy: "p86", file: "86-pinned-check.mjs", args: ["--self-test"] },
  { label: "86-mutation.mjs --self-test", copy: "p86", file: "86-mutation.mjs", args: ["--self-test"] },
  { label: "86-earlier-checks.mjs --self-test", copy: "p86", file: "86-earlier-checks.mjs", args: ["--self-test"] },
  { label: "87-check.mjs base", copy: "p87", file: "87-check.mjs", args: ["base"] },
  { label: "87-check.mjs scan-ids", copy: "p87", file: "87-check.mjs", args: ["scan-ids"] },
  { label: "87-check.mjs scan-forbidden", copy: "p87", file: "87-check.mjs", args: ["scan-forbidden"] },
  { label: "87-check.mjs trailers", copy: "p87", file: "87-check.mjs", args: ["trailers"] },
  { label: "87-check.mjs stated-run-shape", copy: "p87", file: "87-check.mjs", args: ["stated-run-shape"] },
  { label: "87-check.mjs prologue-shape", copy: "p87", file: "87-check.mjs", args: ["prologue-shape"] },
  { label: "87-check.mjs feeds-supply-only-engine", copy: "p87", file: "87-check.mjs", args: ["feeds-supply-only-engine"] },
  { label: "87-check.mjs session-stop", copy: "p87", file: "87-check.mjs", args: ["session-stop"] },
  { label: "87-check.mjs simulator-pre", copy: "p87", file: "87-check.mjs", args: ["simulator-pre"] },
  { label: "87-check.mjs onfailure-gone", copy: "p87", file: "87-check.mjs", args: ["onfailure-gone"] },
  { label: "87-check.mjs built-feeds-once", copy: "p87", file: "87-check.mjs", args: ["built-feeds-once"] },
  { label: "87-check.mjs records", copy: "p87", file: "87-check.mjs", args: ["records"] },
  { label: "87-check.mjs records --close", copy: "p87", file: "87-check.mjs", args: ["records", "--close"] },
  { label: "87-pinned-check.mjs", copy: "p87", file: "87-pinned-check.mjs", args: [] },
  { label: "87-check.mjs --self-test", copy: "p87", file: "87-check.mjs", args: ["--self-test"] },
  { label: "87-pinned-check.mjs --self-test", copy: "p87", file: "87-pinned-check.mjs", args: ["--self-test"] },
  { label: "87-mutation.mjs --self-test", copy: "p87", file: "87-mutation.mjs", args: ["--self-test"] },
  { label: "87-earlier-checks.mjs --self-test", copy: "p87", file: "87-earlier-checks.mjs", args: ["--self-test"] },
  { label: "88-check.mjs base", copy: "p88", file: "88-check.mjs", args: ["base"] },
  { label: "88-check.mjs scan-ids", copy: "p88", file: "88-check.mjs", args: ["scan-ids"] },
  { label: "88-check.mjs scan-forbidden", copy: "p88", file: "88-check.mjs", args: ["scan-forbidden"] },
  { label: "88-check.mjs trailers", copy: "p88", file: "88-check.mjs", args: ["trailers"] },
  { label: "88-check.mjs box-keys-itself", copy: "p88", file: "88-check.mjs", args: ["box-keys-itself"] },
  { label: "88-check.mjs ledger-module", copy: "p88", file: "88-check.mjs", args: ["ledger-module"] },
  { label: "88-check.mjs records", copy: "p88", file: "88-check.mjs", args: ["records"] },
  { label: CLOSE_LABEL, copy: "p88", file: "88-check.mjs", args: ["records", "--close"] },
  { label: "88-pinned-check.mjs", copy: "p88", file: "88-pinned-check.mjs", args: [] },
  { label: "88-check.mjs --self-test", copy: "p88", file: "88-check.mjs", args: ["--self-test"] },
  { label: "88-pinned-check.mjs --self-test", copy: "p88", file: "88-pinned-check.mjs", args: ["--self-test"] },
  { label: "88-mutation.mjs --self-test", copy: "p88", file: "88-mutation.mjs", args: ["--self-test"] },
  { label: "88-earlier-checks.mjs --self-test", copy: "p88", file: "88-earlier-checks.mjs", args: ["--self-test"] },
];

/** What each run must print, keyed by its label. `<root>` stands for the repository root in a line; `when` picks a row by a file's state. */
const LEDGER = [
  { label: "85-check.mjs base", exit: 0, line: "2741584f50d176281038b478d0350dc35f174cc2" },
  { label: "85-check.mjs scan-ids", exit: 1, reasons: true, set: PHASE_RELATIVE },
  { label: "85-check.mjs scan-forbidden", exit: 0, line: "scan-forbidden: no forbidden form in added lines" },
  { label: "85-check.mjs trailers", exit: 0, line: "trailers: 33 plan commits, each with the one trailer" },
  { label: "85-check.mjs no-react-in-model", exit: 0, line: "no-react-in-model: the hydration view is pure, and no model file imports React" },
  { label: "85-check.mjs three-predicates", exit: 0, line: "three-predicates: the questions guard, the one shared reader and the hydration key stay distinct" },
  { label: "85-check.mjs panel-decides-nothing", exit: 0, line: "panel-decides-nothing: the panel renders the hydration view and decides nothing" },
  { label: "85-check.mjs frame-reads-status", exit: 0, line: "frame-reads-status: the dock frame reads the poll's status alone" },
  { label: "85-check.mjs records", exit: 0, line: "records: the pinned-by lists name tests that exist" },
  { label: "85-check.mjs records --close", exit: 0, line: "records: the pinned-by lists name tests that exist, and every reserved record is written" },
  { label: "85-pinned-check.mjs", exit: 0, line: "pinned: 18 files hold their base text, 1 of 1 born files held, 1 of 1 declared edits applied" },
  { label: "86-check.mjs base", exit: 0, line: "41c53c65c3ceb60f974650dd374f391c81db56e7" },
  { label: "86-check.mjs scan-ids", exit: 1, reasons: true, set: PHASE_RELATIVE },
  { label: "86-check.mjs scan-forbidden", exit: 0, line: "scan-forbidden: no forbidden form in added lines" },
  { label: "86-check.mjs trailers", exit: 0, line: "trailers: 22 plan commits, each with the one trailer" },
  { label: "86-check.mjs owner-shape", exit: 0, line: "owner-shape: the registry's lifetime is kept by one React-free module" },
  { label: "86-check.mjs provider-forwards-only", exit: 0, line: "provider-forwards-only: the provider builds the owner once and only forwards to it" },
  { label: "86-check.mjs records", exit: 0, line: "records: the pinned-by lists name tests that exist" },
  { label: "86-check.mjs records --close", exit: 0, line: "records: the pinned-by lists name tests that exist, and every reserved record is written" },
  { label: "86-pinned-check.mjs", exit: 0, line: "pinned: 59 files hold their base text, 1 of 1 born files held" },
  { label: "85-check.mjs --self-test", exit: 0, line: "self-test: 245 passed" },
  { label: "85-pinned-check.mjs --self-test", exit: 0, line: "self-test: 37 passed" },
  { label: "85-mutation.mjs --self-test", exit: 0, line: "self-test: 57 passed" },
  { label: "85-earlier-checks.mjs --self-test", exit: 0, line: "self-test: 17 passed" },
  { label: "86-check.mjs --self-test", exit: 0, line: "self-test: 262 passed" },
  { label: "86-pinned-check.mjs --self-test", exit: 0, line: "self-test: 18 passed" },
  { label: "86-mutation.mjs --self-test", exit: 0, line: "self-test: 64 passed" },
  { label: "86-earlier-checks.mjs --self-test", exit: 0, line: "self-test: 21 passed" },
  { label: "87-check.mjs base", exit: 0, line: "56b9ae4d98ebd1f950369c9830d4a310727895ac" },
  { label: "87-check.mjs scan-ids", exit: 0, line: "scan-ids: no id or phase wording in added lines" },
  { label: "87-check.mjs scan-forbidden", exit: 0, line: "scan-forbidden: no forbidden form in added lines" },
  { label: "87-check.mjs trailers", exit: 0, pattern: /^trailers: [0-9]+ commits since phase_base, each with the one trailer$/ },
  { label: "87-check.mjs stated-run-shape", exit: 0, line: "stated-run-shape: StatedRun.ts is the one run that states its stop" },
  { label: "87-check.mjs prologue-shape", exit: 0, line: "prologue-shape: ConfigurePrologue.ts is the one configure prologue" },
  { label: "87-check.mjs feeds-supply-only-engine", exit: 0, line: "feeds-supply-only-engine: timeline, diagnostics, gates supply only their engine" },
  { label: "87-check.mjs session-stop", exit: 0, line: "session-stop: the session starts its runs through the stated run" },
  { label: "87-check.mjs simulator-pre", exit: 0, line: "simulator-pre: the broken-run box is a labelled preformatted block" },
  { label: "87-check.mjs onfailure-gone", exit: 0, line: "onfailure-gone: no failure hook remains" },
  { label: "87-check.mjs built-feeds-once", exit: 0, line: "built-feeds-once: test/builtFeeds.ts builds and configures through one helper" },
  { label: "87-check.mjs records", exit: 0, line: "records: the pinned-by lists name tests that exist" },
  { label: "87-check.mjs records --close", exit: 0, line: "records: the pinned-by lists name tests that exist, and every reserved record is written" },
  { label: "87-pinned-check.mjs", exit: 1, reasons: true, set: PINNED_87 },
  { label: "87-check.mjs --self-test", exit: 0, line: "self-test: 301 passed" },
  { label: "87-pinned-check.mjs --self-test", exit: 0, line: "self-test: 35 passed" },
  { label: "87-mutation.mjs --self-test", exit: 0, line: "self-test: 103 passed" },
  { label: "87-earlier-checks.mjs --self-test", exit: 0, line: "self-test: 21 passed" },
  { label: "88-check.mjs base", exit: 0, line: "892c4d36bf0f639a5219c53e7c39563533ea8b7e" },
  { label: "88-check.mjs scan-ids", exit: 0, line: "scan-ids: no id or phase wording in added lines" },
  { label: "88-check.mjs scan-forbidden", exit: 0, line: "scan-forbidden: no forbidden form in added lines" },
  { label: "88-check.mjs trailers", exit: 0, pattern: /^trailers: [0-9]+ commits since phase_base, each with the one trailer$/ },
  { label: "88-check.mjs box-keys-itself", exit: 0, line: "box-keys-itself: the stopped box keys itself, decides its alert at mount and records at commit; the notices hand it the notice whole" },
  { label: "88-check.mjs ledger-module", exit: 0, line: "ledger-module: the stop ledger is one React-free module holding stop and count, imported in src only by the box and the hook" },
  { label: "88-check.mjs records", exit: 0, line: "records: the pinned-by lists name tests that exist" },
  { label: CLOSE_LABEL, computed: "close88" },
  { label: "88-pinned-check.mjs", exit: 0, line: "pinned: 130 files hold their base text, 3 of 3 born files held, 5 of 5 declared edits applied" },
  { label: "88-check.mjs --self-test", exit: 0, line: "self-test: 302 passed" },
  { label: "88-pinned-check.mjs --self-test", exit: 0, line: "self-test: 38 passed" },
  { label: "88-mutation.mjs --self-test", exit: 0, line: "self-test: 68 passed" },
  { label: "88-earlier-checks.mjs --self-test", exit: 0, line: "self-test: 46 passed" },
];

/** The line a run is judged by: see the header. */
const lineOf = (status, stdout, stderr) => {
  if (status === 0) return stdout.split("\n").filter((l) => l.trim() !== "").at(-1) ?? "";
  return stderr.split("\n").find((l) => l.trim() !== "" && !/^\s/.test(l) && !l.startsWith("node:")) ?? "";
};

/** Every stderr line a `reasons` row compares: not blank, not indented, not Node's own header. */
const reasonsOf = (stderr) => stderr.split("\n").filter((l) => l.trim() !== "" && !/^\s/.test(l) && !l.startsWith("node:"));

/** The ledger with `<root>` replaced by the repository root. */
const expand = (ledger, root) => ledger.map((row) => ({ ...row, ...(row.line === undefined ? {} : { line: row.line.replaceAll("<root>", root) }) }));

/** The rows that apply: a row with a `when` is kept only when it names the file's state (`moved` is true when it differs). */
const chooseRows = (ledger, moved) => ledger.filter((row) => row.when === undefined || row.when === (moved ? "moved" : "base"));

/** The reasons the runs are not the ledger's rows: a missing run, a changed exit status, a changed line, a run no row names. */
const judgeLedger = (runs, ledger) => {
  const reasons = [];
  for (const row of ledger) {
    const run = runs.find((r) => r.label === row.label);
    if (run === undefined) reasons.push(`missing run: ${row.label}`);
    else if (run.status !== row.exit) reasons.push(`${row.label}: expected exit ${row.exit}, got exit ${run.status}: ${run.line}`);
    else if (row.reasons === true) {
      const got = run.set ?? [];
      for (const line of row.set) if (!got.includes(line)) reasons.push(`${row.label}: missing reason "${line}"`);
      for (const line of got) if (!row.set.includes(line)) reasons.push(`${row.label}: unexpected reason "${line}"`);
    } else if (row.pattern !== undefined) {
      if (!row.pattern.test(run.line)) reasons.push(`${row.label}: expected a line matching ${row.pattern}, got "${run.line}"`);
    } else if (run.line !== row.line) reasons.push(`${row.label}: expected the line "${row.line}", got "${run.line}"`);
  }
  for (const run of runs) if (!ledger.some((row) => row.label === run.label)) reasons.push(`unexpected run: ${run.label}`);
  return reasons;
};

/** The reasons `names` (the directories whose name starts with `prefix`) are not exactly one. */
const judgePick = (prefix, names) => (names.length === 1 ? [] : [`${names.length} directories start with ${prefix}, not one`]);

/** The reasons `root` is not a repository root this script can read phase directories from. */
const judgeRoot = (root) => (existsSync(join(root, ".planning/phases")) ? [] : [`${root} holds no .planning/phases: run this from the repository root`]);

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
  // The computed row is answered by no explaining commit here: a fixed exit and line, as the run resolves it.
  const ledger = expand(chooseRows(LEDGER, false), "/r").map((row) => (row.computed === undefined ? row : { ...row, ...closeExpectation([]) }));
  const ok = ledger.map((row) => ({ label: row.label, status: row.exit, line: row.line ?? row.set?.[0] ?? "trailers: 3 commits since phase_base, each with the one trailer", set: row.set }));
  const swap = (i, patch) => ok.map((r, j) => (j === i ? { ...r, ...patch } : r));
  const index = (label) => ledger.findIndex((r) => r.label === label);
  const keyed = [
    { label: "a", when: "base", exit: 0, line: "x" },
    { label: "a", when: "moved", exit: 1, line: "y" },
    { label: "b", exit: 0, line: "z" },
  ];
  const tmp = mkdtempSync(join(realpathSync(tmpdir()), "qd89-st-"));
  mkdirSync(join(tmp, ".planning/phases/QD-1-a"), { recursive: true });
  mkdirSync(join(tmp, ".planning/milestones/v9-phases/QD-2-b"), { recursive: true });
  mkdirSync(join(tmp, ".planning/milestones/v9-phases/QD-22-c"), { recursive: true });
  mkdirSync(join(tmp, ".planning/milestones/other/QD-3-d"), { recursive: true });
  const found = [findPhases(tmp, "QD-1-"), findPhases(tmp, "QD-2-"), findPhases(tmp, "QD-3-")].map((names) => names.map((n) => n.slice(tmp.length + 1)));
  const rooted = [judgeRoot(tmp), judgeRoot(join(tmp, ".planning"))];
  rmSync(tmp, { recursive: true, force: true });
  const scanIds = index("85-check.mjs scan-ids");
  const trailers = index("87-check.mjs trailers");
  const pinned = index("87-pinned-check.mjs");
  const close = index(CLOSE_LABEL);
  const [changeset, records, , invariants] = EXPLAINING;
  const withClose = (expect) => ledger.map((row, i) => (i === close ? { ...row, ...expect } : row));
  const closeRuns = (expect, set) => ok.map((r, i) => (i === close ? { ...r, status: expect.exit, line: expect.line ?? set?.[0] ?? "", set } : r));
  const sentence = (...picked) => closeExpectation(picked.map(({ subject }) => subject));
  const lines = (expect) => expect.set.join();
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
    ["a reason set is every plain stderr line", reasonsOf("a\n\n  at b\nnode:x\nc\n").join() === "a,c"],
    ["one matching directory passes, none or two fail", judgePick("QD-1-", ["a"]).length === 0 && judgePick("QD-1-", []).length === 1 && judgePick("QD-1-", ["a", "b"]).length === 1],
    ["a directory under .planning/phases resolves", found[0].join() === ".planning/phases/QD-1-a"],
    ["a directory under .planning/milestones/*-phases resolves, and a longer number does not match", found[1].join() === ".planning/milestones/v9-phases/QD-2-b"],
    ["a directory under a milestone folder that does not end in -phases is not found", found[2].length === 0],
    ["a root that holds .planning/phases is accepted and one that holds none is refused, naming it", rooted[0].length === 0 && rooted[1].length === 1 && rooted[1][0].endsWith("holds no .planning/phases: run this from the repository root")],
    ["every run names a copy the script makes", RUNS.every((r) => Object.hasOwn(COPIED, r.copy) && COPIED[r.copy].includes(r.file))],
    ["every run has one row and every row one run, under the same label, in the same order", RUNS.length === LEDGER.length && RUNS.every((r, i) => r.label === LEDGER[i].label) && new Set(RUNS.map((r) => r.label)).size === RUNS.length],
    ["every row states its judge once: a line, a pattern, a reason set or a computation", LEDGER.every((r) => [r.line, r.pattern, r.reasons === true ? r.set : undefined, r.computed].filter((x) => x !== undefined).length === 1)],
    ["the ledger has 59 rows, 46 of them for Phases 85 to 87 and 13 for Phase 88, and one is computed", LEDGER.length === 59 && RUNS.filter((r) => r.copy !== "p88").length === 46 && RUNS.filter((r) => r.copy === "p88").length === 13 && LEDGER.filter((r) => r.computed !== undefined).map((r) => r.label).join() === CLOSE_LABEL],
    ["every copied directory has a name prefix", Object.keys(COPIED).every((name) => Object.hasOwn(PHASE_PREFIX, name))],
    ["every label is unique, and the rows at exit 1 are the two scan-ids rows and 87's pinned row", new Set(LEDGER.map((r) => r.label)).size === LEDGER.length && LEDGER.filter((r) => r.exit === 1).map((r) => r.label).join() === "85-check.mjs scan-ids,86-check.mjs scan-ids,87-pinned-check.mjs"],
    ["the pattern row passes a growing count", ["1", "61", "70", "1234"].every((n) => judgeLedger(swap(trailers, { line: `trailers: ${n} commits since phase_base, each with the one trailer` }), ledger).length === 0)],
    ["the pattern row fails a different sentence, a missing count and a failing run", ["trailers: 61 commits since phase_base, one lacks the trailer", "trailers: commits since phase_base, each with the one trailer", "trailers: 6x commits since phase_base, each with the one trailer"].every((line) => judgeLedger(swap(trailers, { line }), ledger).length === 1) && judgeLedger(swap(trailers, { status: 1 }), ledger).length === 1],
    ["the reasons row passes its measured set", judgeLedger(swap(scanIds, { set: [...PHASE_RELATIVE] }), ledger).length === 0 && PHASE_RELATIVE.length === 5],
    ["the reasons row fails when one reason is added, naming it", judgeLedger(swap(scanIds, { set: [...PHASE_RELATIVE, "extra.ts:1 has phase-relative wording: x"] }), ledger).join() === `85-check.mjs scan-ids: unexpected reason "extra.ts:1 has phase-relative wording: x"`],
    ["the reasons row fails when one reason is dropped, naming it", judgeLedger(swap(scanIds, { set: PHASE_RELATIVE.slice(1) }), ledger).join() === `85-check.mjs scan-ids: missing reason "${PHASE_RELATIVE[0]}"`],
    ["the reasons row fails when a reason is reworded, in both directions", judgeLedger(swap(scanIds, { set: [...PHASE_RELATIVE.slice(1), "other"] }), ledger).length === 2],
    ["the pinned reasons row passes its measured set, in any order", judgeLedger(swap(pinned, { set: [...ledger[pinned].set].reverse() }), ledger).length === 0],
    ["the pinned reasons row fails when a file is missing from the run, naming it", ledger[pinned].set.length > 0 && judgeLedger(swap(pinned, { set: ledger[pinned].set.slice(1) }), ledger).join() === `87-pinned-check.mjs: missing reason "${ledger[pinned].set[0]}"`],
    ["the pinned reasons row fails when a file is added, and when the run exits 0", judgeLedger(swap(pinned, { set: [...ledger[pinned].set, "packages/devtools/test/Other.test.ts: differs from its base text at line 2"] }), ledger).length === 1 && judgeLedger(swap(pinned, { status: 0 }), ledger).length === 1],
    ["with none of the explaining subjects the computed row expects exit 0 and the clean line", sentence().exit === 0 && sentence().line === CLOSE_CLEAN && closeExpectation(["chore(89-02): add the phase check", "docs(89-04): other"]).exit === 0],
    ["with only the changeset subject it expects exit 1 and the one changeset line", sentence(changeset).exit === 1 && lines(sentence(changeset)) === changeset.line],
    ["with the first records subject it expects the README and traceability lines", lines(sentence(records)) === "spec/README.md is at Revision 1.415, not 1.414,spec/traceability.md is at Revision 1.334, not 1.333"],
    ["with all three subjects it expects the four lines", sentence(changeset, records, invariants).set.length === 4 && new Set(sentence(changeset, records, invariants).set).size === 4],
    ["with only the invariants subject it expects the one invariants line", lines(sentence(invariants)) === "spec/invariants.md is at Revision 1.234, not 1.233"],
    ["EXPLAINING names the four lines of the close, each with a plan 09 or plan 10 subject", EXPLAINING.length === 4 && EXPLAINING.every(({ line, subject }) => line.length > 0 && /^(chore[(]89-09[)]|docs[(]89-10[)]): /.test(subject))],
    ["the computed row passes the clean line and fails the changeset line while no commit explains it", judgeLedger(closeRuns(sentence(), undefined), withClose(sentence())).length === 0 && judgeLedger(closeRuns(sentence(changeset), [changeset.line]), withClose(sentence())).length === 1],
    ["the computed row passes the exact set of an existing subject, in any order", judgeLedger(closeRuns(sentence(changeset, records), [...sentence(changeset, records).set].reverse()), withClose(sentence(changeset, records))).length === 0],
    ["a line 88 prints whose subject does not exist is a mismatch, naming it", judgeLedger(closeRuns({ exit: 1 }, [changeset.line]), withClose(sentence())).join() === `${CLOSE_LABEL}: expected exit 0, got exit 1: ${changeset.line}` && judgeLedger(closeRuns({ exit: 1 }, [changeset.line, records.line]), withClose(sentence(changeset))).join() === `${CLOSE_LABEL}: unexpected reason "${records.line}"`],
    ["a subject that exists without its line is a mismatch, whether 88 exits 0 or leaves the line out", judgeLedger(closeRuns({ exit: 0, line: CLOSE_CLEAN }), withClose(sentence(changeset))).join() === `${CLOSE_LABEL}: expected exit 1, got exit 0: ${CLOSE_CLEAN}` && judgeLedger(closeRuns({ exit: 1 }, [invariants.line]), withClose(sentence(changeset, invariants))).join() === `${CLOSE_LABEL}: missing reason "${changeset.line}"`],
    ["each pinned reason names one of the five files Phase 88 edited, once", ledger[pinned].set.length === 5 && new Set(ledger[pinned].set.map((r) => r.split(":")[0])).size === 5 && ledger[pinned].set.every((r) => /^packages\/devtools\/test\/(helpers[.]ts|react\/(DiagnosticsNotice|TimelineNotice)[.]test[.]tsx|react\/Simulator[.]broke[.]test[.]tsx|surface[.]tst[.]ts): differs from /.test(r))],
  ];
  const failed = cases.filter(([, passed]) => !passed).map(([name]) => name);
  if (failed.length > 0) fail([`self-test failed: ${failed.join("; ")}`]);
  console.log(`self-test: ${cases.length} passed`);
};

const run = () => {
  const root = realpathSync(process.cwd());
  const rootReasons = judgeRoot(root);
  if (rootReasons.length > 0) fail(rootReasons);
  for (const [name, files] of Object.entries(COPIED)) {
    const from = findPhase(root, PHASE_PREFIX[name]);
    rmSync(join(OUT, name), { recursive: true, force: true });
    mkdirSync(join(OUT, name), { recursive: true });
    for (const file of files) copyFileSync(join(from, file), join(OUT, name, file));
  }
  const base = JSON.parse(readFileSync(join(findPhase(root, "QD-89-"), "89-mutation-base.json"), "utf8")).phase_base;
  const subjects = execFileSync("git", ["log", "--format=%s", `${base}..HEAD`], { cwd: root, encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter((s) => s !== "");
  const expectation = closeExpectation(subjects);
  // No row carries a `when` (see the header), so no file state picks between rows; the computed row is answered by the subjects.
  const ledger = expand(chooseRows(LEDGER, false), root).map((row) => (row.computed === undefined ? row : { ...row, ...expectation }));
  const runs = [];
  for (const row of RUNS) {
    const r = spawnSync("node", [join(OUT, row.copy, row.file), ...row.args], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const result = { label: row.label, status: r.status, line: lineOf(r.status, r.stdout, r.stderr), set: reasonsOf(r.stderr) };
    console.log(`${result.label}: exit ${result.status}: ${result.line}`);
    runs.push(result);
  }
  const reasons = judgeLedger(runs, ledger);
  if (reasons.length > 0) fail(reasons);
};

if (process.argv.includes("--self-test")) selfTest();
else run();
