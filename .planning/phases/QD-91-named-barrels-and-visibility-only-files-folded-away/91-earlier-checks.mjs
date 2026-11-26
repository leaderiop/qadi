// Re-runs Phase 85's to Phase 90's checks from scratch copies and compares each run with a ledger measured on a clone of the
// repository at this phase's `phase_base`.
//
// The earlier phases' directories are only read: the scripts they run (`NN-check.mjs`, `NN-pinned-check.mjs`, `NN-mutation.mjs`,
// `NN-earlier-checks.mjs` and the files each reads from its own directory, listed in `COPIED`) are copied to
// `<scratch>/earlier/p85/` to `<scratch>/earlier/p90/`, because each derives its own directory from its location and must neither
// write into, nor be run from, `.planning/milestones/` or the earlier phases' directories. No earlier file is edited, moved or
// staged, and no path constant of an earlier script is changed. A directory is found by its name prefix (`QD-85-` to `QD-90-`)
// under `.planning/phases/` or `.planning/milestones/*-phases/`, so the script keeps working when a phase is archived. The
// repository root is the working directory (refused unless it holds `.planning/phases`), and this phase's own directory is found by
// its prefix `QD-91-` like the others. `85-earlier-checks.mjs` to `90-earlier-checks.mjs` compute the repository root from their
// own location, which a copy breaks, so only their `--self-test` runs.
//
// Phase 90's scripts are the first to name their own directory in a repository path (`D`) and to import `scripts/lib` by a
// relative path, so their copy is a small repository of its own: `p90/.planning/phases/QD-90-earlier/` holds the copied files and
// `bench/`, `p90/scripts/lib/` the one library module the pinned check imports, `p90/node_modules` is a link to the repository's,
// and `p90` is a `git init`. The runs that judge the real tree run from the repository root, with that copy's path; the four
// `--self-test`s run from `p90`, where the script's directory is the one relative path its planted clone expects. The modes of
// `90-check.mjs` that clone and compile in a scratch root of their own (`sixth-port`, `routing-landed`), run `pnpm`
// (`circular`), or compare commit paths with the script's own directory (`bench`, the mutation `landed` modes) are not run: no
// earlier phase's list ran its own either, and a copy cannot answer the last two.
//
// The ledger is not "every check exits 0". It is what each run printed on a clone at `phase_base`, measured with `--measure`
// (`node <D>91-check.mjs scratch earlier-base --at phase_base`, this file copied into that clone's directory, uncommitted), and a
// changed exit status or a changed line is a finding to explain with a fixed commit subject of this phase, or a defect to fix,
// never a row to widen. `RUNS` lists what is run and `LEDGER` what each run must print, joined by the label, so a run with no row
// and a row with no run are findings of their own (and so is a run with nothing to judge it by). Rows print in the order `RUNS`
// lists them, so two runs on one tree print the same text. Five kinds of row:
//   fixed      the exit status and the one line the run is judged by (see below).
//   pattern    the `trailers` rows of 87 to 90 print a count of the commits since their phase's base, which grows with every commit
//              of this phase, so the line is matched by a regular expression, and the status must still be 0: a commit with no
//              trailer or two of them still fails the run itself.
//   reasons    the whole set of stderr lines is the row, so an extra reason or a dropped one is a finding as much as a changed first
//              line. A reason that carries a line number states it as `<n>`, which matches any run of digits: the row is keyed on
//              the path, never on a line number a commit that does not exist yet will choose.
//   computed   the rows this phase moves, each keyed on the exact subject of the commit that moves it, copied byte for byte from
//              the subject table of `91-01-PLAN.md` (read when the script starts, so a paraphrase fails before any run). A computed
//              row expects the unmoved lines while its subject does not exist, and the moved line once exactly one commit since
//              `phase_base` has that subject; a moved line before its subject exists, or an unmoved line after, is a finding.
//              A subject that two commits carry is a finding of its own.
// The line compared is the last stdout line when the run exits 0, and otherwise the first stderr line that is not blank, not
// indented and does not begin `node:` (Node's own stack header); a `reasons` row compares every such stderr line.
//
// The rows are measured on the base, and the rows a later commit moves are written from what each earlier check reads and
// rehearsed on a clone with planted commits that carry the exact subjects. Every row keyed on a subject whose commit does not
// exist yet is a prediction until that commit exists: a prediction that fails when its commit lands is corrected by a reviewed
// edit to this file, never widened.
//
// Prints `<check>: exit <n>: <line>` for each run and exits 0 only when every run matches its row. From the repository root:
//   node <this directory>/91-earlier-checks.mjs
//   node <this file> --measure     prints each run as a ledger row and judges nothing
//   node <this file> --self-test
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** The scratch root of the phase (the one `91-check.mjs` calls <S>) and, under it, the directory the copies are made in. */
const OUT = join(realpathSync(process.env.TMPDIR ?? "/tmp"), "qd91", "earlier");
const P85_COPIED = ["85-check.mjs", "85-pinned-check.mjs", "85-mutation.mjs", "85-earlier-checks.mjs", "85-01-SUMMARY.md", "85-RED-EVIDENCE.md"];
const P86_COPIED = ["86-check.mjs", "86-pinned-check.mjs", "86-mutation.mjs", "86-earlier-checks.mjs", "86-01-SUMMARY.md", "86-RED-EVIDENCE.md", "86-mutation-base.json", "86-mutation-close.json"];
const P87_COPIED = ["87-check.mjs", "87-pinned-check.mjs", "87-mutation.mjs", "87-earlier-checks.mjs", "87-01-SUMMARY.md", "87-RED-EVIDENCE.md", "87-mutation-base.json", "87-mutation-close.json"];
const P88_COPIED = ["88-check.mjs", "88-pinned-check.mjs", "88-mutation.mjs", "88-earlier-checks.mjs", "88-RED-EVIDENCE.md", "88-mutation-base.json", "88-mutation-close.json"];
const P89_COPIED = ["89-check.mjs", "89-pinned-check.mjs", "89-mutation.mjs", "89-earlier-checks.mjs", "89-RED-EVIDENCE.md", "89-mutation-base.json", "89-mutation-close.json"];
/** What `90-check.mjs`, `90-pinned-check.mjs`, `90-mutation.mjs` and `90-earlier-checks.mjs` read from their own directory. */
const P90_COPIED = ["90-check.mjs", "90-pinned-check.mjs", "90-mutation.mjs", "90-earlier-checks.mjs", "90-BENCH.md", "90-RED-EVIDENCE.md", "90-mutation-base.json", "90-mutation-close.json", "90-coverage-base.json", "90-coverage-close.json"];
/** The directories of Phase 90 its modes read (the bench analyses that state the routing's gate). */
const P90_DIRECTORIES = ["bench"];
/** The library module the pinned check of Phase 90 imports by a relative path out of its own directory. */
const P90_LIBRARY = ["scripts/lib/typescript-server-child.mjs"];
const COPIED = { p85: P85_COPIED, p86: P86_COPIED, p87: P87_COPIED, p88: P88_COPIED, p89: P89_COPIED, p90: P90_COPIED };
const PHASE_PREFIX = { p85: "QD-85-", p86: "QD-86-", p87: "QD-87-", p88: "QD-88-", p89: "QD-89-", p90: "QD-90-" };
/** Where in its copy a phase's scripts sit: the empty string is the copy root, Phase 90 sits in a repository-shaped tree. */
const SUBDIRECTORY = { p90: ".planning/phases/QD-90-earlier" };

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

// ---- the subjects ----

/** The commit subjects of this phase that move a row, each copied byte for byte from the subject table of `91-01-PLAN.md`. */
const SUBJECT = {
  surface: "feat(91-03): add the surface-diff tool and run its self-test in the merge gate",
  auditBarrel: "refactor(91-09): name the audit barrel's exports per module",
  decoderFold: "refactor(91-10): fold the port span decoder into the span machinery",
  gateFold: "refactor(91-11): fold the gate registry constructor into the gate writer",
  auditFold: "refactor(91-12): fold the sequence check's public home into the archive facts",
  hydrationFold: "refactor(91-13): fold the hydration entry points into the hydration engine",
  decision: "docs(91-16): record the named barrels decision",
  amendments: "docs(91-16): amend the cycle, devtools-model and entry-points decisions",
  behaviours: "docs(91-17): state the folded behaviours and the surface invariants",
  overview: "docs(91-17): name each folded export at its new home",
  decisionNotes: "docs(91-18): note the folds on the decisions they touch",
  changesets: "chore(91-18): add the core, react and audit patch changesets",
  lease: "docs(91-19): name the registry lease's one caller",
  sweep: "docs(91-19): sweep the deleted paths and the old rule name",
};
const USED_SUBJECTS = Object.values(SUBJECT);

