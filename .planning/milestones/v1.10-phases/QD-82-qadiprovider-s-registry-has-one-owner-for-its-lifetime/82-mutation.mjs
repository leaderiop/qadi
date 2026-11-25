// The phase's mutation record, over two groups through `stryker.react.mjs`: `react`, the four files that config mutates
// today (`DecisionOutcome.ts`, `QuestionBook.ts`, `HydrationEvent.ts` and `SweepScheduler.ts`), measured at the base and
// at the close; and `lease`, `RegistryLease.ts`, which has no base and is judged absolutely at the close, run with
// `--disableBail` so every killing test of a mutant is listed. `record base|close <group>` reads the group's report and
// writes, under that group in `82-mutation-base.json` or `82-mutation-close.json`, each file's counts and its open
// (Survived, NoCoverage) and Ignored mutants; every group of one record is measured on one commit, and `record close
// <group> --restart` starts a fresh close record at the current head and names the groups it dropped, for a re-close after
// a fix commit (a base is never restarted). `probe <group>` judges the group's report as its close would and writes
// nothing. Every record names, in `unmeasured`, the files the phase edits that no Stryker config reaches, with the reason.
// `compare` judges each group by the rule below.
// The rule (the removed-mutant rule): a score that fell only because killed mutants were deleted passes, a new open
// mutant (Survived or NoCoverage) never does, and neither does a new Ignored mutant. A close-only file is absolute: no open
// mutant, no Ignored mutant, no Timeout, and every Killed mutant has a killer among the tests of the group's `killers` file.
// A mutant is located by its line number carried through `git diff -U0 <base head> <close head>`, never by the text of its
// line, and every comparison counts mutants as a multiset, so a second copy of one is a new one. `record` refuses a tree
// where a file it reads differs from HEAD, and a report that its group's invocation did not make, through a dispatcher the
// self-test drives. `--self-test` drives the comparison with planted records. From the repository root, after the group's
// INVOCATION (stdin closed, nothing else running):
//   node <this directory>/82-mutation.mjs record base react
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
const REACT = { config: "stryker.react.mjs", report: "reports/mutation-react/mutation.json" };
const REACT_FILES = ["DecisionOutcome", "QuestionBook", "HydrationEvent", "SweepScheduler"].map((name) => `packages/react/src/${name}.ts`);
const GROUPS = {
  react: { ...REACT, files: REACT_FILES },
  lease: { ...REACT, files: ["packages/react/src/RegistryLease.ts"], closeOnly: true, disableBail: true, killers: "packages/react/test/RegistryLease.test.ts" },
};
/** Files the phase edits that no Stryker config reaches, written into every record so the gap is stated, not silent. */
const UNMEASURED = [{ file: "packages/react/src/QadiProvider.tsx", why: "renders; its lifetime logic is RegistryLease.ts, and its behaviour is pinned by the rendered tests" }];
const invocation = (group) => `pnpm exec stryker run ${GROUPS[group].config} --mutate ${GROUPS[group].files.join(",")}${GROUPS[group].disableBail === true ? " --disableBail" : ""}`;
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
/** The porcelain status of the files a group's record reads. */
const gitStatus = (group) => git("status", "--porcelain", "--", ...GROUPS[group].files);

