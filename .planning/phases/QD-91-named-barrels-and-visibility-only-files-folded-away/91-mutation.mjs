// The phase's mutation and coverage record, over three groups, one per Stryker configuration: `core` through
// `stryker.config.mjs`, `audit` through `stryker.audit.mjs` and `react` through `stryker.react.mjs`. Each configuration is run
// strictly one at a time, on its own invocation (the config's own bail setting, no `--disableBail`), at the base over the files
// the phase touches that Stryker measures and at the close over the same list minus the deleted paths, so the two are
// comparable and the base is the run the close is judged against.
// `record base --group <g>` writes `phase_base`, the HEAD the phase started on, and every file's counts with its open (Survived,
// NoCoverage) and Ignored mutants; it refuses a tree where `packages` or a Stryker config differs from HEAD, a tree outside
// `.planning/` that differs from the planning anchor, and a report its invocation did not make (its `config.mutate` is not the
// group's list, or its `config.disableBail` is true). A file of a group that holds no mutant is absent from a Stryker report and
// is written with zero counts and `absent: true`; a report that holds a file outside the group, or none of them, is refused.
// Each re-taken figure the earlier waves recorded (CROSS_CHECK) must equal its record, or the base is not recorded.
// `record close --group <g> [--restart]` reads the close report and writes `91-mutation-close.json`; `--restart` replaces that
// group's entry afresh, for a re-close after a fix commit (a base never is). `probe --group <g>` judges the last report as the
// close would and writes nothing.
// The removed-mutant rule: a close file's score does not fall below its base side, and a score that fell only because killed
// mutants were deleted passes; a new open mutant (Survived or NoCoverage) never passes, and neither does a new Ignored mutant
// of a kind the base did not hold, beyond what EXAMINED and STATIC_PROVEN record. The base side of a file a fold absorbed
// another into (RENAMED) is the sum over its sources, summed detected over summed valid. A mutant is located by its line number
// carried through `git diff -U0 <base head> <close head>`, a mutant of a folded-in source by the trimmed text of its line, and
// every comparison counts mutants as a multiset, so a second copy of one is a new one. A file with no valid mutant on both
// sides is n/a and passes. A Survived mutant that matches an entry of EQUIVALENT (file, mutator, replacement, the trimmed text
// of its line, the reason) is explained, never new; an entry that matches no survivor, or states no reason, fails, and a drop
// a test can reach is closed by a test, never listed there.
// Coverage: `coverage base|close` runs each package's tests with coverage, path-filtered (never `--project`, which measures no
// file under the root coverage include), refuses a summary with no file or missing a touched file, writes the four totals as the
// summary states them and every touched file's covered and total counts, and exits 1 when a core total is below 95 or a react or
// audit total is below 90. A folded file is compared with the line-weighted sum of its sources.
// `landed base|coverage-base|close|coverage-close` checks the committed records against the history: the right commit, with
// exactly the right paths and the one trailer. `--self-test` drives every judge with planted records and planted allowances and
// asserts nothing about the real constants. From the repository root, after each invocation (stdin closed, nothing else running):
//   node <this directory>/91-mutation.mjs record base --group core
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SELF = fileURLToPath(import.meta.url);
/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(SELF))}/`;
const ANCHOR = "e89f89ce";
const TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";
const PLAN_SUBJECT = /^[a-z]+[(]91-[0-9]{2}[)]!?: /;
const CONFIGS = ["stryker.config.mjs", "stryker.audit.mjs", "stryker.react.mjs"];
/** One entry per Stryker configuration: the files of the base run and of the close run (the close names no deleted path). */
const GROUPS = {
  core: {
    config: "stryker.config.mjs",
    report: "reports/mutation/mutation.json",
    base: ["PortSpanEncode", "PortSpan", "PortSpanDecode", "PortInterpreter"].map((name) => `packages/core/src/${name}.ts`),
    close: ["PortSpanEncode", "PortSpan"].map((name) => `packages/core/src/${name}.ts`),
  },
  audit: {
    config: "stryker.audit.mjs",
    report: "reports/mutation-audit/mutation.json",
    base: ["ArchiveFacts", "SequenceIntegrity"].map((name) => `packages/audit/src/${name}.ts`),
    close: ["ArchiveFacts"].map((name) => `packages/audit/src/${name}.ts`),
  },
  react: {
    config: "stryker.react.mjs",
    report: "reports/mutation-react/mutation.json",
    base: ["packages/react/src/RegistryLease.ts"],
    close: ["packages/react/src/RegistryLease.ts"],
  },
};
const GROUP_NAMES = Object.keys(GROUPS);
/** A folded file's base side: the sum of its sources' tallies, itself first. */
const RENAMED = {
  "packages/core/src/PortSpanEncode.ts": ["packages/core/src/PortSpanEncode.ts", "packages/core/src/PortSpanDecode.ts"],
  "packages/core/src/PortSpan.ts": ["packages/core/src/PortSpan.ts", "packages/core/src/PortInterpreter.ts"],
  "packages/audit/src/ArchiveFacts.ts": ["packages/audit/src/ArchiveFacts.ts", "packages/audit/src/SequenceIntegrity.ts"],
};
/** The folds coverage compares: the mutation folds and the two react ones, which no Stryker configuration measures. */
const COVERAGE_RENAMED = {
  ...RENAMED,
  "packages/react/src/GateWriter.ts": ["packages/react/src/GateWriter.ts", "packages/react/src/GateRegistry.ts"],
  "packages/react/src/HydrationEngine.ts": ["packages/react/src/HydrationEngine.ts", "packages/react/src/Hydration.ts"],
};
/** A file that holds no mutant is absent from a Stryker report, so any file of a group may be. */
const MAY_BE_ABSENT = GROUP_NAMES.flatMap((g) => GROUPS[g].base);
/** The figures an earlier wave recorded for a file this phase re-takes: the base must equal its record. */
const CROSS_CHECK = [
  { group: "audit", file: "packages/audit/src/ArchiveFacts.ts", prefix: "QD-89-", record: "89-mutation-close.json", detected: 54, valid: 54 },
  { group: "react", file: "packages/react/src/RegistryLease.ts", prefix: "QD-86-", record: "86-mutation-close.json", detected: 28, valid: 28 },
];
const UNMEASURED_REACT = "outside the explicit list of stryker.react.mjs, so no Stryker run reaches it";
const UNMEASURED_BARREL = "a barrel, excluded by every Stryker configuration";
/** Files the phase touches that no Stryker configuration measures, each with why. */
const UNMEASURED_WHY = {
  "packages/react/src/HydrationEngine.ts": UNMEASURED_REACT,
  "packages/react/src/GateWriter.ts": UNMEASURED_REACT,
  "packages/react/src/Hydration.ts": UNMEASURED_REACT,
  "packages/react/src/GateRegistry.ts": UNMEASURED_REACT,
  "packages/react/src/QadiAtoms.ts": UNMEASURED_REACT,
  "packages/react/src/QadiProvider.tsx": UNMEASURED_REACT,
  "packages/react/src/DevtoolsFeed.ts": UNMEASURED_REACT,
  "packages/react/src/hooks.ts": UNMEASURED_REACT,
  "packages/core/src/index.ts": UNMEASURED_BARREL,
  "packages/react/src/index.ts": UNMEASURED_BARREL,
  "packages/audit/src/index.ts": UNMEASURED_BARREL,
};
/**
 * Survivors that no test can kill, each `{ file, mutatorName, replacement, lineText, reason, status? }`: the line's text
 * trimmed, and the reason naming why no input reaches it; `status` is `"NoCoverage"` for a mutant no test covers, and absent
 * for a Survived one. A stale entry (it matches no open mutant of the close) fails `compare`. A drop a test can reach is closed
 * by a test, never listed here.
 */
const EQUIVALENT = [];
/** Ignored mutants a close may hold beyond its base, per file and kind, each run by hand with `ignoreStatic: false` and Killed. */
const EXAMINED = {};
/** Static code `ignoreStatic` hides from the score, each `{ file, mutator, replacement, count, proof }`; `proof` is a test title. */
const STATIC_PROVEN = [];
const invocation = (group, side) => `pnpm exec stryker run ${GROUPS[group].config} --mutate ${GROUPS[group][side].join(",")}`;
const closeInvocations = () => Object.fromEntries(GROUP_NAMES.map((g) => [g, invocation(g, "close")]));
/** The invocations as the phase states them, spelled out so an edit of GROUPS alone cannot move what `landed` expects. */
const EXACT = {
  core: {
    base: "pnpm exec stryker run stryker.config.mjs --mutate packages/core/src/PortSpanEncode.ts,packages/core/src/PortSpan.ts,packages/core/src/PortSpanDecode.ts,packages/core/src/PortInterpreter.ts",
    close: "pnpm exec stryker run stryker.config.mjs --mutate packages/core/src/PortSpanEncode.ts,packages/core/src/PortSpan.ts",
  },
  audit: {
    base: "pnpm exec stryker run stryker.audit.mjs --mutate packages/audit/src/ArchiveFacts.ts,packages/audit/src/SequenceIntegrity.ts",
    close: "pnpm exec stryker run stryker.audit.mjs --mutate packages/audit/src/ArchiveFacts.ts",
  },
  react: {
    base: "pnpm exec stryker run stryker.react.mjs --mutate packages/react/src/RegistryLease.ts",
    close: "pnpm exec stryker run stryker.react.mjs --mutate packages/react/src/RegistryLease.ts",
  },
};
/** The coverage floor and the touched files of each package, at the base and at the close (a close omits the deleted files). */
const PACKAGES = {
  core: {
    floor: 95,
    base: ["PortSpanEncode", "PortSpan", "PortSpanDecode", "PortInterpreter"].map((name) => `packages/core/src/${name}.ts`),
    close: ["PortSpanEncode", "PortSpan"].map((name) => `packages/core/src/${name}.ts`),
  },
  react: {
    floor: 90,
    base: ["GateRegistry.ts", "GateWriter.ts", "Hydration.ts", "HydrationEngine.ts", "QadiAtoms.ts", "QadiProvider.tsx", "DevtoolsFeed.ts", "hooks.ts", "RegistryLease.ts"].map((name) => `packages/react/src/${name}`),
    close: ["GateWriter.ts", "HydrationEngine.ts", "QadiAtoms.ts", "QadiProvider.tsx", "DevtoolsFeed.ts", "hooks.ts", "RegistryLease.ts"].map((name) => `packages/react/src/${name}`),
  },
  audit: {
    floor: 90,
    base: ["ArchiveFacts", "SequenceIntegrity"].map((name) => `packages/audit/src/${name}.ts`),
    close: ["ArchiveFacts"].map((name) => `packages/audit/src/${name}.ts`),
  },
};
const PACKAGE_NAMES = Object.keys(PACKAGES);
const DETECTED = new Set(["Killed", "Timeout"]);
const OPEN = new Set(["Survived", "NoCoverage"]);
const METRICS = ["lines", "functions", "branches", "statements"];
const SUBJECTS = {
  base: "docs(91-01): record the mutation base",
  "coverage-base": "docs(91-01): record the coverage base",
  close: "docs(91-21): record the mutation close",
  "coverage-close": "docs(91-21): record the coverage close",
};
const record = (name) => `${D}91-mutation-${name}.json`;
const coverageFile = (name) => `${D}91-coverage-${name}.json`;

const fail = (lines) => {
  console.error(lines.join("\n"));
  process.exit(1);
};
/** Why a record or report cannot be read: the file is absent, so the mode that reads it names what to run first, not a raw ENOENT. Pure. */
export const absentReasons = (file, exists) => (exists(file) ? [] : [`${file} does not exist: run the group's Stryker invocation and \`record close\` before this mode`]);
const readJson = (file) => {
  const bad = absentReasons(file, existsSync);
  if (bad.length > 0) fail(bad);
  return JSON.parse(readFileSync(file, "utf8"));
};
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "pipe"] });
const gitOk = (...args) => {
  try {
    execFileSync("git", args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

/** Why a record may not be made: a file it reads differs from HEAD, so its line numbers belong to no commit. */
export const dirtyReasons = (porcelain) => (porcelain.trim() === "" ? [] : [`record from a clean tree; these differ from HEAD:\n${porcelain.trimEnd()}`]);
/** The paths a record reads: every test and source of the packages, and the Stryker configurations. */
export const statusPaths = () => ["packages", ...CONFIGS];
/** The porcelain status of the paths a record reads. */
const gitStatus = () => git("status", "--porcelain", "--", ...statusPaths());

/** Why a report is not the one the invocation makes: it mutated other files, or ran with bail off. Pure. */
export const reportReasons = (report, files) => {
  const mutate = [...(report.config?.mutate ?? [])].sort().join(",");
  return mutate === [...files].sort().join(",") && report.config?.disableBail !== true ? [] : ["the report was not made by the invocation"];
};

/** Why a close invocation may not be made: it names a path that does not exist (a deleted path is in no close list). Pure. */
export const closeListReasons = (files, exists) => files.filter((file) => !exists(file)).map((file) => `the close names ${file}, which does not exist: a deleted path is in no close list`);

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
/** A mutant of a folded-in source has no diff to carry its line, so it is located by the text of its line. */
const textKey = (m) => [m.status, m.mutator, m.replacement, m.lineText].join("\u0000");
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

/** What a file's close may hold beyond its base in Ignored mutants, by kind: EXAMINED and STATIC_PROVEN together. Pure. */
export const allowance = (file, examined = EXAMINED, staticProven = STATIC_PROVEN) => {
  const out = new Map(Object.entries(examined[file] ?? {}));
  for (const s of staticProven) if (s.file === file) out.set(`${s.mutator} ${s.replacement}`, (out.get(`${s.mutator} ${s.replacement}`) ?? 0) + s.count);
  return out;
};

/** Whether `entry` explains the open mutant `m` of `file`: the entry's status (Survived unless it says NoCoverage), same mutation, a line of the same text. */
const explains = (entry, file, m) => entry.file === file && m.status === (entry.status ?? "Survived") && entry.mutatorName === m.mutator && entry.replacement === m.replacement && entry.lineText === m.lineText;
/** The open mutants of `file` that no EQUIVALENT entry explains. Pure. */
export const unexplained = (open, file, equivalent = EQUIVALENT) => open.filter((m) => !equivalent.some((entry) => explains(entry, file, m)));
/** Why an EQUIVALENT entry fails: it states no reason, or it matches no survivor of the close (`closeFiles`: file -> counts). Pure. */
export const equivalentReasons = (equivalent, closeFiles) =>
  equivalent.flatMap((entry) => [
    ...(typeof entry.reason !== "string" || entry.reason.trim() === "" ? [`the equivalent entry for ${entry.file} (${entry.mutatorName} -> ${entry.replacement}) states no reason`] : []),
    ...((closeFiles[entry.file]?.open ?? []).some((m) => explains(entry, entry.file, m)) ? [] : [`the equivalent entry for ${entry.file} (${entry.mutatorName} -> ${entry.replacement}) matches no survivor: remove it`]),
  ]);
/** Why a STATIC_PROVEN entry fails: it names no proof, or its proof is not among the titles that exist. Pure. */
export const proofReasons = (staticProven, titles) =>
  staticProven.flatMap((entry) => (typeof entry.proof === "string" && entry.proof.trim() !== "" && titles.includes(entry.proof) ? [] : [`the static entry for ${entry.file} (${entry.mutator} -> ${entry.replacement}) names no title that exists: ${JSON.stringify(entry.proof)}`]));

const relPath = (file) => (isAbsolute(file) ? relative(process.cwd(), file) : file);

/**
 * Each file's counts and its non-Killed mutants from a parsed Stryker report holding some of `files` and no other (a file of
 * MAY_BE_ABSENT, which a report omits when it holds no mutant, has zero counts and `absent: true`), and the reasons it cannot be
 * read. Pure; `source` is checked by `tally`.
 */
export const classify = (report, files, mayBeAbsent = MAY_BE_ABSENT) => {
  const byFile = {};
  for (const [file, entry] of Object.entries(report.files)) byFile[relPath(file)] = entry;
  const held = Object.keys(byFile);
  const extra = held.filter((file) => !files.includes(file));
  const missing = files.filter((file) => byFile[file] === undefined && !mayBeAbsent.includes(file));
  if (extra.length > 0 || missing.length > 0 || held.length === 0) return { out: {}, bad: [`the report holds ${held.sort().join(",") || "no file"}, not ${files.join(",")}`] };
  const out = {};
  for (const file of files) {
    const lines = (byFile[file]?.source ?? "").split("\n");
    const all = (byFile[file]?.mutants ?? []).map((m) => ({ status: m.status, mutator: m.mutatorName, replacement: m.replacement, line: m.location.start.line, column: m.location.start.column, lineText: (lines[m.location.start.line - 1] ?? "").trim() }));
    const count = (status) => all.filter((m) => m.status === status).length;
    const detected = all.filter((m) => DETECTED.has(m.status)).length;
    const open = all.filter((m) => OPEN.has(m.status));
    out[file] = { killed: count("Killed"), timeout: count("Timeout"), survived: count("Survived"), noCoverage: count("NoCoverage"), ignored: count("Ignored"), detected, valid: detected + open.length, open, ignoredMutants: all.filter((m) => m.status === "Ignored"), ...(byFile[file] === undefined ? { absent: true } : {}) };
  }
  return { out, bad: [] };
};

/** Each file's counts and its non-Killed mutants from a Stryker JSON report holding `files`. */
const tally = (reportFile, files) => {
  const report = readJson(reportFile);
  const { out, bad } = classify(report, files);
  if (bad.length > 0) fail(bad.map((line) => `${reportFile}: ${line}`));
  for (const file of files) {
    const entry = Object.entries(report.files).find(([name]) => relPath(name) === file)?.[1];
    if (entry !== undefined && entry.source !== readFileSync(file, "utf8")) fail([`the report for ${file} is not the file on disk`]);
    console.log(`${file} ${out[file].detected}/${out[file].valid} survived ${out[file].survived} no coverage ${out[file].noCoverage} ignored ${out[file].ignored} timeout ${out[file].timeout}${out[file].absent === true ? " (absent: no mutant)" : ""}`);
    for (const m of out[file].open) console.log(`  ${m.status} ${file}:${m.line} ${m.mutator} -> ${m.replacement}`);
  }
  return out;
};

/**
 * The base side of `file`: its own tally and the tallies of the sources a fold absorbed into it (`renamed[file]`, itself first),
 * and their sums, or undefined when a source is missing from the record. Pure.
 */
export const baseSide = (baseFiles, file, renamed = RENAMED) => {
  const names = renamed[file] ?? [file];
  const parts = names.map((name) => baseFiles[name]);
  if (parts.some((part) => part === undefined)) return undefined;
  const sum = (field) => parts.reduce((total, part) => total + part[field], 0);
  return {
    own: names.includes(file) ? baseFiles[file] : undefined,
    foreign: names.flatMap((name, i) => (name === file ? [] : [parts[i]])),
    killed: sum("killed"),
    timeout: sum("timeout"),
    survived: sum("survived"),
    noCoverage: sum("noCoverage"),
    ignored: sum("ignored"),
    detected: sum("detected"),
    valid: sum("valid"),
    ignoredMutants: parts.flatMap((part) => part.ignoredMutants),
  };
};

/**
 * Every reason the close fails for the files that have a base, given the two records' files and each close file's
 * `git diff -U0 <base head> <close head>`. Pure. A fall in the score is a reason only when the file also has a new open mutant:
 * a score that fell because the code holding killed mutants was deleted passes, and any new Survived or NoCoverage mutant that
 * EQUIVALENT does not explain fails. A file with no valid mutant on both sides is n/a and passes.
 */
export const judge = ({ baseFiles, closeFiles, diffs }, files, log = console.log, { renamed = RENAMED, examined = EXAMINED, equivalent = EQUIVALENT, staticProven = STATIC_PROVEN } = {}) => {
  const bad = [];
  for (const file of files) {
    const b = baseSide(baseFiles, file, renamed);
    const c = closeFiles[file];
    if (b === undefined || c === undefined) {
      bad.push(`${file} is missing from a record`);
      continue;
    }
    if (b.valid === 0 && c.valid === 0) {
      log(`${file} n/a: no valid mutant on either side`);
      continue;
    }
    const toClose = mapLine(diffs[file] ?? "");
    const atBase = (m) => {
      const line = toClose(m.line);
      return line === undefined ? undefined : key(m, line);
    };
    // Integer cross-multiplication, so no rounded float decides whether a score fell.
    const fell = c.detected * b.valid < b.detected * c.valid;
    const afterOwn = beyond(c.open, (x) => key(x), bag(b.own?.open ?? [], atBase));
    const open = unexplained(beyond(afterOwn, textKey, bag(b.foreign.flatMap((part) => part.open), textKey)), file, equivalent);
    if (fell && open.length > 0) bad.push(`${file} fell from ${b.detected}/${b.valid} to ${c.detected}/${c.valid}`);
    for (const m of open) bad.push(`${file}:${m.line} has a new ${m.status} mutant: ${m.mutator} -> ${m.replacement}`);
    // An Ignored (static) mutant never runs, so where it sits tests nothing: a line the phase rewrites moves its static
    // arrow without adding a mutant, and no test can kill one. The rule is per kind: a file holds no more Ignored
    // mutants of a kind than its base side did, plus what EXAMINED and STATIC_PROVEN record.
    const extra = allowance(file, examined, staticProven);
    const allowed = bag(b.ignoredMutants, kind);
    for (const [k, n] of extra) allowed.set(k, (allowed.get(k) ?? 0) + n);
    const fresh = beyond(c.ignoredMutants, kind, allowed);
    for (const m of fresh) bad.push(`${file}:${m.line} has a new Ignored mutant: ${m.mutator} -> ${m.replacement}`);
    for (const [k, n] of extra) {
      const grew = c.ignoredMutants.filter((x) => kind(x) === k).length - b.ignoredMutants.filter((x) => kind(x) === k).length;
      if (grew < n) bad.push(`${file} no longer holds the ${n} Ignored ${k} mutant(s) EXAMINED or STATIC_PROVEN allows: remove the entry`);
    }
    log(`${file} ${b.detected}/${b.valid} -> ${c.detected}/${c.valid}, survived ${b.survived} -> ${c.survived}, no coverage ${b.noCoverage} -> ${c.noCoverage}, ignored ${b.ignored} -> ${c.ignored} (${fresh.length} new)${fell && open.length === 0 ? ", killed mutants removed" : ""}`);
  }
  return bad;
};

/** Why a re-taken base differs from the wave's record of the same file: a count of either side is not the record's. Pure. */
export const crossReasons = (files, entry, recorded) => {
  const got = files[entry.file];
  if (got === undefined) return [`the base holds no ${entry.file} to check against ${entry.record}`];
  const bad = [];
  if (recorded === undefined) bad.push(`${entry.record} holds no ${entry.file}`);
  else {
    if (got.detected !== recorded.detected || got.valid !== recorded.valid) bad.push(`${entry.file} re-taken at ${got.detected}/${got.valid}, but ${entry.record} records ${recorded.detected}/${recorded.valid}`);
    if (recorded.detected !== entry.detected || recorded.valid !== entry.valid) bad.push(`${entry.record} records ${recorded.detected}/${recorded.valid} for ${entry.file}, not the ${entry.detected}/${entry.valid} CROSS_CHECK states`);
  }
  return bad;
};

/** Why two records do not belong together: they name different phase bases, or the base was not measured at the phase base. Pure. */
export const recordReasons = (baseRecord, closeRecord) => {
  const bad = [];
  if (baseRecord.phase_base !== closeRecord.phase_base) bad.push(`the records name different phase bases: ${baseRecord.phase_base} and ${closeRecord.phase_base}`);
  for (const [name, group] of Object.entries(baseRecord.groups ?? {})) if (group.head !== baseRecord.phase_base) bad.push(`the ${name} base was not measured at the phase base`);
  return bad;
};

/** Why a record may not be written over `held`: it names another phase base (a base is taken on one head, a close on one base). Pure. */
export const heldReasons = (held, phaseBase, restart, name) => {
  if (restart && name !== "close") return ["--restart re-measures a close, never a base"];
  return !restart && held !== undefined && held.phase_base !== phaseBase ? [`${record(name)} names phase_base ${held.phase_base}, not ${phaseBase}: a record names the one phase base`] : [];
};

/** The sum of two counts of covered and total, line-weighted. Pure. */
const addCounts = (x, y) => ({ covered: x.covered + y.covered, total: x.total + y.total });

/**
 * What a vitest json-summary holds: the four totals, every file of `files` as covered and total counts, the reasons it cannot be
 * a record (no file, a touched file missing) and the totals below the floor. Pure.
 */
export const coverageRead = (summary, files, floor) => {
  const entries = Object.entries(summary).filter(([name]) => name !== "total").map(([name, value]) => [relPath(name), value]);
  const totals = Object.fromEntries(METRICS.map((metric) => [metric, summary.total?.[metric]?.pct]));
  const counts = (entry) => Object.fromEntries(METRICS.map((metric) => [metric, { covered: entry?.[metric]?.covered, total: entry?.[metric]?.total }]));
  const structural = [...(entries.length === 0 ? ["the coverage summary holds no file"] : []), ...files.filter((file) => !entries.some(([name]) => name === file)).map((file) => `the coverage summary does not hold ${file}`)];
  const below = METRICS.filter((metric) => !(typeof totals[metric] === "number" && totals[metric] >= floor)).map((metric) => `the ${metric} total is ${totals[metric]}, below ${floor}`);
  return { files: entries.length, totals, touched: Object.fromEntries(files.map((file) => [file, counts(entries.find(([name]) => name === file)?.[1])])), structural, below };
};

/**
 * Why a close's coverage fell: for each file the close touches, the sum of its sources' covered and total counts at the base,
 * line-weighted, against the close's own, by cross-multiplication so no rounded percentage decides. Pure.
 */
export const coverageJudge = (baseTouched, closeTouched, renamed = COVERAGE_RENAMED) => {
  const bad = [];
  for (const [file, c] of Object.entries(closeTouched)) {
    const names = renamed[file] ?? [file];
    const parts = names.map((name) => baseTouched[name]);
    if (parts.some((part) => part === undefined)) {
      bad.push(`${file} has no base figure to compare with`);
      continue;
    }
    for (const metric of METRICS) {
      const b = parts.map((part) => part[metric]).reduce(addCounts);
      if (c[metric].covered * b.total < b.covered * c[metric].total) bad.push(`${file} ${metric} fell from ${b.covered} of ${b.total} to ${c[metric].covered} of ${c[metric].total}`);
    }
  }
  return bad;
};

/** The reasons a commit is not the one named: its subject, its parent, its paths or its trailer. Pure. */
export const commitReasons = ({ subject, parents, files, body }, want) => {
  const bad = [];
  if (subject !== want.subject) bad.push(`the commit is ${JSON.stringify(subject)}, not ${JSON.stringify(want.subject)}`);
  if (want.parent !== undefined && !(parents.length === 1 && parents[0] === want.parent)) bad.push(`the commit is not a child of ${want.parent}`);
  if (files.slice().sort().join(",") !== want.files.slice().sort().join(",")) bad.push(`the commit holds ${files.join(",")}, not exactly ${want.files.join(",")}`);
  const lines = body.split("\n").map((line) => line.trimEnd());
  const trailers = lines.filter((line) => /^co-authored-by:/i.test(line));
  const last = lines.filter((line) => line !== "").at(-1);
  if (!(trailers.length === 1 && trailers[0] === TRAILER && last === TRAILER)) bad.push(`the commit does not end with exactly the one trailer ${TRAILER}`);
  return bad;
};

/** The group a `--group <g>` argument names, or undefined. */
export const groupOf = (args) => {
  const at = args.indexOf("--group");
  const name = at === -1 ? undefined : args[at + 1];
  return name !== undefined && Object.hasOwn(GROUPS, name) ? name : undefined;
};

/** The scratch directory every phase run writes to, made when asked for. */
const scratch = () => {
  const dir = `${realpathSync(process.env.TMPDIR ?? "/tmp")}/qd91`;
  mkdirSync(dir, { recursive: true });
  return dir;
};

/** A wave's record file: found through its phase directory's prefix under `.planning/phases` or a milestone's phases. */
const findRecord = (prefix, name) => {
  const roots = [".planning/phases", ...(existsSync(".planning/milestones") ? readdirSync(".planning/milestones").filter((d) => d.endsWith("-phases")).map((d) => `.planning/milestones/${d}`) : [])];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const dir of readdirSync(root).filter((d) => d.startsWith(prefix))) if (existsSync(join(root, dir, name))) return join(root, dir, name);
  }
  return undefined;
};

/** The recorded counts of `file` in any group of a wave's record file. */
const recordedFile = (entry) => {
  const path = findRecord(entry.prefix, entry.record);
  if (path === undefined) return fail([`${entry.record} was not found under a ${entry.prefix} phase directory`]);
  for (const group of Object.values(readJson(path).groups ?? {})) if (group.files?.[entry.file] !== undefined) return group.files[entry.file];
  return undefined;
};

const recordMode = async (name, groupName, restart) => {
  const group = GROUPS[groupName];
  const config = (await import(pathToFileURL(resolve(group.config)).href)).default;
  if (config.jsonReporter?.fileName !== group.report) fail([`${group.config} no longer reports to ${group.report}`]);
  if (config.ignoreStatic !== true) fail([`${group.config} no longer sets ignoreStatic: true`]);
  const files = group[name === "base" ? "base" : "close"];
  const missing = closeListReasons(files, existsSync);
  if (missing.length > 0) fail(missing);
  const refused = reportReasons(readJson(group.report), files);
  if (refused.length > 0) fail(refused);
  const head = git("rev-parse", "HEAD").trim();
  if (name === "close" && !existsSync(record("base"))) fail([`${record("base")} does not exist: the base is recorded first`]);
  if (name === "base" && !gitOk("diff", "--quiet", ANCHOR, "HEAD", "--", ".", ":!.planning")) fail([`the tree outside .planning differs from ${ANCHOR}: the base is taken on the unchanged tree`]);
  const phaseBase = name === "base" ? head : readJson(record("base")).phase_base;
  const out = record(name);
  const held = existsSync(out) ? readJson(out) : undefined;
  const bad = heldReasons(held, phaseBase, restart, name);
  if (name === "base" && held !== undefined && head !== phaseBase) bad.push("a base is taken on one head");
  if (bad.length > 0) fail(bad);
  const measured = tally(group.report, files);
  if (name === "base") {
    const crossed = CROSS_CHECK.filter((entry) => entry.group === groupName).flatMap((entry) => crossReasons(measured, entry, recordedFile(entry)));
    if (crossed.length > 0) fail(crossed);
  } else {
    const closeList = group.close;
    if (closeList.some((file) => measured[file] === undefined)) fail(["the close report does not hold every close file"]);
  }
  const entry = { head, invocation: invocation(groupName, name === "base" ? "base" : "close"), files: measured };
  const kept = held === undefined || (restart && held.phase_base !== phaseBase) ? {} : held.groups;
  const groups = { ...kept, [groupName]: entry };
  const written =
    name === "base"
      ? { phase: "91", phase_base: phaseBase, renamed: RENAMED, unmeasured_why: UNMEASURED_WHY, close_invocations: closeInvocations(), groups }
      : { phase: "91", phase_base: phaseBase, groups };
  writeFileSync(out, `${JSON.stringify(written, null, 1)}\n`);
  console.log(`wrote the ${groupName} ${name} into ${out}`);
};

/** The titles a STATIC_PROVEN proof may name: the `it` and `test` titles of every package's tests. */
const proofTitles = () => {
  const titles = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(test|tst)\.tsx?$/.test(entry)) for (const m of readFileSync(path, "utf8").matchAll(/\b(?:it|test|describe)(?:\.\w+)*\(\s*(["'`])((?:\\.|(?!\1).)*)\1/gs)) titles.push(m[2]);
    }
  };
  for (const p of PACKAGE_NAMES) walk(`packages/${p}/test`);
  return titles;
};

const diffsOf = (baseHead, closeHead, files) => Object.fromEntries(files.map((file) => [file, git("diff", "-U0", baseHead, ...(closeHead === undefined ? [] : [closeHead]), "--", file)]));

/** The reasons the last report of `groupName` fails as its close would judge it, writing nothing. */
const probe = (groupName) => {
  const group = GROUPS[groupName];
  const bad = reportReasons(readJson(group.report), group.close);
  if (bad.length > 0) fail(bad);
  const closeFiles = tally(group.report, group.close);
  const base = readJson(record("base")).groups[groupName];
  bad.push(...judge({ baseFiles: base.files, closeFiles, diffs: diffsOf(base.head, undefined, group.close) }, group.close));
  if (bad.length > 0) fail(bad);
  console.log(`probe: the ${groupName} report passes as its close would judge it`);
};

const compare = () => {
  const baseRecord = readJson(record("base"));
  const closeRecord = readJson(record("close"));
  const bad = recordReasons(baseRecord, closeRecord);
  const closeAll = {};
  for (const groupName of GROUP_NAMES) {
    const base = baseRecord.groups?.[groupName];
    const close = closeRecord.groups?.[groupName];
    if (base === undefined || close === undefined) {
      bad.push(`the ${groupName} group is missing from a record`);
      continue;
    }
    if (base.invocation !== invocation(groupName, "base")) bad.push(`the ${groupName} base record was not made by the invocation`);
    if (close.invocation !== baseRecord.close_invocations?.[groupName] || close.invocation !== invocation(groupName, "close")) bad.push(`the ${groupName} close record was not made by the close invocation of the base record`);
    bad.push(...judge({ baseFiles: base.files, closeFiles: close.files, diffs: diffsOf(base.head, close.head, GROUPS[groupName].close) }, GROUPS[groupName].close));
    Object.assign(closeAll, close.files);
  }
  bad.push(...equivalentReasons(EQUIVALENT, closeAll));
  if (STATIC_PROVEN.length > 0) bad.push(...proofReasons(STATIC_PROVEN, proofTitles()));
  if (bad.length > 0) fail(bad);
  console.log("no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed mutants");
};

const coverageMode = (name) => {
  if (name !== "base" && name !== "close") return usage();
  if (!existsSync(record("base"))) fail([`${record("base")} does not exist: the base is recorded first`]);
  const phaseBase = readJson(record("base")).phase_base;
  const head = git("rev-parse", "HEAD").trim();
  // The base is the phase base's own source: HEAD may sit on the base record's commit, which changes nothing outside .planning.
  if (name === "base" && !gitOk("diff", "--quiet", phaseBase, "HEAD", "--", ".", ":!.planning")) fail([`the tree outside .planning differs from ${phaseBase}: the coverage base is taken on the unchanged tree`]);
  const packages = {};
  const commands = {};
  const bad = [];
  for (const p of PACKAGE_NAMES) {
    const dir = `${scratch()}/coverage-${name}-${p}`;
    rmSync(dir, { recursive: true, force: true });
    const args = ["exec", "vitest", "run", `packages/${p}/test`, "--coverage.enabled", `--coverage.include=packages/${p}/src/**`, `--coverage.exclude=packages/${p}/src/index.ts`, "--coverage.reporter=json-summary", `--coverage.reportsDirectory=${dir}`];
    commands[p] = `pnpm ${args.join(" ")}`;
    try {
      execFileSync("pnpm", args, { stdio: ["ignore", "inherit", "inherit"] });
    } catch {
      // a threshold shortfall exits non-zero; the summary below is what decides
    }
    const summaryFile = `${dir}/coverage-summary.json`;
    if (!existsSync(summaryFile)) fail([`${summaryFile} was not written: the run for ${p} did not finish`]);
    const read = coverageRead(readJson(summaryFile), PACKAGES[p][name], PACKAGES[p].floor);
    if (read.structural.length > 0) fail(read.structural.map((line) => `${p}: ${line}`));
    packages[p] = { files: read.files, totals: read.totals, touched: read.touched };
    bad.push(...read.below.map((line) => `${p}: ${line}`));
  }
  if (name === "close") {
    const baseCoverage = readJson(coverageFile("base")).packages;
    for (const p of PACKAGE_NAMES) bad.push(...coverageJudge(baseCoverage[p].touched, packages[p].touched).map((line) => `${p}: ${line}`));
  }
  const out = coverageFile(name);
  writeFileSync(out, `${JSON.stringify({ phase_base: phaseBase, head: name === "base" ? phaseBase : head, commands, packages }, null, 1)}\n`);
  console.log(`wrote the ${name} coverage into ${out}: ${PACKAGE_NAMES.map((p) => `${p} ${packages[p].files} files, ${METRICS.map((metric) => `${metric} ${packages[p].totals[metric]}`).join(" ")}`).join("; ")}`);
  if (bad.length > 0) fail(bad);
};

/** The plan commits since `phaseBase`, oldest first, each `{ sha, subject }`. */
const planCommits = (phaseBase) =>
  git("log", "--reverse", "--format=%H%x09%s", `${phaseBase}..HEAD`)
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => ({ sha: line.slice(0, line.indexOf("\t")), subject: line.slice(line.indexOf("\t") + 1) }))
    .filter((c) => PLAN_SUBJECT.test(c.subject));
const commitOf = (sha) => ({ subject: git("log", "-1", "--format=%s", sha).trim(), parents: git("log", "-1", "--format=%P", sha).trim().split(" ").filter(Boolean), files: git("show", "--name-only", "--format=", sha).split("\n").filter(Boolean), body: git("log", "-1", "--format=%B", sha) });

/** Why a coverage record is not one: no file, a total below its package's floor, a missing touched file. Pure. */
export const coverageRecordReasons = (cov, which, label) => {
  const bad = [];
  for (const p of PACKAGE_NAMES) {
    const entry = cov.packages?.[p];
    if (entry === undefined) {
      bad.push(`the ${label} holds no ${p}`);
      continue;
    }
    if (!(entry.files > 0)) bad.push(`the ${label} holds no ${p} file`);
    for (const metric of METRICS) if (!(entry.totals?.[metric] >= PACKAGES[p].floor)) bad.push(`the ${label} ${p} ${metric} total ${entry.totals?.[metric]} is below ${PACKAGES[p].floor}`);
    if (Object.keys(entry.touched ?? {}).sort().join(",") !== [...PACKAGES[p][which]].sort().join(",")) bad.push(`the ${label} ${p} does not hold exactly its touched files`);
    for (const [file, counts] of Object.entries(entry.touched ?? {})) for (const metric of METRICS) if (!(Number.isInteger(counts[metric]?.covered) && Number.isInteger(counts[metric]?.total))) bad.push(`the ${label} ${file} ${metric} has no covered and total counts`);
  }
  return bad;
};

const landed = (what) => {
  const subject = SUBJECTS[what];
  if (subject === undefined) return usage();
  if (!existsSync(record("base"))) fail([`${record("base")} does not exist`]);
  const baseRecord = readJson(record("base"));
  const phaseBase = baseRecord.phase_base;
  const bad = [];
  if (!/^[0-9a-f]{40}$/.test(phaseBase ?? "")) fail([`phase_base is not 40 hex: ${phaseBase}`]);
  if (!gitOk("merge-base", "--is-ancestor", ANCHOR, phaseBase)) bad.push(`phase_base does not descend from ${ANCHOR}`);
  if (!gitOk("diff", "--quiet", ANCHOR, phaseBase, "--", ".", ":!.planning")) bad.push(`phase_base differs from ${ANCHOR} outside .planning`);
  const plan = planCommits(phaseBase);
  const check = (c, want) => bad.push(...commitReasons(commitOf(c.sha), want));
  if (what === "base" || what === "coverage-base") {
    if (what === "base") {
      if (baseRecord.phase !== "91") bad.push("the base record is not phase 91");
      for (const g of GROUP_NAMES) {
        const group = baseRecord.groups?.[g];
        if (group?.head !== phaseBase) bad.push(`groups.${g}.head is not phase_base`);
        if (group?.invocation !== EXACT[g].base || group?.invocation !== invocation(g, "base")) bad.push(`the ${g} invocation is not the exact string`);
        if (baseRecord.close_invocations?.[g] !== EXACT[g].close || baseRecord.close_invocations?.[g] !== invocation(g, "close")) bad.push(`the ${g} close invocation is not the exact string`);
        if (Object.keys(group?.files ?? {}).sort().join(",") !== [...GROUPS[g].base].sort().join(",")) bad.push(`groups.${g}.files is not exactly its base files`);
      }
      if (JSON.stringify(Object.keys(baseRecord.groups ?? {}).sort()) !== JSON.stringify([...GROUP_NAMES].sort())) bad.push("groups is not exactly core, audit and react");
      if (JSON.stringify(baseRecord.renamed) !== JSON.stringify(RENAMED) || Object.keys(RENAMED).length !== 3) bad.push("renamed is not as stated");
      if (JSON.stringify(baseRecord.unmeasured_why) !== JSON.stringify(UNMEASURED_WHY) || Object.keys(baseRecord.unmeasured_why ?? {}).length !== 11) bad.push("unmeasured_why is not as stated");
      for (const entry of CROSS_CHECK) bad.push(...crossReasons(baseRecord.groups?.[entry.group]?.files ?? {}, entry, recordedFile(entry)));
      try {
        const lastLine = execFileSync(process.execPath, [SELF, "--self-test"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim().split("\n").at(-1);
        if (!/^self-test: \d+ passed$/.test(lastLine)) bad.push(`the self-test did not end as expected: ${lastLine}`);
      } catch {
        bad.push("the self-test failed");
      }
    }
    const first = what === "base" ? plan[0] : plan[1];
    if (first === undefined || first.subject !== subject) bad.push(`the ${what === "base" ? "first" : "second"} plan commit after phase_base is ${JSON.stringify(first?.subject)}, not ${JSON.stringify(subject)}`);
    else if (what === "base") check(first, { subject, parent: phaseBase, files: [`${D}91-mutation.mjs`, record("base")] });
    else {
      check(first, { subject, files: [coverageFile("base")] });
      if (!existsSync(coverageFile("base"))) bad.push(`${coverageFile("base")} does not exist`);
      else {
        const cov = readJson(coverageFile("base"));
        if (cov.head !== phaseBase || cov.phase_base !== phaseBase) bad.push("the coverage base was not measured at phase_base");
        bad.push(...coverageRecordReasons(cov, "base", "coverage base"));
      }
    }
  } else {
    const found = plan.filter((c) => c.subject === subject);
    if (found.length !== 1) bad.push(`exactly one commit must be ${JSON.stringify(subject)}, found ${found.length}`);
    else {
      const parent = git("rev-parse", `${found[0].sha}^`).trim();
      if (what === "close") {
        check(found[0], { subject, files: [`${D}91-mutation.mjs`, record("close")] });
        const closeRecord = existsSync(record("close")) ? readJson(record("close")) : undefined;
        if (closeRecord === undefined) bad.push(`${record("close")} does not exist`);
        else {
          if (closeRecord.phase_base !== phaseBase) bad.push("the close record's phase_base is not the base record's");
          for (const g of GROUP_NAMES) {
            if (closeRecord.groups?.[g]?.invocation !== baseRecord.close_invocations?.[g]) bad.push(`the ${g} close invocation is not the base record's`);
            if (closeRecord.groups?.[g]?.head !== parent) bad.push(`the ${g} close head is not the close commit's parent`);
          }
        }
        try {
          execFileSync(process.execPath, [SELF, "compare"], { stdio: ["ignore", "inherit", "inherit"] });
        } catch {
          bad.push("compare exits non-zero");
        }
      } else {
        check(found[0], { subject, files: [coverageFile("close")] });
        const cov = existsSync(coverageFile("close")) ? readJson(coverageFile("close")) : undefined;
        if (cov === undefined) bad.push(`${coverageFile("close")} does not exist`);
        else {
          if (cov.head !== parent) bad.push("the coverage close's head is not the commit's parent");
          bad.push(...coverageRecordReasons(cov, "close", "coverage close"));
          if (existsSync(coverageFile("base"))) for (const p of PACKAGE_NAMES) bad.push(...coverageJudge(readJson(coverageFile("base")).packages[p].touched, cov.packages?.[p]?.touched ?? {}).map((line) => `${p}: ${line}`));
        }
      }
    }
  }
  if (bad.length > 0) fail(bad);
  console.log(`landed ${what}: ok`);
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
  const F = "packages/x/src/F.ts";
  const S = "packages/x/src/S.ts";
  const folds = { [F]: [F, S] };
  let passed = 0;
  const check = (name, got, want) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fail([`self-test FAILED: ${name}: ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`]);
    passed++;
  };
  const opts = (extra = {}) => ({ renamed: {}, examined: {}, equivalent: [], staticProven: [], ...extra });
  const run = (baseFiles, closeFiles, diffs, extra, files = [F]) => judge({ baseFiles, closeFiles, diffs }, files, () => {}, opts(extra)).length;
  // Base: one survivor on line 20, a static mutant Ignored on line 3; the close rewrote lines 9 to 11 into 9 to 10, so
  // line 3 stays line 3 and line 20 becomes line 19.
  const diffs = { [F]: "@@ -9,3 +9,2 @@\n-a\n-b\n-c\n+x\n+y\n" };
  const base = { [F]: file(42, 43, [m("Survived", 20)], [m("Ignored", 3)]) };
  for (const [name, close, want] of [
    ["an unchanged close passes", file(42, 43, [m("Survived", 19)], [m("Ignored", 3)]), 0],
    ["a close that kills the survivor passes", file(43, 43, [], [m("Ignored", 3)]), 0],
    ["a score below the base fails", file(41, 43, [m("Survived", 19), m("Survived", 30)], [m("Ignored", 3)]), 2],
    ["a survivor on a line the diff wrote is new and fails", file(42, 43, [m("Survived", 9)], [m("Ignored", 3)]), 1],
    ["a survivor left where the base had it, unmapped, fails", file(42, 43, [m("Survived", 20)], [m("Ignored", 3)]), 1],
    ["a second copy of the base survivor fails", file(84, 86, [m("Survived", 19), m("Survived", 19)], [m("Ignored", 3)]), 1],
    ["a second copy of a base Ignored mutant fails", file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 3)]), 1],
    ["a new Ignored mutant fails", file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9)]), 1],
    ["an Ignored mutant moved by a rewrite is not new", file(42, 43, [m("Survived", 19)], [m("Ignored", 9)]), 0],
    ["a new NoCoverage mutant fails while the score holds", file(85, 87, [m("Survived", 19), m("NoCoverage", 30)], [m("Ignored", 3)]), 1],
  ]) {
    check(name, run(base, { [F]: close }, diffs), want);
  }
  check("a file missing from the close fails", run(base, {}, diffs), 1);
  check("a file missing from the base fails", run({}, { [F]: file(1, 1) }, diffs), 1);
  // An examined or a static-proven allowance admits exactly its count of Ignored mutants of its kind, and a stale one fails.
  const k = kind(m("Ignored", 3));
  const staticFor = (count, file2 = F) => [{ file: file2, mutator: "StringLiteral", replacement: '""', count, proof: "a title" }];
  const two = file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9)]);
  const three = file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9), m("Ignored", 11)]);
  const one = file(42, 43, [m("Survived", 19)], [m("Ignored", 3)]);
  for (const [name, close, extra, want] of [
    ["an examined Ignored mutant is not new", two, { examined: { [F]: { [k]: 1 } } }, 0],
    ["a second Ignored mutant beyond the examined one fails", three, { examined: { [F]: { [k]: 1 } } }, 1],
    ["an examined allowance the close no longer needs fails", one, { examined: { [F]: { [k]: 1 } } }, 1],
    ["a static-proven Ignored mutant is not new", two, { staticProven: staticFor(1) }, 0],
    ["a second Ignored mutant beyond the static-proven one fails", three, { staticProven: staticFor(1) }, 1],
    ["a static allowance the close no longer needs fails", one, { staticProven: staticFor(1) }, 1],
    ["an examined and a static allowance add up", three, { examined: { [F]: { [k]: 1 } }, staticProven: staticFor(1) }, 0],
    ["a static allowance for another file is not this file's", two, { staticProven: staticFor(1, S) }, 1],
  ]) {
    check(name, run(base, { [F]: close }, diffs, extra), want);
  }
  check("a static entry naming a title that exists passes", proofReasons(staticFor(1), ["a title"]).length, 0);
  check("a static entry naming a missing title fails", proofReasons(staticFor(1), ["another"]).length, 1);
  check("a static entry naming no proof fails", proofReasons([{ ...staticFor(1)[0], proof: " " }], [" "]).length, 1);
  // A fall with no new open mutant: the killed mutants went with the code that held them.
  {
    const logged = [];
    const got = judge({ baseFiles: base, closeFiles: { [F]: file(30, 31, [m("Survived", 19)], [m("Ignored", 3)]) }, diffs }, [F], (line) => logged.push(line), opts()).length;
    check("a fall with no new open mutant passes as killed mutants removed", got === 0 && logged.join("\n").includes("killed mutants removed"), true);
  }
  // A touched file with a base: a close equal to its base passes, deleted killed mutants pass, a new open mutant fails.
  {
    const touchedBase = { [F]: file(28, 28) };
    for (const [name, close, want] of [
      ["a touched close equal to its base passes", file(28, 28), 0],
      ["a touched close whose only change is deleted killed mutants passes", file(20, 20), 0],
      ["a touched close with a new Survived mutant fails the score and the mutant", file(28, 29, [m("Survived", 7)]), 2],
      ["a touched close with a new NoCoverage mutant fails the score and the mutant", file(28, 29, [m("NoCoverage", 7)]), 2],
      ["a touched close with a new Ignored mutant fails", file(28, 28, [], [m("Ignored", 7)]), 1],
    ]) {
      check(name, run(touchedBase, { [F]: close }, { [F]: "" }), want);
    }
  }
  // A file with no valid mutant on both sides is n/a and passes, however the Ignored count moved.
  {
    const logged = [];
    const got = judge({ baseFiles: { [F]: file(0, 0) }, closeFiles: { [F]: file(0, 0, [], [m("Ignored", 7)]) }, diffs: { [F]: "" } }, [F], (line) => logged.push(line), opts()).length;
    check("a file at zero valid mutants on both sides is n/a and passes", got === 0 && logged.join("\n").includes("n/a"), true);
    check("a file at zero valid mutants on the base side alone is judged", run({ [F]: file(0, 0) }, { [F]: file(0, 1, [m("Survived", 7)]) }, { [F]: "" }), 1);
  }
  // A folded file is compared with the sum of its sources, itself and the one folded in.
  {
    const folded = (own, foreign) => ({ [F]: own, [S]: foreign });
    const f = (close, extra) => run(folded(...extra), { [F]: close }, { [F]: "" }, { renamed: folds });
    check("54 of 54 and 0 of 0 against a close of 54 of 54 passes at 100", f(file(54, 54), [file(54, 54), file(0, 0)]), 0);
    check("50 of 54 and 3 of 3 against a close of 53 of 57 (a tie) passes", f(file(53, 57, [m("Survived", 7)]), [file(50, 54, [m("Survived", 7)]), file(3, 3)]), 0);
    check("50 of 54 and 3 of 3 against a close of 52 of 57 (one below) fails", f(file(52, 57, [m("Survived", 7), m("Survived", 8)]), [file(50, 54, [m("Survived", 7)]), file(3, 3)]), 2);
    check("the same sum against a close of 51 of 57 fails", f(file(51, 57, [m("Survived", 7), m("Survived", 8), m("Survived", 9)]), [file(50, 54, [m("Survived", 7)]), file(3, 3)]), 3);
    check("a folded file with a source missing from the base fails", run({ [F]: file(1, 1) }, { [F]: file(1, 1) }, { [F]: "" }, { renamed: folds }), 1);
    check("a survivor the folded-in source held is not new when it is moved by text", f(file(53, 54, [m("Survived", 40)]), [file(50, 50), file(3, 4, [m("Survived", 3)])]), 0);
    check("a survivor neither source held is new", f(file(53, 54, [m("Survived", 40, { lineText: "other" })]), [file(50, 50), file(3, 4, [m("Survived", 3)])]), 1);
    check("a folded-in source's Ignored mutants count toward the close's", f(file(54, 54, [], [m("Ignored", 5)]), [file(54, 54), file(0, 0, [], [m("Ignored", 2)])]), 0);
    check("a close holding more Ignored mutants than both sources fails", f(file(54, 54, [], [m("Ignored", 5), m("Ignored", 6)]), [file(54, 54), file(0, 0, [], [m("Ignored", 2)])]), 1);
    check("a sum of two n/a sources against an n/a close passes", f(file(0, 0), [file(0, 0), file(0, 0)]), 0);
  }
  // A survivor an EQUIVALENT entry explains is not new, a stale entry fails and an entry with no reason fails.
  {
    const entry = { file: F, mutatorName: "StringLiteral", replacement: '""', lineText: "const a = 1;", reason: "no input reaches the line" };
    const plain = { [F]: file(42, 42) };
    const survivor = { [F]: file(42, 43, [m("Survived", 30)]) };
    const none = { [F]: file(42, 43, [m("NoCoverage", 30)]) };
    for (const [name, got, want] of [
      ["a new survivor with no equivalent entry fails the score and the mutant", run(plain, survivor, { [F]: "" }), 2],
      ["a new survivor an equivalent entry explains passes", run(plain, survivor, { [F]: "" }, { equivalent: [entry] }), 0],
      ["an entry for another line text does not explain it", run(plain, survivor, { [F]: "" }, { equivalent: [{ ...entry, lineText: "const b = 2;" }] }), 2],
      ["an entry for another mutator does not explain it", run(plain, survivor, { [F]: "" }, { equivalent: [{ ...entry, mutatorName: "ObjectLiteral" }] }), 2],
      ["an entry for another file does not explain it", run(plain, survivor, { [F]: "" }, { equivalent: [{ ...entry, file: S }] }), 2],
      ["an entry explains a Survived mutant, never a NoCoverage one", run(plain, none, { [F]: "" }, { equivalent: [entry] }), 2],
      ["a NoCoverage entry explains a NoCoverage mutant", run(plain, none, { [F]: "" }, { equivalent: [{ ...entry, status: "NoCoverage" }] }), 0],
      ["a NoCoverage entry never explains a Survived mutant", run(plain, survivor, { [F]: "" }, { equivalent: [{ ...entry, status: "NoCoverage" }] }), 2],
      ["an entry that matches a survivor of the close is not stale", equivalentReasons([entry], survivor).length, 0],
      ["an entry that matches no survivor of the close is stale", equivalentReasons([entry], plain).length, 1],
      ["an entry for a file the close does not hold is stale", equivalentReasons([entry], {}).length, 1],
      ["an entry with an empty reason fails", equivalentReasons([{ ...entry, reason: "  " }], survivor).length, 1],
      ["an entry with no reason at all fails", equivalentReasons([{ ...entry, reason: undefined }], survivor).length, 1],
    ]) {
      check(name, got, want);
    }
  }
  // The report a record reads, planted: the group's files and no other, none with bail off, a file with no mutant absent.
  {
    const files = [F, S];
    const raw = (status, line) => ({ status, mutatorName: "StringLiteral", replacement: '""', location: { start: { line, column: 4 } } });
    const entryOf = (...mutants) => ({ source: "a\n  const a = 1;  \nc", mutants });
    const held = (names) => Object.fromEntries(names.map((name) => [name, entryOf(raw("Killed", 1))]));
    check("a report holding exactly the group's files is read", classify({ files: held(files) }, files, files).bad.length, 0);
    check("a report holding a file outside the group cannot be read", classify({ files: held([...files, "packages/x/src/O.ts"]) }, files, files).bad.length, 1);
    check("a report holding none of the group's files cannot be read", classify({ files: {} }, files, files).bad.length, 1);
    const fewer = classify({ files: held([F]) }, files, files);
    check("a report omitting a file is read, the file with zero counts and absent", [fewer.bad.length, fewer.out[S].absent, fewer.out[S].valid, fewer.out[S].ignored], [0, true, 0, 0]);
    check("a report omitting a file not allowed to be absent cannot be read", classify({ files: held([F]) }, files, [F]).bad.length, 1);
    check("a file the report lists carries no absent flag", classify({ files: held(files) }, files, files).out[F].absent, undefined);
    check("a survivor carries the trimmed text of its line", classify({ files: { [F]: { source: "a\n  const a = 1;  \nc", mutants: [raw("Survived", 2)] } } }, [F], [F]).out[F].open[0].lineText, "const a = 1;");
    check("the counts of a report are its statuses", Object.values(classify({ files: { [F]: entryOf(raw("Killed", 1), raw("Timeout", 2), raw("Survived", 3), raw("NoCoverage", 3), raw("Ignored", 1)) } }, [F], [F]).out[F]).slice(0, 5), [1, 1, 1, 1, 1]);
    for (const [name, config, want] of [
      ["a report made with the group's files and no --disableBail is accepted", { mutate: files }, 0],
      ["a report made with the files in another order is accepted", { mutate: [...files].reverse() }, 0],
      ["a report made with explicit disableBail false is accepted", { mutate: files, disableBail: false }, 0],
      ["a report made with --disableBail is refused", { mutate: files, disableBail: true }, 1],
      ["a report made over another group's files is refused", { mutate: [F] }, 1],
      ["a report made over one file too many is refused", { mutate: [...files, "packages/x/src/O.ts"] }, 1],
      ["a report with no config is refused", undefined, 1],
    ]) {
      check(name, reportReasons({ config }, files).length, want);
    }
  }
  // A close list naming a missing path is refused, and a group is found by its flag.
  check("a close list naming a missing path is refused", closeListReasons([F, S], (path) => path === F).length, 1);
  check("a close list naming only existing paths is not refused", closeListReasons([F], () => true).length, 0);
  check("a group flag names a group", [groupOf(["base", "--group", "audit"]), groupOf(["base"]), groupOf(["base", "--group", "nope"]), groupOf(["base", "--group"])], ["audit", undefined, undefined, undefined]);
  // A re-taken figure below (or above) its wave's record fails, and a record that is not the stated figure fails.
  {
    const entry = { file: F, record: "r.json", detected: 54, valid: 54 };
    check("a re-take equal to its record passes", crossReasons({ [F]: file(54, 54) }, entry, file(54, 54)).length, 0);
    check("a re-take below its record fails", crossReasons({ [F]: file(53, 54) }, entry, file(54, 54)).length, 1);
    check("a re-take with more valid mutants than its record fails", crossReasons({ [F]: file(54, 55) }, entry, file(54, 54)).length, 1);
    check("a record that is not the stated figure fails", crossReasons({ [F]: file(53, 54) }, entry, file(53, 54)).length, 1);
    check("a base without the file fails", crossReasons({}, entry, file(54, 54)).length, 1);
    check("a record without the file fails", crossReasons({ [F]: file(54, 54) }, entry, undefined).length, 1);
  }
  // The two records belong to one phase base, every base was measured at it, and a close record names no other.
  {
    const baseRecord = { phase_base: "p", groups: { core: { head: "p" }, audit: { head: "p" } } };
    for (const [name, got, want] of [
      ["a clean pair of records passes", recordReasons(baseRecord, { phase_base: "p" }).length, 0],
      ["records naming different phase bases fail", recordReasons(baseRecord, { phase_base: "q" }).length, 1],
      ["a group measured off the phase base fails", recordReasons({ phase_base: "p", groups: { core: { head: "p" }, audit: { head: "x" } } }, { phase_base: "p" }).length, 1],
      ["a close record over another phase base is refused", heldReasons({ phase_base: "q" }, "p", false, "close").length, 1],
      ["a close record over the same phase base is not refused", heldReasons({ phase_base: "p" }, "p", false, "close").length, 0],
      ["--restart on a close starts afresh whatever the old record named", heldReasons({ phase_base: "q" }, "p", true, "close").length, 0],
      ["--restart on a base is refused", heldReasons(undefined, "p", true, "base").length, 1],
      ["no held record is not refused", heldReasons(undefined, "p", false, "close").length, 0],
    ]) {
      check(name, got, want);
    }
  }
  // Coverage: a summary with no file, with a touched file missing, a core total of 94.99 fails and 95.00 passes, react at 89.99 fails.
  {
    const cell = (pct, covered = 1, total = 1) => ({ pct, covered, total });
    const row = (pct) => ({ lines: cell(pct), functions: cell(pct), branches: cell(pct), statements: cell(pct) });
    const summaryOf = (pct, names) => ({ total: row(pct), ...Object.fromEntries(names.map((name) => [`${process.cwd()}/${name}`, row(pct)])) });
    const reasons = (summary, names, floor) => {
      const read = coverageRead(summary, names, floor);
      return read.structural.length + read.below.length;
    };
    const names = [F, S];
    check("a core summary at 95.00 passes", reasons(summaryOf(95, names), names, 95), 0);
    check("a core summary at 94.99 fails every total", reasons(summaryOf(94.99, names), names, 95), 4);
    check("a react summary at 90.00 passes", reasons(summaryOf(90, names), names, 90), 0);
    check("a react summary at 89.99 fails every total", reasons(summaryOf(89.99, names), names, 90), 4);
    check("a summary with one total below fails once", reasons({ ...summaryOf(100, names), total: { ...row(100), branches: cell(89.99) } }, names, 90), 1);
    check("a summary with no file fails", reasons({ total: row(100) }, names, 90) > 0, true);
    check("a summary missing a touched file fails", reasons(summaryOf(100, [F]), names, 90), 1);
    check("a summary with an unknown total fails", reasons({ ...summaryOf(100, names), total: { ...row(100), lines: cell("Unknown") } }, names, 90), 1);
    check("a read summary counts its files and holds the touched counts", (({ files, touched }) => [files, touched[F].lines])(coverageRead(summaryOf(100, names), names, 90)), [2, { covered: 1, total: 1 }]);
    check("a coverage record with no file fails", coverageRecordReasons({ packages: { core: { files: 0, totals: { lines: 100, functions: 100, branches: 100, statements: 100 }, touched: {} } } }, "base", "x").some((line) => line.includes("no core file")), true);
    // Line-weighted: 90 of 100 and 10 of 10 is 100 of 110, and the close must not fall below it.
    const at = (covered, total) => Object.fromEntries(METRICS.map((metric) => [metric, { covered, total }]));
    const touched = { [F]: at(90, 100), [S]: at(10, 10) };
    check("a folded file's coverage is the line-weighted sum of its sources", coverageJudge(touched, { [F]: at(100, 110) }, folds).length, 0);
    check("a folded file below that sum fails each metric", coverageJudge(touched, { [F]: at(99, 110) }, folds).length, 4);
    check("a folded file is not judged by a rounded percentage", coverageJudge({ [F]: at(999999, 1000000) }, { [F]: at(9999, 10000) }, {}).length, 4);
    check("a file with no base figure fails", coverageJudge({}, { [F]: at(1, 1) }, {}).length, 1);
    check("a file with no lines on either side passes", coverageJudge({ [F]: at(0, 0) }, { [F]: at(0, 0) }, {}).length, 0);
  }
  // A commit is the one named: its subject, its parent, its paths and exactly one trailer.
  {
    const good = { subject: "docs(91-01): record the mutation base", parents: ["p"], files: ["a", "b"], body: `docs(91-01): record the mutation base\n\nbody\n\n${TRAILER}\n` };
    const want = { subject: good.subject, parent: "p", files: ["b", "a"] };
    check("a commit with the subject, parent, paths and trailer passes", commitReasons(good, want).length, 0);
    check("a commit with another subject fails", commitReasons({ ...good, subject: "x" }, want).length, 1);
    check("a commit with another parent fails", commitReasons({ ...good, parents: ["q"] }, want).length, 1);
    check("a commit with an extra path fails", commitReasons({ ...good, files: ["a", "b", "c"] }, want).length, 1);
    check("a commit with no trailer fails", commitReasons({ ...good, body: "body\n" }, want).length, 1);
    check("a commit with a second trailer fails", commitReasons({ ...good, body: `${TRAILER}\nCo-Authored-By: Other <o@example.com>\n` }, want).length, 1);
    check("a commit with a different trailer fails", commitReasons({ ...good, body: "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n" }, want).length, 1);
    check("a commit whose trailer is not last fails", commitReasons({ ...good, body: `${TRAILER}\nafter\n` }, want).length, 1);
  }
  // The dispatcher with this file's own table, every mode's run replaced: a record from a modified tree is refused before its
  // run, a clean one runs, and compare, probe and landed never read the status.
  const planted = ` M packages/core/src/PortSpan.ts\n`;
  check("a modified file refuses a record", dirtyReasons(planted).length === 1 && dirtyReasons(planted)[0].includes("PortSpan.ts") && dirtyReasons("").length === 0, true);
  for (const [mode, args, status, want] of [
    ["record", ["base", "--group", "core"], planted, "refused"],
    ["record", ["close", "--group", "react"], planted, "refused"],
    ["record", ["base", "--group", "audit"], "", "ran"],
    ["record", ["close", "--group", "core", "--restart"], "", "ran"],
    ["coverage", ["base"], planted, "refused"],
    ["coverage", ["close"], "", "ran"],
    ["compare", [], planted, "ran"],
    ["probe", ["--group", "core"], planted, "ran"],
    ["landed", ["base"], planted, "ran"],
  ]) {
    let got = "nothing";
    const stubs = Object.fromEntries(Object.entries(MODES).map(([name, v]) => [name, { ...v, run: () => { got = "ran"; } }]));
    dispatch(stubs, mode, args, () => status, () => { got = "refused"; });
    check(`${mode} ${args.join(" ")} on ${JSON.stringify(status)}`, got, want);
  }
  check("the status a record reads covers packages and every Stryker configuration", statusPaths().join(), `packages,${CONFIGS.join(",")}`);
  check("the status reader reads the paths a record reads", gitStatus.toString(), '() => git("status", "--porcelain", "--", ...statusPaths())');
  check("the four plan subjects are plan subjects", Object.values(SUBJECTS).every((s) => PLAN_SUBJECT.test(s)), true);
  // An absent record or report is refused with a message naming the file, by the one reader every mode shares.
  check("a present file is not refused", absentReasons(`${D}91-mutation-base.json`, () => true), []);
  check("an absent file is refused, naming it", absentReasons("reports/none/mutation.json", () => false).map((line) => line.startsWith("reports/none/mutation.json does not exist")), [true]);
  check("every mode reads a file through the refusing reader", readJson.toString().includes("absentReasons(file, existsSync)") && !readJson.toString().includes("ENOENT"), true);
  console.log(`self-test: ${passed} passed`);
};