/** The subject column of the table of `91-01-PLAN.md`: the text in the backticks of the second cell of each row. */
const tableSubjects = (text) => text.split("\n").flatMap((line) => /^\| [0-9]{2} \| `([^`]+)`/.exec(line)?.slice(1) ?? []);

/** The reasons a subject this script keys a row on is not in the table, or is carried by two commits. */
const judgeSubjects = (wanted, table, log) => [
  ...(table.length === 0 ? ["the subject table of 91-01-PLAN.md holds no row"] : []),
  ...wanted.filter((s) => !table.includes(s)).map((s) => `the subject is not in the table of 91-01-PLAN.md: ${s}`),
  ...wanted.filter((s) => log.filter((l) => l === s).length > 1).map((s) => `${log.filter((l) => l === s).length} commits carry the subject: ${s}`),
];

// ---- the computed rows ----

/** A line a row prints, and when: `always`, `after` any of the subjects exists, or `until` the subject exists. */
const always = (line) => ({ line, present: () => true });
const after = (line, ...subjects) => ({ line, present: (have) => subjects.some((s) => have.includes(s)) });
const until = (line, subject) => ({ line, present: (have) => !have.includes(subject) });
/** A register line a bump moves: the line the base prints, until the subject exists (none when the base is exactly one revision above), then the moved line. */
const bumped = (moved, subject, base) => [...(base === undefined ? [] : [until(base, subject)]), after(moved, subject)];

/** The row a computed run expects: `clean` while no entry applies to the subjects that exist, otherwise exit 1 and exactly the lines that do. */
const rowOf = (clean, entries, have) => {
  const set = entries.filter(({ present }) => present(have)).map(({ line }) => line);
  return set.length === 0 ? clean : { exit: 1, reasons: true, set };
};

/** What `86-pinned-check.mjs` prints for a file a fold edits: the status line, no line number. */
const MOVED_86 = (path) => `${path} is reported as M against its base, not unchanged`;
const GATE_FILES_86 = ["DecisionOutcome.tst.ts", "DeveloperSignalReporters.test.tsx", "GateRegistration.characterisation.test.tsx", "GateRegistry.store.test.ts", "GateRegistry.test.tsx", "GateWriter.reconcile.test.ts", "GateWriter.test.tsx", "QadiProvider.tst.ts", "support/gates.ts", "support/trees.tsx"].map((f) => `packages/react/test/${f}`);
const HYDRATION_FILES_86 = ["DecisionOutcome.test.ts", "Hydration.lifetime.test.ts", "Hydration.test.ts", "Hydration.tst.ts", "HydrationCounts.test.ts", "HydrationPayload.test.ts", "QadiAtoms.test.ts", "UntrustedSeams.test.ts"].map((f) => `packages/react/test/${f}`);
const PINNED_86 = [
  ...GATE_FILES_86.map((path) => after(MOVED_86(path), SUBJECT.gateFold)),
  ...HYDRATION_FILES_86.map((path) => after(MOVED_86(path), SUBJECT.hydrationFold)),
  after(MOVED_86("packages/react/src/RegistryLease.ts"), SUBJECT.lease),
  after(MOVED_86("packages/react/test/ServerRender.test.tsx"), SUBJECT.sweep),
];
/** What `89-pinned-check.mjs` prints for the audit files the sequence check's fold edits, each with a line number it states as `<n>`. */
const PINNED_89 = [
  after("packages/audit/src/SequenceIntegrity.ts was deleted", SUBJECT.auditFold),
  after("packages/audit/test/AuditArchive.test.ts: differs from its base text at line <n>", SUBJECT.auditFold),
  after("packages/audit/test/SequenceIntegrity.test.ts: differs from its base text at line <n>", SUBJECT.auditFold),
  after("packages/audit/src/index.ts: differs from its base text at line <n>", SUBJECT.auditBarrel, SUBJECT.auditFold),
  after("packages/audit/test/ForeignRows.test.ts: the text between regions differs from its base text at line <n> (between importHostBatch and importFaults)", SUBJECT.auditFold),
  after("packages/audit/test/AdmissionOrder.characterisation.test.ts: the text between regions differs from its base text at line <n> (between header and import)", SUBJECT.auditFold),
  after("packages/audit/test/BatchReadOnce.test.ts: differs from the commit that added it at line <n>", SUBJECT.auditFold),
];
/** What `90-pinned-check.mjs` prints once the decoder's import line moves. */
const PINNED_90 = [after("packages/core/test/PortSpan.test.ts: differs from its base text at line <n>", SUBJECT.decoderFold)];

/** What `scan-forbidden` of Phases 85 to 90 print: each holds `AGENTS.md` and the budget file against its own base. */
const AGENTS_85_TO_89 = "AGENTS.md differs from phase_base: no budget moves";
const AGENTS_90 = "AGENTS.md differs from phase_base outside its section 3: only that section may change";
const BUDGET_FILE = "scripts/check-house-style.mjs differs from phase_base: no budget moves";
const GUARD_85_TO_89 = [always(AGENTS_85_TO_89), after(BUDGET_FILE, SUBJECT.decoderFold)];
const GUARD_90 = [after(AGENTS_90, SUBJECT.decoderFold), after(BUDGET_FILE, SUBJECT.decoderFold)];

/** What a `records --close` prints: a register line is "<file> is at Revision <it is>, not <it should be>". */
const REVISION = (file, is, want) => `${file} is at Revision ${is}, not ${want}`;
const README = "spec/README.md";
const TRACEABILITY = "spec/traceability.md";
const INVARIANTS = "spec/invariants.md";
/** What each changeset subject adds, and how a close words a count that is not the one it wants. */
const CHANGESETS_ADDED = 3;
const COUNT = (n, wanted) => `${n} changesets are added since phase_base, not ${wanted}`;
/** A count line: the base's (none when it is what the close wants) until the changeset subject exists, then the base's plus what it adds. */
const counted = (at, wanted) => [
  ...(at === wanted ? [] : [until(COUNT(at, wanted === 1 ? "one" : wanted), SUBJECT.changesets)]),
  ...(at + CHANGESETS_ADDED === wanted ? [] : [after(COUNT(at + CHANGESETS_ADDED, wanted === 1 ? "one" : wanted), SUBJECT.changesets)]),
];
const CLEAN_CLOSE = { exit: 0, line: "records: the pinned-by lists name tests that exist, and every reserved record is written" };
/** `88-check.mjs records --close`: Phase 90's edits already put each register one above and the count at five; this phase bumps each once more. */
const CLOSE_88 = [
  ...bumped(REVISION(README, "1.417", "1.414"), SUBJECT.surface, REVISION(README, "1.416", "1.414")),
  ...bumped(REVISION(TRACEABILITY, "1.336", "1.333"), SUBJECT.decision, REVISION(TRACEABILITY, "1.335", "1.333")),
  ...bumped(REVISION(INVARIANTS, "1.236", "1.233"), SUBJECT.behaviours, REVISION(INVARIANTS, "1.235", "1.233")),
  ...counted(5, 1),
];
/** `87-check.mjs records --close` pins the devtools-model decision at its Phase 87 revision, which the amendment to it moves one minor above. */
const CLOSE_87 = [after("ADR-QD-047 is not at Revision 1.24", SUBJECT.amendments)];
/** `89-check.mjs records --close`: the same three registers, the audit behaviours document and the decision that notes the archive's facts, and the count at four. */
const CLOSE_89 = [
  ...bumped(REVISION(README, "1.417", "1.415"), SUBJECT.surface, REVISION(README, "1.416", "1.415")),
  ...bumped(REVISION(TRACEABILITY, "1.336", "1.334"), SUBJECT.decision, REVISION(TRACEABILITY, "1.335", "1.334")),
  ...bumped(REVISION(INVARIANTS, "1.236", "1.234"), SUBJECT.behaviours, REVISION(INVARIANTS, "1.235", "1.234")),
  ...bumped(REVISION("spec/behaviors/33-audit-pipeline.md", "1.34", "1.33"), SUBJECT.behaviours),
  ...bumped(REVISION("spec/decisions/110-an-archives-facts-are-computed-once.md", "1.5", "1.4"), SUBJECT.decisionNotes),
  ...counted(4, 1),
];
/** The three changesets Phase 90 expects, as its close lists them when it refuses another. */
const EXPECTED_90 = ".changeset/core-port-facts-on-the-description.md, .changeset/http-port-names-from-core.md, .changeset/testing-review-layer-fixture-doc.md";
/** `90-check.mjs records --close` is clean at the base: it names a register once this phase bumps it, and each of the three changesets this phase adds. */
const CLOSE_90 = [
  ...bumped(REVISION(README, "1.417", "1.416"), SUBJECT.surface),
  ...bumped(REVISION(TRACEABILITY, "1.336", "1.335"), SUBJECT.decision),
  ...bumped(REVISION(INVARIANTS, "1.236", "1.235"), SUBJECT.behaviours),
  ...bumped(REVISION("spec/behaviors/30-port-calls.md", "1.27", "1.26"), SUBJECT.behaviours),
  ...bumped(REVISION("spec/overview.md", "1.148", "1.147"), SUBJECT.overview),
  ...counted(3, 3),
  ...["audit", "core", "react"].map((package_) => after(`.changeset/${package_}-named-barrel.md is not one of ${EXPECTED_90}`, SUBJECT.changesets)),
];

/** The computations a `computed` row names: the row each expects of the subjects that exist. */
const COMPUTED = {
  pinned86: (have) => rowOf({ exit: 0, line: "pinned: 59 files hold their base text, 1 of 1 born files held" }, PINNED_86, have),
  pinned89: (have) => rowOf({ exit: 0, line: "pinned: 46 files hold their base text, 5 of 5 born files held, 5 of 5 declared edits applied" }, PINNED_89, have),
  pinned90: (have) => rowOf({ exit: 0, line: "90-pinned-check.mjs: pinned: 408 files hold their base text, 5 of 5 born files held, 5 of 5 declared edits applied" }, PINNED_90, have),
  guard: (have) => rowOf({ exit: 0, line: "scan-forbidden: no forbidden form in added lines" }, GUARD_85_TO_89, have),
  guard90: (have) => rowOf({ exit: 0, line: "scan-forbidden: no forbidden form in added lines" }, GUARD_90, have),
  close87: (have) => rowOf(CLEAN_CLOSE, CLOSE_87, have),
  close88: (have) => rowOf(CLEAN_CLOSE, CLOSE_88, have),
  close89: (have) => rowOf(CLEAN_CLOSE, CLOSE_89, have),
  close90: (have) => rowOf(CLEAN_CLOSE, CLOSE_90, have),
};

/** The ledger with each computed row replaced by what its computation expects of `have`, the subjects that exist. */
const resolve = (ledger, have) => ledger.map((row) => (row.computed === undefined ? row : { label: row.label, ...COMPUTED[row.computed](have) }));

// ---- what is run ----

const mk = (copy, file, ...args) => ({ label: [file, ...args].join(" "), copy, file, args });
/** What is run, in the order the runs print: the label, the copy it runs from, the script and its arguments. A row of the ledger
 * names a run by its label, so a run no row names, and a row no run answers, are both findings. */
const RUNS = [
  ...["base", "scan-ids", "scan-forbidden", "trailers", "no-react-in-model", "three-predicates", "panel-decides-nothing", "frame-reads-status", "records"].map((m) => mk("p85", "85-check.mjs", m)),
  mk("p85", "85-check.mjs", "records", "--close"),
  mk("p85", "85-pinned-check.mjs"),
  ...["base", "scan-ids", "scan-forbidden", "trailers", "owner-shape", "provider-forwards-only", "records"].map((m) => mk("p86", "86-check.mjs", m)),
  mk("p86", "86-check.mjs", "records", "--close"),
  mk("p86", "86-pinned-check.mjs"),
  ...["85-check.mjs", "85-pinned-check.mjs", "85-mutation.mjs", "85-earlier-checks.mjs"].map((f) => mk("p85", f, "--self-test")),
  ...["86-check.mjs", "86-pinned-check.mjs", "86-mutation.mjs", "86-earlier-checks.mjs"].map((f) => mk("p86", f, "--self-test")),
  ...["base", "scan-ids", "scan-forbidden", "trailers", "stated-run-shape", "prologue-shape", "feeds-supply-only-engine", "session-stop", "simulator-pre", "onfailure-gone", "built-feeds-once", "records"].map((m) => mk("p87", "87-check.mjs", m)),
  mk("p87", "87-check.mjs", "records", "--close"),
  mk("p87", "87-pinned-check.mjs"),
  ...["87-check.mjs", "87-pinned-check.mjs", "87-mutation.mjs", "87-earlier-checks.mjs"].map((f) => mk("p87", f, "--self-test")),
  ...["base", "scan-ids", "scan-forbidden", "trailers", "box-keys-itself", "ledger-module", "records"].map((m) => mk("p88", "88-check.mjs", m)),
  mk("p88", "88-check.mjs", "records", "--close"),
  mk("p88", "88-pinned-check.mjs"),
  ...["88-check.mjs", "88-pinned-check.mjs", "88-mutation.mjs", "88-earlier-checks.mjs"].map((f) => mk("p88", f, "--self-test")),
  ...["base", "scan-ids", "scan-forbidden", "trailers", "admission-step", "entry-points-first", "records"].map((m) => mk("p89", "89-check.mjs", m)),
  mk("p89", "89-check.mjs", "records", "--close"),
  mk("p89", "89-pinned-check.mjs"),
  ...["89-check.mjs", "89-pinned-check.mjs", "89-mutation.mjs", "89-earlier-checks.mjs"].map((f) => mk("p89", f, "--self-test")),
  ...["base", "scan-ids", "scan-forbidden", "trailers", "records"].map((m) => mk("p90", "90-check.mjs", m)),
  mk("p90", "90-check.mjs", "records", "--close"),
  mk("p90", "90-check.mjs", "port-facts"),
  mk("p90", "90-check.mjs", "scoped-route", "derived"),
  mk("p90", "90-check.mjs", "scoped-route", "route"),
  mk("p90", "90-pinned-check.mjs"),
  mk("p90", "90-pinned-check.mjs", "--all-applied"),
  ...["90-check.mjs", "90-pinned-check.mjs", "90-mutation.mjs", "90-earlier-checks.mjs"].map((f) => mk("p90", f, "--self-test")),
];

/** What each run must print, keyed by its label. */
/** The line the `trailers` rows of Phases 87 to 90 print: a count of the commits since their phase's base, which grows with every commit of this phase. */
const TRAILERS = /^trailers: [0-9]+ commits since phase_base, each with the one trailer$/;
const LEDGER = [
  { label: "85-check.mjs base", exit: 0, line: "2741584f50d176281038b478d0350dc35f174cc2" },
  { label: "85-check.mjs scan-ids", exit: 1, reasons: true, set: PHASE_RELATIVE },
  { label: "85-check.mjs scan-forbidden", computed: "guard" },
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
  { label: "86-check.mjs scan-forbidden", computed: "guard" },
  { label: "86-check.mjs trailers", exit: 0, line: "trailers: 22 plan commits, each with the one trailer" },
  { label: "86-check.mjs owner-shape", exit: 0, line: "owner-shape: the registry's lifetime is kept by one React-free module" },
  { label: "86-check.mjs provider-forwards-only", exit: 0, line: "provider-forwards-only: the provider builds the owner once and only forwards to it" },
  { label: "86-check.mjs records", exit: 0, line: "records: the pinned-by lists name tests that exist" },
  { label: "86-check.mjs records --close", exit: 0, line: "records: the pinned-by lists name tests that exist, and every reserved record is written" },
  { label: "86-pinned-check.mjs", computed: "pinned86" },
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
  { label: "87-check.mjs scan-forbidden", computed: "guard" },
  { label: "87-check.mjs trailers", exit: 0, pattern: TRAILERS },
  { label: "87-check.mjs stated-run-shape", exit: 0, line: "stated-run-shape: StatedRun.ts is the one run that states its stop" },
  { label: "87-check.mjs prologue-shape", exit: 0, line: "prologue-shape: ConfigurePrologue.ts is the one configure prologue" },
  { label: "87-check.mjs feeds-supply-only-engine", exit: 0, line: "feeds-supply-only-engine: timeline, diagnostics, gates supply only their engine" },
  { label: "87-check.mjs session-stop", exit: 0, line: "session-stop: the session starts its runs through the stated run" },
  { label: "87-check.mjs simulator-pre", exit: 0, line: "simulator-pre: the broken-run box is a labelled preformatted block" },
  { label: "87-check.mjs onfailure-gone", exit: 0, line: "onfailure-gone: no failure hook remains" },
  { label: "87-check.mjs built-feeds-once", exit: 0, line: "built-feeds-once: test/builtFeeds.ts builds and configures through one helper" },
  { label: "87-check.mjs records", exit: 0, line: "records: the pinned-by lists name tests that exist" },
  { label: "87-check.mjs records --close", computed: "close87" },
  { label: "87-pinned-check.mjs", exit: 1, reasons: true, set: PINNED_87 },
  { label: "87-check.mjs --self-test", exit: 0, line: "self-test: 301 passed" },
  { label: "87-pinned-check.mjs --self-test", exit: 0, line: "self-test: 35 passed" },
  { label: "87-mutation.mjs --self-test", exit: 0, line: "self-test: 103 passed" },
  { label: "87-earlier-checks.mjs --self-test", exit: 0, line: "self-test: 21 passed" },
  { label: "88-check.mjs base", exit: 0, line: "892c4d36bf0f639a5219c53e7c39563533ea8b7e" },
  { label: "88-check.mjs scan-ids", exit: 0, line: "scan-ids: no id or phase wording in added lines" },
  { label: "88-check.mjs scan-forbidden", computed: "guard" },
  { label: "88-check.mjs trailers", exit: 0, pattern: TRAILERS },
  { label: "88-check.mjs box-keys-itself", exit: 0, line: "box-keys-itself: the stopped box keys itself, decides its alert at mount and records at commit; the notices hand it the notice whole" },
  { label: "88-check.mjs ledger-module", exit: 0, line: "ledger-module: the stop ledger is one React-free module holding stop and count, imported in src only by the box and the hook" },
  { label: "88-check.mjs records", exit: 0, line: "records: the pinned-by lists name tests that exist" },
  { label: "88-check.mjs records --close", computed: "close88" },
  { label: "88-pinned-check.mjs", exit: 0, line: "pinned: 130 files hold their base text, 3 of 3 born files held, 5 of 5 declared edits applied" },
  { label: "88-check.mjs --self-test", exit: 0, line: "self-test: 302 passed" },
  { label: "88-pinned-check.mjs --self-test", exit: 0, line: "self-test: 38 passed" },
  { label: "88-mutation.mjs --self-test", exit: 0, line: "self-test: 68 passed" },
  { label: "88-earlier-checks.mjs --self-test", exit: 0, line: "self-test: 46 passed" },
  { label: "89-check.mjs base", exit: 0, line: "8ee14f6f703f3121d44d15a1515d02eff62ca63f" },
  { label: "89-check.mjs scan-ids", exit: 0, line: "scan-ids: no id or phase wording in added lines" },
  { label: "89-check.mjs scan-forbidden", computed: "guard" },
  { label: "89-check.mjs trailers", exit: 0, pattern: TRAILERS },
  { label: "89-check.mjs admission-step", exit: 0, line: "admission-step: HostBatch.ts is the one plain, package-private admission step; NowNotFinite is stated once and isCodecMade and Number.isFinite are asked only there" },
  { label: "89-check.mjs entry-points-first", exit: 0, line: "entry-points-first: archiveAuditTrail, verifySequenceIntegrity, planRetention, planPurge each admit the batch first; planPurge does not call planRetention; verifiedArchiveFacts takes AdmittedRows" },
  { label: "89-check.mjs records", exit: 0, line: "records: the pinned-by lists name tests that exist" },
  { label: "89-check.mjs records --close", computed: "close89" },
  { label: "89-pinned-check.mjs", computed: "pinned89" },
  { label: "89-check.mjs --self-test", exit: 0, line: "self-test: 381 passed" },
  { label: "89-pinned-check.mjs --self-test", exit: 0, line: "self-test: 57 passed" },
  { label: "89-mutation.mjs --self-test", exit: 0, line: "self-test: 92 passed" },
  { label: "89-earlier-checks.mjs --self-test", exit: 0, line: "self-test: 47 passed" },
  { label: "90-check.mjs base", exit: 0, line: "46174873c60e85bcd0c6702867c602cad8460310" },
  { label: "90-check.mjs scan-ids", exit: 0, line: "scan-ids: no id or phase wording in added lines" },
  { label: "90-check.mjs scan-forbidden", computed: "guard90" },
  { label: "90-check.mjs trailers", exit: 0, pattern: TRAILERS },
  { label: "90-check.mjs records", exit: 0, line: "records: the pinned-by lists name tests that exist" },
  { label: "90-check.mjs records --close", computed: "close90" },
  { label: "90-check.mjs port-facts", exit: 0, line: "port-facts names spans fixtures serving: the facts are stated as the shape requires" },
  { label: "90-check.mjs scoped-route derived", exit: 0, line: "scoped-route derived: the scoped read is derived from the leaf rows and routed on each port's need" },
  { label: "90-check.mjs scoped-route route", exit: 0, line: "scoped-route route: the scoped read is derived from the leaf rows and routed on each port's need" },
  { label: "90-pinned-check.mjs", computed: "pinned90" },
  { label: "90-pinned-check.mjs --all-applied", computed: "pinned90" },
  { label: "90-check.mjs --self-test", exit: 0, line: "self-test: 543 passed" },
  { label: "90-pinned-check.mjs --self-test", exit: 0, line: "self-test: passed" },
  { label: "90-mutation.mjs --self-test", exit: 0, line: "self-test: 105 passed" },
  { label: "90-earlier-checks.mjs --self-test", exit: 0, line: "self-test: 77 passed" },
];

/** The line a run is judged by: see the header. */
const lineOf = (status, stdout, stderr) => {
  if (status === 0) return stdout.split("\n").filter((l) => l.trim() !== "").at(-1) ?? "";
  return stderr.split("\n").find((l) => l.trim() !== "" && !/^\s/.test(l) && !l.startsWith("node:")) ?? "";
};

/** Every stderr line a `reasons` row compares: not blank, not indented, not Node's own header. */
const reasonsOf = (stderr) => stderr.split("\n").filter((l) => l.trim() !== "" && !/^\s/.test(l) && !l.startsWith("node:"));

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Whether the reason `got` is the expected `want`, where `<n>` in `want` stands for any run of digits. */
const sameReason = (want, got) => new RegExp(`^${escapeRe(want).replaceAll("<n>", "[0-9]+")}$`).test(got);

/** The reasons the runs are not the ledger's rows: a missing run, a changed exit status, a changed line, a run no row names, and no run or no row at all. */
const judgeLedger = (runs, ledger) => {
  const reasons = [];
  if (runs.length === 0) reasons.push("no run to judge");
  if (ledger.length === 0) reasons.push("no ledger row to judge by");
  for (const row of ledger) {
    const run = runs.find((r) => r.label === row.label);
    if (run === undefined) reasons.push(`missing run: ${row.label}`);
    else if (run.status !== row.exit) reasons.push(`${row.label}: expected exit ${row.exit}, got exit ${run.status}: ${run.line}`);
    else if (row.reasons === true) {
      const got = run.set ?? [];
      for (const want of row.set) if (!got.some((line) => sameReason(want, line))) reasons.push(`${row.label}: missing reason "${want}"`);
      for (const line of got) if (!row.set.some((want) => sameReason(want, line))) reasons.push(`${row.label}: unexpected reason "${line}"`);
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
  if (existsSync(milestones)) for (const name of readdirSync(milestones, { withFileTypes: true })) if (name.isDirectory() && name.name.endsWith("-phases")) parents.push(join(milestones, name.name));
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

/** The working directory of a run: the repository root, except for a `--self-test` of Phase 90, which expects its own directory as the relative path from where it runs. */
const cwdOf = (row, root) => (row.copy === "p90" && row.args.includes("--self-test") ? join(OUT, "p90") : root);

/** The runs each subject moves: every row that prints differently once exactly that subject exists is named here, and no other. */
const MOVES_BY_SUBJECT = {
  surface: ["88-check.mjs records --close", "89-check.mjs records --close", "90-check.mjs records --close"],
  auditBarrel: ["89-pinned-check.mjs"],
  decoderFold: ["85-check.mjs scan-forbidden", "86-check.mjs scan-forbidden", "87-check.mjs scan-forbidden", "88-check.mjs scan-forbidden", "89-check.mjs scan-forbidden", "90-check.mjs scan-forbidden", "90-pinned-check.mjs", "90-pinned-check.mjs --all-applied"],
  gateFold: ["86-pinned-check.mjs"],
  auditFold: ["89-pinned-check.mjs"],
  hydrationFold: ["86-pinned-check.mjs"],
  decision: ["88-check.mjs records --close", "89-check.mjs records --close", "90-check.mjs records --close"],
  amendments: ["87-check.mjs records --close"],
  behaviours: ["88-check.mjs records --close", "89-check.mjs records --close", "90-check.mjs records --close"],
  overview: ["90-check.mjs records --close"],
  decisionNotes: ["89-check.mjs records --close"],
  changesets: ["88-check.mjs records --close", "89-check.mjs records --close", "90-check.mjs records --close"],
  lease: ["86-pinned-check.mjs"],
  sweep: ["86-pinned-check.mjs"],
};

const selfTest = () => {
  const concrete = (line) => line.replaceAll("<n>", "12");
  const toRun = (row) => ({ label: row.label, status: row.exit, line: row.pattern === undefined ? concrete(row.line ?? row.set?.[0] ?? "") : "trailers: 3 commits since phase_base, each with the one trailer", set: row.set?.map(concrete) });
  /** The ledger as it reads when exactly `have` are among the commit subjects since `phase_base`. */
  const at = (have) => resolve(LEDGER, have);
  const rowAt = (label, have) => at(have).find((r) => r.label === label);
  const setAt = (label, have) => [...rowAt(label, have).set].sort().join("|");
  const exitAt = (label, have) => rowAt(label, have).exit;
  const none = [];
  const every = USED_SUBJECTS;
  const ledger = at(none);
  const ok = ledger.map(toRun);
  const swap = (i, patch) => ok.map((r, j) => (j === i ? { ...r, ...patch } : r));
  const index = (label) => ledger.findIndex((r) => r.label === label);
  /** The runs a tree whose subjects are `printed` shows, judged by the ledger a tree whose subjects are `judged` expects. */
  const judgedAt = (printed, judged) => judgeLedger(at(printed).map(toRun), at(judged));
  /** The reasons naming `label`, so a case reads one row and not the whole table. */
  const about = (reasons, label) => reasons.filter((r) => r.startsWith(`${label}: `));
  const moved = (subject) => ledger.filter((_, i) => JSON.stringify(at([subject])[i]) !== JSON.stringify(ledger[i])).map((r) => r.label);
  const one = (row) => judgeLedger([toRun({ label: "x", ...row.run })], [{ label: "x", ...row.row }]);
  const tmp = mkdtempSync(join(realpathSync(tmpdir()), "qd91-st-"));
  mkdirSync(join(tmp, ".planning/phases/QD-1-a"), { recursive: true });
  mkdirSync(join(tmp, ".planning/milestones/v9-phases/QD-2-b"), { recursive: true });
  mkdirSync(join(tmp, ".planning/milestones/v9-phases/QD-22-c"), { recursive: true });
  mkdirSync(join(tmp, ".planning/milestones/other/QD-3-d"), { recursive: true });
  const found = [findPhases(tmp, "QD-1-"), findPhases(tmp, "QD-2-"), findPhases(tmp, "QD-3-")].map((names) => names.map((n) => n.slice(tmp.length + 1)));
  const rooted = [judgeRoot(tmp), judgeRoot(join(tmp, ".planning"))];
  rmSync(tmp, { recursive: true, force: true });
  const scanIds = index("85-check.mjs scan-ids");
  const trailers = index("87-check.mjs trailers");
  const pinned87 = index("87-pinned-check.mjs");
  const provider = LEDGER.find((r) => r.label === "86-check.mjs provider-forwards-only");
  const plannedTable = "| Plan | Subject | Paths |\n| ---- | ------- | ----- |\n| 01 | `docs(91-01): record the mutation base` | `<D>91-mutation.mjs` |\n| 11 | `refactor(91-11): a b` | `x`, `y` |\nsome text | `not a row`\n";
  const label = "86-pinned-check.mjs";
  const cases = [
    // The judge: fixed rows, pattern rows, reasons rows.
    ["a matching set of runs passes", judgeLedger(ok, ledger).length === 0],
    ["a matching exit with another line fails, naming both lines", judgeLedger(swap(0, { line: "changed" }), ledger).join() === `${ledger[0].label}: expected the line "${ledger[0].line}", got "changed"`],
    ["a matching line with another exit fails, naming the run and both statuses", judgeLedger(swap(0, { status: 1 }), ledger).join() === `${ledger[0].label}: expected exit 0, got exit 1: ${ledger[0].line}`],
    ["an exit that was 1 now 0 fails", judgeLedger(swap(scanIds, { status: 0 }), ledger).length === 1],
    ["a changed self-test count fails", judgeLedger(swap(ok.length - 1, { line: "self-test: 1 passed" }), ledger).length === 1],
    ["a missing run fails, naming it", judgeLedger(ok.slice(1), ledger).join() === `missing run: ${ledger[0].label}`],
    ["a run no row names fails", judgeLedger([...ok, { label: "extra", status: 0, line: "x" }], ledger).join() === "unexpected run: extra"],
    ["no run at all fails, and so does no row at all", judgeLedger([], ledger).includes("no run to judge") && judgeLedger([], ledger).length === ledger.length + 1 && judgeLedger(ok, []).includes("no ledger row to judge by") && judgeLedger(ok, []).length === ok.length + 1 && judgeLedger([], []).join() === "no run to judge,no ledger row to judge by"],
    ["a run with no row and a row with no run are each one finding", judgeLedger([...ok.slice(1), { label: "extra", status: 0, line: "x" }], ledger).join() === `missing run: ${ledger[0].label},unexpected run: extra`],
    ["the pattern rows pass a growing count", ["1", "61", "251", "1234"].every((n) => judgeLedger(swap(trailers, { line: `trailers: ${n} commits since phase_base, each with the one trailer` }), ledger).length === 0)],
    ["the pattern rows fail a different sentence, a missing count and a failing run", ["trailers: 61 commits since phase_base, one lacks the trailer", "trailers: commits since phase_base, each with the one trailer", "trailers: 6x commits since phase_base, each with the one trailer"].every((line) => judgeLedger(swap(trailers, { line }), ledger).length === 1) && judgeLedger(swap(trailers, { status: 1 }), ledger).length === 1],
    ["the reasons row passes its measured set, in any order", judgeLedger(swap(scanIds, { set: [...PHASE_RELATIVE].reverse() }), ledger).length === 0 && PHASE_RELATIVE.length === 5],
    ["the reasons row fails when one reason is added, naming it", judgeLedger(swap(scanIds, { set: [...PHASE_RELATIVE, "extra.ts:1 has phase-relative wording: x"] }), ledger).join() === `85-check.mjs scan-ids: unexpected reason "extra.ts:1 has phase-relative wording: x"`],
    ["the reasons row fails when one reason is dropped, naming it", judgeLedger(swap(scanIds, { set: PHASE_RELATIVE.slice(1) }), ledger).join() === `85-check.mjs scan-ids: missing reason "${PHASE_RELATIVE[0]}"`],
    ["the reasons row fails when a reason is reworded, in both directions", judgeLedger(swap(scanIds, { set: [...PHASE_RELATIVE.slice(1), "other"] }), ledger).length === 2],
    ["the pinned reasons row passes its measured set and fails when a file is missing, added, or the run exits 0", judgeLedger(swap(pinned87, { set: [...ledger[pinned87].set].reverse() }), ledger).length === 0 && judgeLedger(swap(pinned87, { set: ledger[pinned87].set.slice(1) }), ledger).join() === `87-pinned-check.mjs: missing reason "${ledger[pinned87].set[0]}"` && judgeLedger(swap(pinned87, { set: [...ledger[pinned87].set, "packages/devtools/test/Other.test.ts: differs from its base text at line 2"] }), ledger).length === 1 && judgeLedger(swap(pinned87, { status: 0 }), ledger).length === 1],
    // A reason states its line number as `<n>`.
    ["a reason with <n> matches any run of digits", [["a.ts: differs at line <n>", "a.ts: differs at line 1"], ["a.ts: differs at line <n>", "a.ts: differs at line 1234"]].every(([want, got]) => one({ row: { exit: 1, reasons: true, set: [want] }, run: { exit: 1, reasons: true, set: [got] } }).length === 0)],
    ["a reason with <n> does not match a word, an empty number, or another path, in both directions", [["a.ts: differs at line x", "a.ts: differs at line <n>"], ["a.ts: differs at line ", "a.ts: differs at line <n>"], ["b.ts: differs at line 3", "a.ts: differs at line <n>"]].every(([got, want]) => one({ row: { exit: 1, reasons: true, set: [want] }, run: { exit: 1, reasons: true, set: [got] } }).length === 2)],
    ["a reason is matched whole, so a longer line does not pass", one({ row: { exit: 1, reasons: true, set: ["a.ts: differs at line <n>"] }, run: { exit: 1, reasons: true, set: ["a.ts: differs at line 3 and more"] } }).length === 2],
    ["a reason holding regular expression characters is matched as text", one({ row: { exit: 1, reasons: true, set: ["a (b) [c] line <n>"] }, run: { exit: 1, reasons: true, set: ["a (b) [c] line 4"] } }).length === 0 && one({ row: { exit: 1, reasons: true, set: ["a (b) [c] line <n>"] }, run: { exit: 1, reasons: true, set: ["a b c line 4"] } }).length === 2],
    // What a run prints.
    ["a run that exits 0 is judged by its last stdout line", lineOf(0, "a\nb\n\n", "ignored") === "b"],
    ["a run that fails is judged by its first plain stderr line", lineOf(1, "out", "\nnode:internal/x:1\n  throw err;\n  ^\n\nError: gone\n  at y\n") === "Error: gone"],
    ["a failing run with only Node's header and an indented stack has no line", lineOf(1, "", "node:internal/x:1\n  throw err;\n") === ""],
    ["a reason set is every plain stderr line", reasonsOf("a\n\n  at b\nnode:x\nc\n").join() === "a,c"],
    // Where the earlier phases are.
    ["one matching directory passes, none or two fail", judgePick("QD-1-", ["a"]).length === 0 && judgePick("QD-1-", []).length === 1 && judgePick("QD-1-", ["a", "b"]).length === 1],
    ["a directory under .planning/phases resolves", found[0].join() === ".planning/phases/QD-1-a"],
    ["a directory under .planning/milestones/*-phases resolves, and a longer number does not match", found[1].join() === ".planning/milestones/v9-phases/QD-2-b"],
    ["a directory under a milestone folder that does not end in -phases is not found", found[2].length === 0],
    ["a root that holds .planning/phases is accepted and one that holds none is refused, naming it", rooted[0].length === 0 && rooted[1].length === 1 && rooted[1][0].endsWith("holds no .planning/phases: run this from the repository root")],
    ["a run of Phase 90's own self-test runs from its copy, and every other run from the root", cwdOf({ copy: "p90", args: ["--self-test"] }, "/r") === join(OUT, "p90") && cwdOf({ copy: "p90", args: ["base"] }, "/r") === "/r" && cwdOf({ copy: "p89", args: ["--self-test"] }, "/r") === "/r"],
    // The subjects.
    ["the table of a plan names its subjects, one per row, and no other text", tableSubjects(plannedTable).join("|") === "docs(91-01): record the mutation base|refactor(91-11): a b"],
    ["a subject in the table passes, and one that is not names itself", judgeSubjects(["docs(91-01): record the mutation base"], tableSubjects(plannedTable), []).length === 0 && judgeSubjects(["docs(91-01): record the mutation base."], tableSubjects(plannedTable), []).join() === "the subject is not in the table of 91-01-PLAN.md: docs(91-01): record the mutation base."],
    ["an empty table fails", judgeSubjects([], [], []).join() === "the subject table of 91-01-PLAN.md holds no row"],
    ["a subject that two commits carry fails, naming the count, and one that one commit or none carries passes", judgeSubjects(["refactor(91-11): a b"], tableSubjects(plannedTable), ["refactor(91-11): a b", "x", "refactor(91-11): a b"]).join() === "2 commits carry the subject: refactor(91-11): a b" && judgeSubjects(["refactor(91-11): a b"], tableSubjects(plannedTable), ["refactor(91-11): a b"]).length === 0 && judgeSubjects(["refactor(91-11): a b"], tableSubjects(plannedTable), []).length === 0],
    ["every subject is a plan commit of this phase, written once, and the ledger names no other", USED_SUBJECTS.every((s) => /^[a-z]+[(]91-[0-9]{2}[)]!?: /.test(s)) && new Set(USED_SUBJECTS).size === USED_SUBJECTS.length && USED_SUBJECTS.length === 14],
    ["the subjects are the exact strings of the commit subject table", SUBJECT.gateFold === "refactor(91-11): fold the gate registry constructor into the gate writer" && SUBJECT.hydrationFold === "refactor(91-13): fold the hydration entry points into the hydration engine" && SUBJECT.lease === "docs(91-19): name the registry lease's one caller" && SUBJECT.sweep === "docs(91-19): sweep the deleted paths and the old rule name" && SUBJECT.auditFold === "refactor(91-12): fold the sequence check's public home into the archive facts" && SUBJECT.auditBarrel === "refactor(91-09): name the audit barrel's exports per module" && SUBJECT.decoderFold === "refactor(91-10): fold the port span decoder into the span machinery" && SUBJECT.surface === "feat(91-03): add the surface-diff tool and run its self-test in the merge gate" && SUBJECT.decision === "docs(91-16): record the named barrels decision" && SUBJECT.behaviours === "docs(91-17): state the folded behaviours and the surface invariants" && SUBJECT.overview === "docs(91-17): name each folded export at its new home" && SUBJECT.decisionNotes === "docs(91-18): note the folds on the decisions they touch" && SUBJECT.changesets === "chore(91-18): add the core, react and audit patch changesets"],
    // The shape of the ledger.
    ["every run names a copy the script makes", RUNS.every((r) => Object.hasOwn(COPIED, r.copy) && COPIED[r.copy].includes(r.file))],
    ["every run has one row and every row one run, under the same label, in the same order", RUNS.length === LEDGER.length && RUNS.every((r, i) => r.label === LEDGER[i].label) && new Set(RUNS.map((r) => r.label)).size === RUNS.length],
    ["the runs number at least eighty, Phase 90's among them", RUNS.length >= 80 && RUNS.filter((r) => r.copy === "p90").length === 15 && RUNS.filter((r) => r.copy === "p90" && r.args.includes("--self-test")).length === 4],
    ["every row states its judge once: a line, a pattern, a reason set or a computation", LEDGER.every((r) => [r.line, r.pattern, r.reasons === true ? r.set : undefined, r.computed].filter((x) => x !== undefined).length === 1)],
    ["every computed row names a computation the script has, and every computation is named", LEDGER.filter((r) => r.computed !== undefined).every((r) => Object.hasOwn(COMPUTED, r.computed)) && Object.keys(COMPUTED).every((name) => LEDGER.some((r) => r.computed === name))],
    ["the computed rows are the six scan-forbidden rows, the three pinned rows of 86, 89 and 90, and the four records --close rows", LEDGER.filter((r) => r.computed !== undefined).map((r) => r.label).join() === "85-check.mjs scan-forbidden,86-check.mjs scan-forbidden,86-pinned-check.mjs,87-check.mjs scan-forbidden,87-check.mjs records --close,88-check.mjs scan-forbidden,88-check.mjs records --close,89-check.mjs scan-forbidden,89-check.mjs records --close,89-pinned-check.mjs,90-check.mjs scan-forbidden,90-check.mjs records --close,90-pinned-check.mjs,90-pinned-check.mjs --all-applied"],
    ["the provider judge is a fixed exit 0 row with no computed move", provider !== undefined && provider.exit === 0 && provider.computed === undefined && provider.line === "provider-forwards-only: the provider builds the owner once and only forwards to it" && every.every((s) => JSON.stringify(rowAt(provider.label, [s])) === JSON.stringify(provider))],
    ["every label is unique, and with no subject the rows at exit 1 are the two scan-ids rows, 87's pinned row, the five scan-forbidden rows of 85 to 89 and the two closes of 88 and 89", new Set(LEDGER.map((r) => r.label)).size === LEDGER.length && ledger.filter((r) => r.exit === 1).map((r) => r.label).join() === "85-check.mjs scan-ids,85-check.mjs scan-forbidden,86-check.mjs scan-ids,86-check.mjs scan-forbidden,87-check.mjs scan-forbidden,87-pinned-check.mjs,88-check.mjs scan-forbidden,88-check.mjs records --close,89-check.mjs scan-forbidden,89-check.mjs records --close"],
    ["the rows read in the order RUNS lists in every state, so two runs on one tree print the same text", [none, [SUBJECT.surface], every].every((have) => at(have).map((r) => r.label).join() === RUNS.map((r) => r.label).join())],
    // What each subject moves.
    ["each subject moves exactly the rows it explains, and every subject moves one", Object.keys(SUBJECT).every((key) => moved(SUBJECT[key]).join("|") === MOVES_BY_SUBJECT[key].join("|")) && Object.keys(MOVES_BY_SUBJECT).length === Object.keys(SUBJECT).length],
    ["with no subject each computed row is its measured one", exitAt(label, none) === 0 && rowAt(label, none).line === "pinned: 59 files hold their base text, 1 of 1 born files held" && exitAt("89-pinned-check.mjs", none) === 0 && exitAt("90-pinned-check.mjs", none) === 0 && exitAt("90-check.mjs scan-forbidden", none) === 0 && exitAt("90-check.mjs records --close", none) === 0],
    // 86's pinned row.
    ["the gate subject moves 86's pinned row to the ten gate files, no more", exitAt(label, [SUBJECT.gateFold]) === 1 && rowAt(label, [SUBJECT.gateFold]).set.length === 10 && rowAt(label, [SUBJECT.gateFold]).set.every((l) => /^packages\/react\/test\/.* is reported as M against its base, not unchanged$/.test(l))],
    ["the hydration subject moves it to the eight hydration files, the lease subject to the lease alone, and the sweep subject to the one test it corrects", rowAt(label, [SUBJECT.hydrationFold]).set.length === 8 && setAt(label, [SUBJECT.lease]) === "packages/react/src/RegistryLease.ts is reported as M against its base, not unchanged" && setAt(label, [SUBJECT.sweep]) === "packages/react/test/ServerRender.test.tsx is reported as M against its base, not unchanged"],
    ["with the four subjects 86's pinned row holds twenty distinct files", rowAt(label, [SUBJECT.gateFold, SUBJECT.hydrationFold, SUBJECT.lease, SUBJECT.sweep]).set.length === 20 && new Set(rowAt(label, every).set).size === 20],
    ["86's pinned row run before its subject, judged after it, fails in both directions, and the reverse fails too", about(judgedAt(none, [SUBJECT.gateFold]), label).length === 1 && about(judgedAt([SUBJECT.gateFold], none), label).length === 1],
    ["86's pinned row passes in each of its states", [none, [SUBJECT.gateFold], [SUBJECT.hydrationFold], [SUBJECT.lease], [SUBJECT.sweep], every].every((have) => about(judgedAt(have, have), label).length === 0)],
    ["86's pinned row, with the gate subject, fails when a gate file is missing from the run, naming it", about(judgeLedger(at([SUBJECT.gateFold]).map((r) => (r.label === label ? { ...toRun(r), set: toRun(r).set.slice(1) } : toRun(r))), at([SUBJECT.gateFold])), label).join() === `${label}: missing reason "${rowAt(label, [SUBJECT.gateFold]).set[0]}"`],
    // 89's pinned row.
    ["the audit barrel subject moves 89's pinned row to the barrel line alone", setAt("89-pinned-check.mjs", [SUBJECT.auditBarrel]) === "packages/audit/src/index.ts: differs from its base text at line <n>"],
    ["the audit fold subject moves it to seven lines, the barrel line among them once, with the barrel subject as well", rowAt("89-pinned-check.mjs", [SUBJECT.auditFold]).set.length === 7 && rowAt("89-pinned-check.mjs", [SUBJECT.auditBarrel, SUBJECT.auditFold]).set.length === 7 && rowAt("89-pinned-check.mjs", [SUBJECT.auditFold]).set.includes("packages/audit/src/SequenceIntegrity.ts was deleted")],
    ["89's pinned row accepts any line number, and refuses a path no row names", about(judgeLedger(at([SUBJECT.auditFold]).map((r) => (r.label === "89-pinned-check.mjs" ? { ...toRun(r), set: toRun(r).set.map((l) => l.replace("at line 12", "at line 4096")) } : toRun(r))), at([SUBJECT.auditFold])), "89-pinned-check.mjs").length === 0 && about(judgeLedger(at([SUBJECT.auditFold]).map((r) => (r.label === "89-pinned-check.mjs" ? { ...toRun(r), set: [...toRun(r).set, "packages/audit/test/Other.test.ts: differs from its base text at line 3"] } : toRun(r))), at([SUBJECT.auditFold])), "89-pinned-check.mjs").length === 1],
    ["89's pinned row passes in each of its states", [none, [SUBJECT.auditBarrel], [SUBJECT.auditFold], [SUBJECT.auditBarrel, SUBJECT.auditFold]].every((have) => about(judgedAt(have, have), "89-pinned-check.mjs").length === 0)],
    ["89's pinned row run before the audit fold, judged after it, fails, and run after, judged before, fails too", about(judgedAt(none, [SUBJECT.auditFold]), "89-pinned-check.mjs").length === 1 && about(judgedAt([SUBJECT.auditFold], none), "89-pinned-check.mjs").length === 1],
    // 90's pinned row, and what it prints with --all-applied.
    ["the decoder subject moves 90's pinned rows, both runs, to the one decoder test line", ["90-pinned-check.mjs", "90-pinned-check.mjs --all-applied"].every((l) => setAt(l, [SUBJECT.decoderFold]) === "packages/core/test/PortSpan.test.ts: differs from its base text at line <n>" && exitAt(l, [SUBJECT.decoderFold]) === 1)],
    ["90's pinned row run after the decoder subject, judged before it, fails, naming the exit", about(judgedAt([SUBJECT.decoderFold], none), "90-pinned-check.mjs").join() === "90-pinned-check.mjs: expected exit 0, got exit 1: packages/core/test/PortSpan.test.ts: differs from its base text at line 12"],
    // The scan-forbidden rows.
    ["with no subject the scan-forbidden rows of 85 to 89 print the AGENTS.md line and 90's is clean", ["85", "86", "87", "88", "89"].every((n) => setAt(`${n}-check.mjs scan-forbidden`, none) === AGENTS_85_TO_89) && exitAt("90-check.mjs scan-forbidden", none) === 0],
    ["with the decoder subject each of the five adds the budget file line and 90's holds the two lines", ["85", "86", "87", "88", "89"].every((n) => setAt(`${n}-check.mjs scan-forbidden`, [SUBJECT.decoderFold]) === [AGENTS_85_TO_89, BUDGET_FILE].sort().join("|")) && setAt("90-check.mjs scan-forbidden", [SUBJECT.decoderFold]) === [AGENTS_90, BUDGET_FILE].sort().join("|")],
    ["a scan-forbidden row run before the decoder subject, judged after it, fails, and the reverse fails too, naming the line", ["85", "90"].every((n) => about(judgedAt(none, [SUBJECT.decoderFold]), `${n}-check.mjs scan-forbidden`).length >= 1 && about(judgedAt([SUBJECT.decoderFold], none), `${n}-check.mjs scan-forbidden`).length >= 1)],
    ["no scan-forbidden row is widened: a third line fails whichever way", ["85", "90"].every((n) => about(judgeLedger(at([SUBJECT.decoderFold]).map((r) => (r.label === `${n}-check.mjs scan-forbidden` ? { ...toRun(r), set: [...toRun(r).set, ".oxlintrc.json differs from phase_base: no budget moves"] } : toRun(r))), at([SUBJECT.decoderFold])), `${n}-check.mjs scan-forbidden`).join() === `${n}-check.mjs scan-forbidden: unexpected reason ".oxlintrc.json differs from phase_base: no budget moves"`)],
    // The three closes.
    ["with no subject 88's close prints its four lines and 89's four, and 90's is clean", setAt("88-check.mjs records --close", none) === [REVISION(README, "1.416", "1.414"), REVISION(TRACEABILITY, "1.335", "1.333"), REVISION(INVARIANTS, "1.235", "1.233"), COUNT(5, "one")].sort().join("|") && setAt("89-check.mjs records --close", none) === [REVISION(README, "1.416", "1.415"), REVISION(TRACEABILITY, "1.335", "1.334"), REVISION(INVARIANTS, "1.235", "1.234"), COUNT(4, "one")].sort().join("|") && exitAt("90-check.mjs records --close", none) === 0],
    ["the surface subject moves the README line of each close and no other", setAt("88-check.mjs records --close", [SUBJECT.surface]) === [REVISION(README, "1.417", "1.414"), REVISION(TRACEABILITY, "1.335", "1.333"), REVISION(INVARIANTS, "1.235", "1.233"), COUNT(5, "one")].sort().join("|") && setAt("90-check.mjs records --close", [SUBJECT.surface]) === REVISION(README, "1.417", "1.416")],
    ["the decision subject moves each close's traceability line, and the behaviours subject its invariants line", setAt("90-check.mjs records --close", [SUBJECT.decision]) === REVISION(TRACEABILITY, "1.336", "1.335") && setAt("89-check.mjs records --close", [SUBJECT.behaviours]).includes(REVISION("spec/behaviors/33-audit-pipeline.md", "1.34", "1.33")) && setAt("88-check.mjs records --close", [SUBJECT.behaviours]).includes(REVISION(INVARIANTS, "1.236", "1.233"))],
    ["the behaviours subject moves 90's close to the invariants and the port-calls lines, the overview subject to the overview line alone", setAt("90-check.mjs records --close", [SUBJECT.behaviours]) === [REVISION(INVARIANTS, "1.236", "1.235"), REVISION("spec/behaviors/30-port-calls.md", "1.27", "1.26")].sort().join("|") && setAt("90-check.mjs records --close", [SUBJECT.overview]) === REVISION("spec/overview.md", "1.148", "1.147")],
    ["the decision notes subject moves 89's close to the decision line, and no other close", setAt("89-check.mjs records --close", [SUBJECT.decisionNotes]).includes(REVISION("spec/decisions/110-an-archives-facts-are-computed-once.md", "1.5", "1.4")) && moved(SUBJECT.decisionNotes).join() === "89-check.mjs records --close"],
    ["the changeset subject moves each close's count by three, and 90's by three more lines naming each new file", setAt("88-check.mjs records --close", [SUBJECT.changesets]).includes(COUNT(8, "one")) && !setAt("88-check.mjs records --close", [SUBJECT.changesets]).includes(COUNT(5, "one")) && setAt("89-check.mjs records --close", [SUBJECT.changesets]).includes(COUNT(7, "one")) && rowAt("90-check.mjs records --close", [SUBJECT.changesets]).set.length === 4 && rowAt("90-check.mjs records --close", [SUBJECT.changesets]).set.includes(COUNT(6, 3)) && rowAt("90-check.mjs records --close", [SUBJECT.changesets]).set.filter((l) => l.includes("-named-barrel.md is not one of")).length === 3],
    ["with every subject 88's close holds the four moved lines, 89's six and 90's nine", rowAt("88-check.mjs records --close", every).set.length === 4 && rowAt("89-check.mjs records --close", every).set.length === 6 && rowAt("90-check.mjs records --close", every).set.length === 9 && new Set(rowAt("90-check.mjs records --close", every).set).size === 9],
    ["a close run at three changesets, judged at six, fails in both directions on the count line alone", about(judgedAt(none, [SUBJECT.changesets]), "89-check.mjs records --close").length === 2 && about(judgedAt([SUBJECT.changesets], none), "89-check.mjs records --close").length === 2],
    ["a close passes in each of its states", [none, [SUBJECT.surface], [SUBJECT.decision], [SUBJECT.amendments], [SUBJECT.behaviours], [SUBJECT.overview], [SUBJECT.decisionNotes], [SUBJECT.changesets], every].every((have) => ["87", "88", "89", "90"].every((n) => about(judgedAt(have, have), `${n}-check.mjs records --close`).length === 0))],
    ["a register line whose subject does not exist yet fails, naming the exit of a clean 90 close", about(judgedAt([SUBJECT.surface], none), "90-check.mjs records --close").join() === `90-check.mjs records --close: expected exit 0, got exit 1: ${REVISION(README, "1.417", "1.416")}`],
    ["a bump to a register one step too far fails, in both directions", about(judgeLedger(at([SUBJECT.decision]).map((r) => (r.label === "90-check.mjs records --close" ? { ...toRun(r), set: [REVISION(TRACEABILITY, "1.337", "1.335")] } : toRun(r))), at([SUBJECT.decision])), "90-check.mjs records --close").length === 2],
  ];
  const failed = cases.filter(([, passed]) => !passed).map(([name]) => name);
  if (failed.length > 0) fail([`self-test failed: ${failed.join("; ")}`]);
  console.log(`self-test: ${cases.length} passed`);
};

/** Copies what each earlier phase's scripts read into `OUT`, and lays out Phase 90's repository-shaped copy. */
const makeCopies = (root) => {
  for (const [name, files] of Object.entries(COPIED)) {
    const from = findPhase(root, PHASE_PREFIX[name]);
    rmSync(join(OUT, name), { recursive: true, force: true });
    const to = join(OUT, name, SUBDIRECTORY[name] ?? "");
    mkdirSync(to, { recursive: true });
    for (const file of files) copyFileSync(join(from, file), join(to, file));
    if (name === "p90") {
      for (const directory of P90_DIRECTORIES) cpSync(join(from, directory), join(to, directory), { recursive: true });
      for (const file of P90_LIBRARY) {
        mkdirSync(join(OUT, name, dirname(file)), { recursive: true });
        copyFileSync(join(root, file), join(OUT, name, file));
      }
      symlinkSync(join(root, "node_modules"), join(OUT, name, "node_modules"));
      execFileSync("git", ["init", "-q"], { cwd: join(OUT, name), stdio: "ignore" });
    }
  }
};

/** The runs, each from its copy: the repository root is the working directory, except for Phase 90's `--self-test`s. */
const runAll = (root, echo) => {
  const runs = [];
  for (const row of RUNS) {
    const cwd = cwdOf(row, root);
    const r = spawnSync("node", [join(OUT, row.copy, SUBDIRECTORY[row.copy] ?? "", row.file), ...row.args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const result = { label: row.label, status: r.status, line: lineOf(r.status, r.stdout, r.stderr), set: reasonsOf(r.stderr) };
    echo(result);
    runs.push(result);
  }
  return runs;
};

const measure = () => {
  const root = realpathSync(process.cwd());
  const rootReasons = judgeRoot(root);
  if (rootReasons.length > 0) fail(rootReasons);
  makeCopies(root);
  runAll(root, (r) => {
    const body = r.status === 0 ? `exit: 0, line: ${JSON.stringify(r.line)}` : `exit: ${r.status}, reasons: true, set: ${JSON.stringify(r.set)}`;
    console.log(`  { label: ${JSON.stringify(r.label)}, ${body} },`);
  });
};

const run = () => {
  const root = realpathSync(process.cwd());
  const rootReasons = judgeRoot(root);
  if (rootReasons.length > 0) fail(rootReasons);
  const here = findPhase(root, "QD-91-");
  const table = tableSubjects(readFileSync(join(here, "91-01-PLAN.md"), "utf8"));
  const base = JSON.parse(readFileSync(join(here, "91-mutation-base.json"), "utf8")).phase_base;
  const subjects = execFileSync("git", ["log", "--format=%s", `${base}..HEAD`], { cwd: root, encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter((s) => s !== "");
  const early = judgeSubjects(USED_SUBJECTS, table, subjects);
  if (early.length > 0) fail(early);
  makeCopies(root);
  const runs = runAll(root, (r) => console.log(`${r.label}: exit ${r.status}: ${r.line}`));
  const reasons = judgeLedger(runs, resolve(LEDGER, subjects));
  if (reasons.length > 0) fail(reasons);
  console.log(`earlier-checks: ${runs.length} runs, all match their rows`);
};

if (process.argv.includes("--self-test")) selfTest();
else if (process.argv.includes("--measure")) measure();
else run();
