// The phase's mutation record, through `stryker.audit.mjs`, over one group, `audit`. The config mutates every file under
// `packages/audit/src` but the barrel, so the group is measured at the base over the five files the phase touches or holds
// (AuditArchive.ts, ArchiveFacts.ts, Retention.ts, CodecMade.ts, SequenceIntegrity.ts) and at the close over those five plus
// the born step (HostBatch.ts), with one and the same bail setting (no `--disableBail`), so the five are comparable and the
// base is the run the research measured. `record base` writes `phase_base`, the HEAD the phase started on, and every file's
// counts with its open (Survived, NoCoverage) and Ignored mutants; it refuses a tree where `packages` or the Stryker config
// differs from HEAD, a tree where HostBatch.ts already exists, and a report its invocation did not make (its `config.mutate`
// is not the five files, or its `config.disableBail` is true). `record close [--restart]` reads the close report (the five
// plus HostBatch.ts) and writes `89-mutation-close.json`, with the same counts and a `phase91_base` field; `--restart` starts
// the close record afresh, for a re-close after a fix commit (a base is never restarted), and every `record close` writes
// `phase91_base`, so a close re-recorded after the code review carries the post-review score of ArchiveFacts.ts, the base the
// next fold of that file is judged against. `probe` judges the last report as the close would and writes nothing.
// The removed-mutant rule, for the five files, which have a base: a touched file's score does not fall because a new open
// mutant came with it (a score that fell only because killed mutants were deleted passes), a new open mutant (Survived or
// NoCoverage) never passes, and neither does a new Ignored mutant of a kind the base did not hold, plus what EXAMINED records.
// A mutant is located by its line number carried through `git diff -U0 <base head> <close head>`, never by the text of its
// line, and every comparison counts mutants as a multiset, so a second copy of one is a new one. A Survived mutant that
// matches an entry of EQUIVALENT (file, mutator, replacement, the trimmed text of its line, the reason) is explained, never
// new, and an entry that matches no survivor, or states no reason, fails.
// The absolute rule, for the born HostBatch.ts, which has no base, so a base record of it is refused: a close holds no
// Survived, NoCoverage, Ignored or Timeout mutant and at least one Killed mutant. It has no `killers` clause: the close keeps
// the base's bail setting so the five compare, and a bailed run names one killer for a mutant, so the clause cannot be read;
// the order rows of HostBatch.test.ts and the scratch variants hold the property that every mutant has a killer among them.
// The EXAMINED allowance: an Ignored (static) mutant is admitted only after it was run by hand with the config spread to
// `ignoreStatic: false`, `--mutate <file>`, and seen Killed, by its file, kind (mutator and replacement) and count; an
// allowance a close does not need, or an Ignored mutant beyond it, fails.
// The moved note: the two `now` checks and the rows wrap leave AuditArchive.ts, Retention.ts and ArchiveFacts.ts for
// HostBatch.ts, each to the home `moved` names; no file is renamed, so RENAMED is empty and a close path is its own base path.
// SequenceIntegrity.ts holds two re-exports and so no mutant, and Stryker lists no file that holds none: a report may omit it,
// and the record writes it with zero counts. `unmeasured` is empty: every file the phase edits is under `packages/audit/src/**/*.ts` minus `index.ts`, which the glob of
// `stryker.audit.mjs` mutates. `compare` judges both records by these rules, and checks they name one `phase_base`, that the
// base was measured at it and that `phase91_base` is the close's ArchiveFacts.ts. `--self-test` drives every judge with planted
// records and planted `examined` and `equivalent` arguments, and asserts nothing about the real constants. From the repository
// root, after the invocation (stdin closed, nothing else running):
//   node <this directory>/89-mutation.mjs record base
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
const CONFIG = "stryker.audit.mjs";
const REPORT = "reports/mutation-audit/mutation.json";
const SRC = "packages/audit/src/";
/** The five files measured at the base: the three the phase touches and the two it holds. */
const FIVE = ["AuditArchive", "ArchiveFacts", "Retention", "CodecMade", "SequenceIntegrity"].map((name) => `${SRC}${name}.ts`);
const HOST_BATCH = `${SRC}HostBatch.ts`;
/** A file of two re-exports holds no mutant, and Stryker lists no file that holds none, so the report may omit it. */
const MAY_BE_ABSENT = [`${SRC}SequenceIntegrity.ts`];
const ARCHIVE_FACTS = `${SRC}ArchiveFacts.ts`;
/** The files a report of each record holds: the base the five, the close the five and the born step. */
const FILES = { base: FIVE, close: [...FIVE, HOST_BATCH] };
/** Files born in the phase: they have no base, so a base record of them is refused and a close is judged by `judgeNew`. */
const NEW_FILES = [HOST_BATCH];
/** A close path mapped to its base path. Empty: the phase renames no file. */
const RENAMED = {};
const baseOf = (file) => RENAMED[file] ?? file;
/** Code the phase moves, each with its old and its new home, written into the base record. */
const MOVED = [
  { code: "the now check of archiveAuditTrail", from: `${SRC}AuditArchive.ts`, to: `${HOST_BATCH} admitBatch` },
  { code: "the now check of planRetention", from: `${SRC}Retention.ts`, to: `${HOST_BATCH} admitBatch` },
  { code: "the rows wrap of verifiedArchiveFacts and of planRetention", from: `${ARCHIVE_FACTS} and ${SRC}Retention.ts`, to: `${HOST_BATCH} admitRows` },
];
const UNMEASURED_WHY = "every file the phase edits is under packages/audit/src/**/*.ts minus index.ts, the glob stryker.audit.mjs mutates, so no edited file escapes a run";
/**
 * Survivors that no test can kill, each `{ file, mutatorName, replacement, lineText, reason }`: the line's text trimmed, and the
 * reason naming why no input reaches it. An entry is added only when the close has looked at the survivor and found no input
 * that reaches it. A stale entry (it matches no survivor of the close) fails `compare`.
 */
