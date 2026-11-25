// The phase's mutation record, through `stryker.devtools.mjs`, over one born module: the `ledger` group, `StopLedger.ts`.
// The base measures nothing, and says so. The one file the phase measures is born in it, and the old home of the stop key,
// `react/StoppedBox.tsx`, sits under `src/react`, which no Stryker config reaches, so there is no run to take at the base and no
// `RENAMED` comparison to make. `record base` (no group argument) therefore writes `phase_base`, the HEAD the phase started
// on, and the measured set: every `.ts` file under `src/model` at that commit with its blob, `touched: []` and
// `born: [StopLedger.ts]`. It refuses a tree where `packages`, the Stryker config or the born file differs from HEAD, and a
// born file that already exists.
// The absolute rule, for the born module, judged by `judgeNew` at `record close ledger` / `probe ledger` / `compare`: the close
// holds no Survived, NoCoverage or Timeout mutant, at least one Killed mutant, and every Killed mutant has a killer among the
// tests of the group's `killers` file. With no base to compare against, anything the module's own tests do not kill is a gap,
// not a carried-over one, and the `killers` check is the measured form of "tested by the module's own tests". The group runs
// with `--disableBail`, so Stryker lists every killing test of a mutant and the killers check can read them.
// The EXAMINED allowance: an Ignored (static) mutant is admitted only after it was run by hand with `ignoreStatic: false` and
// seen Killed, by its file, its kind (mutator and replacement) and its count; an allowance the close does not need, or one of
// another kind, fails, and so does an Ignored mutant beyond it. A Survived mutant that matches an EQUIVALENT entry (file,
// mutator, replacement, the trimmed text of its line) is explained, never open, and an entry that matches no survivor, or states
// no reason, fails.
// The measured-set rule, checked by `compare`: every file the base record lists has the same blob at the close head, the only
// model file added since `phase_base` is the born one, and neither the born module nor its test differs between the close head
// and HEAD, so what was measured is what ships.
// If a whole-suite `--disableBail` run leaves Timeout mutants a settled re-run does not clear, the same config is run with
// vitest's `include` narrowed to the killers file through an untracked scratch config, removed before the record and stated in
// the evidence file; the report it makes names the same files and the same bail setting, so the record accepts it.
// `record` refuses a report its group's invocation did not make (its `config.mutate` is not the group's file list, or its
// `config.disableBail` is not the group's). `--self-test` drives every judge with planted records. From the repository root,
// after the invocation (stdin closed, nothing else running):
//   node <this directory>/88-mutation.mjs record base
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
const CONFIG = "stryker.devtools.mjs";
const MODEL = "packages/devtools/src/model/";
const LEDGER = `${MODEL}StopLedger.ts`;
const GROUPS = {
  ledger: { config: CONFIG, report: "reports/mutation-devtools/mutation.json", files: [LEDGER], closeOnly: true, disableBail: true, killers: "packages/devtools/test/model/StopLedger.test.ts" },
};
/** Files born in the phase: they have no base, so a base record of them is refused and a close is judged by `judgeNew`. */
const NEW_FILES = [LEDGER];
/**
 * Survivors that no test can kill, each `{ file, mutatorName, replacement, lineText, reason }`: the line's text trimmed, and the
 * reason naming why no input reaches it. An entry is added only when the close has looked at the survivor and found no input
 * that reaches it. A stale entry (it matches no survivor of the close) fails `compare`.
 */
const EQUIVALENT = [];
/**
 * Ignored mutants a close may hold, per file and kind, each run by hand and Killed there: the group's config spread with
 * `ignoreStatic: false`, run with `--mutate <file>`. A born file has no base, so its allowance is the whole of what it holds. An
 * entry is added only when such a mutant was run by hand and seen Killed.
 */
