// Re-runs Phase 85's, Phase 86's and Phase 87's checks from scratch copies and compares each run with a ledger measured on this
// phase's base.
//
// The earlier phases' directories are only read: the scripts they run (`85-check.mjs`, `85-pinned-check.mjs`, `85-mutation.mjs`,
// `85-earlier-checks.mjs`, `85-01-SUMMARY.md`, `85-RED-EVIDENCE.md`; `86-check.mjs`, `86-pinned-check.mjs`, `86-mutation.mjs`,
// `86-earlier-checks.mjs`, `86-01-SUMMARY.md`, `86-RED-EVIDENCE.md`, `86-mutation-base.json`, `86-mutation-close.json`; the
// eight files in `P87_COPIED`) are copied to `<scratch>/p85/`, `<scratch>/p86/` and `<scratch>/p87/`, because each derives its
// own directory from its location and must neither write into, nor be run from, `.planning/milestones/` or the earlier phases'
// directories. A directory is found by its name prefix (`QD-85-`, `QD-86-`, `QD-87-`) under `.planning/phases/` or
// `.planning/milestones/*-phases/`, so the script keeps working when a phase is archived. `85-earlier-checks.mjs`,
// `86-earlier-checks.mjs` and `87-earlier-checks.mjs` compute the repository root from their own location, which a copy breaks,
// so only their `--self-test` runs.
//
// The ledger is not "every check exits 0". It is what each run printed while `packages/*/src` still equalled `phase_base`, and a
// changed exit status or a changed line is a finding to explain, never a row to widen. Every row is a single fact. Five kinds
// of row:
//   fixed      the exit status and the one line the run is judged by (see below).
//   pattern    `87-check.mjs trailers` prints a count of the commits since Phase 87's base, which grows with every commit of this
//              phase, so its line is matched by a regular expression, and the status must still be 0: a commit with no trailer
//              or two of them still fails the run itself.
//   reasons    `85-check.mjs scan-ids` and `86-check.mjs scan-ids` exit 1 and print five reasons; the whole set is the row, so a
//              sixth reason or a dropped one is a finding as much as a changed first line.
//   computed   `87-pinned-check.mjs` holds the tests this phase edits, so what it prints depends on how far the phase is. The
//              row is computed from `EXPLAINED`: with no explained file differing from `phase_base` it expects exit 0 and the
//              line measured on the clean base; otherwise exit 1 and exactly one reason per differing file, `<n>` being the first
//              line that differs from `phase_base`, and every differing file must have been touched by a commit since
//              `phase_base` whose subject is one of the subjects `EXPLAINED` names for it. A file outside `EXPLAINED` that the
//              check reports, or an explained file with no explaining commit, is a failure.
// The known exit-1 rows are the one measured finding, not a pass: five comments of Phase 87's born test files
// (`DiagnosticsFeed.stop.test.ts`, `StatedRun.characterisation.test.ts` three times, `TimelineFeed.stop.test.ts`) say a feed
// `publishes from now on`, a status tape's own subscription time, and the earlier phases' phrase list reads `from now on` as
// phase-relative wording. The files are held byte for byte, so the lines are not reworded, and the earlier scripts are not
// edited; `87-check.mjs` carries the reviewed exception, and the rows record what the earlier rules say. A sixth line changing
// the set, or the exit becoming 0, is a finding too.
// The line compared is the last stdout line when the run exits 0, and otherwise the first stderr line that is not blank, not
// indented and does not begin `node:` (Node's own stack header); a `reasons` row compares every such stderr line.
//
// Prints `<check>: exit <n>: <line>` for each run and exits 0 only when every run matches its row. From the repository root:
//   node <this directory>/88-earlier-checks.mjs
//   node <this file> --self-test
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(realpathSync(process.env.TMPDIR || "/tmp"), "qd88");
const P85_COPIED = ["85-check.mjs", "85-pinned-check.mjs", "85-mutation.mjs", "85-earlier-checks.mjs", "85-01-SUMMARY.md", "85-RED-EVIDENCE.md"];
const P86_COPIED = ["86-check.mjs", "86-pinned-check.mjs", "86-mutation.mjs", "86-earlier-checks.mjs", "86-01-SUMMARY.md", "86-RED-EVIDENCE.md", "86-mutation-base.json", "86-mutation-close.json"];
const P87_COPIED = ["87-check.mjs", "87-pinned-check.mjs", "87-mutation.mjs", "87-earlier-checks.mjs", "87-01-SUMMARY.md", "87-RED-EVIDENCE.md", "87-mutation-base.json", "87-mutation-close.json"];
const COPIED = { p85: P85_COPIED, p86: P86_COPIED, p87: P87_COPIED };
const PHASE_PREFIX = { p85: "QD-85-", p86: "QD-86-", p87: "QD-87-" };