/** Why a report is not the one its group's invocation makes: it mutated other files, or ran with the other bail setting. Pure. */
export const reportReasons = (report, group, name) => {
  const mutate = [...(report.config?.mutate ?? [])].sort().join(",");
  const bailOk = (report.config?.disableBail === true) === (group.disableBail === true);
  return mutate === [...group.files].sort().join(",") && bailOk ? [] : [`${name} was not made by this group's invocation`];
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

const relPath = (file) => (isAbsolute(file) ? relative(process.cwd(), file) : file);

/**
 * Each file's counts and its non-Killed mutants from a parsed Stryker report holding exactly `files`, and the reasons it
 * cannot be read. With `killers`, each Killed mutant's killing test files are read from `testFiles`: a Killed mutant with no
 * killer in the `killers` file is listed in `outside`, and a Timeout in `timeouts`. Pure; `source` is checked by `tally`.
 */
export const classify = (report, files, killers) => {
  const byFile = {};
  for (const [file, entry] of Object.entries(report.files)) byFile[relPath(file)] = entry;
  const held = Object.keys(byFile).sort().join(",");
  if (held !== [...files].sort().join(",")) return { out: {}, bad: [`the report holds ${held}, not exactly ${files.join(",")}`] };
  const testOf = new Map();
  for (const [testFile, entry] of Object.entries(report.testFiles ?? {})) for (const t of entry.tests ?? []) testOf.set(String(t.id), relPath(testFile));
  if (killers !== undefined && testOf.size === 0) return { out: {}, bad: ["the report names no test files"] };
  const out = {};
  for (const file of files) {
    const all = byFile[file].mutants.map((m) => ({ status: m.status, mutator: m.mutatorName, replacement: m.replacement, line: m.location.start.line, column: m.location.start.column, killedBy: m.killedBy ?? [] }));
    const strip = ({ killedBy: _killedBy, ...rest }) => rest;
    const count = (status) => all.filter((m) => m.status === status).length;
    const detected = all.filter((m) => DETECTED.has(m.status)).length;
    const open = all.filter((m) => OPEN.has(m.status)).map(strip);
    const valid = detected + open.length;
    out[file] = { killed: count("Killed"), timeout: count("Timeout"), survived: count("Survived"), noCoverage: count("NoCoverage"), ignored: count("Ignored"), detected, valid, open, ignoredMutants: all.filter((m) => m.status === "Ignored").map(strip) };
    if (killers !== undefined) {
      out[file].timeouts = all.filter((m) => m.status === "Timeout").map(strip);
      out[file].outside = all.filter((m) => m.status === "Killed" && !m.killedBy.some((id) => testOf.get(String(id)) === killers)).map(strip);
    }
  }
  return { out, bad: [] };
};

/** Each file's counts and its non-Killed mutants from a Stryker JSON report holding exactly `files`. */
const tally = (reportFile, files, killers) => {
  const report = readJson(reportFile);
  const { out, bad } = classify(report, files, killers);
  if (bad.length > 0) fail(bad.map((line) => `${reportFile}: ${line}`));
  for (const file of files) {
    const entry = Object.entries(report.files).find(([name]) => relPath(name) === file)[1];
    if (entry.source !== readFileSync(file, "utf8")) fail([`the report for ${file} is not the file on disk`]);
    console.log(`${file} ${out[file].detected}/${out[file].valid} survived ${out[file].survived} no coverage ${out[file].noCoverage} ignored ${out[file].ignored}`);
    for (const m of out[file].open) console.log(`  ${m.status} ${file}:${m.line} ${m.mutator} -> ${m.replacement}`);
  }
  return out;
};

/**
 * Every reason the close fails, given the two records and each file's `git diff -U0 <base head> <close head>`. Pure.
 * A fall in the score is a reason only when the file also has a new open mutant: a score that fell because the code
 * holding killed mutants was deleted passes, and any new Survived or NoCoverage mutant fails.
 */
export const judge = ({ base, close, diffs }, files, log = console.log, examined = EXAMINED) => {
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

/**
 * Every reason a close-only file fails: it has no base, so it is judged absolutely. It may hold no open mutant, no Ignored
 * mutant and no Timeout, and every Killed mutant must have a killer among the tests of `killers`. Pure.
 */
export const judgeNew = ({ close }, files, log = console.log, killers = GROUPS.lease.killers) => {
  const bad = [];
  for (const file of files) {
    const c = close.files[file];
    if (c === undefined) {
      bad.push(`${file} is missing from the close record`);
      continue;
    }
    for (const m of c.open) bad.push(`${file}:${m.line} is new and has a ${m.status} mutant: ${m.mutator} -> ${m.replacement}`);
    for (const m of c.ignoredMutants) bad.push(`${file}:${m.line} is new and Ignored: ${m.mutator} -> ${m.replacement}`);
    for (const m of c.timeouts ?? []) bad.push(`${file}:${m.line} timed out: a test must kill it`);
    for (const m of c.outside ?? []) bad.push(`${file}:${m.line} is killed only by tests outside ${killers}`);
    log(`${file} ${c.detected}/${c.valid}, survived ${c.survived}, no coverage ${c.noCoverage}, ignored ${c.ignored}, timeout ${c.timeout}`);
  }
  return bad;
};

/**
 * The record a `record` writes into, the reasons it may not, and the groups a restart dropped. Pure. `restart` is for a
 * close only: it keeps no group of the old record, so a re-close after a fix commit is measured on one commit again.
 */
export const heldFor = (held, name, group, head, restart) => {
  if (restart && name !== "close") return { held, bad: ["--restart re-measures a close, never a base"], dropped: [] };
  if (restart) return { held: { phase: "82", unmeasured: UNMEASURED, groups: {} }, bad: [], dropped: Object.keys(held.groups).filter((other) => other !== group) };
  const out = `${D}82-mutation-${name}.json`;
  const bad = Object.entries(held.groups)
    .filter(([other, entry]) => other !== group && entry.head !== head)
    .map(([other, entry]) => `${out} holds ${other} measured on ${entry.head}, not ${head}: every group of a record is measured on one commit`);
  return { held, bad, dropped: [] };
};

const record = async (name, group, restart) => {
  const { config: CONFIG, report: REPORT, files: FILES, closeOnly, killers } = GROUPS[group];
  if (name === "base" && closeOnly === true) return usage();
  const config = (await import(pathToFileURL(resolve(CONFIG)).href)).default;
  if (config.jsonReporter?.fileName !== REPORT) fail([`${CONFIG} no longer reports to the report this reads`]);
  if (config.ignoreStatic !== true) fail([`${CONFIG} no longer sets ignoreStatic: true`]);
  const refused = reportReasons(readJson(REPORT), GROUPS[group], REPORT);
  if (refused.length > 0) fail(refused);
  const head = git("rev-parse", "HEAD").trim();
  const out = `${D}82-mutation-${name}.json`;
  const { held, bad, dropped } = heldFor(existsSync(out) ? readJson(out) : { phase: "82", unmeasured: UNMEASURED, groups: {} }, name, group, head, restart);
  if (bad.length > 0) fail(bad);
  if (dropped.length > 0) console.log(`restarted the close record at ${head}; re-measure: ${dropped.join(", ")}`);
  const files = tally(REPORT, FILES, killers);
  held.groups[group] = { head, invocation: invocation(group), files };
  writeFileSync(out, `${JSON.stringify(held, null, 1)}\n`);
  console.log(`wrote ${group} into ${out}`);
};

/** The reasons a group's report fails as its close would judge it, writing nothing. */
const probe = (group) => {
  const { report: REPORT, files, closeOnly, killers } = GROUPS[group];
  const bad = reportReasons(readJson(REPORT), GROUPS[group], REPORT);
  if (bad.length > 0) fail(bad);
  const close = { files: tally(REPORT, files, killers) };
  if (closeOnly === true) bad.push(...judgeNew({ close }, files, console.log, killers));
  else {
    const base = readJson(`${D}82-mutation-base.json`).groups[group];
    if (base === undefined) fail([`the ${group} group is missing from the base record`]);
    const diffs = Object.fromEntries(files.map((file) => [file, git("diff", "-U0", base.head, "--", file)]));
    bad.push(...judge({ base, close, diffs }, files));
  }
  if (bad.length > 0) fail(bad);
  console.log(`probe ${group}: the report passes as its close would judge it`);
};

const compare = () => {
  const bad = [];
  const baseRecord = readJson(`${D}82-mutation-base.json`);
  const closeRecord = readJson(`${D}82-mutation-close.json`);
  for (const group of Object.keys(GROUPS)) {
    const { files, closeOnly, killers } = GROUPS[group];
    const base = baseRecord.groups[group];
    const close = closeRecord.groups[group];
    if (closeOnly === true) {
      if (close === undefined) {
        bad.push(`the ${group} group is missing from the close record`);
        continue;
      }
      if (close.invocation !== invocation(group)) bad.push(`a ${group} record was not made by the recorded invocation`);
      bad.push(...judgeNew({ close }, files, console.log, killers));
      continue;
    }
    if (base === undefined || close === undefined) {
      bad.push(`the ${group} group is missing from a record`);
      continue;
    }
    if (base.invocation !== invocation(group) || close.invocation !== invocation(group)) bad.push(`a ${group} record was not made by the recorded invocation`);
    const diffs = Object.fromEntries(files.map((file) => [file, git("diff", "-U0", base.head, close.head, "--", file)]));
    bad.push(...judge({ base, close, diffs }, files));
  }
  if (bad.length > 0) fail(bad);
  console.log("no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed mutants");
};

const selfTest = () => {
  const m = (status, line, extra = {}) => ({ status, mutator: "StringLiteral", replacement: '""', line, column: 4, ...extra });
  const file = (detected, valid, open = [], ignoredMutants = [], extra = {}) => ({
    detected,
    valid,
    open,
    survived: open.filter((x) => x.status === "Survived").length,
    noCoverage: open.filter((x) => x.status === "NoCoverage").length,
    ignored: ignoredMutants.length,
    ignoredMutants,
    ...extra,
  });
  const F = "packages/react/src/QuestionBook.ts";
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
  let passed = 0;
  const planted = ` M ${F}\n`;
  if (dirtyReasons(planted).length !== 1 || !dirtyReasons(planted)[0].includes(F) || dirtyReasons("").length !== 0) fail(["self-test FAILED: a modified file does not refuse a record"]);
  passed++;
  for (const [name, close, want] of cases) {
    const got = judge({ base, close, diffs }, [F], () => {}, {}).length;
    if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
    passed++;
  }
  // An examined allowance admits exactly its count of Ignored mutants of its kind, and a stale one fails.
  for (const [name, close, want] of [
    ["an examined Ignored mutant is not new", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9)])), 0],
    ["a second Ignored mutant beyond the examined one fails", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9), m("Ignored", 11)])), 1],
    ["an examined allowance the close no longer needs fails", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3)])), 1],
  ]) {
    const got = judge({ base, close, diffs }, [F], () => {}, { [F]: { [kind(m("Ignored", 3))]: 1 } }).length;
    if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
    passed++;
  }
  // A fall with no new open mutant: the killed mutants went with the code that held them.
  {
    const logged = [];
    const got = judge({ base, close: closeOf(file(30, 31, [m("Survived", 19)], [m("Ignored", 3)])), diffs }, [F], (line) => logged.push(line), {}).length;
    if (got !== 0 || !logged.join("\n").includes("killed mutants removed")) fail([`self-test FAILED: a fall with no new open mutant passes as killed mutants removed: ${got} reasons, logged ${JSON.stringify(logged)}`]);
    passed++;
  }
  // A close-only file has no base and is absolute: an open mutant, an Ignored one, a Timeout and a Killed mutant killed only
  // outside the killers file each fail; a file with none passes.
  for (const [name, close, want] of [
    ["a close-only file with nothing open, Ignored, timed out or outside passes", closeOf(file(10, 10)), 0],
    ["a close-only file with a Survived mutant fails", closeOf(file(9, 10, [m("Survived", 5)])), 1],
    ["a close-only file with an Ignored mutant fails", closeOf(file(10, 10, [], [m("Ignored", 3)])), 1],
    ["a close-only file with a Timeout fails", closeOf(file(10, 10, [], [], { timeouts: [m("Timeout", 7)] })), 1],
    ["a close-only file with a mutant killed only outside its tests fails", closeOf(file(10, 10, [], [], { outside: [m("Killed", 8)] })), 1],
    ["a close-only file missing from the close fails", { files: {} }, 1],
  ]) {
    const got = judgeNew({ close }, [F], () => {}).length;
    if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
    passed++;
  }
  // The report a close-only group reads, planted: a mutant killed by a RegistryLease.test.ts test (alone, or beside a rendered
  // test) has a killer in the group's tests, one killed only by a rendered test has none, and a report with no testFiles
  // cannot be read.
  {
    const L = GROUPS.lease.files[0];
    const K = GROUPS.lease.killers;
    const R = "packages/react/test/QadiProvider.lifetime.test.tsx";
    const raw = (status, line, killedBy) => ({ status, mutatorName: "StringLiteral", replacement: '""', location: { start: { line, column: 4 } }, killedBy });
    const report = (mutants, testFiles = { [K]: { tests: [{ id: "1" }] }, [R]: { tests: [{ id: "2" }] } }) => ({ files: { [L]: { source: "", mutants } }, testFiles });
    const verdict = (rep) => {
      const read = classify(rep, [L], K);
      return read.bad.length > 0 ? read.bad : judgeNew({ close: { files: read.out } }, [L], () => {}, K);
    };
    for (const [name, rep, want] of [
      ["a Killed mutant killed by a RegistryLease.test.ts test passes", report([raw("Killed", 5, ["1"])]), 0],
      ["a Killed mutant killed by a RegistryLease.test.ts test and a rendered test passes", report([raw("Killed", 5, ["1", "2"])]), 0],
      ["a Killed mutant killed only by a rendered test fails", report([raw("Killed", 5, ["2"])]), 1],
      ["a Killed mutant with no killer fails", report([raw("Killed", 5, [])]), 1],
      ["an Ignored mutant in the report fails", report([raw("Ignored", 5, undefined)]), 1],
      ["a Timeout in the report fails", report([raw("Timeout", 5, ["1"])]), 1],
      ["a report with no testFiles cannot be read", { files: { [L]: { source: "", mutants: [raw("Killed", 5, ["1"])] } } }, 1],
      ["a report holding another file cannot be read", { files: { [F]: { source: "", mutants: [] } }, testFiles: { [K]: { tests: [{ id: "1" }] } } }, 1],
    ]) {
      const got = verdict(rep).length;
      if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
      passed++;
    }
    if (verdict({ files: { [L]: { source: "", mutants: [] } } })[0] !== "the report names no test files") fail(["self-test FAILED: a report with no testFiles does not say so"]);
    passed++;
    // The report names the invocation that made it: the group's own files and its own bail setting.
    for (const [name, group, config, want] of [
      ["a report made with the group's files and its bail setting is accepted", "lease", { mutate: [L], disableBail: true }, 0],
      ["a report whose config.mutate is not the group's files is refused", "lease", { mutate: [F], disableBail: true }, 1],
      ["a report whose config.mutate holds the group's files and another is refused", "lease", { mutate: [L, F], disableBail: true }, 1],
      ["a report whose config.disableBail differs is refused", "lease", { mutate: [L], disableBail: false }, 1],
      ["a report with no config is refused", "lease", undefined, 1],
      ["a react report made without disableBail is accepted", "react", { mutate: GROUPS.react.files, disableBail: false }, 0],
      ["a react report made with disableBail is refused", "react", { mutate: GROUPS.react.files, disableBail: true }, 1],
    ]) {
      const got = reportReasons({ config }, GROUPS[group], "report").length;
      if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
      passed++;
    }
  }
  // The record a record writes into: one beside a group measured on another commit is refused, a restart of a close
  // drops the old record and names what it dropped, and a base is never restarted.
  const held = { phase: "82", groups: { other: { head: "a" } } };
  for (const [name, got, want] of [
    ["a record beside a group measured on another commit is refused", heldFor(held, "base", "react", "b", false).bad.length, 1],
    ["a record beside a group measured on the same commit keeps it", heldFor(held, "base", "react", "a", false).bad.length + (heldFor(held, "base", "react", "a", false).held.groups.other === undefined ? 1 : 0), 0],
    ["--restart on a close starts a fresh record and names what it dropped", (() => { const r = heldFor(held, "close", "react", "b", true); return r.bad.length + Object.keys(r.held.groups).length + (r.dropped.join() === "other" ? 0 : 1); })(), 0],
    ["--restart on a base is refused", heldFor(held, "base", "react", "b", true).bad.length, 1],
  ]) {
    if (got !== want) fail([`self-test FAILED: ${name}: ${got}, wanted ${want}`]);
    passed++;
  }
  // The dispatcher with this file's own table, every mode's run replaced: a record from a modified tree is refused
  // before its run, a clean one runs, and compare and probe never read the status.
  for (const [mode, status, want] of [
    ["record", planted, "refused"],
    ["record", "", "ran"],
    ["compare", planted, "ran"],
    ["probe", planted, "ran"],
  ]) {
    let got = "nothing";
    const stubs = Object.fromEntries(Object.entries(MODES).map(([k, v]) => [k, { ...v, run: () => { got = "ran"; } }]));
    dispatch(stubs, mode, mode === "probe" ? ["lease"] : ["base", "react"], () => status, () => { got = "refused"; });
    if (got !== want) fail([`self-test FAILED: ${mode} on ${JSON.stringify(status)}: ${got}, wanted ${want}`]);
    passed++;
  }
  for (const group of Object.keys(GROUPS).filter((g) => GROUPS[g].closeOnly !== true)) {
    const asked = [];
    dispatch(MODES, "record", ["base", group], (g) => { asked.push(g); return planted; }, () => {});
    if (asked.join() !== group) fail([`self-test FAILED: a ${group} record read the status of ${asked.join() || "nothing"}`]);
    passed++;
  }
  if (gitStatus.toString() !== '(group) => git("status", "--porcelain", "--", ...GROUPS[group].files)') fail(["self-test FAILED: the status reader does not read the files a record reads"]);
  passed++;
  // The lease group runs without bail so every killer is listed, and the react group does not.
  if (!invocation("lease").endsWith("stryker.react.mjs --mutate packages/react/src/RegistryLease.ts --disableBail") || invocation("react").includes("--disableBail")) fail(["self-test FAILED: the invocations do not state the groups' bail settings"]);
  passed++;
  console.log(`self-test: ${passed} passed`);
};