const EXAMINED = {};
/** Why no Stryker config measures a file under `src/react`, then which rows pin it, then which scratch variants prove it. */
const reactWhy = (pinned, variants) => `stryker.devtools.mjs mutates src/model/** only, so no mutant is made of this file; ${pinned}; the scratch variants ${variants} in 88-RED-EVIDENCE.md prove it`;
/** Files the phase edits that no Stryker config reaches, written into every record so the gap is stated, not silent. */
const UNMEASURED = [
  { name: "StoppedBox.tsx", pinned: "the wrapper keys the body from the ledger, the body decides the alert at mount and records at commit, and the announce rows A1 to A5, H1, C1 and the notice rows pin it", variants: "V1, V2, V3, V7, V8 and V10" },
  { name: "useStopNotice.ts", pinned: "it holds one reducer and one memo per feed, and H2, H3, DS1 to DS3, A1 and A2 pin it", variants: "V4, V5, V6, V9 and H3" },
  { name: "TimelineNotice.tsx", pinned: "it hands the box the notice whole and passes no key, and the TN rows and N rows pin it", variants: "VN1" },
  { name: "DiagnosticsNotice.tsx", pinned: "it hands the box the notice whole and passes no key, and the TN rows and N rows pin it", variants: "VN2" },
].map(({ name, pinned, variants }) => ({ file: `packages/devtools/src/react/${name}`, why: reactWhy(pinned, variants) }));
const invocation = (group) => `pnpm exec stryker run ${GROUPS[group].config} --mutate ${GROUPS[group].files.join(",")}${GROUPS[group].disableBail === true ? " --disableBail" : ""}`;
const BASE_RUN = "none: no file this phase measures exists at phase_base";
const DETECTED = new Set(["Killed", "Timeout"]);
const OPEN = new Set(["Survived", "NoCoverage"]);

const fail = (lines) => {
  console.error(lines.join("\n"));
  process.exit(1);
};
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 26 });

/** Why a record may not be made: a file it reads differs from HEAD, so it belongs to no commit. Pure. */
export const dirtyReasons = (porcelain) => (porcelain.trim() === "" ? [] : [`record from a clean tree; these differ from HEAD:\n${porcelain.trimEnd()}`]);
/** The paths a record reads: the born files, and every test and source of the package that made the report. */
export const statusPaths = () => [...NEW_FILES, "packages", CONFIG];
/** The porcelain status of the paths a record reads. */
const gitStatus = () => git("status", "--porcelain", "--", ...statusPaths());

/** Why a base may not be recorded: a born file already exists at HEAD, so it would have a base after all. Pure. */
export const bornReasons = (present) => NEW_FILES.filter((file) => present.includes(file)).map((file) => `${file.split("/").pop()} is born in the phase and already exists: the base is recorded before it`);

/** Why a report is not the one its group's invocation makes: it mutated other files, or ran with the other bail setting. Pure. */
export const reportReasons = (report, group, name) => {
  const mutate = [...(report.config?.mutate ?? [])].sort().join(",");
  const bailOk = (report.config?.disableBail === true) === (group.disableBail === true);
  return mutate === [...group.files].sort().join(",") && bailOk ? [] : [`${name} was not made by this group's invocation`];
};

/** An Ignored mutant's kind: what it replaces and with what, not where. */
const kind = (m) => `${m.mutator} ${m.replacement}`;
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
 * Every reason a close-only file fails: it has no base, so it is judged absolutely. It may hold no open mutant (EQUIVALENT
 * explains a Survived one), no Ignored mutant beyond what EXAMINED records as run by hand and Killed, and no Timeout, it holds
 * at least one Killed mutant, and every Killed mutant must have a killer among the tests of `killers`. Pure.
 */
export const judgeNew = ({ close }, files, log = console.log, killers = GROUPS.ledger.killers, equivalent = EQUIVALENT, examined = EXAMINED) => {
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
      if (c.ignoredMutants.filter((x) => kind(x) === k).length < n) bad.push(`${file} does not hold the ${n} examined Ignored ${k} mutant(s) EXAMINED allows: remove the entry`);
    }
    for (const m of c.timeouts ?? []) bad.push(`${file}:${m.line} timed out: a test must kill it`);
    for (const m of c.outside ?? []) bad.push(`${file}:${m.line} is killed only by tests outside ${killers}`);
    if (c.killed === 0) bad.push(`${file} is new and holds no killed mutant`);
    log(`${file} ${c.detected}/${c.valid}, survived ${c.survived}, no coverage ${c.noCoverage}, ignored ${c.ignored}, timeout ${c.timeout}`);
  }
  return bad;
};

/**
 * Why the measured set moved: a file the base lists is gone or has another blob at the close, or a model file other than the
 * born ones was added. `baseFiles` and `closeFiles` map path -> blob. Pure.
 */