/** The five lines of Phase 87's born tests that 85's and 86's `scan-ids` read as phase-relative wording. */
const PHASE_RELATIVE = [
  "packages/devtools/test/model/DiagnosticsFeed.stop.test.ts:35 has phase-relative wording: /** The status tag of every notification a feed publishes from now on, in order. */",
  "packages/devtools/test/model/StatedRun.characterisation.test.ts:45 has phase-relative wording: /** The tag of every status a timeline feed publishes from now on, in order. */",
  "packages/devtools/test/model/StatedRun.characterisation.test.ts:54 has phase-relative wording: /** The tag of every status a diagnostics feed publishes from now on, in order. */",
  "packages/devtools/test/model/StatedRun.characterisation.test.ts:63 has phase-relative wording: /** The tag of every run state a session publishes from now on, in order. */",
  "packages/devtools/test/model/TimelineFeed.stop.test.ts:29 has phase-relative wording: /** The tag of every status a feed publishes from now on, in order. */",
];

/** What `87-pinned-check.mjs` prints on the clean base: the held set is computed from Phase 87's base, so it does not move. */
const PINNED_CLEAN = "pinned: 122 files hold their base text, 5 of 5 born files held, 2 of 2 declared edits applied";

/** The label of the computed row. */
const PINNED_LABEL = "87-pinned-check.mjs";

/** The one file of the five that Phase 87's pinned check holds against the commit that added it, not against its base. */
const BORN_87 = "packages/devtools/test/react/Simulator.broke.test.tsx";

/**
 * The files of Phase 87's pinned set that this phase edits, each with the subjects of the commits that explain it. The subjects
 * are written here before the commits exist, and plan 06 commits with exactly these.
 */
const EXPLAINED = {
  "packages/devtools/test/helpers.ts": ["refactor(88-06): the stopped box keys itself and records its stop through the feed ledger"],
  "packages/devtools/test/react/DiagnosticsNotice.test.tsx": ["refactor(88-06): the stopped box keys itself and records its stop through the feed ledger"],
  "packages/devtools/test/react/TimelineNotice.test.tsx": ["refactor(88-06): the stopped box keys itself and records its stop through the feed ledger"],
  "packages/devtools/test/react/Simulator.broke.test.tsx": [
    "refactor(88-06): the stopped box keys itself and records its stop through the feed ledger",
    "test(88-06): compare the simulator reason block with the rendered stopped box",
  ],
  "packages/devtools/test/surface.tst.ts": ["test(88-06): refuse the stop ledger names from both entries"],
};