/** Each mode, whether it refuses a tree whose read files differ from HEAD, and its run. */
const MODES = {
  record: { clean: true, run: (name, group, flag) => ((name === "base" || name === "close") && Object.hasOwn(GROUPS, group) && (flag === undefined || flag === "--restart") ? record(name, group, flag === "--restart") : usage()) },
  probe: { clean: false, run: (group) => (Object.hasOwn(GROUPS, group ?? "") ? probe(group) : usage()) },
  compare: { clean: false, run: () => compare() },
  "--self-test": { clean: false, run: () => selfTest() },
};
const usage = () => fail(["usage: node 82-mutation.mjs record base react | record close react|lease [--restart] | probe react|lease | compare | --self-test"]);
/** Runs `mode`, refusing first when it records and `status` shows a read file modified. */
function dispatch(modes, mode, args, status, refuse) {
  const entry = Object.hasOwn(modes, mode) ? modes[mode] : undefined;
  if (entry === undefined) return usage();
  if (entry.clean) {
    if (!Object.hasOwn(GROUPS, args[1] ?? "")) return usage();
    const bad = dirtyReasons(status(args[1]));
    if (bad.length > 0) return refuse(bad);
  }
  return entry.run(...args);
}

const [mode, ...args] = process.argv.slice(2);
await dispatch(MODES, mode, args, gitStatus, fail);
