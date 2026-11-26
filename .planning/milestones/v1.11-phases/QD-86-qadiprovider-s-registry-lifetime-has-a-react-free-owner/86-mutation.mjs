// The phase's mutation record, over two groups through `stryker.react.mjs`: `lease`, `RegistryLease.ts`, the file the
// phase composes and leaves unchanged, measured at the base and at the close with the same invocation, run with
// `--disableBail` so every killing test of a mutant is listed; and `owner`, `RegistryOwner.ts`, the file the phase creates,
// measured at the close alone. `record base|close <group>` reads the group's report and writes, under that group in
// `86-mutation-base.json` or `86-mutation-close.json`, each file's counts and its open (Survived, NoCoverage) and Ignored
// mutants; every group of one record is measured on one commit, and `record close <group> --restart` starts a fresh close
// record at the current head and names the groups it dropped, for a re-close after a fix commit (a base is never
// restarted). `probe <group>` judges the group's report as its close would and writes nothing. Every record names, in
// `unmeasured`, the files the phase edits that no Stryker config reaches, with the reason. `compare` judges each group by
// the rule of its kind.
// The removed-mutant rule, for the lease, which has a base: a score that fell only because killed mutants were deleted
// passes, a new open mutant (Survived or NoCoverage) never does, and neither does a new Ignored mutant of a kind the base
// did not hold. A mutant is located by its line number carried through `git diff -U0 <base head> <close head>`, never by
// the text of its line, and every comparison counts mutants as a multiset, so a second copy of one is a new one.
// The absolute rule, for the owner, which is born in the phase, so `record base owner` is refused: its close holds no
// Survived, NoCoverage, Ignored or Timeout mutant, at least one Killed mutant, and every Killed mutant has a killer among
// the tests of `packages/react/test/RegistryOwner.test.ts`. With no base to compare against, anything the tests do not kill
// is a gap rather than a carried-over one, and the `killers` check is the measured form of "tested without rendering": a
// mutant only a rendered test kills is not covered by the owner's own tests. `record` refuses a tree where a file it reads
// differs from HEAD, and a report its group's invocation did not make (its `config.mutate` is not the group's file list,
// or its `config.disableBail` is not the group's), through a dispatcher the self-test drives. `--self-test` drives the
// comparison with planted records. From the repository root, after the group's INVOCATION (stdin closed, nothing else
// running):
//   node <this directory>/86-mutation.mjs record base lease
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
const REACT = { config: "stryker.react.mjs", report: "reports/mutation-react/mutation.json" };
const LEASE = "packages/react/src/RegistryLease.ts";
const OWNER = "packages/react/src/RegistryOwner.ts";
const GROUPS = {
  lease: { ...REACT, files: [LEASE], disableBail: true },
  owner: { ...REACT, files: [OWNER], closeOnly: true, disableBail: true, killers: "packages/react/test/RegistryOwner.test.ts" },
};
/** Files born in the phase: they have no base, so a base record of them is refused and a close is judged by `judgeNew`. */
const NEW_FILES = [OWNER];
/** Files the phase edits that no Stryker config reaches, written into every record so the gap is stated, not silent. */
const UNMEASURED = [{ file: "packages/react/src/QadiProvider.tsx", why: "renders; it holds no lifetime branch, and its behaviour is pinned by the rendered tests and the characterisation" }];
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

/** Why a record of `group` may not be made at all: a base of a born file has nothing to be measured against. Pure. */
export const bornReasons = (name, group) => {
  const born = NEW_FILES.filter((file) => GROUPS[group].files.includes(file));
  return name === "base" && born.length > 0 ? born.map((file) => `${file.split("/").pop()} is born in the phase and has no base`) : [];
};

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
 * mutant and no Timeout, it holds at least one Killed mutant, and every Killed mutant must have a killer among the tests of
 * `killers`. Pure.
 */
export const judgeNew = ({ close }, files, log = console.log, killers = GROUPS.owner.killers) => {
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
    if (c.killed === 0) bad.push(`${file} is new and holds no killed mutant`);
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
  if (restart) return { held: { phase: "86", unmeasured: UNMEASURED, groups: {} }, bad: [], dropped: Object.keys(held.groups).filter((other) => other !== group) };
  const out = `${D}86-mutation-${name}.json`;
  const bad = Object.entries(held.groups)
    .filter(([other, entry]) => other !== group && entry.head !== head)
    .map(([other, entry]) => `${out} holds ${other} measured on ${entry.head}, not ${head}: every group of a record is measured on one commit`);
  return { held, bad, dropped: [] };
};