// Empty since the review of the phase: its one entry was the `filter` over rows the check had already refused holes
// from (`MethodExpression -> taken`), and `admitRows` checks each entry as it reads it and pushes only admitted rows, so
// the filter and its equivalent survivor are gone (WR-02).
const EQUIVALENT = [];
/**
 * Ignored mutants a close may hold beyond its base, per file and kind, each run by hand and Killed there: the config spread
 * with `ignoreStatic: false`, run with `--mutate <file>`. A born file has no base, so its allowance is the whole of what it
 * holds. An entry is added only when such a mutant was run by hand and seen Killed.
 */
const EXAMINED = {
  "packages/audit/src/HostBatch.ts": {
    // isCodecMadeRow: the guard that reads the codec's answer as the row type (the review of the phase replaced the
    // takeRows arrow this entry first named); run by hand with ignoreStatic false, it is Killed.
    "ArrowFunction () => undefined": 1,
  },
  "packages/audit/src/CodecMade.ts": {
    // isCodecMade: the per-entry question that replaced rowsRefusal in the review of the phase; run by hand with
    // ignoreStatic false and `--mutate packages/audit/src/HostBatch.ts,packages/audit/src/CodecMade.ts`, it is Killed.
    "ArrowFunction () => undefined": 1,
  },
};
const invocation = (name) => `pnpm exec stryker run ${CONFIG} --mutate ${FILES[name].join(",")}`;
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
/** The paths a record reads: every test and source of the package that made the report, and the Stryker config. */
export const statusPaths = () => ["packages", CONFIG];
/** The porcelain status of the paths a record reads. */
const gitStatus = () => git("status", "--porcelain", "--", ...statusPaths());

/** Why a base of the group may not be made at all: a born file exists, and so has nothing to be measured against. Pure. */
export const bornReasons = (name, exists) => (name === "base" ? NEW_FILES.filter((file) => exists(file)).map((file) => `${file.split("/").pop()} exists: it is born in the phase and has no base`) : []);