/** The runs, in the order they print. `<root>` stands for the repository root in a line; `when` picks a row by a file's state. */
const LEDGER = [
  { label: "85-check.mjs base", copy: "p85", file: "85-check.mjs", args: ["base"], exit: 0, line: "2741584f50d176281038b478d0350dc35f174cc2" },
  { label: "85-check.mjs scan-ids", copy: "p85", file: "85-check.mjs", args: ["scan-ids"], exit: 1, reasons: true, set: PHASE_RELATIVE },
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
  { label: "86-check.mjs scan-ids", copy: "p86", file: "86-check.mjs", args: ["scan-ids"], exit: 1, reasons: true, set: PHASE_RELATIVE },
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
  { label: "87-check.mjs base", copy: "p87", file: "87-check.mjs", args: ["base"], exit: 0, line: "56b9ae4d98ebd1f950369c9830d4a310727895ac" },
  { label: "87-check.mjs scan-ids", copy: "p87", file: "87-check.mjs", args: ["scan-ids"], exit: 0, line: "scan-ids: no id or phase wording in added lines" },
  { label: "87-check.mjs scan-forbidden", copy: "p87", file: "87-check.mjs", args: ["scan-forbidden"], exit: 0, line: "scan-forbidden: no forbidden form in added lines" },
  { label: "87-check.mjs trailers", copy: "p87", file: "87-check.mjs", args: ["trailers"], exit: 0, pattern: /^trailers: [0-9]+ commits since phase_base, each with the one trailer$/ },
  { label: "87-check.mjs stated-run-shape", copy: "p87", file: "87-check.mjs", args: ["stated-run-shape"], exit: 0, line: "stated-run-shape: StatedRun.ts is the one run that states its stop" },
  { label: "87-check.mjs prologue-shape", copy: "p87", file: "87-check.mjs", args: ["prologue-shape"], exit: 0, line: "prologue-shape: ConfigurePrologue.ts is the one configure prologue" },
  { label: "87-check.mjs feeds-supply-only-engine", copy: "p87", file: "87-check.mjs", args: ["feeds-supply-only-engine"], exit: 0, line: "feeds-supply-only-engine: timeline, diagnostics, gates supply only their engine" },
  { label: "87-check.mjs session-stop", copy: "p87", file: "87-check.mjs", args: ["session-stop"], exit: 0, line: "session-stop: the session starts its runs through the stated run" },
  { label: "87-check.mjs simulator-pre", copy: "p87", file: "87-check.mjs", args: ["simulator-pre"], exit: 0, line: "simulator-pre: the broken-run box is a labelled preformatted block" },
  { label: "87-check.mjs onfailure-gone", copy: "p87", file: "87-check.mjs", args: ["onfailure-gone"], exit: 0, line: "onfailure-gone: no failure hook remains" },
  { label: "87-check.mjs built-feeds-once", copy: "p87", file: "87-check.mjs", args: ["built-feeds-once"], exit: 0, line: "built-feeds-once: test/builtFeeds.ts builds and configures through one helper" },
  { label: "87-check.mjs records", copy: "p87", file: "87-check.mjs", args: ["records"], exit: 0, line: "records: the pinned-by lists name tests that exist" },
  { label: "87-check.mjs records --close", copy: "p87", file: "87-check.mjs", args: ["records", "--close"], exit: 0, line: "records: the pinned-by lists name tests that exist, and every reserved record is written" },
  { label: "87-pinned-check.mjs", copy: "p87", file: "87-pinned-check.mjs", args: [], computed: "pinned" },
  { label: "87-check.mjs --self-test", copy: "p87", file: "87-check.mjs", args: ["--self-test"], exit: 0, line: "self-test: 301 passed" },
  { label: "87-pinned-check.mjs --self-test", copy: "p87", file: "87-pinned-check.mjs", args: ["--self-test"], exit: 0, line: "self-test: 35 passed" },
  { label: "87-mutation.mjs --self-test", copy: "p87", file: "87-mutation.mjs", args: ["--self-test"], exit: 0, line: "self-test: 103 passed" },
  { label: "87-earlier-checks.mjs --self-test", copy: "p87", file: "87-earlier-checks.mjs", args: ["--self-test"], exit: 0, line: "self-test: 21 passed" },
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

/** The 1-based number of the first line two texts disagree on, or 0 when they do not (ported from `87-pinned-check.mjs`). */
const firstDifference = (a, b) => {
  const x = a.split("\n");
  const y = b.split("\n");
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i += 1) if (x[i] !== y[i]) return i + 1;
  return 0;
};

/** The reason `87-pinned-check.mjs` prints for an explained file that differs at `line`. */
const pinnedReason = (file, line) => `${file}: differs from ${file === BORN_87 ? "the commit that added it" : "its base text"} at line ${line}`;

/**
 * What the computed row expects. `differing` holds the explained files whose text is not their text at `phase_base` (with the
 * first line that differs) and `subjects` the subjects of the commits since `phase_base` that touch each. Returns the row's
 * `exit` with its `line` or `set`, or the `problems` that make it unanswerable: a differing file outside `EXPLAINED`, or one no
 * explaining commit touches.
 */
