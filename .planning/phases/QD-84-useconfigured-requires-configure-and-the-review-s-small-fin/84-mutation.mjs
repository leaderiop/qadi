// The phase's mutation record, over one group, `lens`, through `stryker.devtools.mjs`: the one model file the phase edits
// and measures, `LensSession.ts`, measured at the base and at the close. `record base|close <group>` reads the group's
// report and writes, under that group in `84-mutation-base.json` or `84-mutation-close.json`, each file's counts and its
// open (Survived, NoCoverage) and Ignored mutants; every group of one record is measured on one commit, and `record close
// <group> --restart` starts a fresh close record at the current head and names the groups it dropped, for a re-close after
// a fix commit (a base is never restarted). Every record names, in `unmeasured`, the files the phase edits that no Stryker
// config measures, with the reason. `compare` judges each group by the rule below.
// The rule (the removed-mutant rule): a score that fell only because killed mutants were deleted passes, a new open
// mutant (Survived or NoCoverage) never does, and neither does a new Ignored mutant. A file in `ABSOLUTE` is stricter: its
// close holds no open mutant whatever its base held. A mutant is located by its line number carried through `git diff
// -U0 <base head> <close head>`, never by the text of its line, and every comparison counts mutants as a multiset, so a
// second copy of one is a new one. `record` refuses a tree where a file it reads differs from HEAD, and a report its
// group's invocation did not make (its `config.mutate` is not the record's own file list), through a dispatcher the
// self-test drives. `--self-test` drives the comparison with planted records. From the repository root, after the group's
// INVOCATION (stdin closed, nothing else running):
//   node <this directory>/84-mutation.mjs record base lens
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
const DEVTOOLS = { config: "stryker.devtools.mjs", report: "reports/mutation-devtools/mutation.json" };
const MODEL_DIR = "packages/devtools/src/model/";
const LENS = `${MODEL_DIR}LensSession.ts`;
const GROUPS = {
  lens: { ...DEVTOOLS, files: [LENS] },
};
/** The paths a record reads: the group's files, the same for a base and a close (no file is renamed). */
const filesFor = (_name, group) => GROUPS[group].files;
/** Files whose close holds no open mutant, whatever the base held. */
const ABSOLUTE = [LENS];
/** Why no Stryker config measures a file under `src/react`. */
const REACT_WHY = "no Stryker config reaches src/react (stryker.devtools.mjs mutates src/model only); held by its tests, the characterisations and the 90% coverage threshold";
/** Files the phase edits that no Stryker config measures, written into every record so the gap is stated, not silent. */
const UNMEASURED = [
  "useConfigured.ts",
  "useDockModel.ts",
  "useTimeline.ts",
  "useDiagnostics.ts",
  "useLens.ts",
  "useStopNotice.ts",
  "QuestionsPanel.tsx",
  "DevtoolsDock.tsx",
  "StoppedBox.tsx",
  "DiagnosticsNotice.tsx",
  "TimelineNotice.tsx",
].map((name) => ({ file: `packages/devtools/src/react/${name}`, why: REACT_WHY }));
/** The invocation that makes the report of `name`'s record: the group's config over exactly the files `filesFor` names. */
const invocation = (group, name) => `pnpm exec stryker run ${GROUPS[group].config} --mutate ${filesFor(name, group).join(",")}`;
const DETECTED = new Set(["Killed", "Timeout"]);
const OPEN = new Set(["Survived", "NoCoverage"]);

const fail = (lines) => {
  console.error(lines.join("\n"));
  process.exit(1);
};
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 26 });

/** Why a record may not be made: a file it reads differs from HEAD, so its line numbers belong to no commit. */
export const dirtyReasons = (porcelain) => (porcelain.trim() === "" ? [] : [`record from a clean tree; these differ from HEAD:\n${porcelain.trimEnd()}`]);
/** The porcelain status of the files a group's record of `name` reads. */
const gitStatus = (group, name) => git("status", "--porcelain", "--", ...filesFor(name, group));