/** Why a report is not the one the invocation of `name` makes: it mutated other files, or ran with bail off. Pure. */
export const reportReasons = (report, name) => {
  const mutate = [...(report.config?.mutate ?? [])].sort().join(",");
  return mutate === [...FILES[name]].sort().join(",") && report.config?.disableBail !== true ? [] : [`the report was not made by the ${name} invocation`];
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

const relPath = (file) => (isAbsolute(file) ? relative(process.cwd(), file) : file);

/**
 * Each file's counts and its non-Killed mutants from a parsed Stryker report holding exactly `files` (but for a file of
 * MAY_BE_ABSENT, which a report may omit: it has zero counts), and the reasons it cannot be read. Pure; `source` is checked
 * by `tally`.
 */
export const classify = (report, files) => {
  const byFile = {};
  for (const [file, entry] of Object.entries(report.files)) byFile[relPath(file)] = entry;
  const held = Object.keys(byFile).sort().join(",");
  if (held !== files.filter((file) => byFile[file] !== undefined || !MAY_BE_ABSENT.includes(file)).sort().join(",")) return { out: {}, bad: [`the report holds ${held}, not exactly ${files.join(",")}`] };
  const out = {};
  for (const file of files) {
    const lines = (byFile[file]?.source ?? "").split("\n");
    const all = (byFile[file]?.mutants ?? []).map((m) => ({ status: m.status, mutator: m.mutatorName, replacement: m.replacement, line: m.location.start.line, column: m.location.start.column, lineText: (lines[m.location.start.line - 1] ?? "").trim() }));
    const count = (status) => all.filter((m) => m.status === status).length;
    const detected = all.filter((m) => DETECTED.has(m.status)).length;
    const open = all.filter((m) => OPEN.has(m.status));
    out[file] = { killed: count("Killed"), timeout: count("Timeout"), survived: count("Survived"), noCoverage: count("NoCoverage"), ignored: count("Ignored"), detected, valid: detected + open.length, open, ignoredMutants: all.filter((m) => m.status === "Ignored") };
  }
  return { out, bad: [] };
};

/** Each file's counts and its non-Killed mutants from a Stryker JSON report holding exactly `files`. */
const tally = (reportFile, files) => {
  const report = readJson(reportFile);
  const { out, bad } = classify(report, files);
  if (bad.length > 0) fail(bad.map((line) => `${reportFile}: ${line}`));
  for (const file of files) {
    const entry = Object.entries(report.files).find(([name]) => relPath(name) === file)?.[1];
    if (entry !== undefined && entry.source !== readFileSync(file, "utf8")) fail([`the report for ${file} is not the file on disk`]);
    console.log(`${file} ${out[file].detected}/${out[file].valid} survived ${out[file].survived} no coverage ${out[file].noCoverage} ignored ${out[file].ignored} timeout ${out[file].timeout}`);
    for (const m of out[file].open) console.log(`  ${m.status} ${file}:${m.line} ${m.mutator} -> ${m.replacement}`);
  }
  return out;
};

/**
 * Every reason the close fails for the files that have a base, given the two records and each file's `git diff -U0 <base head>
 * <close head>`. Pure. A fall in the score is a reason only when the file also has a new open mutant: a score that fell because
 * the code holding killed mutants was deleted passes, and any new Survived or NoCoverage mutant that EQUIVALENT does not
 * explain fails.
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
 * Every reason a born file fails: it has no base, so it is judged absolutely. It may hold no open mutant (EQUIVALENT explains
 * a Survived one), no Ignored mutant beyond what EXAMINED records as run by hand and Killed, and no Timeout, and it holds at
 * least one Killed mutant. There is no `killers` clause: a bailed run names one killer for a mutant. Pure.
 */
export const judgeNew = ({ close }, files, log = console.log, equivalent = EQUIVALENT, examined = EXAMINED) => {
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
    if (c.timeout > 0) bad.push(`${file} is new and holds ${c.timeout} Timeout mutant(s): a test must kill each`);
    if (c.killed === 0) bad.push(`${file} is new and holds no killed mutant`);
    log(`${file} ${c.detected}/${c.valid}, survived ${c.survived}, no coverage ${c.noCoverage}, ignored ${c.ignored}, timeout ${c.timeout}`);
  }
  return bad;
};

/** The percentage `detected / valid` to two places, an integer cross-checked form of the score. Pure. */
export const scoreOf = (detected, valid) => (valid === 0 ? 0 : Math.round((detected * 10000) / valid) / 100);