const pinnedExpectation = (differing, subjects) => {
  const problems = [];
  for (const { file } of differing) {
    if (!Object.hasOwn(EXPLAINED, file)) problems.push(`${file}: differs from phase_base and is not in EXPLAINED`);
    else if (!(subjects[file] ?? []).some((subject) => EXPLAINED[file].includes(subject))) problems.push(`${file}: differs from phase_base and no commit since it has one of its explaining subjects`);
  }
  if (problems.length > 0) return { problems };
  if (differing.length === 0) return { problems, exit: 0, line: PINNED_CLEAN };
  return { problems, exit: 1, reasons: true, set: differing.map(({ file, line }) => pinnedReason(file, line)) };
};

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
  // The computed row is answered by a clean tree here: a fixed exit and line, as the run resolves it.
  const resolved = ledger.map((row) => (row.computed === undefined ? row : { ...row, ...pinnedExpectation([], {}) }));
  const ok = resolved.map((row) => ({ label: row.label, status: row.exit, line: row.line ?? row.set?.[0] ?? "trailers: 3 commits since phase_base, each with the one trailer", set: row.set }));
  const swap = (i, patch) => ok.map((r, j) => (j === i ? { ...r, ...patch } : r));
  const index = (label) => ledger.findIndex((r) => r.label === label);
  const keyed = [
    { label: "a", when: "base", exit: 0, line: "x" },
    { label: "a", when: "moved", exit: 1, line: "y" },
    { label: "b", exit: 0, line: "z" },
  ];
  const tmp = mkdtempSync(join(realpathSync(tmpdir()), "qd88-st-"));
  mkdirSync(join(tmp, ".planning/phases/QD-1-a"), { recursive: true });
  mkdirSync(join(tmp, ".planning/milestones/v9-phases/QD-2-b"), { recursive: true });
  mkdirSync(join(tmp, ".planning/milestones/v9-phases/QD-22-c"), { recursive: true });
  mkdirSync(join(tmp, ".planning/milestones/other/QD-3-d"), { recursive: true });
  const found = [findPhases(tmp, "QD-1-"), findPhases(tmp, "QD-2-"), findPhases(tmp, "QD-3-")].map((names) => names.map((n) => n.slice(tmp.length + 1)));
  rmSync(tmp, { recursive: true, force: true });
  const scanIds = index("85-check.mjs scan-ids");
  const trailers = index("87-check.mjs trailers");
  const pinned = index("87-pinned-check.mjs");
  const files = Object.keys(EXPLAINED);
  const [helpers, notice, , broke] = files;
  const subject = EXPLAINED[helpers][0];
  const brokeSecond = EXPLAINED[broke][1];
  const withPinned = (expect) => resolved.map((row, i) => (i === pinned ? { ...row, ...expect } : row));
  const runsFor = (expect, set) => ok.map((r, i) => (i === pinned ? { ...r, status: expect.exit, line: expect.line ?? set?.[0] ?? "", set } : r));
  const one = pinnedExpectation([{ file: helpers, line: 12 }], { [helpers]: [subject] });
  const two = pinnedExpectation([{ file: helpers, line: 12 }, { file: broke, line: 3 }], { [helpers]: [subject], [broke]: [brokeSecond] });
  const many = pinnedExpectation(files.map((file, n) => ({ file, line: n + 1 })), Object.fromEntries(files.map((file) => [file, EXPLAINED[file]])));
  const cases = [
    ["a matching set of runs passes", judgeLedger(ok, resolved).length === 0],
    ["a matching exit with another line fails, naming both lines", judgeLedger(swap(0, { line: "changed" }), resolved).join() === `${ledger[0].label}: expected the line "${ledger[0].line}", got "changed"`],
    ["a matching line with another exit fails, naming the run and both statuses", judgeLedger(swap(0, { status: 1 }), resolved).join() === `${ledger[0].label}: expected exit 0, got exit 1: ${ledger[0].line}`],
    ["an exit that was 1 now 0 fails", judgeLedger(swap(scanIds, { status: 0 }), resolved).length === 1],
    ["a changed self-test count fails", judgeLedger(swap(ok.length - 1, { line: "self-test: 1 passed" }), resolved).length === 1],
    ["a missing run fails, naming it", judgeLedger(ok.slice(1), resolved).join() === `missing run: ${ledger[0].label}`],
    ["a run no row names fails", judgeLedger([...ok, { label: "extra", status: 0, line: "x" }], resolved).join() === "unexpected run: extra"],
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
    ["the ledger has 46 rows with 46 labels, the two at exit 1 being the earlier scan-ids and one row computed", LEDGER.length === 46 && new Set(LEDGER.map((r) => r.label)).size === 46 && LEDGER.filter((r) => r.exit === 1).map((r) => r.label).join() === "85-check.mjs scan-ids,86-check.mjs scan-ids" && LEDGER.filter((r) => r.computed !== undefined).length === 1],
    ["the ledger holds the 28 earlier rows and the 18 Phase 87 rows", LEDGER.filter((r) => r.copy !== "p87").length === 28 && LEDGER.filter((r) => r.copy === "p87").length === 18],
    ["every row names a copy the script makes", LEDGER.every((r) => Object.hasOwn(COPIED, r.copy) && COPIED[r.copy].includes(r.file))],
    ["every row states its judge once: a line, a pattern, a reason set or a computation", LEDGER.every((r) => [r.line, r.pattern, r.reasons === true ? r.set : undefined, r.computed].filter((x) => x !== undefined).length === 1)],
    ["every copied directory has a name prefix", Object.keys(COPIED).every((name) => Object.hasOwn(PHASE_PREFIX, name))],
    ["the pattern row passes a growing count", ["1", "61", "70", "1234"].every((n) => judgeLedger(swap(trailers, { line: `trailers: ${n} commits since phase_base, each with the one trailer` }), resolved).length === 0)],
    ["the pattern row fails a different sentence, a missing count and a failing run", ["trailers: 61 commits since phase_base, one lacks the trailer", "trailers: commits since phase_base, each with the one trailer", "trailers: 6x commits since phase_base, each with the one trailer"].every((line) => judgeLedger(swap(trailers, { line }), resolved).length === 1) && judgeLedger(swap(trailers, { status: 1 }), resolved).length === 1],
    ["the reasons row passes its measured set", judgeLedger(swap(scanIds, { set: [...PHASE_RELATIVE] }), resolved).length === 0 && PHASE_RELATIVE.length === 5],
    ["the reasons row fails when one reason is added, naming it", judgeLedger(swap(scanIds, { set: [...PHASE_RELATIVE, "extra.ts:1 has phase-relative wording: x"] }), resolved).join() === `85-check.mjs scan-ids: unexpected reason "extra.ts:1 has phase-relative wording: x"`],
    ["the reasons row fails when one reason is dropped, naming it", judgeLedger(swap(scanIds, { set: PHASE_RELATIVE.slice(1) }), resolved).join() === `85-check.mjs scan-ids: missing reason "${PHASE_RELATIVE[0]}"`],
    ["the reasons row fails when a reason is reworded, in both directions", judgeLedger(swap(scanIds, { set: [...PHASE_RELATIVE.slice(1), "other"] }), resolved).length === 2],
    ["the computed row expects exit 0 and the clean line when nothing differs", pinnedExpectation([], {}).exit === 0 && pinnedExpectation([], {}).line === PINNED_CLEAN && pinnedExpectation([], {}).problems.length === 0],
    ["the computed row passes its clean line and fails another", judgeLedger(runsFor({ exit: 0, line: PINNED_CLEAN }), withPinned(pinnedExpectation([], {}))).length === 0 && judgeLedger(runsFor({ exit: 0, line: "pinned: 1 files hold their base text, 0 of 0 born files held, 0 of 0 declared edits applied" }), withPinned(pinnedExpectation([], {}))).length === 1],
    ["a differing explained file with an explaining commit expects exit 1 and one reason naming the line", one.exit === 1 && one.problems.length === 0 && one.set.join() === `${helpers}: differs from its base text at line 12`],
    ["a differing born file reports the commit that added it", two.set.join() === `${helpers}: differs from its base text at line 12,${broke}: differs from the commit that added it at line 3`],
    ["the five explained files expect five reasons", many.exit === 1 && many.set.length === 5 && new Set(many.set).size === 5],
    ["the computed row passes the exact reason set, in any order", judgeLedger(runsFor(two, [...two.set].reverse()), withPinned(two)).length === 0],
    ["the computed row fails when a reported file is missing from the run or one is added", judgeLedger(runsFor(two, two.set.slice(1)), withPinned(two)).length === 1 && judgeLedger(runsFor(one, [...one.set, pinnedReason(notice, 4)]), withPinned(one)).length === 1],
    ["the computed row fails when the run reports a file outside EXPLAINED", judgeLedger(runsFor(one, [...one.set, pinnedReason("packages/devtools/test/model/Other.test.ts", 2)]), withPinned(one)).join() === `87-pinned-check.mjs: unexpected reason "${pinnedReason("packages/devtools/test/model/Other.test.ts", 2)}"`],
    ["the computed row fails when the run exits 0 but a file differs, and when it exits 1 on a clean tree", judgeLedger(runsFor({ exit: 0, line: PINNED_CLEAN }), withPinned(one)).length === 1 && judgeLedger(runsFor({ exit: 1 }, [pinnedReason(helpers, 1)]), withPinned(pinnedExpectation([], {}))).length === 1],
    ["a differing file with no explaining commit is unanswerable", pinnedExpectation([{ file: helpers, line: 3 }], { [helpers]: [] }).problems.join() === `${helpers}: differs from phase_base and no commit since it has one of its explaining subjects`],
    ["a differing file touched only by another file's subject is unanswerable", pinnedExpectation([{ file: helpers, line: 3 }], { [helpers]: [EXPLAINED["packages/devtools/test/surface.tst.ts"][0]] }).problems.length === 1],
    ["a differing file outside EXPLAINED is unanswerable", pinnedExpectation([{ file: "packages/devtools/test/Other.test.ts", line: 3 }], { "packages/devtools/test/Other.test.ts": [subject] }).problems.length === 1],
    ["the born file takes either of its two subjects", pinnedExpectation([{ file: broke, line: 1 }], { [broke]: [EXPLAINED[broke][0]] }).problems.length === 0 && pinnedExpectation([{ file: broke, line: 1 }], { [broke]: [brokeSecond] }).problems.length === 0],
    ["the first differing line is the one 87's pinned check prints", firstDifference("a\nb\nc\n", "a\nB\nc\n") === 2 && firstDifference("a\nb", "a\nb\nc") === 3 && firstDifference("a", "a") === 0],
    ["EXPLAINED names the five files, each with a subject that begins like a plan 06 commit", files.length === 5 && files.every((file) => EXPLAINED[file].length > 0 && EXPLAINED[file].every((s) => /^(refactor|test)[(]88-06[)]: /.test(s)))],
  ];
  const failed = cases.filter(([, passed]) => !passed).map(([name]) => name);
  if (failed.length > 0) fail([`self-test failed: ${failed.join("; ")}`]);
  console.log(`self-test: ${cases.length} passed`);
};