export const measuredSetReasons = (baseFiles, closeFiles, born = NEW_FILES) => [
  ...Object.entries(baseFiles).flatMap(([file, blob]) => (closeFiles[file] === undefined ? [`${file} is listed in the base record and missing at the close head`] : closeFiles[file] === blob ? [] : [`${file} differs from its base blob at the close head`])),
  ...Object.keys(closeFiles)
    .filter((file) => baseFiles[file] === undefined && !born.includes(file))
    .map((file) => `${file} was added to the model since the phase base`),
  ...born.filter((file) => closeFiles[file] === undefined).map((file) => `${file} is missing at the close head`),
];
/** Why the measured code is not the shipped code: a path of the born module or its test differs between the close head and HEAD. Pure. */
export const shippedReasons = (changed) => changed.map((file) => `${file} differs between the close head and HEAD: re-close after the change`);

/** The `.ts` files under the model at `commit`, path -> blob. */
const modelAt = (commit) =>
  Object.fromEntries(
    git("ls-tree", "-r", commit, "--", MODEL.slice(0, -1))
      .split("\n")
      .filter((line) => line !== "")
      .map((line) => {
        const [meta, path] = line.split("\t");
        return [path, meta.split(" ")[2]];
      })
      .filter(([path]) => path.endsWith(".ts")),
  );

/**
 * The record a `record` writes into, the reasons it may not, and the groups a restart dropped. Pure. `restart` is for a
 * close only: it keeps no group of the old record, so a re-close after a fix commit is measured on one commit again. A
 * record holds one `phase_base`, the HEAD the phase started on, and a record naming another is refused.
 */
export const heldFor = (held, name, group, head, restart, phaseBase = head) => {
  if (restart && name !== "close") return { held, bad: ["--restart re-measures a close, never a base"], dropped: [] };
  if (restart) return { held: { phase: "88", phase_base: phaseBase, unmeasured: UNMEASURED, groups: {} }, bad: [], dropped: Object.keys(held.groups).filter((other) => other !== group) };
  const bad = held.phase_base === phaseBase ? [] : [`${D}88-mutation-${name}.json holds phase_base ${held.phase_base}, not ${phaseBase}: a record names the one phase base`];
  return { held, bad, dropped: [] };
};

/** The request a `record` line makes, or undefined when it is not one: `base` takes no group, `close` takes one and `--restart`. Pure. */
export const recordRequest = (name, rest) => {
  if (name === "base") return rest.length === 0 ? { name, group: undefined, restart: false } : undefined;
  if (name === "close" && Object.hasOwn(GROUPS, rest[0] ?? "") && (rest[1] === undefined || rest[1] === "--restart") && rest.length <= 2) return { name, group: rest[0], restart: rest[1] === "--restart" };
  return undefined;
};

const recordBase = () => {
  const head = git("rev-parse", "HEAD").trim();
  const present = git("ls-tree", "-r", "--name-only", head, "--", ...NEW_FILES).split("\n").filter((line) => line !== "");
  const bad = [...bornReasons(present), ...bornReasons(NEW_FILES.filter((file) => existsSync(file)))];
  if (bad.length > 0) return fail([...new Set(bad)]);
  const out = `${D}88-mutation-base.json`;
  if (existsSync(out)) return fail([`${out} exists: a base is recorded once`]);
  const record = { phase: "88", phase_base: head, invocation: invocation("ledger"), base_run: BASE_RUN, unmeasured: UNMEASURED, measured: { config: CONFIG, mutate: `${MODEL}**/*.ts`, files: modelAt(head) }, touched: [], born: NEW_FILES, groups: {} };
  writeFileSync(out, `${JSON.stringify(record, null, 1)}\n`);
  console.log(`wrote the base record into ${out}: ${Object.keys(record.measured.files).length} model files measured at ${head}, nothing touched`);
};

