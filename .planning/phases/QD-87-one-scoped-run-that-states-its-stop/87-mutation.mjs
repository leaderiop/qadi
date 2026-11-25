// The phase's mutation record, over three groups through `stryker.devtools.mjs`: `touched`, the five model files the phase
// edits (SupersedingRun.ts, TimelineFeed.ts, DiagnosticsFeed.ts, SimulationSession.ts, GatesFeed.ts), measured at the base
// and at the close with one and the same invocation (no `--disableBail`, so a base and a close are comparable and the base
// is the run the research measured); and `stated` (StatedRun.ts) and `prologue` (ConfigurePrologue.ts), the two files the
// phase creates, measured at the close alone and run with `--disableBail` so every killing test of a mutant is listed.
// `record base touched` writes `phase_base`, the HEAD the phase started on, and refuses any tree where `packages` or the
// Stryker config differs from HEAD; `record close <group>` reads the report of that group and writes, under it in
// `87-mutation-close.json`, each file's counts and its open (Survived, NoCoverage) and Ignored mutants; every group of one
// record is measured on one commit, and `record close <group> --restart` starts a fresh close record at the current head
// and names the groups it dropped, for a re-close after a fix commit (a base is never restarted). `probe <group>` judges
// the group's report as its close would and writes nothing. Every record names, in `unmeasured`, the files the phase edits
// that no Stryker config reaches, with the reason. `compare` judges each group by the rule of its kind, then the sum rule.
// The removed-mutant rule, for the touched files, which have a base: a score that fell only because killed mutants were
// deleted passes, a new open mutant (Survived or NoCoverage) never does, and neither does a new Ignored mutant of a kind the
// base did not hold. A mutant is located by its line number carried through `git diff -U0 <base head> <close head>`, never
// by the text of its line, and every comparison counts mutants as a multiset, so a second copy of one is a new one. A
// Survived mutant that matches an entry of EQUIVALENT (file, mutator, replacement, the trimmed text of its line) is
// explained, never new, and an entry that matches no survivor, or states no reason, fails.
// The absolute rule, for the two born modules, which have no base, so `record base stated` and `record base prologue` are
// refused: a close holds no Survived, NoCoverage, Ignored or Timeout mutant, at least one Killed mutant, and every Killed
// mutant has a killer among the tests of the group's `killers` file. With no base to compare against, anything the tests do
// not kill is a gap rather than a carried-over one, and the `killers` check is the measured form of "tested by the module's
// own tests": a mutant only a store's test kills is not covered by the module's rows.
// The sum rule, checked by `compare`: the publish-then-fork, the stop and the configure prologue the phase moves leave
// three files for two, so a per-file rule cannot see them; the detected / valid of the touched base, over its five files,
// must not exceed the detected / valid of the close over the five touched files plus the two born files. Moved code cannot
// lower the aggregate.
// No file is renamed, so RENAMED is empty: a close path is its own base path.
// `record` refuses a report its group's invocation did not make (its `config.mutate` is not the group's file list, or its
// `config.disableBail` is not the group's), through a dispatcher the self-test drives. `--self-test` drives the comparison
// with planted records. From the repository root, after the group's INVOCATION (stdin closed, nothing else running):
//   node <this directory>/87-mutation.mjs record base touched
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
const DEVTOOLS = { config: "stryker.devtools.mjs", report: "reports/mutation-devtools/mutation.json" };
const MODEL = "packages/devtools/src/model/";
const TOUCHED = ["SupersedingRun", "TimelineFeed", "DiagnosticsFeed", "SimulationSession", "GatesFeed"].map((name) => `${MODEL}${name}.ts`);
const STATED = `${MODEL}StatedRun.ts`;
const PROLOGUE = `${MODEL}ConfigurePrologue.ts`;
const GROUPS = {
  touched: { ...DEVTOOLS, files: TOUCHED },
  stated: { ...DEVTOOLS, files: [STATED], closeOnly: true, disableBail: true, killers: "packages/devtools/test/model/StatedRun.test.ts" },
  prologue: { ...DEVTOOLS, files: [PROLOGUE], closeOnly: true, disableBail: true, killers: "packages/devtools/test/model/ConfigurePrologue.test.ts" },
};
/** Files born in the phase: they have no base, so a base record of them is refused and a close is judged by `judgeNew`. */
const NEW_FILES = [STATED, PROLOGUE];
/** A close path mapped to its base path. Empty: the phase renames no file. */
const RENAMED = {};
const baseOf = (file) => RENAMED[file] ?? file;
/**
 * Survivors that no test can kill, each `{ file, mutatorName, replacement, lineText, reason }`: the line's text trimmed, and
 * the reason naming why no input reaches it. Empty at the base; an entry is added only when the close has looked at the
 * survivor and found no input that reaches it. A stale entry (it matches no survivor of the close) fails `compare`.
 */