/** Why a report is not the one its record's invocation makes: it mutated other files than the record's own list. Pure. */
export const reportReasons = (report, files, name) => {
  const mutate = [...(report.config?.mutate ?? [])].sort().join(",");
  return mutate === [...files].sort().join(",") ? [] : [`${name} was not made by this group's invocation`];
};

/** The hunks of a `git diff -U0` of one file: removed base lines [a, a+b) and added close lines [c, c+d). */
export const hunks = (diffText) =>
  diffText
    .split("\n")
    .map((line) => /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line))
    .filter((m) => m !== null)
    .map((m) => ({ a: Number(m[1]), b: m[2] === undefined ? 1 : Number(m[2]), c: Number(m[3]), d: m[4] === undefined ? 1 : Number(m[4]) }));

/** A base line's number in the close file, or undefined when the diff removed or rewrote it. */
export const mapLine = (diffText) => {
  const hs = hunks(diffText);
  return (line) => {
    let offset = 0;
    for (const { a, b, d } of hs) {
      if (b > 0 && line >= a && line < a + b) return undefined;
      if (b > 0 ? line >= a + b : line > a) offset += d - b;
      else break;
    }
    return line + offset;
  };
};

/** An Ignored mutant's kind: what it replaces and with what, not where. */
const kind = (m) => `${m.mutator} ${m.replacement}`;
/**
 * Ignored mutants a close may hold beyond its base, per file and kind, each run by hand and Killed there: the group's
 * config spread with `ignoreStatic: false`, run with `--mutate <file>`. Empty at the base; an entry is added only when the
 * close has run such a mutant by hand and seen it Killed.
 */
const EXAMINED = {};