const record = async (name, group, restart) => {
  const { config: CONFIG, report: REPORT, files: FILES, killers } = GROUPS[group];
  const born = bornReasons(name, group);
  if (born.length > 0) return fail(born);
  const config = (await import(pathToFileURL(resolve(CONFIG)).href)).default;
  if (config.jsonReporter?.fileName !== REPORT) fail([`${CONFIG} no longer reports to the report this reads`]);
  if (config.ignoreStatic !== true) fail([`${CONFIG} no longer sets ignoreStatic: true`]);
  const refused = reportReasons(readJson(REPORT), GROUPS[group], REPORT);
  if (refused.length > 0) fail(refused);
  const head = git("rev-parse", "HEAD").trim();
  const out = `${D}86-mutation-${name}.json`;
  const { held, bad, dropped } = heldFor(existsSync(out) ? readJson(out) : { phase: "86", unmeasured: UNMEASURED, groups: {} }, name, group, head, restart);
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
    const base = readJson(`${D}86-mutation-base.json`).groups[group];
    if (base === undefined) fail([`the ${group} group is missing from the base record`]);
    const diffs = Object.fromEntries(files.map((file) => [file, git("diff", "-U0", base.head, "--", file)]));
    bad.push(...judge({ base, close, diffs }, files));
  }
  if (bad.length > 0) fail(bad);
  console.log(`probe ${group}: the report passes as its close would judge it`);
};