const EQUIVALENT = [
  {
    file: `${MODEL}SimulationSession.ts`,
    mutatorName: "ConditionalExpression",
    replacement: "false",
    lineText: "if (!live.current()) return;",
    reason:
      "land's own evaluation suspends before it reads its exit (the resolver of a Live run runs only after the run call has returned), and a newer run's fork interrupts the older fiber at that suspension, so a run that reaches this line is current. The one window in which an older run ends after a newer begin is the older engine's synchronous prefix inside `drain`, which the session's engine cannot stay inside: a newer run started from the resolver and from the run span's own creation were both driven, and the older run never landed with this line removed. The stated run's own guard, which the same window reaches for a synchronous engine, is pinned by ST14 and ST15.",
  },
];
/** Why no Stryker config measures a file under `src/react`. */
const REACT_WHY = "stryker.devtools.mjs mutates src/model only, so no mutant is made of a React file; its render is pinned by Simulator.broke.test.tsx and the held stopped-box tests";
/** Files the phase edits that no Stryker config reaches, written into every record so the gap is stated, not silent. */
const UNMEASURED = ["Simulator.tsx", "StoppedBox.tsx", "theme.ts"].map((name) => ({ file: `packages/devtools/src/react/${name}`, why: REACT_WHY }));
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
/** The paths a record reads: the group's files, and every test and source of the package that made the report. */
export const statusPaths = (group) => [...GROUPS[group].files, "packages", DEVTOOLS.config];
/** The porcelain status of the paths a group's record reads. */
const gitStatus = (group) => git("status", "--porcelain", "--", ...statusPaths(group));

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
 * config spread with `ignoreStatic: false`, run with `--mutate <file>`. A born file has no base, so its allowance is the whole
 * of what it holds. Empty at the base; an entry is added only when the close has run such a mutant by hand and seen it Killed.
 */
const EXAMINED = {
  // `makeConfigure`'s own arrow, `() => undefined` in its place: a static mutant, because the arrow is built when the module
  // loads. Run by hand with `ignoreStatic: false` it is Killed by eight rows of ConfigurePrologue.test.ts.
  [PROLOGUE]: { "ArrowFunction () => undefined": 1 },
};

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

/** Whether `entry` explains the Survived mutant `m` of `file`: same mutation on a line of the same text. */
const explains = (entry, file, m) => entry.file === file && m.status === "Survived" && entry.mutatorName === m.mutator && entry.replacement === m.replacement && entry.lineText === m.lineText;
/** The open mutants of `file` that no EQUIVALENT entry explains. Pure. */
export const unexplained = (open, file, equivalent = EQUIVALENT) => open.filter((m) => !equivalent.some((entry) => explains(entry, file, m)));
/** Why an EQUIVALENT entry fails: it states no reason, or it matches no survivor of the close (`closeFiles`: file -> counts). Pure. */
export const equivalentReasons = (equivalent, closeFiles) =>
  equivalent.flatMap((entry) => [
    ...(typeof entry.reason !== "string" || entry.reason.trim() === "" ? [`the equivalent entry for ${entry.file} (${entry.mutatorName} -> ${entry.replacement}) states no reason`] : []),
    ...((closeFiles[entry.file]?.open ?? []).some((m) => explains(entry, entry.file, m)) ? [] : [`the equivalent entry for ${entry.file} (${entry.mutatorName} -> ${entry.replacement}) matches no survivor: remove it`]),
  ]);