const key = (m, line = m.line) => [m.status, m.mutator, m.replacement, line, m.column].join("\u0000");
/** A multiset of mutant keys: key -> count. */
const bag = (mutants, toKey) => {
  const out = new Map();
  for (const m of mutants) {
    const k = toKey(m);
    if (k !== undefined) out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
};
/** The mutants of `mutants` beyond what `allowed` holds, copy by copy. */
const beyond = (mutants, toKey, allowed) => {
  const left = new Map(allowed);
  return mutants.filter((m) => {
    const k = toKey(m);
    const n = left.get(k) ?? 0;
    if (n > 0) {
      left.set(k, n - 1);
      return false;
    }
    return true;
  });
};

/** Each file's counts and its non-Killed mutants from a Stryker JSON report holding exactly `files`. */
const tally = (reportFile, files) => {
  const report = {};
  for (const [file, entry] of Object.entries(readJson(reportFile).files)) {
    report[isAbsolute(file) ? relative(process.cwd(), file) : file] = entry;
  }
  const held = Object.keys(report).sort().join(",");
  if (held !== [...files].sort().join(",")) fail([`${reportFile} holds ${held}, not exactly ${files.join(",")}`]);
  const out = {};
  for (const file of files) {
    if (report[file].source !== readFileSync(file, "utf8")) fail([`the report for ${file} is not the file on disk`]);
    const all = report[file].mutants.map((m) => ({ status: m.status, mutator: m.mutatorName, replacement: m.replacement, line: m.location.start.line, column: m.location.start.column }));
    const count = (status) => all.filter((m) => m.status === status).length;
    const detected = all.filter((m) => DETECTED.has(m.status)).length;
    const open = all.filter((m) => OPEN.has(m.status));
    const valid = detected + open.length;
    out[file] = { killed: count("Killed"), timeout: count("Timeout"), survived: count("Survived"), noCoverage: count("NoCoverage"), ignored: count("Ignored"), detected, valid, open, ignoredMutants: all.filter((m) => m.status === "Ignored") };
    console.log(`${file} ${detected}/${valid} survived ${out[file].survived} no coverage ${out[file].noCoverage} ignored ${out[file].ignored}`);
    for (const m of open) console.log(`  ${m.status} ${file}:${m.line} ${m.mutator} -> ${m.replacement}`);
  }
  return out;
};

/**
 * Every reason the close fails, given the two records and each file's `git diff -U0 <base head> <close head>`. Pure.
 * A fall in the score is a reason only when the file also has a new open mutant: a score that fell because the code
 * holding killed mutants was deleted passes, and any new Survived or NoCoverage mutant fails.
 */
export const judge = ({ base, close, diffs }, files, log = console.log, examined = EXAMINED, absolute = ABSOLUTE) => {
  const bad = [];
  for (const file of files) {
    const b = base.files[file];
    const c = close.files[file];
    if (b === undefined || c === undefined) {
      bad.push(`${file} is missing from a record`);
      continue;
    }
    const toClose = mapLine(diffs[file] ?? "");
    const atBase = (m) => {
      const line = toClose(m.line);
      return line === undefined ? undefined : key(m, line);
    };
    // Integer cross-multiplication, so no rounded float decides whether a score fell.
    const fell = c.detected * b.valid < b.detected * c.valid;
    const open = beyond(c.open, (x) => key(x), bag(b.open, atBase));
    if (fell && open.length > 0) bad.push(`${file} fell from ${b.detected}/${b.valid} to ${c.detected}/${c.valid}`);
    for (const m of open) bad.push(`${file}:${m.line} has a new ${m.status} mutant: ${m.mutator} -> ${m.replacement}`);
    // An absolute file holds no open mutant at its close, whatever its base held: a survivor the base carried is no excuse.
    if (absolute.includes(file)) {
      for (const m of c.open) if (!open.includes(m)) bad.push(`${file}:${m.line} has an open mutant an absolute file may not hold: ${m.status} ${m.mutator} -> ${m.replacement}`);
    }
    // An Ignored (static) mutant never runs, so where it sits tests nothing: a line the phase rewrites moves its static
    // arrow without adding a mutant, and no test can kill one. The rule is per kind: a file holds no more Ignored
    // mutants of a kind than its base did, plus what EXAMINED records as run by hand.
    const allowed = bag(b.ignoredMutants, kind);
    for (const [k, n] of Object.entries(examined[file] ?? {})) allowed.set(k, (allowed.get(k) ?? 0) + n);
    const fresh = beyond(c.ignoredMutants, kind, allowed);
    for (const m of fresh) bad.push(`${file}:${m.line} has a new Ignored mutant: ${m.mutator} -> ${m.replacement}`);
    for (const [k, n] of Object.entries(examined[file] ?? {})) {
      const grew = c.ignoredMutants.filter((x) => kind(x) === k).length - b.ignoredMutants.filter((x) => kind(x) === k).length;
      if (grew < n) bad.push(`${file} no longer holds the ${n} examined Ignored ${k} mutant(s) EXAMINED allows: remove the entry`);
    }
    log(`${file} ${b.detected}/${b.valid} -> ${c.detected}/${c.valid}, survived ${b.survived} -> ${c.survived}, no coverage ${b.noCoverage} -> ${c.noCoverage}, ignored ${b.ignored} -> ${c.ignored} (${fresh.length} new)${fell && open.length === 0 ? ", killed mutants removed" : ""}`);
  }
  return bad;
};

/** The arguments of the diff that carries a mutant's line from the base head to the close head. Pure. */
export const diffArgs = (baseHead, closeHead, path) => ["diff", "-U0", baseHead, closeHead, "--", path];
/** Every reason one group fails, given its two records and `diffOf(...diffArgs)`, which reads one file's diff. Pure. */
export const judgeGroup = (group, base, close, diffOf, log = console.log) => {
  const files = GROUPS[group].files;
  const diffs = Object.fromEntries(files.map((file) => [file, diffOf(...diffArgs(base.head, close.head, file))]));
  return judge({ base, close, diffs }, files, log);
};

/** Every reason a close-only file fails: it has no base, so it may hold no open mutant (Ignored ones are allowed). Pure. */
export const judgeNew = ({ close }, files, log = console.log) => {
  const bad = [];
  for (const file of files) {
    const c = close.files[file];
    if (c === undefined) {
      bad.push(`${file} is missing from the close record`);
      continue;
    }
    for (const m of c.open) bad.push(`${file}:${m.line} is new and has a ${m.status} mutant: ${m.mutator} -> ${m.replacement}`);
    log(`${file} ${c.detected}/${c.valid}, survived ${c.survived}, no coverage ${c.noCoverage}, ignored ${c.ignored}`);
  }
  return bad;
};

/**
 * The record a `record` writes into, the reasons it may not, and the groups a restart dropped. Pure. `restart` is for a
 * close only: it keeps no group of the old record, so a re-close after a fix commit is measured on one commit again.
 */
export const heldFor = (held, name, group, head, restart) => {
  if (restart && name !== "close") return { held, bad: ["--restart re-measures a close, never a base"], dropped: [] };
  if (restart) return { held: { phase: "84", unmeasured: UNMEASURED, groups: {} }, bad: [], dropped: Object.keys(held.groups).filter((other) => other !== group) };
  const out = `${D}84-mutation-${name}.json`;
  const bad = Object.entries(held.groups)
    .filter(([other, entry]) => other !== group && entry.head !== head)
    .map(([other, entry]) => `${out} holds ${other} measured on ${entry.head}, not ${head}: every group of a record is measured on one commit`);
  return { held, bad, dropped: [] };
};

const record = async (name, group, restart) => {
  const { config: CONFIG, report: REPORT, closeOnly } = GROUPS[group];
  const FILES = filesFor(name, group);
  if (name === "base" && closeOnly === true) return usage();
  const config = (await import(pathToFileURL(resolve(CONFIG)).href)).default;
  if (config.jsonReporter?.fileName !== REPORT) fail([`${CONFIG} no longer reports to the report this reads`]);
  if (config.ignoreStatic !== true) fail([`${CONFIG} no longer sets ignoreStatic: true`]);
  const refused = reportReasons(readJson(REPORT), FILES, REPORT);
  if (refused.length > 0) fail(refused);
  const head = git("rev-parse", "HEAD").trim();
  const out = `${D}84-mutation-${name}.json`;
  const { held, bad, dropped } = heldFor(existsSync(out) ? readJson(out) : { phase: "84", unmeasured: UNMEASURED, groups: {} }, name, group, head, restart);
  if (bad.length > 0) fail(bad);
  if (dropped.length > 0) console.log(`restarted the close record at ${head}; re-measure: ${dropped.join(", ")}`);
  const files = tally(REPORT, FILES);
  held.groups[group] = { head, invocation: invocation(group, name), files };
  writeFileSync(out, `${JSON.stringify(held, null, 1)}\n`);
  console.log(`wrote ${group} into ${out}`);
};

const compare = () => {
  const bad = [];
  const baseRecord = readJson(`${D}84-mutation-base.json`);
  const closeRecord = readJson(`${D}84-mutation-close.json`);
  for (const group of Object.keys(GROUPS)) {
    const { files, closeOnly } = GROUPS[group];
    const base = baseRecord.groups[group];
    const close = closeRecord.groups[group];
    if (closeOnly === true) {
      if (close === undefined) {
        bad.push(`the ${group} group is missing from the close record`);
        continue;
      }
      if (close.invocation !== invocation(group, "close")) bad.push(`a ${group} record was not made by the recorded invocation`);
      bad.push(...judgeNew({ close }, files));
      continue;
    }
    if (base === undefined || close === undefined) {
      bad.push(`the ${group} group is missing from a record`);
      continue;
    }
    if (base.invocation !== invocation(group, "base") || close.invocation !== invocation(group, "close")) bad.push(`a ${group} record was not made by the recorded invocation`);
    bad.push(...judgeGroup(group, base, close, (...args) => git(...args)));
  }
  if (bad.length > 0) fail(bad);
  console.log("no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed mutants");
};

const selfTest = () => {
  const m = (status, line, extra = {}) => ({ status, mutator: "StringLiteral", replacement: '""', line, column: 4, ...extra });
  const file = (detected, valid, open = [], ignoredMutants = []) => ({
    detected,
    valid,
    open,
    survived: open.filter((x) => x.status === "Survived").length,
    noCoverage: open.filter((x) => x.status === "NoCoverage").length,
    ignored: ignoredMutants.length,
    ignoredMutants,
  });
  const F = LENS;
  // Base: one survivor on line 10, a static mutant Ignored on line 3; the close rewrote lines 9 to 11 into 9 to 10, so
  // line 3 stays line 3 and line 20 becomes line 19.
  const diffs = { [F]: "@@ -9,3 +9,2 @@\n-a\n-b\n-c\n+x\n+y\n" };
  const base = { files: { [F]: file(42, 43, [m("Survived", 20)], [m("Ignored", 3)]) } };
  const closeOf = (f) => ({ files: { [F]: f } });
  const cases = [
    ["an unchanged close passes", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3)])), 0],
    ["a close that kills the survivor passes", closeOf(file(43, 43, [], [m("Ignored", 3)])), 0],
    ["a score below the base fails", closeOf(file(41, 43, [m("Survived", 19), m("Survived", 30)], [m("Ignored", 3)])), 2],
    ["a survivor on a line the diff wrote is new and fails", closeOf(file(42, 43, [m("Survived", 9)], [m("Ignored", 3)])), 1],
    ["a survivor left where the base had it, unmapped, fails", closeOf(file(42, 43, [m("Survived", 20)], [m("Ignored", 3)])), 1],
    ["a second copy of the base survivor fails", closeOf(file(84, 86, [m("Survived", 19), m("Survived", 19)], [m("Ignored", 3)])), 1],
    ["a second copy of a base Ignored mutant fails", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 3)])), 1],
    ["a new Ignored mutant fails", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9)])), 1],
    ["an Ignored mutant moved by a rewrite is not new", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 9)])), 0],
    ["a file missing from the close fails", { files: {} }, 1],
    ["a new NoCoverage mutant fails while the score holds", closeOf(file(85, 87, [m("Survived", 19), m("NoCoverage", 30)], [m("Ignored", 3)])), 1],
  ];
  // The first cases test the removed-mutant rule on a file that is not absolute (judge's last argument is empty);
  // the absolute bar is driven below with LensSession.ts's own entry.
  let passed = 0;
  const planted = ` M ${F}\n`;
  if (dirtyReasons(planted).length !== 1 || !dirtyReasons(planted)[0].includes(F) || dirtyReasons("").length !== 0) fail(["self-test FAILED: a modified file does not refuse a record"]);
  passed++;
  for (const [name, close, want] of cases) {
    const got = judge({ base, close, diffs }, [F], () => {}, {}, []).length;
    if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
    passed++;
  }
  // An examined allowance admits exactly its count of Ignored mutants of its kind, and a stale one fails.
  for (const [name, close, want] of [
    ["an examined Ignored mutant is not new", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9)])), 0],
    ["a second Ignored mutant beyond the examined one fails", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9), m("Ignored", 11)])), 1],
    ["an examined allowance the close no longer needs fails", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3)])), 1],
  ]) {
    const got = judge({ base, close, diffs }, [F], () => {}, { [F]: { [kind(m("Ignored", 3))]: 1 } }, []).length;
    if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
    passed++;
  }
  // A fall with no new open mutant: the killed mutants went with the code that held them.
  {
    const logged = [];
    const got = judge({ base, close: closeOf(file(30, 31, [m("Survived", 19)], [m("Ignored", 3)])), diffs }, [F], (line) => logged.push(line), {}, []).length;
    if (got !== 0 || !logged.join("\n").includes("killed mutants removed")) fail([`self-test FAILED: a fall with no new open mutant passes as killed mutants removed: ${got} reasons, logged ${JSON.stringify(logged)}`]);
    passed++;
  }
  // A close-only file has no base: an open mutant fails, an Ignored one and a file with none pass.
  for (const [name, close, want] of [
    ["a close-only file with no open mutant passes", closeOf(file(10, 10, [], [m("Ignored", 3)])), 0],
    ["a close-only file with a Survived mutant fails", closeOf(file(9, 10, [m("Survived", 5)])), 1],
    ["a close-only file missing from the close fails", { files: {} }, 1],
  ]) {
    const got = judgeNew({ close }, [F], () => {}).length;
    if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
    passed++;
  }
  // The record a record writes into: one beside a group measured on another commit is refused, a restart of a close
  // drops the old record and names what it dropped, and a base is never restarted.
  const held = { phase: "84", groups: { other: { head: "a" } } };
  for (const [name, got, want] of [
    ["a record beside a group measured on another commit is refused", heldFor(held, "base", "lens", "b", false).bad.length, 1],
    ["a record beside a group measured on the same commit keeps it", heldFor(held, "base", "lens", "a", false).bad.length + (heldFor(held, "base", "lens", "a", false).held.groups.other === undefined ? 1 : 0), 0],
    ["--restart on a close starts a fresh record and names what it dropped", (() => { const r = heldFor(held, "close", "lens", "b", true); return r.bad.length + Object.keys(r.held.groups).length + (r.dropped.join() === "other" ? 0 : 1); })(), 0],
    ["--restart on a base is refused", heldFor(held, "base", "lens", "b", true).bad.length, 1],
  ]) {
    if (got !== want) fail([`self-test FAILED: ${name}: ${got}, wanted ${want}`]);
    passed++;
  }
  // The dispatcher with this file's own table, every mode's run replaced: a record from a modified tree is refused
  // before its run, a clean one runs, and compare never reads the status.
  for (const [mode, status, want] of [
    ["record", planted, "refused"],
    ["record", "", "ran"],
    ["compare", planted, "ran"],
  ]) {
    let got = "nothing";
    const stubs = Object.fromEntries(Object.entries(MODES).map(([k, v]) => [k, { ...v, run: () => { got = "ran"; } }]));
    dispatch(stubs, mode, ["base", "lens"], () => status, () => { got = "refused"; });
    if (got !== want) fail([`self-test FAILED: ${mode} on ${JSON.stringify(status)}: ${got}, wanted ${want}`]);
    passed++;
  }
  for (const group of Object.keys(GROUPS).filter((g) => GROUPS[g].closeOnly !== true)) {
    for (const name of ["base", "close"]) {
      const asked = [];
      dispatch(MODES, "record", [name, group], (g, n) => { asked.push(`${n}:${g}`); return planted; }, () => {});
      if (asked.join() !== `${name}:${group}`) fail([`self-test FAILED: a ${group} ${name} record read the status of ${asked.join() || "nothing"}`]);
      passed++;
    }
  }
  if (!gitStatus.toString().includes("...filesFor(name, group)")) fail(["self-test FAILED: the status reader does not read the files a record reads"]);
  passed++;
  // One group, one file, no rename: a base and a close read the same path, and the diff names that path alone.
  if (filesFor("base", "lens").join() !== F || filesFor("close", "lens").join() !== F) fail(["self-test FAILED: filesFor does not name LensSession.ts for a base and a close"]);
  passed++;
  if (invocation("lens", "base") !== `pnpm exec stryker run stryker.devtools.mjs --mutate ${F}` || invocation("lens", "close") !== invocation("lens", "base")) fail(["self-test FAILED: the base and close invocations do not name LensSession.ts alone"]);
  passed++;
  if (diffArgs("b", "c", F).join(" ") !== `diff -U0 b c -- ${F}`) fail(["self-test FAILED: the diff is not a plain diff over LensSession.ts"]);
  passed++;
  if (Object.keys(GROUPS).join() !== "lens" || ABSOLUTE.join() !== F || UNMEASURED.length !== 11 || UNMEASURED.some((u) => !u.file.startsWith("packages/devtools/src/react/") || u.why.length === 0)) fail(["self-test FAILED: the group, ABSOLUTE or UNMEASURED is not the lens session and the eleven src/react files"]);
  passed++;
  {
    const baseRec = { head: "b", files: { [F]: file(42, 43, [m("Survived", 20)]) } };
    const closeRec = (head, f) => ({ head, files: { [F]: f } });
    const move = "@@ -9,3 +9,2 @@\n-a\n-b\n-c\n+x\n+y\n";
    const run = (rec, diff = move) => judgeGroup("lens", baseRec, rec, () => diff, () => {});
    // The planted diff maps base line 20 to close line 19; the base survivor sits there, and LensSession.ts is absolute.
    for (const [name, rec, want] of [
      ["a close with no open mutant passes against its base entry", closeRec("c", file(42, 43)), 0],
      ["a base survivor carried to the same line still fails the absolute bar", closeRec("c", file(42, 43, [m("Survived", 19)])), 1],
      ["a new Survived mutant fails", closeRec("c", file(42, 43, [m("Survived", 19), m("Survived", 40)])), 2],
      ["a close where move's killed mutants are gone passes", closeRec("c", file(30, 30)), 0],
      ["a close with one new Ignored mutant fails", closeRec("c", file(42, 42, [], [m("Ignored", 5)])), 1],
    ]) {
      const got = run(rec).length;
      if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
      passed++;
    }
    // Without ABSOLUTE the base survivor mapped onto the close is not new: the absolute bar is what fails it above.
    const same = judge({ base: { files: { [F]: file(42, 43, [m("Survived", 20)]) } }, close: { files: { [F]: file(42, 43, [m("Survived", 19)]) } }, diffs: { [F]: move } }, [F], () => {}, {}, []).length;
    if (same !== 0) fail([`self-test FAILED: with no absolute file the base survivor mapped onto the close passes: ${same}`]);
    passed++;
  }
  // The report guard: a report made by another invocation is refused, whichever record it is offered to.
  for (const [name, config, files, want] of [
    ["a report made with LensSession.ts is accepted", { mutate: [F] }, filesFor("base", "lens"), 0],
    ["a report listed in another order is accepted", { mutate: [F, "x.ts"] }, [F, "x.ts"].reverse(), 0],
    ["a report whose mutate names another file is refused by record", { mutate: [`${MODEL_DIR}DockModel.ts`] }, filesFor("base", "lens"), 1],
    ["a report with one file more is refused", { mutate: [F, "x.ts"] }, filesFor("base", "lens"), 1],
    ["a report with no config is refused", undefined, filesFor("base", "lens"), 1],
  ]) {
    const got = reportReasons({ config }, files, "report").length;
    if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
    passed++;
  }
  console.log(`self-test: ${passed} passed`);
};

/** Each mode, whether it refuses a tree whose read files differ from HEAD, and its run. */
const MODES = {
  record: { clean: true, run: (name, group, flag) => ((name === "base" || name === "close") && Object.hasOwn(GROUPS, group) && (flag === undefined || flag === "--restart") ? record(name, group, flag === "--restart") : usage()) },
  compare: { clean: false, run: () => compare() },
  "--self-test": { clean: false, run: () => selfTest() },
};
const usage = () => fail(["usage: node 84-mutation.mjs record base|close lens [--restart], compare, or --self-test"]);
/** Runs `mode`, refusing first when it records and `status` shows a read file modified. */
function dispatch(modes, mode, args, status, refuse) {
  const entry = Object.hasOwn(modes, mode) ? modes[mode] : undefined;
  if (entry === undefined) return usage();
  if (entry.clean) {
    if (!Object.hasOwn(GROUPS, args[1] ?? "")) return usage();
    const bad = dirtyReasons(status(args[1], args[0]));
    if (bad.length > 0) return refuse(bad);
  }
  return entry.run(...args);
}

const [mode, ...args] = process.argv.slice(2);
await dispatch(MODES, mode, args, gitStatus, fail);