const recordClose = async ({ group, restart }) => {
  const { report: REPORT, files: FILES, killers } = GROUPS[group];
  const config = (await import(pathToFileURL(resolve(CONFIG)).href)).default;
  if (config.jsonReporter?.fileName !== REPORT) fail([`${CONFIG} does not report to the report this reads`]);
  if (config.ignoreStatic !== true) fail([`${CONFIG} does not set ignoreStatic: true`]);
  const refused = reportReasons(readJson(REPORT), GROUPS[group], REPORT);
  if (refused.length > 0) fail(refused);
  const head = git("rev-parse", "HEAD").trim();
  const baseFile = `${D}88-mutation-base.json`;
  if (!existsSync(baseFile)) fail([`${baseFile} does not exist: the base is recorded first`]);
  const phaseBase = readJson(baseFile).phase_base;
  const out = `${D}88-mutation-close.json`;
  const { held, bad, dropped } = heldFor(existsSync(out) ? readJson(out) : { phase: "88", phase_base: phaseBase, unmeasured: UNMEASURED, groups: {} }, "close", group, head, restart, phaseBase);
  if (bad.length > 0) fail(bad);
  if (dropped.length > 0) console.log(`restarted the close record at ${head}; re-measure: ${dropped.join(", ")}`);
  const files = tally(REPORT, FILES, killers);
  held.groups[group] = { head, invocation: invocation(group), files };
  writeFileSync(out, `${JSON.stringify(held, null, 1)}\n`);
  console.log(`wrote ${group} into ${out}`);
};

/** The reasons a group's report fails as its close would judge it, writing nothing. */
const probe = (group) => {
  const { report: REPORT, files, killers } = GROUPS[group];
  const bad = reportReasons(readJson(REPORT), GROUPS[group], REPORT);
  if (bad.length > 0) fail(bad);
  const close = { files: tally(REPORT, files, killers) };
  bad.push(...judgeNew({ close }, files, console.log, killers), ...equivalentReasons(EQUIVALENT.filter((entry) => files.includes(entry.file)), close.files));
  if (bad.length > 0) fail(bad);
  console.log(`probe ${group}: the report passes as its close would judge it`);
};