/**
 * The sum rule over the code the phase moves: the touched base's detected / valid over its files must not exceed the close's
 * over the touched files and the born files together. Integer cross-multiplication, so no rounded float decides. Pure.
 */
export const sumReasons = (baseFiles, closeFiles) => {
  const sum = (files) => Object.values(files).reduce((acc, f) => ({ detected: acc.detected + f.detected, valid: acc.valid + f.valid }), { detected: 0, valid: 0 });
  const b = sum(baseFiles);
  const c = sum(closeFiles);
  if (c.valid === 0) return ["the close holds no valid mutant to sum"];
  return c.detected * b.valid < b.detected * c.valid ? [`the sum fell from ${b.detected}/${b.valid} over the base files to ${c.detected}/${c.valid} over the close files: moved code cannot lower the aggregate`] : [];
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
    const lines = (byFile[file].source ?? "").split("\n");
    const all = byFile[file].mutants.map((m) => ({ status: m.status, mutator: m.mutatorName, replacement: m.replacement, line: m.location.start.line, column: m.location.start.column, lineText: (lines[m.location.start.line - 1] ?? "").trim(), killedBy: m.killedBy ?? [] }));
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
    console.log(`${file} ${out[file].detected}/${out[file].valid} survived ${out[file].survived} no coverage ${out[file].noCoverage} ignored ${out[file].ignored} timeout ${out[file].timeout}`);
    for (const m of out[file].open) console.log(`  ${m.status} ${file}:${m.line} ${m.mutator} -> ${m.replacement}`);
  }
  return out;
};

/**
 * Every reason the close fails, given the two records and each file's `git diff -U0 <base head> <close head>`. Pure.
 * A fall in the score is a reason only when the file also has a new open mutant: a score that fell because the code
 * holding killed mutants was deleted passes, and any new Survived or NoCoverage mutant that EQUIVALENT does not explain fails.
 */