/** The `phase91_base` field of a close record: ArchiveFacts.ts as measured at `head`. Pure. */
export const phase91Base = (files, head) => ({ file: ARCHIVE_FACTS, head, detected: files[ARCHIVE_FACTS].detected, valid: files[ARCHIVE_FACTS].valid, score: scoreOf(files[ARCHIVE_FACTS].detected, files[ARCHIVE_FACTS].valid) });

/**
 * Why two records do not belong together: they name different phase bases, the base was not measured at the phase base, or
 * `phase91_base` is not the close's ArchiveFacts.ts. Pure.
 */
export const recordReasons = (baseRecord, closeRecord) => {
  const bad = [];
  if (baseRecord.phase_base !== closeRecord.phase_base) bad.push(`the records name different phase bases: ${baseRecord.phase_base} and ${closeRecord.phase_base}`);
  if (baseRecord.groups?.audit?.head !== baseRecord.phase_base) bad.push("the audit base was not measured at the phase base");
  const facts = closeRecord.groups?.audit?.files?.[ARCHIVE_FACTS];
  const next = closeRecord.phase91_base;
  if (facts === undefined || next === undefined || next.file !== ARCHIVE_FACTS || next.head !== closeRecord.groups.audit.head || next.detected !== facts.detected || next.valid !== facts.valid || next.score !== scoreOf(facts.detected, facts.valid)) {
    bad.push("phase91_base is not the ArchiveFacts.ts counts of the close record");
  }
  return bad;
};

/** Why a close record may not be written over `held`: it names another phase base. Pure. */
export const heldReasons = (held, phaseBase, restart, name) => {
  if (restart && name !== "close") return ["--restart re-measures a close, never a base"];
  return !restart && held !== undefined && held.phase_base !== phaseBase ? [`${D}89-mutation-close.json names phase_base ${held.phase_base}, not ${phaseBase}: a record names the one phase base`] : [];
};

const record = async (name, restart) => {
  const config = (await import(pathToFileURL(resolve(CONFIG)).href)).default;
  if (config.jsonReporter?.fileName !== REPORT) fail([`${CONFIG} no longer reports to the report this reads`]);
  if (config.ignoreStatic !== true) fail([`${CONFIG} no longer sets ignoreStatic: true`]);
  const born = bornReasons(name, existsSync);
  if (born.length > 0) return fail(born);
  const refused = reportReasons(readJson(REPORT), name);
  if (refused.length > 0) fail(refused);
  const head = git("rev-parse", "HEAD").trim();
  const baseFile = `${D}89-mutation-base.json`;
  if (name === "close" && !existsSync(baseFile)) fail([`${baseFile} does not exist: the base is recorded first`]);
  const phaseBase = name === "base" ? head : readJson(baseFile).phase_base;
  const out = `${D}89-mutation-${name}.json`;
  const bad = heldReasons(existsSync(out) ? readJson(out) : undefined, phaseBase, restart, name);
  if (bad.length > 0) fail(bad);
  const files = tally(REPORT, FILES[name]);
  const group = { head, invocation: invocation(name), files };
  const written =
    name === "base"
      ? { phase: "89", phase_base: phaseBase, born: NEW_FILES, moved: MOVED, unmeasured: [], unmeasured_why: UNMEASURED_WHY, close_invocation: invocation("close"), groups: { audit: group } }
      : { phase: "89", phase_base: phaseBase, moved: MOVED, unmeasured: [], groups: { audit: group }, phase91_base: phase91Base(files, head) };
  writeFileSync(out, `${JSON.stringify(written, null, 1)}\n`);
  console.log(`wrote the ${name} record into ${out}`);
};

/** The reasons the last report fails as its close would judge it, writing nothing. */
const probe = () => {
  const bad = reportReasons(readJson(REPORT), "close");
  if (bad.length > 0) fail(bad);
  const files = tally(REPORT, FILES.close);
  const base = readJson(`${D}89-mutation-base.json`).groups.audit;
  const diffs = Object.fromEntries(FIVE.map((file) => [file, git("diff", "-U0", base.head, "--", baseOf(file), file)]));
  bad.push(...judge({ base, close: { files }, diffs }, FIVE));
  bad.push(...judgeNew({ close: { files } }, NEW_FILES));
  bad.push(...equivalentReasons(EQUIVALENT, files));
  if (bad.length > 0) fail(bad);
  console.log("probe: the report passes as its close would judge it");
};