const compare = () => {
  const bad = [];
  const baseRecord = readJson(`${D}88-mutation-base.json`);
  const closeRecord = readJson(`${D}88-mutation-close.json`);
  if (baseRecord.phase_base !== closeRecord.phase_base) bad.push(`the records name different phase bases: ${baseRecord.phase_base} and ${closeRecord.phase_base}`);
  if (Object.keys(baseRecord.groups ?? {}).length !== 0 || (baseRecord.touched ?? []).length !== 0) bad.push("the base record measured a group or names a touched file: it measures nothing");
  if (baseRecord.invocation !== invocation("ledger")) bad.push("the base record does not name the recorded invocation");
  const { files, killers } = GROUPS.ledger;
  const close = closeRecord.groups.ledger;
  if (close === undefined) bad.push("the ledger group is missing from the close record");
  else {
    if (close.invocation !== invocation("ledger")) bad.push("a ledger record was not made by the recorded invocation");
    bad.push(...judgeNew({ close }, files, console.log, killers));
    bad.push(...equivalentReasons(EQUIVALENT, close.files));
    const base = baseRecord.measured.files;
    bad.push(...measuredSetReasons(base, modelAt(close.head)));
    const changed = git("diff", "--name-only", close.head, "HEAD", "--", ...files, killers).split("\n").filter((line) => line !== "");
    bad.push(...shippedReasons(changed));
  }
  if (bad.length > 0) fail(bad);
  console.log("the born module has no open, Timeout or unexamined Ignored mutant, every killed mutant is killed by its own tests, no measured model file moved and the measured code is the shipped code");
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
  const O = LEDGER;
  const K = GROUPS.ledger.killers;
  let passed = 0;
  const expect = (name, got, want) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fail([`self-test FAILED: ${name}: ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`]);
    passed++;
  };
  const ownerOf = (f) => ({ files: { [O]: f } });
  const planted = ` M ${O}\n`;
  // A modified file refuses a record; a clean tree does not.
  expect("a modified born file refuses a record", [dirtyReasons(planted).length, dirtyReasons(planted)[0].includes(O), dirtyReasons("").length], [1, true, 0]);
  // The judge of the born module: absolute, with EXAMINED and EQUIVALENT planted.
  const entry = { file: O, mutatorName: "StringLiteral", replacement: '""', lineText: "const a = 1;", reason: "no input reaches the line" };
  const examinedOne = { [O]: { [kind(m("Ignored", 3))]: 1 } };
  for (const [name, close, equivalent, examined, want] of [
    ["a close with nothing open, Ignored, timed out or outside passes", ownerOf(file(10, 10)), [], {}, 0],
    ["a close with a Survived mutant fails", ownerOf(file(9, 10, [m("Survived", 5)])), [], {}, 1],
    ["a close with a NoCoverage mutant fails", ownerOf(file(9, 10, [m("NoCoverage", 5)])), [], {}, 1],
    ["a close with a Timeout fails", ownerOf(file(10, 10, [], [], { timeouts: [m("Timeout", 7)] })), [], {}, 1],
    ["a close with no Killed mutant at all fails", ownerOf(file(0, 0)), [], {}, 1],
    ["a close with a mutant killed only outside its tests fails", ownerOf(file(10, 10, [], [], { outside: [m("Killed", 8)] })), [], {}, 1],
    ["a close missing from the record fails", { files: {} }, [], {}, 1],
    ["an Ignored mutant with no allowance fails", ownerOf(file(10, 10, [], [m("Ignored", 3)])), [], {}, 1],
    ["an Ignored mutant within an allowance of its kind passes", ownerOf(file(10, 10, [], [m("Ignored", 3)])), [], examinedOne, 0],
    ["a second Ignored mutant beyond the allowance fails", ownerOf(file(10, 10, [], [m("Ignored", 3), m("Ignored", 9)])), [], examinedOne, 1],
    ["an Ignored mutant of another kind fails and leaves the allowance stale", ownerOf(file(10, 10, [], [{ ...m("Ignored", 3), mutator: "Other" }])), [], examinedOne, 2],
    ["an allowance the close does not need fails", ownerOf(file(10, 10)), [], examinedOne, 1],
    ["a Survived mutant an EQUIVALENT entry explains passes", ownerOf(file(9, 10, [m("Survived", 5)])), [entry], {}, 0],
    ["an EQUIVALENT entry never explains a NoCoverage mutant", ownerOf(file(9, 10, [m("NoCoverage", 5)])), [entry], {}, 1],
    ["an EQUIVALENT entry of another line text does not explain it", ownerOf(file(9, 10, [m("Survived", 5)])), [{ ...entry, lineText: "const b = 2;" }], {}, 1],
  ]) expect(name, judgeNew({ close }, [O], () => {}, K, equivalent, examined).length, want);
  // An EQUIVALENT entry: one that matches a survivor is not stale, one that matches none is, an empty reason fails.
  const survivors = { [O]: file(9, 10, [m("Survived", 5)]) };
  expect("an entry that matches a survivor of the close is not stale", equivalentReasons([entry], survivors).length, 0);
  expect("an entry that matches no survivor of the close is stale", equivalentReasons([entry], { [O]: file(10, 10) }).length, 1);
  expect("an entry for a file the close does not hold is stale", equivalentReasons([entry], {}).length, 1);
  expect("an entry with an empty reason fails", equivalentReasons([{ ...entry, reason: "  " }], survivors).length, 1);
  expect("an entry with no reason at all fails", equivalentReasons([{ ...entry, reason: undefined }], survivors).length, 1);
  // The report a close reads, planted: a mutant killed by a StopLedger.test.ts test has a killer, one killed only by another
  // test file has none, and a report with no testFiles cannot be read.
  const R = "packages/devtools/test/react/DockFrame.announce.characterisation.test.tsx";
  const raw = (status, line, killedBy) => ({ status, mutatorName: "StringLiteral", replacement: '""', location: { start: { line, column: 4 } }, killedBy });
  const report = (mutants, testFiles = { [K]: { tests: [{ id: "1" }] }, [R]: { tests: [{ id: "2" }] } }) => ({ files: { [O]: { source: "", mutants } }, testFiles });
  const verdict = (rep) => {
    const read = classify(rep, [O], K);
    return read.bad.length > 0 ? read.bad : judgeNew({ close: { files: read.out } }, [O], () => {}, K, []);
  };
  for (const [name, rep, want] of [
    ["a Killed mutant killed by a StopLedger.test.ts test passes", report([raw("Killed", 5, ["1"])]), 0],
    ["a Killed mutant killed by the ledger test and another test passes", report([raw("Killed", 5, ["1", "2"])]), 0],
    ["a Killed mutant killed only by another test file fails", report([raw("Killed", 5, ["2"])]), 1],
    ["a Killed mutant with no killer fails", report([raw("Killed", 5, [])]), 1],
    ["an Ignored mutant in the report fails", report([raw("Killed", 4, ["1"]), raw("Ignored", 5, undefined)]), 1],
    ["a Survived mutant in the report fails", report([raw("Killed", 5, ["1"]), raw("Survived", 6, undefined)]), 1],
    ["a Timeout in the report fails", report([raw("Timeout", 5, ["1"])]), 2],
    ["a report with no mutant at all fails", report([]), 1],
    ["a report with no testFiles cannot be read", { files: { [O]: { source: "", mutants: [raw("Killed", 5, ["1"])] } } }, 1],
    ["a report holding another file cannot be read", { files: { "packages/devtools/src/model/Other.ts": { source: "", mutants: [] } }, testFiles: { [K]: { tests: [{ id: "1" }] } } }, 1],
  ]) expect(name, verdict(rep).length, want);
  expect("a report with no testFiles says so", verdict({ files: { [O]: { source: "", mutants: [] } } })[0], "the report names no test files");
  expect("a survivor carries the trimmed text of its line", classify({ files: { [O]: { source: "a\n  const a = 1;  \nc", mutants: [raw("Survived", 2, undefined)] } } }, [O], undefined).out[O].open[0].lineText, "const a = 1;");
  // The report names the invocation that made it: the group's own file and --disableBail.
  for (const [name, config, want] of [
    ["a report made with the group's file and --disableBail is accepted", { mutate: [LEDGER], disableBail: true }, 0],
    ["a report made without --disableBail is refused", { mutate: [LEDGER] }, 1],
    ["a report made with disableBail false is refused", { mutate: [LEDGER], disableBail: false }, 1],
    ["a report whose mutate is another file is refused", { mutate: [`${MODEL}Other.ts`], disableBail: true }, 1],
    ["a report whose mutate holds the file and another is refused", { mutate: [LEDGER, `${MODEL}Other.ts`], disableBail: true }, 1],
    ["a report with no config is refused", undefined, 1],
  ]) expect(name, reportReasons({ config }, GROUPS.ledger, "report").length, want);
  // The measured set: nothing the base lists changed, nothing but the born file added, the born file present.
  const base = { [`${MODEL}A.ts`]: "a1", [`${MODEL}B.ts`]: "b1" };
  const closeOk = { ...base, [LEDGER]: "n1" };
  for (const [name, closeFiles, want] of [
    ["a clean close passes the measured set", closeOk, 0],
    ["a base-listed blob that changed fails", { ...closeOk, [`${MODEL}A.ts`]: "a2" }, 1],
    ["a base-listed file that is gone fails", { [`${MODEL}A.ts`]: "a1", [LEDGER]: "n1" }, 1],
    ["a second added model file fails", { ...closeOk, [`${MODEL}C.ts`]: "c1" }, 1],
    ["a close without the born file fails", base, 1],
  ]) expect(name, measuredSetReasons(base, closeFiles).length, want);
  expect("no change after the close head passes", shippedReasons([]).length, 0);
  expect("the born module changed after the close head fails", shippedReasons([LEDGER]).length, 1);
  expect("the born module's test changed after the close head fails", shippedReasons([K]).length, 1);
  // The base record: refused when a born file exists, a group is not accepted, the request forms.
  expect("a base is refused when the born file exists", bornReasons([LEDGER]).length, 1);
  expect("a base is allowed when no born file exists", bornReasons([`${MODEL}A.ts`]).length, 0);
  expect("record base takes no group", [recordRequest("base", []) !== undefined, recordRequest("base", ["ledger"]) === undefined], [true, true]);
  expect("record close takes the group and --restart only", [recordRequest("close", ["ledger"]) !== undefined, recordRequest("close", ["ledger", "--restart"])?.restart, recordRequest("close", []) === undefined, recordRequest("close", ["other"]) === undefined, recordRequest("close", ["ledger", "--now"]) === undefined, recordRequest("close", ["ledger", "--restart", "x"]) === undefined], [true, true, true, true, true, true]);
  // The record a record writes into: a restart of a close starts a fresh record, a base is never restarted, and a record names the one phase base.
  const held = { phase: "88", phase_base: "p", groups: { other: { head: "a" } } };
  expect("--restart on a close starts a fresh record and names what it dropped", (() => { const r = heldFor(held, "close", "ledger", "b", true, "p"); return [r.bad.length, Object.keys(r.held.groups).length, r.dropped.join(), r.held.phase_base]; })(), [0, 0, "other", "p"]);
  expect("--restart on a base is refused", heldFor(held, "base", "ledger", "b", true, "p").bad.length, 1);
  expect("a record naming another phase base is refused", heldFor(held, "close", "ledger", "b", false, "q").bad.length, 1);
  expect("a record naming the same phase base is not refused", heldFor(held, "close", "ledger", "b", false, "p").bad.length, 0);
  // The dispatcher with this file's own table, every mode's run replaced: a record from a modified tree is refused before its
  // run, a clean one runs, and compare and probe never read the status.
  for (const [mode, args, status, want] of [
    ["record", ["base"], planted, "refused"],
    ["record", ["close", "ledger"], planted, "refused"],
    ["record", ["base"], "", "ran"],
    ["record", ["close", "ledger"], "", "ran"],
    ["record", ["base", "ledger"], "", "usage"],
    ["compare", [], planted, "ran"],
    ["probe", ["ledger"], planted, "ran"],
  ]) {
    let got = "nothing";
    const stubs = Object.fromEntries(Object.entries(MODES).map(([k, v]) => [k, { ...v, run: () => { got = "ran"; } }]));
    dispatch(stubs, mode, args, () => status, () => { got = "refused"; }, () => { got = "usage"; });
    expect(`${mode} ${args.join(" ")} on ${JSON.stringify(status)}`, got, want);
  }
  // The status a record reads covers the born files, the whole of `packages` and the Stryker config, so a test file written
  // but not committed is refused too.
  expect("the status of a record reads the born files, packages and the Stryker config", [NEW_FILES.every((f) => statusPaths().includes(f)), statusPaths().includes("packages"), statusPaths().includes(CONFIG)], [true, true, true]);
  expect("the status reader reads the paths a record reads", gitStatus.toString(), '() => git("status", "--porcelain", "--", ...statusPaths())');
  // The invocation, the group and the constants.
  expect("the invocation is the born file alone with --disableBail", invocation("ledger"), `pnpm exec stryker run ${CONFIG} --mutate ${LEDGER} --disableBail`);
  expect("the one group is the born ledger, close only", [Object.keys(GROUPS).join(), NEW_FILES.join(), GROUPS.ledger.closeOnly], ["ledger", LEDGER, true]);
  expect("every EXAMINED allowance is a positive count in a born file and every EQUIVALENT entry is complete", [Object.entries(EXAMINED).some(([f, kinds]) => !NEW_FILES.includes(f) || Object.values(kinds).some((n) => !Number.isInteger(n) || n < 1)), EQUIVALENT.some((e) => !NEW_FILES.includes(e.file) || [e.mutatorName, e.replacement, e.lineText, e.reason].some((v) => typeof v !== "string" || v.trim() === ""))], [false, false]);
  expect("UNMEASURED is the four react files, each with a reason that opens with the fact", [UNMEASURED.map((u) => u.file.split("/").pop()).join(), UNMEASURED.every((u) => u.why.startsWith("stryker.devtools.mjs mutates src/model/** only") && u.why.endsWith("prove it"))], ["StoppedBox.tsx,useStopNotice.ts,TimelineNotice.tsx,DiagnosticsNotice.tsx", true]);
  console.log(`self-test: ${passed} passed`);
};