export const judge = ({ base, close, diffs }, files, log = console.log, examined = EXAMINED, equivalent = EQUIVALENT) => {
  const bad = [];
  for (const file of files) {
    const b = base.files[baseOf(file)];
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
    const open = unexplained(beyond(c.open, (x) => key(x), bag(b.open, atBase)), file, equivalent);
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
 * Every reason a close-only file fails: it has no base, so it is judged absolutely. It may hold no open mutant (EQUIVALENT
 * explains a Survived one), no Ignored mutant beyond what EXAMINED records as run by hand and Killed, and no Timeout, it holds
 * at least one Killed mutant, and every Killed mutant must have a killer among the tests of `killers`. Pure.
 */
export const judgeNew = ({ close }, files, log = console.log, killers = GROUPS.stated.killers, equivalent = EQUIVALENT, examined = EXAMINED) => {
  const bad = [];
  for (const file of files) {
    const c = close.files[file];
    if (c === undefined) {
      bad.push(`${file} is missing from the close record`);
      continue;
    }
    for (const m of unexplained(c.open, file, equivalent)) bad.push(`${file}:${m.line} is new and has a ${m.status} mutant: ${m.mutator} -> ${m.replacement}`);
    const allowed = new Map(Object.entries(examined[file] ?? {}));
    for (const m of beyond(c.ignoredMutants, kind, allowed)) bad.push(`${file}:${m.line} is new and Ignored: ${m.mutator} -> ${m.replacement}`);
    for (const [k, n] of Object.entries(examined[file] ?? {})) {
      if (c.ignoredMutants.filter((x) => kind(x) === k).length < n) bad.push(`${file} no longer holds the ${n} examined Ignored ${k} mutant(s) EXAMINED allows: remove the entry`);
    }
    for (const m of c.timeouts ?? []) bad.push(`${file}:${m.line} timed out: a test must kill it`);
    for (const m of c.outside ?? []) bad.push(`${file}:${m.line} is killed only by tests outside ${killers}`);
    if (c.killed === 0) bad.push(`${file} is new and holds no killed mutant`);
    log(`${file} ${c.detected}/${c.valid}, survived ${c.survived}, no coverage ${c.noCoverage}, ignored ${c.ignored}, timeout ${c.timeout}`);
  }
  return bad;
};

/**
 * The record a `record` writes into, the reasons it may not, and the groups a restart dropped. Pure. `restart` is for a
 * close only: it keeps no group of the old record, so a re-close after a fix commit is measured on one commit again. A
 * record holds one `phase_base`, the HEAD the phase started on, and a record naming another is refused.
 */
export const heldFor = (held, name, group, head, restart, phaseBase = head) => {
  if (restart && name !== "close") return { held, bad: ["--restart re-measures a close, never a base"], dropped: [] };
  if (restart) return { held: { phase: "87", phase_base: phaseBase, unmeasured: UNMEASURED, groups: {} }, bad: [], dropped: Object.keys(held.groups).filter((other) => other !== group) };
  const out = `${D}87-mutation-${name}.json`;
  const bad = Object.entries(held.groups)
    .filter(([other, entry]) => other !== group && entry.head !== head)
    .map(([other, entry]) => `${out} holds ${other} measured on ${entry.head}, not ${head}: every group of a record is measured on one commit`);
  if (held.phase_base !== phaseBase) bad.push(`${out} holds phase_base ${held.phase_base}, not ${phaseBase}: a record names the one phase base`);
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
  const baseFile = `${D}87-mutation-base.json`;
  if (name === "close" && !existsSync(baseFile)) fail([`${baseFile} does not exist: the base is recorded first`]);
  const phaseBase = name === "base" ? head : readJson(baseFile).phase_base;
  const out = `${D}87-mutation-${name}.json`;
  const { held, bad, dropped } = heldFor(existsSync(out) ? readJson(out) : { phase: "87", phase_base: phaseBase, unmeasured: UNMEASURED, groups: {} }, name, group, head, restart, phaseBase);
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
    const base = readJson(`${D}87-mutation-base.json`).groups[group];
    if (base === undefined) fail([`the ${group} group is missing from the base record`]);
    const diffs = Object.fromEntries(files.map((file) => [file, git("diff", "-U0", base.head, "--", baseOf(file), file)]));
    bad.push(...judge({ base, close, diffs }, files));
  }
  bad.push(...equivalentReasons(EQUIVALENT.filter((entry) => files.includes(entry.file)), close.files));
  if (bad.length > 0) fail(bad);
  console.log(`probe ${group}: the report passes as its close would judge it`);
};

const compare = () => {
  const bad = [];
  const baseRecord = readJson(`${D}87-mutation-base.json`);
  const closeRecord = readJson(`${D}87-mutation-close.json`);
  if (baseRecord.phase_base !== closeRecord.phase_base) bad.push(`the records name different phase bases: ${baseRecord.phase_base} and ${closeRecord.phase_base}`);
  if (baseRecord.groups.touched?.head !== baseRecord.phase_base) bad.push("the touched base was not measured at the phase base");
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
    const diffs = Object.fromEntries(files.map((file) => [file, git("diff", "-U0", base.head, close.head, "--", baseOf(file), file)]));
    bad.push(...judge({ base, close, diffs }, files));
  }
  const closeFiles = Object.assign({}, ...Object.values(closeRecord.groups).map((entry) => entry.files));
  bad.push(...equivalentReasons(EQUIVALENT, closeFiles));
  if (baseRecord.groups.touched !== undefined && closeRecord.groups.touched !== undefined) bad.push(...sumReasons(baseRecord.groups.touched.files, closeFiles));
  if (bad.length > 0) fail(bad);
  console.log("no file has an open or Ignored mutant its base did not have, every score that fell lost only killed mutants, and the sum over the moved code holds");
};