/** Each mode, whether it refuses a tree whose read files differ from HEAD, and its run. */
const MODES = {
  record: {
    clean: true,
    run: (name, ...rest) => {
      const groupName = groupOf(rest);
      const restart = rest.includes("--restart");
      const flags = rest.filter((arg) => arg !== "--restart" && arg !== "--group" && arg !== groupName);
      return (name === "base" || name === "close") && groupName !== undefined && flags.length === 0 && !(name === "base" && restart) ? recordMode(name, groupName, restart) : usage();
    },
  },
  coverage: { clean: true, run: (name) => coverageMode(name) },
  landed: { clean: false, run: (what) => landed(what) },
  probe: { clean: false, run: (...rest) => (groupOf(rest) === undefined ? usage() : probe(groupOf(rest))) },
  compare: { clean: false, run: () => compare() },
  "--self-test": { clean: false, run: () => selfTest() },
};
const usage = () => fail(["usage: node 91-mutation.mjs record base --group <g> | record close --group <g> [--restart] | coverage base|close | landed base|coverage-base|close|coverage-close | probe --group <g> | compare | --self-test (groups: core, audit, react)"]);
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

// Every mode runs from the repository root, in the phase directory this file sits in.
if (realpathSync(process.cwd()) !== realpathSync(git("rev-parse", "--show-toplevel").trim())) fail(["run this from the repository root"]);
if (!basename(dirname(SELF)).startsWith("QD-91-")) fail([`${SELF} is not in a QD-91- directory`]);
const [mode, ...args] = process.argv.slice(2);
await dispatch(MODES, mode, args, gitStatus, fail);