/** Each mode, whether it refuses a tree whose read files differ from HEAD, and its run. */
const MODES = {
  record: {
    clean: true,
    run: (name, ...rest) => {
      const request = recordRequest(name, rest);
      return request === undefined ? usage() : request.name === "base" ? recordBase() : recordClose(request);
    },
  },
  probe: { clean: false, run: (group) => (Object.hasOwn(GROUPS, group ?? "") ? probe(group) : usage()) },
  compare: { clean: false, run: () => compare() },
  "--self-test": { clean: false, run: () => selfTest() },
};
const usage = () => fail(["usage: node 88-mutation.mjs record base | record close ledger [--restart] | probe ledger | compare | --self-test"]);
/** Runs `mode`, refusing first when it records and `status` shows a read file modified; `unusable` answers a line that is no request. */
function dispatch(modes, mode, args, status, refuse, unusable = usage) {
  const entry = Object.hasOwn(modes, mode) ? modes[mode] : undefined;
  if (entry === undefined) return unusable();
  if (entry.clean) {
    if (recordRequest(args[0], args.slice(1)) === undefined) return unusable();
    const bad = dirtyReasons(status());
    if (bad.length > 0) return refuse(bad);
  }
  return entry.run(...args);
}

const [mode, ...args] = process.argv.slice(2);
await dispatch(MODES, mode, args, gitStatus, fail);