const selfTest = () => {
  const m = (status, line, extra = {}) => ({ status, mutator: "StringLiteral", replacement: '""', line, column: 4, lineText: "const a = 1;", ...extra });
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
  const F = TOUCHED[0];
  // Base: one survivor on line 20, a static mutant Ignored on line 3; the close rewrote lines 9 to 11 into 9 to 10, so
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
  // The touched group has a base and is judged by the removed-mutant rule: a close equal to its base passes, deleted killed
  // mutants pass, and a new Survived or NoCoverage mutant fails.
  {
    const touchedBase = { files: { [F]: file(28, 28) } };
    const none = { [F]: "" };
    const judgeTouched = (close) => judge({ base: touchedBase, close: { files: { [F]: close } }, diffs: none }, [F], () => {}, {}, []).length;
    for (const [name, close, want] of [
      ["a touched close equal to its base passes", file(28, 28), 0],
      ["a touched close whose only change is deleted killed mutants passes", file(20, 20), 0],
      ["a touched close with a new Survived mutant fails the score and the mutant", file(28, 29, [m("Survived", 7)]), 2],
      ["a touched close with a new NoCoverage mutant fails the score and the mutant", file(28, 29, [m("NoCoverage", 7)]), 2],
      ["a touched close with a new Ignored mutant fails", file(28, 28, [], [m("Ignored", 7)]), 1],
    ]) {
      const got = judgeTouched(close);
      if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
      passed++;
    }
  }
  // A survivor an EQUIVALENT entry explains is not new, a stale entry fails and an entry with no reason fails.
  {
    const entry = { file: F, mutatorName: "StringLiteral", replacement: '""', lineText: "const a = 1;", reason: "no input reaches the line" };
    const plain = { files: { [F]: file(42, 42) } };
    const survivor = { files: { [F]: file(42, 43, [m("Survived", 30)]) } };
    const withEntry = (equivalent) => judge({ base: plain, close: survivor, diffs: { [F]: "" } }, [F], () => {}, {}, equivalent).length;
    for (const [name, got, want] of [
      ["a new survivor with no equivalent entry fails the score and the mutant", withEntry([]), 2],
      ["a new survivor an equivalent entry explains passes", withEntry([entry]), 0],
      ["an entry for another line text does not explain it", withEntry([{ ...entry, lineText: "const b = 2;" }]), 2],
      ["an entry for another mutator does not explain it", withEntry([{ ...entry, mutatorName: "ObjectLiteral" }]), 2],
      ["an entry for another file does not explain it", withEntry([{ ...entry, file: TOUCHED[1] }]), 2],
      ["an entry explains a Survived mutant, never a NoCoverage one", judge({ base: plain, close: { files: { [F]: file(42, 43, [m("NoCoverage", 30)]) } }, diffs: { [F]: "" } }, [F], () => {}, {}, [entry]).length, 2],
      ["an entry that matches a survivor of the close is not stale", equivalentReasons([entry], { [F]: file(42, 43, [m("Survived", 30)]) }).length, 0],
      ["an entry that matches no survivor of the close is stale", equivalentReasons([entry], { [F]: file(42, 42) }).length, 1],
      ["an entry for a file the close does not hold is stale", equivalentReasons([entry], {}).length, 1],
      ["an entry with an empty reason fails", equivalentReasons([{ ...entry, reason: "  " }], { [F]: file(42, 43, [m("Survived", 30)]) }).length, 1],
      ["an entry with no reason at all fails", equivalentReasons([{ ...entry, reason: undefined }], { [F]: file(42, 43, [m("Survived", 30)]) }).length, 1],
    ]) {
      if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
      passed++;
    }
  }
  // A close-only file has no base and is absolute: an open mutant, an Ignored one, a Timeout, no Killed mutant at all and a
  // Killed mutant killed only outside the killers file each fail; a file with none passes.
  const O = STATED;
  const ownerOf = (f) => ({ files: { [O]: f } });
  for (const [name, close, want] of [
    ["a born close with nothing open, Ignored, timed out or outside passes", ownerOf(file(10, 10)), 0],
    ["a born close with a Survived mutant fails", ownerOf(file(9, 10, [m("Survived", 5)])), 1],
    ["a born close with a NoCoverage mutant fails", ownerOf(file(9, 10, [m("NoCoverage", 5)])), 1],
    ["a born close with an Ignored mutant fails", ownerOf(file(10, 10, [], [m("Ignored", 3)])), 1],
    ["a born close with a Timeout fails", ownerOf(file(10, 10, [], [], { timeouts: [m("Timeout", 7)] })), 1],
    ["a born close with no mutant at all fails", ownerOf(file(0, 0)), 1],
    ["a born close with a mutant killed only outside its tests fails", ownerOf(file(10, 10, [], [], { outside: [m("Killed", 8)] })), 1],
    ["a born close missing from the close fails", { files: {} }, 1],
  ]) {
    const got = judgeNew({ close }, [O], () => {}, GROUPS.stated.killers, []).length;
    if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
    passed++;
  }
  {
    const entry = { file: O, mutatorName: "StringLiteral", replacement: '""', lineText: "const a = 1;", reason: "no input reaches the line" };
    const got = judgeNew({ close: ownerOf(file(9, 10, [m("Survived", 5)])) }, [O], () => {}, GROUPS.stated.killers, [entry]).length;
    if (got !== 0) fail([`self-test FAILED: a born survivor an equivalent entry explains passes: ${got} reasons`]);
    passed++;
  }
  // An examined allowance admits exactly its count of Ignored mutants of its kind in a born file, and a stale one fails.
  for (const [name, close, want] of [
    ["a born Ignored mutant an examined allowance admits passes", ownerOf(file(10, 10, [], [m("Ignored", 3)])), 0],
    ["a second born Ignored mutant of the kind fails", ownerOf(file(10, 10, [], [m("Ignored", 3), m("Ignored", 9)])), 1],
    ["a born Ignored mutant of another kind fails, and leaves the allowance stale", ownerOf(file(10, 10, [], [{ ...m("Ignored", 3), mutator: "Other" }])), 2],
    ["an examined allowance the born close no longer needs fails", ownerOf(file(10, 10)), 1],
  ]) {
    const got = judgeNew({ close }, [O], () => {}, GROUPS.stated.killers, [], { [O]: { [kind(m("Ignored", 3))]: 1 } }).length;
    if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
    passed++;
  }
  // The base of a born file is refused with its reason, and every other record is not.
  for (const [name, got, want] of [
    ["a base of StatedRun.ts is refused as born in the phase", bornReasons("base", "stated").join(), "StatedRun.ts is born in the phase and has no base"],
    ["a base of ConfigurePrologue.ts is refused as born in the phase", bornReasons("base", "prologue").join(), "ConfigurePrologue.ts is born in the phase and has no base"],
    ["a close of StatedRun.ts is not refused", bornReasons("close", "stated").join(), ""],
    ["a close of ConfigurePrologue.ts is not refused", bornReasons("close", "prologue").join(), ""],
    ["a base of the touched files is not refused", bornReasons("base", "touched").join(), ""],
    ["a close of the touched files is not refused", bornReasons("close", "touched").join(), ""],
  ]) {
    if (got !== want) fail([`self-test FAILED: ${name}: ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`]);
    passed++;
  }
  // The sum rule: a close that holds the base ratio over its seven files passes, one that falls fails, a close that gains
  // passes, and a close holding no mutant is refused.
  for (const [name, got, want] of [
    ["a sum equal to the base passes", sumReasons({ a: file(90, 100) }, { a: file(60, 66), b: file(30, 34) }).length, 0],
    ["a sum above the base passes", sumReasons({ a: file(90, 100) }, { a: file(60, 62), b: file(30, 31) }).length, 0],
    ["a sum below the base fails", sumReasons({ a: file(90, 100) }, { a: file(60, 66), b: file(29, 34) }).length, 1],
    ["a sum that fell only because the code was deleted still fails when the ratio falls", sumReasons({ a: file(90, 100) }, { a: file(50, 60) }).length, 1],
    ["a close holding no valid mutant is refused", sumReasons({ a: file(90, 100) }, {}).length, 1],
  ]) {
    if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
    passed++;
  }
  // The report a close-only group reads, planted: a mutant killed by a StatedRun.test.ts test (alone, or beside a store's
  // test) has a killer in the group's tests, one killed only by TimelineFeed.test.ts has none, and a report with no
  // testFiles cannot be read.
  {
    const K = GROUPS.stated.killers;
    const R = "packages/devtools/test/model/TimelineFeed.test.ts";
    const raw = (status, line, killedBy) => ({ status, mutatorName: "StringLiteral", replacement: '""', location: { start: { line, column: 4 } }, killedBy });
    const report = (mutants, testFiles = { [K]: { tests: [{ id: "1" }] }, [R]: { tests: [{ id: "2" }] } }) => ({ files: { [O]: { source: "", mutants } }, testFiles });
    const verdict = (rep, killers = K) => {
      const read = classify(rep, [O], killers);
      return read.bad.length > 0 ? read.bad : judgeNew({ close: { files: read.out } }, [O], () => {}, killers, []);
    };
    for (const [name, rep, want] of [
      ["a Killed mutant killed by a StatedRun.test.ts test passes", report([raw("Killed", 5, ["1"])]), 0],
      ["every Killed mutant having a killer in the killers file passes", report([raw("Killed", 5, ["1"]), raw("Killed", 6, ["1", "2"])]), 0],
      ["a Killed mutant killed by a StatedRun.test.ts test and a store test passes", report([raw("Killed", 5, ["1", "2"])]), 0],
      ["a Killed mutant killed only by TimelineFeed.test.ts fails", report([raw("Killed", 5, ["2"])]), 1],
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
    // The line's text rides the open mutant, so EQUIVALENT can match it.
    const withSource = classify({ files: { [F]: { source: "a\n  const a = 1;  \nc", mutants: [raw("Survived", 2, undefined)] } } }, [F], undefined);
    if (withSource.out[F]?.open[0]?.lineText !== "const a = 1;") fail(["self-test FAILED: a survivor does not carry the trimmed text of its line"]);
    passed++;
    // The report names the invocation that made it: the group's own files and its own bail setting.
    for (const [name, group, config, want] of [
      ["a touched report made with the group's five files and no --disableBail is accepted", "touched", { mutate: TOUCHED }, 0],
      ["a touched report made with the files in another order is accepted", "touched", { mutate: [...TOUCHED].reverse() }, 0],
      ["a touched report made with explicit disableBail false is accepted", "touched", { mutate: TOUCHED, disableBail: false }, 0],
      ["a touched report made with --disableBail is refused", "touched", { mutate: TOUCHED, disableBail: true }, 1],
      ["a touched report holding four of the five files is refused", "touched", { mutate: TOUCHED.slice(1) }, 1],
      ["a touched report holding the five files and a born one is refused", "touched", { mutate: [...TOUCHED, STATED] }, 1],
      ["a stated report made with the group's file and --disableBail is accepted", "stated", { mutate: [STATED], disableBail: true }, 0],
      ["a prologue report made with the group's file and --disableBail is accepted", "prologue", { mutate: [PROLOGUE], disableBail: true }, 0],
      ["a stated report made without --disableBail is refused", "stated", { mutate: [STATED], disableBail: false }, 1],
      ["a prologue report made without --disableBail is refused", "prologue", { mutate: [PROLOGUE] }, 1],
      ["a stated report whose config.mutate is another file is refused", "stated", { mutate: [PROLOGUE], disableBail: true }, 1],
      ["a touched report with no config is refused", "touched", undefined, 1],
    ]) {
      const got = reportReasons({ config }, GROUPS[group], "report").length;
      if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
      passed++;
    }
  }
  // The record a record writes into: one beside a group measured on another commit is refused, a restart of a close
  // drops the old record and names what it dropped, a base is never restarted, and a record names the one phase base.
  const held = { phase: "87", phase_base: "p", groups: { other: { head: "a" } } };
  for (const [name, got, want] of [
    ["a record beside a group measured on another commit is refused", heldFor(held, "base", "touched", "b", false, "p").bad.length, 1],
    ["a record beside a group measured on the same commit keeps it", heldFor(held, "close", "touched", "a", false, "p").bad.length + (heldFor(held, "close", "touched", "a", false, "p").held.groups.other === undefined ? 1 : 0), 0],
    ["--restart on a close starts a fresh record and names what it dropped", (() => { const r = heldFor(held, "close", "touched", "b", true, "p"); return r.bad.length + Object.keys(r.held.groups).length + (r.dropped.join() === "other" ? 0 : 1) + (r.held.phase_base === "p" ? 0 : 1); })(), 0],
    ["--restart on a base is refused", heldFor(held, "base", "touched", "b", true, "p").bad.length, 1],
    ["a record naming another phase base is refused", heldFor({ ...held, groups: {} }, "base", "touched", "b", false, "q").bad.length, 1],
    ["a record naming the same phase base is not refused", heldFor({ ...held, groups: {} }, "base", "touched", "b", false, "p").bad.length, 0],
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
    dispatch(stubs, mode, mode === "probe" ? ["touched"] : ["base", "touched"], () => status, () => { got = "refused"; });
    if (got !== want) fail([`self-test FAILED: ${mode} on ${JSON.stringify(status)}: ${got}, wanted ${want}`]);
    passed++;
  }
  for (const group of Object.keys(GROUPS)) {
    const asked = [];
    dispatch(MODES, "record", ["base", group], (g) => { asked.push(g); return planted; }, () => {});
    if (asked.join() !== group) fail([`self-test FAILED: a ${group} record read the status of ${asked.join() || "nothing"}`]);
    passed++;
  }
  // The status a record reads covers the group's own files and the whole of `packages`, so a test file written but not
  // committed is refused too.
  for (const group of Object.keys(GROUPS)) {
    const paths = statusPaths(group);
    if (!GROUPS[group].files.every((f) => paths.includes(f)) || !paths.includes("packages") || !paths.includes("stryker.devtools.mjs")) fail([`self-test FAILED: the status of a ${group} record does not read its files, packages and the Stryker config`]);
    passed++;
  }
  if (gitStatus.toString() !== '(group) => git("status", "--porcelain", "--", ...statusPaths(group))') fail(["self-test FAILED: the status reader does not read the paths a record reads"]);
  passed++;
  // The touched group runs without bail, the born groups with it, each over its own files.
  const M = "packages/devtools/src/model/";
  if (invocation("touched") !== `pnpm exec stryker run stryker.devtools.mjs --mutate ${M}SupersedingRun.ts,${M}TimelineFeed.ts,${M}DiagnosticsFeed.ts,${M}SimulationSession.ts,${M}GatesFeed.ts` || invocation("stated") !== `pnpm exec stryker run stryker.devtools.mjs --mutate ${STATED} --disableBail` || invocation("prologue") !== `pnpm exec stryker run stryker.devtools.mjs --mutate ${PROLOGUE} --disableBail`) fail(["self-test FAILED: the invocations are not the five touched files without bail and each born file alone with --disableBail"]);
  passed++;
  if (Object.keys(GROUPS).join() !== "touched,stated,prologue" || NEW_FILES.join() !== `${STATED},${PROLOGUE}` || GROUPS.touched.closeOnly === true || GROUPS.stated.closeOnly !== true || GROUPS.prologue.closeOnly !== true) fail(["self-test FAILED: the groups or NEW_FILES are not the touched files, StatedRun.ts and ConfigurePrologue.ts"]);
  passed++;
  if (Object.keys(RENAMED).length !== 0 || baseOf(F) !== F) fail(["self-test FAILED: RENAMED is not empty"]);
  passed++;
  if (Object.entries(EXAMINED).some(([file, kinds]) => !NEW_FILES.includes(file) || Object.values(kinds).some((n) => !Number.isInteger(n) || n < 1)) || EQUIVALENT.some((e) => !TOUCHED.includes(e.file) || [e.mutatorName, e.replacement, e.lineText, e.reason].some((v) => typeof v !== "string" || v.trim() === ""))) fail(["self-test FAILED: an EXAMINED allowance is not a positive count in a born file, or an EQUIVALENT entry is not of a touched file with its mutator, replacement, line text and reason"]);
  passed++;
  if (UNMEASURED.map((u) => u.file.split("/").pop()).join() !== "Simulator.tsx,StoppedBox.tsx,theme.ts" || UNMEASURED.some((u) => u.why.trim() === "")) fail(["self-test FAILED: UNMEASURED is not the three React files, each with a reason"]);
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
const usage = () => fail(["usage: node 87-mutation.mjs record base touched | record close touched|stated|prologue [--restart] | probe touched|stated|prologue | compare | --self-test"]);
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