const git = (root, ...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] });

/** The text of `file` at `rev`, or `undefined` when it has none there. */
const showAt = (root, rev, file) => {
  try {
    return git(root, "show", `${rev}:${file}`);
  } catch {
    return undefined;
  }
};

/** The explained files that differ from `phase_base`, and the subjects of the commits since it that touch each. */
const readPinnedState = (root) => {
  const base = JSON.parse(readFileSync(join(here, "88-mutation-base.json"), "utf8")).phase_base;
  const differing = [];
  const subjects = {};
  for (const file of Object.keys(EXPLAINED)) {
    const was = showAt(root, base, file);
    const path = join(root, file);
    const now = existsSync(path) ? readFileSync(path, "utf8") : undefined;
    if (was === now) continue;
    differing.push({ file, line: firstDifference(now ?? "", was ?? "") });
    subjects[file] = git(root, "log", "--format=%s", `${base}..HEAD`, "--", file).split("\n").filter((s) => s !== "");
  }
  return { differing, subjects };
};

const run = () => {
  const root = git(here, "rev-parse", "--show-toplevel").trim();
  for (const [name, files] of Object.entries(COPIED)) {
    const from = findPhase(root, PHASE_PREFIX[name]);
    rmSync(join(OUT, name), { recursive: true, force: true });
    mkdirSync(join(OUT, name), { recursive: true });
    for (const file of files) copyFileSync(join(from, file), join(OUT, name, file));
  }
  // No row carries a `when` (see the header), so no file state picks between rows; a row that needs one reads it here.
  const planned = expand(chooseRows(LEDGER, false), root);
  const state = readPinnedState(root);
  const expectation = pinnedExpectation(state.differing, state.subjects);
  const ledger = planned.map((row) => (row.computed === undefined ? row : { ...row, ...expectation }));
  const runs = [];
  for (const row of ledger) {
    const r = spawnSync("node", [join(OUT, row.copy, row.file), ...row.args], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const result = { label: row.label, status: r.status, line: lineOf(r.status, r.stdout, r.stderr), set: reasonsOf(r.stderr) };
    console.log(`${result.label}: exit ${result.status}: ${result.line}`);
    runs.push(result);
  }
  // A computed row with no answer is not judged by the ledger: its problems are the reasons.
  const judged = (xs) => (expectation.problems.length === 0 ? xs : xs.filter((x) => x.label !== PINNED_LABEL));
  const reasons = [...expectation.problems, ...judgeLedger(judged(runs), judged(ledger))];
  if (reasons.length > 0) fail(reasons);
};

if (process.argv.includes("--self-test")) selfTest();
else run();