const compare = () => {
  const bad = [];
  const baseRecord = readJson(`${D}86-mutation-base.json`);
  const closeRecord = readJson(`${D}86-mutation-close.json`);
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
    killed: detected,
    detected,
    valid,
    open,
    survived: open.filter((x) => x.status === "Survived").length,
    noCoverage: open.filter((x) => x.status === "NoCoverage").length,
    ignored: ignoredMutants.length,
    ignoredMutants,
    ...extra,
  });
  const F = LEASE;
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
  // A close-only file has no base and is absolute: an open mutant, an Ignored one, a Timeout, no Killed mutant at all and a
  // Killed mutant killed only outside the killers file each fail; a file with none passes.
  const O = OWNER;
  const ownerOf = (f) => ({ files: { [O]: f } });
  for (const [name, close, want] of [
    ["a close-only file with nothing open, Ignored, timed out or outside passes", ownerOf(file(10, 10)), 0],
    ["a close-only file with a Survived mutant fails", ownerOf(file(9, 10, [m("Survived", 5)])), 1],
    ["a close-only file with a NoCoverage mutant fails", ownerOf(file(9, 10, [m("NoCoverage", 5)])), 1],
    ["a close-only file with an Ignored mutant fails", ownerOf(file(10, 10, [], [m("Ignored", 3)])), 1],
    ["a close-only file with a Timeout fails", ownerOf(file(10, 10, [], [], { timeouts: [m("Timeout", 7)] })), 1],
    ["a close-only file with no mutant at all fails", ownerOf(file(0, 0)), 1],
    ["a close-only file with a mutant killed only outside its tests fails", ownerOf(file(10, 10, [], [], { outside: [m("Killed", 8)] })), 1],
    ["a close-only file missing from the close fails", { files: {} }, 1],
  ]) {
    const got = judgeNew({ close }, [O], () => {}).length;
    if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
    passed++;
  }
  // The base of a born file is refused with its reason, and every other record is not.
  for (const [name, got, want] of [
    ["a base of RegistryOwner.ts is refused as born in the phase", bornReasons("base", "owner").join(), "RegistryOwner.ts is born in the phase and has no base"],
    ["a close of RegistryOwner.ts is not refused", bornReasons("close", "owner").join(), ""],
    ["a base of RegistryLease.ts is not refused", bornReasons("base", "lease").join(), ""],
    ["a close of RegistryLease.ts is not refused", bornReasons("close", "lease").join(), ""],
  ]) {
    if (got !== want) fail([`self-test FAILED: ${name}: ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`]);
    passed++;
  }
  // The lease group has a base and is judged by the removed-mutant rule: a close equal to its base passes, deleted killed
  // mutants pass, and a new Survived or NoCoverage mutant fails.
  {
    const leaseBase = { files: { [LEASE]: file(28, 28) } };
    const none = { [LEASE]: "" };
    const judgeLease = (close) => judge({ base: leaseBase, close: { files: { [LEASE]: close } }, diffs: none }, [LEASE], () => {}, {}).length;
    for (const [name, close, want] of [
      ["a lease close equal to its base passes", file(28, 28), 0],
      ["a lease close whose only change is deleted killed mutants passes", file(20, 20), 0],
      ["a lease close with a new Survived mutant fails the score and the mutant", file(28, 29, [m("Survived", 7)]), 2],
      ["a lease close with a new NoCoverage mutant fails the score and the mutant", file(28, 29, [m("NoCoverage", 7)]), 2],
      ["a lease close with a new Ignored mutant fails", file(28, 28, [], [m("Ignored", 7)]), 1],
    ]) {
      const got = judgeLease(close);
      if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
      passed++;
    }
  }
  // The report a close-only group reads, planted: a mutant killed by a RegistryOwner.test.ts test (alone, or beside a
  // rendered test) has a killer in the group's tests, one killed only by a rendered test has none, and a report with no
  // testFiles cannot be read.
  {
    const K = GROUPS.owner.killers;
    const R = "packages/react/test/QadiProvider.lifetime.test.tsx";
    const raw = (status, line, killedBy) => ({ status, mutatorName: "StringLiteral", replacement: '""', location: { start: { line, column: 4 } }, killedBy });
    const report = (mutants, testFiles = { [K]: { tests: [{ id: "1" }] }, [R]: { tests: [{ id: "2" }] } }) => ({ files: { [O]: { source: "", mutants } }, testFiles });
    const verdict = (rep) => {
      const read = classify(rep, [O], K);
      return read.bad.length > 0 ? read.bad : judgeNew({ close: { files: read.out } }, [O], () => {}, K);
    };
    for (const [name, rep, want] of [
      ["a Killed mutant killed by a RegistryOwner.test.ts test passes", report([raw("Killed", 5, ["1"])]), 0],
      ["a Killed mutant killed by a RegistryOwner.test.ts test and a rendered test passes", report([raw("Killed", 5, ["1", "2"])]), 0],
      ["a Killed mutant killed only by QadiProvider.lifetime.test.tsx fails", report([raw("Killed", 5, ["2"])]), 1],
      ["a Killed mutant with no killer fails", report([raw("Killed", 5, [])]), 1],
      ["an Ignored mutant in the report fails", report([raw("Killed", 4, ["1"]), raw("Ignored", 5, undefined)]), 1],
      ["a Survived mutant in the report fails", report([raw("Killed", 5, ["1"]), raw("Survived", 6, undefined)]), 1],
      ["a Timeout in the report fails", report([raw("Timeout", 5, ["1"])]), 2],
      ["a report with no mutant at all fails", report([]), 1],
      ["a report with no testFiles cannot be read", { files: { [O]: { source: "", mutants: [raw("Killed", 5, ["1"])] } } }, 1],
      ["a report holding another file cannot be read", { files: { [F]: { source: "", mutants: [] } }, testFiles: { [K]: { tests: [{ id: "1" }] } } }, 1],
    ]) {
      const got = verdict(rep).length;
      if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
      passed++;
    }
    if (verdict({ files: { [O]: { source: "", mutants: [] } } })[0] !== "the report names no test files") fail(["self-test FAILED: a report with no testFiles does not say so"]);
    passed++;
    // The report names the invocation that made it: the group's own files and its own bail setting.
    for (const [name, group, config, want] of [
      ["a lease report made with the group's files and --disableBail is accepted", "lease", { mutate: [LEASE], disableBail: true }, 0],
      ["an owner report made with the group's files and --disableBail is accepted", "owner", { mutate: [OWNER], disableBail: true }, 0],
      ["a lease report whose config.mutate is not the group's files is refused", "lease", { mutate: [OWNER], disableBail: true }, 1],
      ["a lease report whose config.mutate holds the group's files and another is refused", "lease", { mutate: [LEASE, OWNER], disableBail: true }, 1],
      ["a lease report made without --disableBail is refused", "lease", { mutate: [LEASE], disableBail: false }, 1],
      ["an owner report made without --disableBail is refused", "owner", { mutate: [OWNER], disableBail: false }, 1],
      ["a report with no disableBail setting is refused for either group", "owner", { mutate: [OWNER] }, 1],
      ["a lease report with no config is refused", "lease", undefined, 1],
    ]) {
      const got = reportReasons({ config }, GROUPS[group], "report").length;
      if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
      passed++;
    }
  }
  // The record a record writes into: one beside a group measured on another commit is refused, a restart of a close
  // drops the old record and names what it dropped, and a base is never restarted.
  const held = { phase: "86", groups: { other: { head: "a" } } };
  for (const [name, got, want] of [
    ["a record beside a group measured on another commit is refused", heldFor(held, "base", "lease", "b", false).bad.length, 1],
    ["a record beside a group measured on the same commit keeps it", heldFor(held, "base", "lease", "a", false).bad.length + (heldFor(held, "base", "lease", "a", false).held.groups.other === undefined ? 1 : 0), 0],
    ["--restart on a close starts a fresh record and names what it dropped", (() => { const r = heldFor(held, "close", "lease", "b", true); return r.bad.length + Object.keys(r.held.groups).length + (r.dropped.join() === "other" ? 0 : 1); })(), 0],
    ["--restart on a base is refused", heldFor(held, "base", "lease", "b", true).bad.length, 1],
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
    dispatch(stubs, mode, mode === "probe" ? ["lease"] : ["base", "lease"], () => status, () => { got = "refused"; });
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
  // Both groups run without bail so every killer is listed, each over its own file alone.
  if (invocation("lease") !== `pnpm exec stryker run stryker.react.mjs --mutate ${LEASE} --disableBail` || invocation("owner") !== `pnpm exec stryker run stryker.react.mjs --mutate ${OWNER} --disableBail`) fail(["self-test FAILED: the invocations do not name each group's file alone with --disableBail"]);
  passed++;
  if (Object.keys(GROUPS).join() !== "lease,owner" || NEW_FILES.join() !== OWNER || UNMEASURED.length !== 1 || UNMEASURED[0].file !== "packages/react/src/QadiProvider.tsx") fail(["self-test FAILED: the groups, NEW_FILES or UNMEASURED are not the lease, the owner and the provider"]);
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
const usage = () => fail(["usage: node 86-mutation.mjs record base lease | record close lease|owner [--restart] | probe lease|owner | compare | --self-test"]);
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