const compare = () => {
  const baseRecord = readJson(`${D}89-mutation-base.json`);
  const closeRecord = readJson(`${D}89-mutation-close.json`);
  const bad = recordReasons(baseRecord, closeRecord);
  const base = baseRecord.groups.audit;
  const close = closeRecord.groups.audit;
  if (base.invocation !== invocation("base")) bad.push("the base record was not made by the base invocation");
  if (close.invocation !== invocation("close")) bad.push("the close record was not made by the close invocation");
  const diffs = Object.fromEntries(FIVE.map((file) => [file, git("diff", "-U0", base.head, close.head, "--", baseOf(file), file)]));
  bad.push(...judge({ base, close, diffs }, FIVE));
  bad.push(...judgeNew({ close }, NEW_FILES));
  bad.push(...equivalentReasons(EQUIVALENT, close.files));
  if (bad.length > 0) fail(bad);
  console.log("no file has an open or Ignored mutant its base did not have, every score that fell lost only killed mutants, and the born step holds none");
};

const selfTest = () => {
  const m = (status, line, extra = {}) => ({ status, mutator: "StringLiteral", replacement: '""', line, column: 4, lineText: "const a = 1;", ...extra });
  const file = (detected, valid, open = [], ignoredMutants = [], extra = {}) => ({
    killed: detected,
    timeout: 0,
    detected,
    valid,
    open,
    survived: open.filter((x) => x.status === "Survived").length,
    noCoverage: open.filter((x) => x.status === "NoCoverage").length,
    ignored: ignoredMutants.length,
    ignoredMutants,
    ...extra,
  });
  const F = FIVE[0];
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
  const check = (name, got, want) => {
    if (got !== want) fail([`self-test FAILED: ${name}: ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`]);
    passed++;
  };
  for (const [name, close, want] of cases) check(name, judge({ base, close, diffs }, [F], () => {}, {}, []).length, want);
  // An examined allowance admits exactly its count of Ignored mutants of its kind, and a stale one fails.
  for (const [name, close, want] of [
    ["an examined Ignored mutant is not new", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9)])), 0],
    ["a second Ignored mutant beyond the examined one fails", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9), m("Ignored", 11)])), 1],
    ["an examined allowance the close no longer needs fails", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3)])), 1],
  ]) {
    check(name, judge({ base, close, diffs }, [F], () => {}, { [F]: { [kind(m("Ignored", 3))]: 1 } }, []).length, want);
  }
  // A fall with no new open mutant: the killed mutants went with the code that held them.
  {
    const logged = [];
    const got = judge({ base, close: closeOf(file(30, 31, [m("Survived", 19)], [m("Ignored", 3)])), diffs }, [F], (line) => logged.push(line), {}, []).length;
    check("a fall with no new open mutant passes as killed mutants removed", got === 0 && logged.join("\n").includes("killed mutants removed"), true);
  }
  // A touched file with a base is judged by the removed-mutant rule: a close equal to its base passes, deleted killed mutants
  // pass, and a new Survived or NoCoverage mutant fails.
  {
    const touchedBase = { files: { [F]: file(28, 28) } };
    const judgeTouched = (close) => judge({ base: touchedBase, close: { files: { [F]: close } }, diffs: { [F]: "" } }, [F], () => {}, {}, []).length;
    for (const [name, close, want] of [
      ["a touched close equal to its base passes", file(28, 28), 0],
      ["a touched close whose only change is deleted killed mutants passes", file(20, 20), 0],
      ["a touched close with a new Survived mutant fails the score and the mutant", file(28, 29, [m("Survived", 7)]), 2],
      ["a touched close with a new NoCoverage mutant fails the score and the mutant", file(28, 29, [m("NoCoverage", 7)]), 2],
      ["a touched close with a new Ignored mutant fails", file(28, 28, [], [m("Ignored", 7)]), 1],
    ]) {
      check(name, judgeTouched(close), want);
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
      ["an entry for another file does not explain it", withEntry([{ ...entry, file: FIVE[1] }]), 2],
      ["an entry explains a Survived mutant, never a NoCoverage one", judge({ base: plain, close: { files: { [F]: file(42, 43, [m("NoCoverage", 30)]) } }, diffs: { [F]: "" } }, [F], () => {}, {}, [entry]).length, 2],
      ["an entry that matches a survivor of the close is not stale", equivalentReasons([entry], { [F]: file(42, 43, [m("Survived", 30)]) }).length, 0],
      ["an entry that matches no survivor of the close is stale", equivalentReasons([entry], { [F]: file(42, 42) }).length, 1],
      ["an entry for a file the close does not hold is stale", equivalentReasons([entry], {}).length, 1],
      ["an entry with an empty reason fails", equivalentReasons([{ ...entry, reason: "  " }], { [F]: file(42, 43, [m("Survived", 30)]) }).length, 1],
      ["an entry with no reason at all fails", equivalentReasons([{ ...entry, reason: undefined }], { [F]: file(42, 43, [m("Survived", 30)]) }).length, 1],
    ]) {
      check(name, got, want);
    }
  }
  // The born file has no base and is absolute: an open mutant, an Ignored one, a Timeout and no Killed mutant at all each fail;
  // a file with none passes.
  const O = HOST_BATCH;
  const ownerOf = (f) => ({ files: { [O]: f } });
  for (const [name, close, want] of [
    ["a born close with nothing open, Ignored or timed out passes", ownerOf(file(10, 10)), 0],
    ["a born close with a Survived mutant fails", ownerOf(file(9, 10, [m("Survived", 5)])), 1],
    ["a born close with a NoCoverage mutant fails", ownerOf(file(9, 10, [m("NoCoverage", 5)])), 1],
    ["a born close with an Ignored mutant fails", ownerOf(file(10, 10, [], [m("Ignored", 3)])), 1],
    ["a born close with a Timeout fails", ownerOf(file(10, 10, [], [], { timeout: 1 })), 1],
    ["a born close with no mutant at all fails", ownerOf(file(0, 0)), 1],
    ["a born close missing from the close fails", { files: {} }, 1],
  ]) {
    check(name, judgeNew({ close }, [O], () => {}, [], {}).length, want);
  }
  {
    const entry = { file: O, mutatorName: "StringLiteral", replacement: '""', lineText: "const a = 1;", reason: "no input reaches the line" };
    check("a born survivor an equivalent entry explains passes", judgeNew({ close: ownerOf(file(9, 10, [m("Survived", 5)])) }, [O], () => {}, [entry], {}).length, 0);
  }
  // An examined allowance admits exactly its count of Ignored mutants of its kind in a born file, and a stale one fails.
  for (const [name, close, want] of [
    ["a born Ignored mutant an examined allowance admits passes", ownerOf(file(10, 10, [], [m("Ignored", 3)])), 0],
    ["a second born Ignored mutant of the kind fails", ownerOf(file(10, 10, [], [m("Ignored", 3), m("Ignored", 9)])), 1],
    ["a born Ignored mutant of another kind fails, and leaves the allowance stale", ownerOf(file(10, 10, [], [{ ...m("Ignored", 3), mutator: "Other" }])), 2],
    ["an examined allowance the born close no longer needs fails", ownerOf(file(10, 10)), 1],
  ]) {
    check(name, judgeNew({ close }, [O], () => {}, [], { [O]: { [kind(m("Ignored", 3))]: 1 } }).length, want);
  }
  // The report a record reads, planted: the base is made over the five files, the close over the five and the born step, and
  // neither with bail off; a report holding other files, or no config, cannot be read.
  {
    const raw = (status, line) => ({ status, mutatorName: "StringLiteral", replacement: '""', location: { start: { line, column: 4 } } });
    const entryOf = (...mutants) => ({ source: "a\n  const a = 1;  \nc", mutants });
    const held = (names) => Object.fromEntries(names.map((name) => [name, entryOf(raw("Killed", 1))]));
    check("a report holding exactly the files is read", classify({ files: held(FIVE) }, FIVE).bad.length, 0);
    check("a report holding one file too many cannot be read", classify({ files: held(FILES.close) }, FIVE).bad.length, 1);
    check("a report holding one file too few cannot be read", classify({ files: held(FIVE.slice(1)) }, FIVE).bad.length, 1);
    check("a report omitting the file that holds no mutant is read, with zero counts", JSON.stringify(Object.entries(classify({ files: held(FIVE.slice(0, 4)) }, FIVE).out[FIVE[4]]).sort()), JSON.stringify(Object.entries(file(0, 0)).sort()));
    check("a report omitting the born file cannot be read", classify({ files: held(FIVE) }, FILES.close).bad.length, 1);
    check("a file the report lists with no mutant has zero counts", JSON.stringify(Object.entries(classify({ files: { [F]: { source: "", mutants: [] } } }, [F]).out[F]).sort()), JSON.stringify(Object.entries(file(0, 0)).sort()));
    check("a survivor carries the trimmed text of its line", classify({ files: { [F]: { source: "a\n  const a = 1;  \nc", mutants: [raw("Survived", 2)] } } }, [F]).out[F].open[0].lineText, "const a = 1;");
    check("the counts of a report are its statuses", JSON.stringify(Object.values(classify({ files: { [F]: entryOf(raw("Killed", 1), raw("Timeout", 2), raw("Survived", 3), raw("NoCoverage", 3), raw("Ignored", 1)) } }, [F]).out[F]).slice(0, 5)), JSON.stringify([1, 1, 1, 1, 1]));
    for (const [name, mode, config, want] of [
      ["a base report made with the five files and no --disableBail is accepted", "base", { mutate: FIVE }, 0],
      ["a base report made with the files in another order is accepted", "base", { mutate: [...FIVE].reverse() }, 0],
      ["a base report made with explicit disableBail false is accepted", "base", { mutate: FIVE, disableBail: false }, 0],
      ["a base report made with --disableBail is refused", "base", { mutate: FIVE, disableBail: true }, 1],
      ["a base report holding the six files is refused", "base", { mutate: FILES.close }, 1],
      ["a base report holding four of the five files is refused", "base", { mutate: FIVE.slice(1) }, 1],
      ["a close report made with the six files is accepted", "close", { mutate: FILES.close }, 0],
      ["a close report made with the five files is refused", "close", { mutate: FIVE }, 1],
      ["a close report made with --disableBail is refused", "close", { mutate: FILES.close, disableBail: true }, 1],
      ["a base report with no config is refused", "base", undefined, 1],
    ]) {
      check(name, reportReasons({ config }, mode).length, want);
    }
  }
  // The base of a born file is refused with its reason, and a close is not.
  check("a base is refused when HostBatch.ts exists", bornReasons("base", () => true).join(), "HostBatch.ts exists: it is born in the phase and has no base");
  check("a base is not refused when HostBatch.ts is absent", bornReasons("base", () => false).length, 0);
  check("a close is not refused when HostBatch.ts exists", bornReasons("close", () => true).length, 0);
  // The two records belong to one phase base, the base was measured at it, and phase91_base is the close's ArchiveFacts.ts.
  {
    const counted = { [ARCHIVE_FACTS]: file(55, 55) };
    const baseRecord = { phase_base: "p", groups: { audit: { head: "p", files: counted } } };
    const closeRecord = { phase_base: "p", groups: { audit: { head: "c", files: counted } }, phase91_base: phase91Base(counted, "c") };
    for (const [name, got, want] of [
      ["a clean pair of records passes", recordReasons(baseRecord, closeRecord).length, 0],
      ["records naming different phase bases fail", recordReasons(baseRecord, { ...closeRecord, phase_base: "q" }).length, 1],
      ["a base measured off the phase base fails", recordReasons({ ...baseRecord, groups: { audit: { head: "x", files: counted } } }, closeRecord).length, 1],
      ["a phase91_base that differs from the close counts fails", recordReasons(baseRecord, { ...closeRecord, phase91_base: { ...closeRecord.phase91_base, detected: 54 } }).length, 1],
      ["a phase91_base of another head fails", recordReasons(baseRecord, { ...closeRecord, phase91_base: { ...closeRecord.phase91_base, head: "z" } }).length, 1],
      ["a close with no phase91_base fails", recordReasons(baseRecord, { ...closeRecord, phase91_base: undefined }).length, 1],
      ["the score is a percentage to two places", scoreOf(212, 212) === 100 && scoreOf(1, 3) === 33.33 && scoreOf(0, 0) === 0, true],
      ["a close record over another phase base is refused", heldReasons({ phase_base: "q" }, "p", false, "close").length, 1],
      ["a close record over the same phase base is not refused", heldReasons({ phase_base: "p" }, "p", false, "close").length, 0],
      ["--restart on a close starts afresh whatever the old record named", heldReasons({ phase_base: "q" }, "p", true, "close").length, 0],
      ["--restart on a base is refused", heldReasons(undefined, "p", true, "base").length, 1],
      ["no held record is not refused", heldReasons(undefined, "p", false, "close").length, 0],
    ]) {
      check(name, got, want);
    }
  }
  // The dispatcher with this file's own table, every mode's run replaced: a record from a modified tree is refused before its
  // run, a clean one runs, and compare and probe never read the status.
  const planted = ` M ${F}\n`;
  check("a modified file refuses a record", dirtyReasons(planted).length === 1 && dirtyReasons(planted)[0].includes(F) && dirtyReasons("").length === 0, true);
  for (const [mode, args, status, want] of [
    ["record", ["base"], planted, "refused"],
    ["record", ["close"], planted, "refused"],
    ["record", ["base"], "", "ran"],
    ["record", ["close", "--restart"], "", "ran"],
    ["compare", [], planted, "ran"],
    ["probe", [], planted, "ran"],
  ]) {
    let got = "nothing";
    const stubs = Object.fromEntries(Object.entries(MODES).map(([k, v]) => [k, { ...v, run: () => { got = "ran"; } }]));
    dispatch(stubs, mode, args, () => status, () => { got = "refused"; });
    check(`${mode} ${args.join(" ")} on ${JSON.stringify(status)}`, got, want);
  }
  check("the status a record reads covers packages and the Stryker config", statusPaths().join(), `packages,${CONFIG}`);
  check("the status reader reads the paths a record reads", gitStatus.toString(), '() => git("status", "--porcelain", "--", ...statusPaths())');
  // The invocations: the base over the five files, the close over the five and the born step, neither with --disableBail.
  const five = FIVE.join(",");
  check("the base invocation is the five files without bail", invocation("base"), `pnpm exec stryker run stryker.audit.mjs --mutate ${five}`);
  check("the close invocation is the base string plus HostBatch.ts", invocation("close"), `${invocation("base")},packages/audit/src/HostBatch.ts`);
  check("the five files are those the phase touches or holds, in order", FIVE.map((f) => f.split("/").pop()).join(), "AuditArchive.ts,ArchiveFacts.ts,Retention.ts,CodecMade.ts,SequenceIntegrity.ts");
  check("the born file is HostBatch.ts alone", NEW_FILES.join(), HOST_BATCH);
  check("RENAMED is empty", Object.keys(RENAMED).length === 0 && baseOf(F) === F, true);
  check("MOVED names three codes, each moved into HostBatch.ts", MOVED.length === 3 && MOVED.every((x) => typeof x.code === "string" && x.code !== "" && x.to.includes("HostBatch.ts")), true);
  check("UNMEASURED_WHY is stated", UNMEASURED_WHY.trim() !== "", true);
  console.log(`self-test: ${passed} passed`);
};

/** Each mode, whether it refuses a tree whose read files differ from HEAD, and its run. */
const MODES = {
  record: { clean: true, run: (name, flag) => ((name === "base" && flag === undefined) || (name === "close" && (flag === undefined || flag === "--restart")) ? record(name, flag === "--restart") : usage()) },
  probe: { clean: false, run: () => probe() },
  compare: { clean: false, run: () => compare() },
  "--self-test": { clean: false, run: () => selfTest() },
};
const usage = () => fail(["usage: node 89-mutation.mjs record base | record close [--restart] | probe | compare | --self-test"]);
/** Runs `mode`, refusing first when it records and `status` shows a read file modified. */
function dispatch(modes, mode, args, status, refuse) {
  const entry = Object.hasOwn(modes, mode) ? modes[mode] : undefined;
  if (entry === undefined) return usage();
  if (entry.clean) {
    const bad = dirtyReasons(status());
    if (bad.length > 0) return refuse(bad);
  }
  return entry.run(...args);
}

const [mode, ...args] = process.argv.slice(2);
await dispatch(MODES, mode, args, gitStatus, fail);
