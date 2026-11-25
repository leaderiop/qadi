// The phase's mutation record, over two groups through `stryker.devtools.mjs`: `dock`, `DockModel.ts`, the model file the
// phase edits, measured at the base and at the close, and `hydration`, `HydrationView.ts`, the model file the phase
// creates, measured at the close alone. `record base|close <group>` reads the group's report and writes, under that group
// in `85-mutation-base.json` or `85-mutation-close.json`, each file's counts and its open (Survived, NoCoverage) and
// Ignored mutants; every group of one record is measured on one commit, and `record close <group> --restart` starts a
// fresh close record at the current head and names the groups it dropped, for a re-close after a fix commit (a base is
// never restarted). Every record names, in `unmeasured`, the files the phase edits that no Stryker config measures, with
// the reason. `compare` judges each group by the rule below.
// The removed-mutant rule, for a file with a base (`DockModel.ts`): a score that fell only because killed mutants were
// deleted passes, a new open mutant (Survived or NoCoverage) never does, and neither does a new Ignored mutant of a kind
// the base did not hold. A mutant is located by its line number carried through `git diff -U0 <base head> <close head>`,
// never by the text of its line, and every comparison counts mutants as a multiset, so a second copy of one is a new one.
// The born-file rule, for a file with no base (`HydrationView.ts`, born in the phase, so `record base hydration` is
// refused): its close holds no Survived, NoCoverage or Ignored mutant at all and at least one killed one, because with no
// base to compare against, anything the tests do not kill is a gap rather than a carried-over one. `record` refuses a
// tree where a file it reads differs from HEAD, and a report its group's invocation did not make (its `config.mutate` is
// not the record's own file list), through a dispatcher the self-test drives. `--self-test` drives the comparison with
// planted records. From the repository root, after the group's INVOCATION (stdin closed, nothing else running):
//   node <this directory>/85-mutation.mjs record base dock
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
const DEVTOOLS = { config: "stryker.devtools.mjs", report: "reports/mutation-devtools/mutation.json" };
const MODEL_DIR = "packages/devtools/src/model/";
const DOCK = `${MODEL_DIR}DockModel.ts`;
const HYDRATION = `${MODEL_DIR}HydrationView.ts`;
const GROUPS = {
  dock: { ...DEVTOOLS, files: [DOCK] },
  hydration: { ...DEVTOOLS, files: [HYDRATION], closeOnly: true },
};
/** Files born in the phase: they have no base, so a base record of them is refused and a close is judged by `judgeNew`. */
const NEW_FILES = [HYDRATION];
/** The paths a record reads: the group's files, the same for a base and a close (no file is renamed). */
const filesFor = (_name, group) => GROUPS[group].files;
/** Files whose close holds no open mutant, whatever the base held. None: the born file is judged by `judgeNew`. */
const ABSOLUTE = [];
/** Why no Stryker config measures a file under `src/react`. */
const REACT_WHY = "no Stryker config reaches src/react (stryker.devtools.mjs mutates src/model only); held by its tests, the characterisations and the 90% coverage threshold";
/** Files the phase edits that no Stryker config measures, written into every record so the gap is stated, not silent. */
const UNMEASURED = [
  "QuestionsPanel.tsx",
  "DevtoolsDock.tsx",
  "useStoreSnapshot.ts",
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

/**
 * Every reason a born file fails: it has no base, so its close holds no open mutant, no Ignored mutant and at least one
 * killed one. The Ignored allowance of a file with a base does not carry over: a born file has nothing it could be
 * carrying over from. Pure.
 */
export const judgeNew = ({ close }, files, log = console.log) => {
  const bad = [];
  for (const file of files) {
    const c = close.files[file];
    if (c === undefined) {
      bad.push(`${file} is missing from the close record`);
      continue;
    }
    for (const m of c.open) bad.push(`${file}:${m.line} is new and has a ${m.status} mutant: ${m.mutator} -> ${m.replacement}`);
    for (const m of c.ignoredMutants) bad.push(`${file}:${m.line} is new and has an Ignored mutant: ${m.mutator} -> ${m.replacement}`);
    if (c.detected === 0) bad.push(`${file} is new and holds no killed mutant`);
    log(`${file} ${c.detected}/${c.valid}, survived ${c.survived}, no coverage ${c.noCoverage}, ignored ${c.ignored}`);
  }
  return bad;
};

/** Why a record of `group` may not be made at all: a base of a born file has nothing to be measured against. Pure. */
export const bornReasons = (name, group) => {
  const born = NEW_FILES.filter((file) => GROUPS[group].files.includes(file));
  return name === "base" && born.length > 0 ? born.map((file) => `${file.split("/").pop()} is born in the phase and has no base`) : [];
};

/**
 * The record a `record` writes into, the reasons it may not, and the groups a restart dropped. Pure. `restart` is for a
 * close only: it keeps no group of the old record, so a re-close after a fix commit is measured on one commit again.
 */
export const heldFor = (held, name, group, head, restart) => {
  if (restart && name !== "close") return { held, bad: ["--restart re-measures a close, never a base"], dropped: [] };
  if (restart) return { held: { phase: "85", unmeasured: UNMEASURED, groups: {} }, bad: [], dropped: Object.keys(held.groups).filter((other) => other !== group) };
  const out = `${D}85-mutation-${name}.json`;
  const bad = Object.entries(held.groups)
    .filter(([other, entry]) => other !== group && entry.head !== head)
    .map(([other, entry]) => `${out} holds ${other} measured on ${entry.head}, not ${head}: every group of a record is measured on one commit`);
  return { held, bad, dropped: [] };
};

const record = async (name, group, restart) => {
  const { config: CONFIG, report: REPORT } = GROUPS[group];
  const FILES = filesFor(name, group);
  const born = bornReasons(name, group);
  if (born.length > 0) return fail(born);
  const config = (await import(pathToFileURL(resolve(CONFIG)).href)).default;
  if (config.jsonReporter?.fileName !== REPORT) fail([`${CONFIG} no longer reports to the report this reads`]);
  if (config.ignoreStatic !== true) fail([`${CONFIG} no longer sets ignoreStatic: true`]);
  const refused = reportReasons(readJson(REPORT), FILES, REPORT);
  if (refused.length > 0) fail(refused);
  const head = git("rev-parse", "HEAD").trim();
  const out = `${D}85-mutation-${name}.json`;
  const { held, bad, dropped } = heldFor(existsSync(out) ? readJson(out) : { phase: "85", unmeasured: UNMEASURED, groups: {} }, name, group, head, restart);
  if (bad.length > 0) fail(bad);
  if (dropped.length > 0) console.log(`restarted the close record at ${head}; re-measure: ${dropped.join(", ")}`);
  const files = tally(REPORT, FILES);
  held.groups[group] = { head, invocation: invocation(group, name), files };
  writeFileSync(out, `${JSON.stringify(held, null, 1)}\n`);
  console.log(`wrote ${group} into ${out}`);
};

const compare = () => {
  const bad = [];
  const baseRecord = readJson(`${D}85-mutation-base.json`);
  const closeRecord = readJson(`${D}85-mutation-close.json`);
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
  const F = DOCK;
  const H = HYDRATION;
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
  // The first cases test the removed-mutant rule on a file that is not absolute (judge's last argument is empty).
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
  // The base this phase measures: the dock model holds no open mutant and twelve Ignored ones of one kind. Deleted killed
  // mutants pass, a thirteenth Ignored mutant of that kind fails, and so does a new open one.
  {
    const twelve = Array.from({ length: 12 }, (_, i) => m("Ignored", 100 + i));
    const dockBase = { files: { [F]: file(65, 65, [], twelve) } };
    const none = { [F]: "" };
    const judgeDock = (close) => judge({ base: dockBase, close: closeOf(close), diffs: none }, [F], () => {}, {}, []).length;
    for (const [name, close, want] of [
      ["a dock close whose only change is deleted killed mutants passes", file(40, 40, [], twelve), 0],
      ["a dock close with a thirteenth Ignored mutant of a kind the base held twelve of fails", file(65, 65, [], [...twelve, m("Ignored", 200)]), 1],
      ["a dock close with a new Survived mutant fails the score and the mutant", file(65, 66, [m("Survived", 7)], twelve), 2],
    ]) {
      const got = judgeDock(close);
      if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
      passed++;
    }
  }
  // A born file has no base: it holds no open mutant, no Ignored mutant and at least one killed one.
  for (const [name, close, want] of [
    ["a born file with only killed mutants passes", closeOf(file(10, 10)), 0],
    ["a born file with a Survived mutant fails", closeOf(file(9, 10, [m("Survived", 5)])), 1],
    ["a born file with a NoCoverage mutant fails", closeOf(file(9, 10, [m("NoCoverage", 5)])), 1],
    ["a born file with one Ignored mutant fails", closeOf(file(10, 10, [], [m("Ignored", 3)])), 1],
    ["a born file with no mutant at all fails", closeOf(file(0, 0)), 1],
    ["a born file missing from the close fails", { files: {} }, 1],
  ]) {
    const got = judgeNew({ close }, [F], () => {}).length;
    if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
    passed++;
  }
  // The base of a born file is refused with its reason, and every other record is not.
  for (const [name, got, want] of [
    ["a base of HydrationView.ts is refused as born in the phase", bornReasons("base", "hydration").join(), "HydrationView.ts is born in the phase and has no base"],
    ["a close of HydrationView.ts is not refused", bornReasons("close", "hydration").join(), ""],
    ["a base of DockModel.ts is not refused", bornReasons("base", "dock").join(), ""],
    ["a close of DockModel.ts is not refused", bornReasons("close", "dock").join(), ""],
  ]) {
    if (got !== want) fail([`self-test FAILED: ${name}: ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`]);
    passed++;
  }
  // The record a record writes into: one beside a group measured on another commit is refused, a restart of a close
  // drops the old record and names what it dropped, and a base is never restarted.
  const held = { phase: "85", groups: { other: { head: "a" } } };
  for (const [name, got, want] of [
    ["a record beside a group measured on another commit is refused", heldFor(held, "base", "dock", "b", false).bad.length, 1],
    ["a record beside a group measured on the same commit keeps it", heldFor(held, "base", "dock", "a", false).bad.length + (heldFor(held, "base", "dock", "a", false).held.groups.other === undefined ? 1 : 0), 0],
    ["--restart on a close starts a fresh record and names what it dropped", (() => { const r = heldFor(held, "close", "dock", "b", true); return r.bad.length + Object.keys(r.held.groups).length + (r.dropped.join() === "other" ? 0 : 1); })(), 0],
    ["--restart on a base is refused", heldFor(held, "base", "dock", "b", true).bad.length, 1],
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
    dispatch(stubs, mode, ["base", "dock"], () => status, () => { got = "refused"; });
    if (got !== want) fail([`self-test FAILED: ${mode} on ${JSON.stringify(status)}: ${got}, wanted ${want}`]);
    passed++;
  }
  for (const group of Object.keys(GROUPS)) {
    for (const name of ["base", "close"]) {
      const asked = [];
      dispatch(MODES, "record", [name, group], (g, n) => { asked.push(`${n}:${g}`); return planted; }, () => {});
      if (asked.join() !== `${name}:${group}`) fail([`self-test FAILED: a ${group} ${name} record read the status of ${asked.join() || "nothing"}`]);
      passed++;
    }
  }
  if (!gitStatus.toString().includes("...filesFor(name, group)")) fail(["self-test FAILED: the status reader does not read the files a record reads"]);
  passed++;
  // One file per group, no rename: a base and a close read the same path, and the diff names that path alone.
  if (filesFor("base", "dock").join() !== F || filesFor("close", "dock").join() !== F || filesFor("close", "hydration").join() !== H) fail(["self-test FAILED: filesFor does not name DockModel.ts and HydrationView.ts"]);
  passed++;
  if (invocation("dock", "base") !== `pnpm exec stryker run stryker.devtools.mjs --mutate ${F}` || invocation("dock", "close") !== invocation("dock", "base")) fail(["self-test FAILED: the base and close invocations do not name DockModel.ts alone"]);
  passed++;
  if (invocation("hydration", "close") !== `pnpm exec stryker run stryker.devtools.mjs --mutate ${H}`) fail(["self-test FAILED: the hydration close invocation does not name HydrationView.ts alone"]);
  passed++;
  if (diffArgs("b", "c", F).join(" ") !== `diff -U0 b c -- ${F}`) fail(["self-test FAILED: the diff is not a plain diff over DockModel.ts"]);
  passed++;
  if (Object.keys(GROUPS).join() !== "dock,hydration" || NEW_FILES.join() !== H || ABSOLUTE.length !== 0 || UNMEASURED.length !== 3 || UNMEASURED.some((u) => !u.file.startsWith("packages/devtools/src/react/") || u.why.length === 0)) fail(["self-test FAILED: the groups, NEW_FILES or UNMEASURED are not the dock, the hydration view and the three src/react files"]);
  passed++;
  {
    const baseRec = { head: "b", files: { [F]: file(42, 43, [m("Survived", 20)]) } };
    const closeRec = (head, f) => ({ head, files: { [F]: f } });
    const move = "@@ -9,3 +9,2 @@\n-a\n-b\n-c\n+x\n+y\n";
    const run = (rec, diff = move) => judgeGroup("dock", baseRec, rec, () => diff, () => {});
    // The planted diff maps base line 20 to close line 19, where the base survivor sits: it is carried, not new.
    for (const [name, rec, want] of [
      ["a close with no open mutant passes against its base entry", closeRec("c", file(42, 43)), 0],
      ["a base survivor carried to the same line is not new", closeRec("c", file(42, 43, [m("Survived", 19)])), 0],
      ["a new Survived mutant fails", closeRec("c", file(42, 43, [m("Survived", 19), m("Survived", 40)])), 1],
      ["a close where move's killed mutants are gone passes", closeRec("c", file(30, 30)), 0],
      ["a close with one new Ignored mutant fails", closeRec("c", file(42, 42, [], [m("Ignored", 5)])), 1],
    ]) {
      const got = run(rec).length;
      if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
      passed++;
    }
    // A file listed as absolute holds no open mutant at its close, whatever its base held.
    const abs = judge({ base: { files: { [F]: file(42, 43, [m("Survived", 20)]) } }, close: { files: { [F]: file(42, 43, [m("Survived", 19)]) } }, diffs: { [F]: move } }, [F], () => {}, {}, [F]).length;
    if (abs !== 1) fail([`self-test FAILED: an absolute file holding a carried survivor: ${abs} reasons, wanted 1`]);
    passed++;
  }
  // The report guard: a report made by another invocation is refused, whichever record it is offered to.
  for (const [name, config, files, want] of [
    ["a report made with DockModel.ts is accepted", { mutate: [F] }, filesFor("base", "dock"), 0],
    ["a report listed in another order is accepted", { mutate: [F, "x.ts"] }, [F, "x.ts"].reverse(), 0],
    ["a report whose mutate names another file is refused by record", { mutate: [H] }, filesFor("base", "dock"), 1],
    ["a report with one file more is refused", { mutate: [F, "x.ts"] }, filesFor("base", "dock"), 1],
    ["a report with no config is refused", undefined, filesFor("base", "dock"), 1],
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
const usage = () => fail(["usage: node 85-mutation.mjs record base|close dock|hydration [--restart], compare, or --self-test"]);
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
